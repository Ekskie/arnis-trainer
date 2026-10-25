import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from './AuthContext';
import { DirectMessage, isUUID, MessageService } from '@/services/messageService';
import { isSupabaseConfigured, supabase, UserProfile } from '@/services/supabase';
import { MartialTheme } from '@/constants/theme';

interface ToastData {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  senderRole?: string;
  content: string;
}

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markThreadRead: (partnerId: string) => Promise<void>;
  setActiveChatPartnerId: (partnerId: string | null) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeChatPartnerId, setActiveChatPartnerIdState] = useState<string | null>(null);
  const activeChatPartnerRef = useRef<string | null>(null);

  const setActiveChatPartnerId = useCallback((partnerId: string | null) => {
    activeChatPartnerRef.current = partnerId;
    setActiveChatPartnerIdState(partnerId);
  }, []);

  // Toast state and animation
  const [currentToast, setCurrentToast] = useState<ToastData | null>(null);
  const toastY = useRef(new Animated.Value(-120)).current;
  const dismissTimeoutRef = useRef<any>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    const count = await MessageService.getTotalUnreadCount(user.id);
    setUnreadCount(count);
  }, [user?.id]);

  const markThreadRead = useCallback(
    async (partnerId: string) => {
      if (!user?.id || !partnerId) return;
      await MessageService.markThreadAsRead(user.id, partnerId);
      // Immediately refresh unread count
      await refreshUnreadCount();
    },
    [user?.id, refreshUnreadCount]
  );

  const hideToast = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
    Animated.timing(toastY, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentToast(null);
    });
  }, [toastY]);

  const showToast = useCallback(
    (toast: ToastData) => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
      setCurrentToast(toast);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      // Slide down
      Animated.spring(toastY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();

      // Auto dismiss after 4.5 seconds
      dismissTimeoutRef.current = setTimeout(() => {
        hideToast();
      }, 4500);
    },
    [toastY, hideToast]
  );

  // Initial unread fetch on user change
  useEffect(() => {
    refreshUnreadCount();
  }, [user?.id, refreshUnreadCount]);

  // Real-time listener for incoming messages to active user
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = MessageService.subscribeToUserMessages(user.id, async (newMsg: DirectMessage) => {
      // 1. Refresh total unread count
      refreshUnreadCount();

      // 2. If the user is currently looking at this thread, skip toast banner
      if (activeChatPartnerRef.current === newMsg.sender_id) {
        return;
      }

      // 3. Resolve sender info for the banner
      let senderName = 'Training Partner';
      let senderAvatar: string | null = null;
      let senderRole = 'Student';

      if (isSupabaseConfigured && isUUID(newMsg.sender_id)) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, role')
            .eq('id', newMsg.sender_id)
            .maybeSingle();

          if (data) {
            senderName = data.display_name || 'Training Partner';
            senderAvatar = data.avatar_url;
            senderRole = data.role === 'coach' ? 'Coach Guro' : 'Student';
          }
        } catch {
          // Fallback gracefully
        }
      } else {
        senderName = newMsg.sender_id.includes('coach') ? 'Guro Miguel Roxas' : 'Juan Dela Cruz';
        senderRole = newMsg.sender_id.includes('coach') ? 'Coach Guro' : 'Student';
      }

      showToast({
        id: newMsg.id,
        senderId: newMsg.sender_id,
        senderName,
        senderAvatar,
        senderRole,
        content: newMsg.content,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, refreshUnreadCount, showToast]);

  const handleToastPress = () => {
    if (!currentToast) return;
    const targetSenderId = currentToast.senderId;
    hideToast();
    router.push({
      pathname: '/direct-chat/[partnerId]',
      params: { partnerId: targetSenderId },
    } as any);
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        markThreadRead,
        setActiveChatPartnerId,
      }}>
      {children}

      {/* Interactive In-App Top Toast Notification */}
      {currentToast && (
        <Animated.View
          style={[
            styles.toastWrapper,
            {
              top: insets.top + (Platform.OS === 'android' ? 8 : 4),
              transform: [{ translateY: toastY }],
            },
          ]}>
          <TouchableOpacity
            style={styles.toastContainer}
            activeOpacity={0.9}
            onPress={handleToastPress}>
            <View style={styles.toastAvatarBox}>
              {currentToast.senderAvatar ? (
                <Image source={{ uri: currentToast.senderAvatar }} style={styles.toastAvatarImg} />
              ) : (
                <MaterialCommunityIcons
                  name={currentToast.senderRole?.includes('Coach') ? 'shield-account' : 'karate'}
                  size={20}
                  color={currentToast.senderRole?.includes('Coach') ? '#D97706' : '#15803D'}
                />
              )}
            </View>

            <View style={styles.toastTextBox}>
              <View style={styles.toastHeaderRow}>
                <Text style={styles.toastSenderName} numberOfLines={1}>
                  {currentToast.senderName}
                </Text>
                <Text style={styles.toastRolePill}>{currentToast.senderRole || 'Partner'}</Text>
              </View>
              <Text style={styles.toastMessageContent} numberOfLines={2}>
                {currentToast.content}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.toastCloseBtn}
              onPress={hideToast}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 99999,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    gap: 12,
  },
  toastAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  toastAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  toastTextBox: {
    flex: 1,
  },
  toastHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  toastSenderName: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    flexShrink: 1,
  },
  toastRolePill: {
    fontSize: 9.5,
    fontWeight: '800',
    color: MartialTheme.colors.primary,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    overflow: 'hidden',
  },
  toastMessageContent: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  toastCloseBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
});

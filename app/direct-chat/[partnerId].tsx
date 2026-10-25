import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { DirectMessage, isUUID, MessageService } from '@/services/messageService';
import { isSupabaseConfigured, supabase, UserProfile } from '@/services/supabase';

const COACH_QUICK_TIPS = [
  'Keep your Kalasag guard pinned to your chest',
  'Snap your wrist (Pitik) crisply at the apex',
  'Slicing plane angle looks good, keep your elbow high',
  'Great recovery and balance back to ready stance!',
  'Engage your core and hips for more strike power',
];

export default function DirectChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const { user, profile } = useAuth();
  const { markThreadRead, setActiveChatPartnerId } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Monitor keyboard appearance for smooth responsive input positioning
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Set active partner to suppress toast banners for this chat, and mark messages as read
  useEffect(() => {
    if (!partnerId) return;
    setActiveChatPartnerId(partnerId);
    markThreadRead(partnerId).catch(() => {});

    return () => {
      setActiveChatPartnerId(null);
    };
  }, [partnerId, setActiveChatPartnerId, markThreadRead]);

  // Load partner profile and message history
  useEffect(() => {
    if (!partnerId || !user) return;

    // Fetch partner profile safely
    if (isSupabaseConfigured && isUUID(partnerId)) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .maybeSingle()
        .then(
          ({ data }) => {
            if (data) {
              setPartnerProfile(data as UserProfile);
            } else {
              setPartnerProfile({
                id: partnerId,
                role: profile?.role === 'coach' ? 'student' : 'coach',
                display_name: profile?.role === 'coach' ? 'Trainee' : 'Guro Instructor',
                email: null,
                rank_sash: profile?.role === 'coach' ? 'White Sash' : 'Lakan Tatlo (3rd Dan)',
              });
            }
          },
          () => {}
        );
    } else {
      // Dev / offline fallback
      setPartnerProfile({
        id: partnerId,
        role: partnerId.includes('coach') ? 'coach' : 'student',
        display_name: partnerId.includes('coach') ? 'Guro Miguel Roxas' : 'Juan Dela Cruz',
        email: partnerId.includes('coach') ? 'guro.miguel@arnis.ph' : 'student.juan@arnis.ph',
        rank_sash: partnerId.includes('coach') ? 'Lakan Tatlo (3rd Dan)' : 'Green Sash',
      });
    }

    // Initial message history load
    MessageService.fetchMessages(user.id, partnerId).then((history) => {
      setMessages(history);
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    });

    // Realtime incoming message subscription via Supabase
    const unsubscribe = MessageService.subscribeToMessages(
      user.id,
      partnerId,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        markThreadRead(partnerId).catch(() => {});
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    // Reliable 4s polling fallback in case mobile websocket drops
    const pollTimer = setInterval(() => {
      MessageService.fetchMessages(user.id, partnerId).then((latest) => {
        setMessages((prev) => {
          if (
            latest.length !== prev.length ||
            (latest.length > 0 && prev.length > 0 && latest[latest.length - 1].id !== prev[prev.length - 1].id)
          ) {
            return latest;
          }
          return prev;
        });
      });
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, [partnerId, user, profile]);

  const handleSend = async (contentToSend?: string) => {
    const text = (contentToSend || inputText).trim();
    if (!text || !user || !partnerId || isSending) return;

    setSendError(null);
    setIsSending(true);
    setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Optimistically show message immediately
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: DirectMessage = {
      id: tempId,
      sender_id: user.id,
      recipient_id: partnerId,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    const res = await MessageService.sendMessage(user.id, partnerId, text);
    setIsSending(false);

    if (res.error) {
      // Revert optimistic insert and restore input text
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
      setSendError(res.error.message || 'Failed to send message.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Send Failed', res.error.message || 'Please check your connection and try again.');
    } else if (res.message) {
      // Replace temporary optimistic message with confirmed server record
      setMessages((prev) => prev.map((m) => (m.id === tempId ? res.message! : m)));
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const isCoach = profile?.role === 'coach';

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      if (isCoach) {
        router.replace('/(coach)/inbox' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={MartialTheme.colors.text} />
        </TouchableOpacity>

        <View style={styles.partnerAvatarCircle}>
          {partnerProfile?.avatar_url ? (
            <Image source={{ uri: partnerProfile.avatar_url }} style={styles.partnerAvatarImg} />
          ) : (
            <MaterialCommunityIcons
              name={partnerProfile?.role === 'coach' ? 'shield-account' : 'karate'}
              size={22}
              color={partnerProfile?.role === 'coach' ? '#D97706' : '#15803D'}
            />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.partnerName}>
              {partnerProfile?.display_name || 'Training Partner'}
            </Text>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.partnerRole}>
            {partnerProfile?.rank_sash || (partnerProfile?.role === 'coach' ? 'Coach Guro' : 'Student')}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={MartialTheme.colors.primary} />
            <Text style={styles.loadingText}>Opening direct secure channel...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>
            {/* Martial Direct Mentorship Crest */}
            <View style={styles.chatIntroBox}>
              <Ionicons name="lock-closed" size={14} color="#6B7280" />
              <Text style={styles.chatIntroText}>
                End-to-end direct mentorship channel between Student and Coach. Practice feedback and advice exchanged here are private.
              </Text>
            </View>

            {messages.length === 0 ? (
              <View style={styles.emptyMessagesBox}>
                <Ionicons name="chatbubbles-outline" size={36} color="#D1D5DB" />
                <Text style={styles.emptyMessagesText}>No messages yet.</Text>
                <Text style={styles.emptyMessagesSub}>
                  {isCoach
                    ? 'Send a warm greeting or advice on their latest strike attempt!'
                    : 'Ask your Guro any questions about strike angles, kalasag guard, or timing!'}
                </Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isMine ? styles.messageRowMine : styles.messageRowTheirs,
                    ]}>
                    <View
                      style={[
                        styles.messageBubble,
                        isMine
                          ? isCoach
                            ? styles.bubbleMineCoach
                            : styles.bubbleMineStudent
                          : styles.bubbleTheirs,
                      ]}>
                      <Text
                        style={[
                          styles.messageText,
                          isMine ? styles.messageTextMine : styles.messageTextTheirs,
                        ]}>
                        {msg.content}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          isMine ? styles.messageTimeMine : styles.messageTimeTheirs,
                        ]}>
                        {timeStr}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Quick Coaching Tips Bar (Available to Coaches) */}
        {isCoach && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickTipsScroll}
            contentContainerStyle={styles.quickTipsRow}>
            {COACH_QUICK_TIPS.map((tip, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickTipChip}
                onPress={() => {
                  Haptics.selectionAsync();
                  handleSend(tip);
                }}
                activeOpacity={0.8}>
                <Text style={styles.quickTipText}>{tip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Error Notice */}
        {sendError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.errorBannerText}>{sendError}</Text>
            <TouchableOpacity onPress={() => setSendError(null)}>
              <Ionicons name="close" size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 12) },
          ]}>
          <TextInput
            style={styles.input}
            placeholder={
              isCoach ? 'Send guidance or pointers...' : 'Ask your Guro for guidance...'
            }
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => {
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 120);
            }}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              isCoach && { backgroundColor: '#D97706' },
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.85}>
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={17} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MartialTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  partnerAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  partnerAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  partnerRole: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '600',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '600',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
    gap: 10,
  },
  chatIntroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 10,
    gap: 6,
    marginBottom: 10,
  },
  chatIntroText: {
    flex: 1,
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  emptyMessagesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyMessagesText: {
    fontSize: 15,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  emptyMessagesSub: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowTheirs: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMineStudent: {
    backgroundColor: MartialTheme.colors.primary,
    borderBottomRightRadius: 2,
  },
  bubbleMineCoach: {
    backgroundColor: '#D97706',
    borderBottomRightRadius: 2,
  },
  bubbleTheirs: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  messageTextTheirs: {
    color: MartialTheme.colors.text,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMine: {
    color: 'rgba(255,255,255,0.75)',
  },
  messageTimeTheirs: {
    color: '#9CA3AF',
  },
  quickTipsScroll: {
    flexGrow: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
  },
  quickTipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  quickTipChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  quickTipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FECDD3',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: MartialTheme.colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: MartialTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

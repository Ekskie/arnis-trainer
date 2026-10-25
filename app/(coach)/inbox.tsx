import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { ConversationThread, MessageService } from '@/services/messageService';
import { MentorshipRequest, MentorshipService } from '@/services/mentorshipService';

export default function CoachInboxScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshUnreadCount } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [students, setStudents] = useState<MentorshipRequest[]>([]);

  const loadInbox = async () => {
    if (!user) return;
    try {
      const [list, accepted] = await Promise.all([
        MessageService.getConversations(user.id),
        MentorshipService.getCoachStudents(user.id),
      ]);
      setThreads(list);
      setStudents(accepted);
      refreshUnreadCount().catch(() => {});
    } catch (e) {
      console.error('Failed to load inbox:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInbox();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadInbox();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.crestCircle}>
            <Ionicons name="chatbubbles" size={24} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Student Messages</Text>
            <Text style={styles.headerSubtitle}>Direct 1-on-1 Mentorship Channels</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={styles.loadingText}>Loading student conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.partnerId}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            students.length > 0 ? (
              <View style={styles.activeStudentsBox}>
                <View style={styles.activeStudentsHeader}>
                  <Text style={styles.activeStudentsTitle}>YOUR CONNECTED STUDENTS</Text>
                  <Text style={styles.activeStudentsSub}>Tap to start direct chat</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.studentPillScroll}>
                  {students.map((req) => {
                    const s = req.student;
                    if (!s) return null;
                    const targetId = s.id || req.student_id;
                    return (
                      <TouchableOpacity
                        key={targetId}
                        style={styles.studentPillCard}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(`/direct-chat/${targetId}` as any);
                        }}
                        activeOpacity={0.8}>
                        <View style={styles.studentPillAvatar}>
                          {s.avatar_url ? (
                            <Image
                              source={{ uri: s.avatar_url }}
                              style={styles.studentPillAvatarImg}
                            />
                          ) : (
                            <Ionicons name="person" size={20} color="#15803D" />
                          )}
                        </View>
                        <Text style={styles.studentPillName} numberOfLines={1}>
                          {s.display_name.split(' ')[0]}
                        </Text>
                        <Text style={styles.studentPillSash} numberOfLines={1}>
                          {s.rank_sash || 'White Sash'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="chat-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyDesc}>
                {students.length > 0
                  ? 'Tap one of your connected students above to send them pointers or feedback!'
                  : 'When connected students reach out to you or when you message them from your Roster, conversation threads will appear here.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const timeStr = new Date(item.lastMessage.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });

            const isUnread = item.unreadCount > 0;

            return (
              <TouchableOpacity
                style={[styles.threadCard, isUnread && styles.threadCardUnread]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/direct-chat/${item.partnerId}` as any);
                }}
                activeOpacity={0.8}>
                <View style={[styles.studentAvatar, isUnread && styles.studentAvatarUnread]}>
                  {item.partnerProfile?.avatar_url ? (
                    <Image
                      source={{ uri: item.partnerProfile.avatar_url }}
                      style={styles.studentAvatarImg}
                    />
                  ) : (
                    <Ionicons name="person" size={22} color={isUnread ? '#D97706' : '#15803D'} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.threadHeaderRow}>
                    <Text style={[styles.studentName, isUnread && styles.studentNameUnread]}>
                      {item.partnerProfile?.display_name || 'Student'}
                    </Text>
                    <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>{timeStr}</Text>
                  </View>

                  <View style={styles.sashRow}>
                    <Text style={styles.sashText}>
                      {item.partnerProfile?.rank_sash || 'White Sash'}
                    </Text>
                  </View>

                  <Text
                    style={[styles.lastMessagePreview, isUnread && styles.lastMessagePreviewUnread]}
                    numberOfLines={1}>
                    {item.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                    {item.lastMessage.content}
                  </Text>
                </View>

                <View style={styles.threadEndColumn}>
                  {isUnread ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {item.unreadCount > 9 ? '9+' : item.unreadCount}
                      </Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crestCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    marginTop: 2,
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
  listContent: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  emptyDesc: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  studentAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  studentAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  threadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  sashRow: {
    marginBottom: 4,
  },
  sashText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  lastMessagePreview: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 18,
  },
  threadCardUnread: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFDF5',
  },
  studentAvatarUnread: {
    backgroundColor: '#FEF3C7',
  },
  studentNameUnread: {
    fontWeight: '900',
    color: '#111827',
  },
  timeTextUnread: {
    color: '#D97706',
    fontWeight: '800',
  },
  lastMessagePreviewUnread: {
    color: '#1F2937',
    fontWeight: '700',
  },
  threadEndColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  unreadBadge: {
    backgroundColor: '#DC2626',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  activeStudentsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  activeStudentsHeader: {
    marginBottom: 10,
  },
  activeStudentsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  activeStudentsSub: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    marginTop: 1,
  },
  studentPillScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  studentPillCard: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    minWidth: 80,
  },
  studentPillAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  studentPillAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  studentPillName: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  studentPillSash: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 1,
  },
});

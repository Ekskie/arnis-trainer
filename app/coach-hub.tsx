import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MartialTheme, createShadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { MentorshipRequest, MentorshipService } from '@/services/mentorshipService';

export default function CoachHubScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    strikeId?: string;
    strikeName?: string;
    recentScore?: string;
    weakness?: string;
    lessonId?: string;
    source?: string;
  }>();
  const { user } = useAuth();
  const { unreadCount, refreshUnreadCount } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [mentorship, setMentorship] = useState<MentorshipRequest | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }

      MentorshipService.getStudentMentorship(user.id)
        .then((req) => setMentorship(req))
        .catch((err) => console.warn('[CoachHub] Failed to fetch mentorship:', err))
        .finally(() => setLoading(false));

      refreshUnreadCount().catch(() => {});
    }, [user, refreshUnreadCount])
  );

  const handleOpenDirectChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (mentorship?.status === 'accepted' && mentorship.coach_id) {
      router.push({
        pathname: `/direct-chat/${mentorship.coach_id}` as any,
        params,
      });
    } else {
      router.push('/coach-connect' as any);
    }
  };

  const handleFindCoach = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/coach-connect' as any);
  };

  const handleLeaveCoach = () => {
    if (!mentorship) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Leave Coach?',
      `Are you sure you want to end your mentorship with ${mentorship.coach?.display_name || 'your Guro'}? You will be free to connect with another instructor. Your evaluations and past chat history will remain safe.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Coach',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await MentorshipService.endMentorship(mentorship.id);
            setMentorship(null);
            setLoading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Mentorship Ended', 'You can now browse and connect with a new coach.');
          },
        },
      ]
    );
  };

  const handleCancelPending = () => {
    if (!mentorship) return;
    Alert.alert(
      'Cancel Request?',
      `Cancel your mentorship request to ${mentorship.coach?.display_name || 'this coach'}?`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await MentorshipService.cancelMentorshipRequest(mentorship.id);
            setMentorship(null);
            setLoading(false);
          },
        },
      ]
    );
  };

  const hasContextParams = Boolean(params.strikeName || params.lessonId || params.weakness);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={MartialTheme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Guro Mentorship Hub</Text>
          <Text style={styles.headerSubtitle}>Personal guidance from certified Arnis coaches</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Contextual Attempt Alert (if navigated from an evaluation or lesson) */}
        {hasContextParams && (
          <View style={styles.contextBanner}>
            <View style={styles.contextBannerHeader}>
              <Ionicons name="sparkles" size={16} color="#B45309" />
              <Text style={styles.contextBannerTitle}>PRACTICE CONTEXT READY</Text>
            </View>
            <Text style={styles.contextBannerText}>
              {params.strikeName ? (
                <>
                  Ask about <Text style={{ fontWeight: '800' }}>{params.strikeName}</Text>
                  {params.recentScore ? ` (Score: ${params.recentScore}%)` : ''}.
                  {params.weakness ? `\nFocus fault: "${params.weakness}"` : ''}
                </>
              ) : params.lessonId ? (
                <>Ask questions regarding your current lesson progression.</>
              ) : (
                <>Ready to discuss your practice session with your Guro.</>
              )}
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={MartialTheme.colors.primary} />
            <Text style={styles.loadingText}>Checking mentorship status...</Text>
          </View>
        ) : mentorship?.status === 'accepted' ? (
          /* ========================================================= */
          /* STATE 1: ACTIVE MENTORSHIP                                */
          /* ========================================================= */
          <View style={styles.activeHubCard}>
            {/* Coach Card Header */}
            <View style={styles.cardHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: '#FEF3C7', overflow: 'hidden' }]}>
                {mentorship.coach?.avatar_url ? (
                  <Image source={{ uri: mentorship.coach.avatar_url }} style={styles.hubAvatarImg} />
                ) : (
                  <MaterialCommunityIcons name="shield-account" size={38} color="#D97706" />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.badgeTagCoach}>
                    <Text style={styles.badgeTagCoachText}>🥋 CERTIFIED GURO</Text>
                  </View>
                  {unreadCount > 0 && (
                    <View style={styles.unreadCounterTag}>
                      <Text style={styles.unreadCounterTagText}>{unreadCount} NEW</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.cardTitle}>{mentorship.coach?.display_name || 'Coach'}</Text>
                <Text style={styles.cardSubtitle}>
                  {mentorship.coach?.rank_sash || 'Master Guro'}
                </Text>
              </View>
            </View>

            {mentorship.coach?.bio ? (
              <View style={styles.connectedCoachInfo}>
                <Text style={styles.connectedCoachBio} numberOfLines={3}>
                  {mentorship.coach.bio}
                </Text>
              </View>
            ) : null}

            {/* Mentorship Perks */}
            <View style={styles.perksList}>
              <View style={styles.perkRow}>
                <Ionicons name="chatbubbles" size={17} color={MartialTheme.colors.primary} />
                <Text style={styles.perkText}>1-on-1 direct coaching & technique advice</Text>
              </View>
              <View style={styles.perkRow}>
                <Ionicons name="videocam" size={17} color="#2563EB" />
                <Text style={styles.perkText}>Recorded practice video reviews</Text>
              </View>
              <View style={styles.perkRow}>
                <Ionicons name="ribbon" size={17} color="#D97706" />
                <Text style={styles.perkText}>Sash promotions & official syllabus grading</Text>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={styles.messageCoachBtn}
              onPress={handleOpenDirectChat}
              activeOpacity={0.85}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
              <Text style={styles.messageCoachBtnText}>
                {unreadCount > 0
                  ? `Message Guro (${unreadCount} unread)`
                  : hasContextParams
                  ? 'Ask Guro About This Practice'
                  : 'Message Guro Coach'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Leave Coach / Switch Option */}
            <TouchableOpacity
              style={styles.leaveCoachBtn}
              onPress={handleLeaveCoach}
              activeOpacity={0.7}>
              <Ionicons name="exit-outline" size={14} color="#DC2626" />
              <Text style={styles.leaveCoachBtnText}>Leave Coach / Switch Mentorship</Text>
            </TouchableOpacity>
          </View>
        ) : mentorship?.status === 'pending' ? (
          /* ========================================================= */
          /* STATE 2: PENDING MENTORSHIP REQUEST                       */
          /* ========================================================= */
          <View style={styles.pendingHubCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: '#FEF3C7', overflow: 'hidden' }]}>
                {mentorship.coach?.avatar_url ? (
                  <Image source={{ uri: mentorship.coach.avatar_url }} style={styles.hubAvatarImg} />
                ) : (
                  <MaterialCommunityIcons name="clock-outline" size={38} color="#D97706" />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.badgeTagPending}>
                  <Text style={styles.badgeTagPendingText}>⏳ REQUEST PENDING</Text>
                </View>
                <Text style={styles.cardTitle}>{mentorship.coach?.display_name || 'Coach'}</Text>
                <Text style={styles.cardSubtitle}>
                  {mentorship.coach?.rank_sash || 'Certified Guro'}
                </Text>
              </View>
            </View>

            <View style={styles.pendingNoticeBox}>
              <Ionicons name="information-circle" size={18} color="#92400E" />
              <Text style={styles.pendingNoticeText}>
                Your request has been submitted to <Text style={{ fontWeight: '800' }}>{mentorship.coach?.display_name}</Text>. Once your coach accepts, you can exchange 1-on-1 direct messages and share practice recordings.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cancelPendingBtn}
              onPress={handleCancelPending}
              activeOpacity={0.75}>
              <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.cancelPendingBtnText}>Cancel Pending Request</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ========================================================= */
          /* STATE 3: NO COACH CONNECTED                               */
          /* ========================================================= */
          <View style={styles.emptyHubCard}>
            <View style={styles.emptyIconBadge}>
              <MaterialCommunityIcons name="shield-account-outline" size={48} color="#D97706" />
            </View>

            <Text style={styles.emptyTitle}>Personal Guro Mentorship</Text>
            <Text style={styles.emptyDesc}>
              Connect with a certified Arnis master for personalized 1-on-1 guidance, practice video critiques, and official sash progression.
            </Text>

            <View style={styles.emptyBenefitsCard}>
              <View style={styles.emptyBenefitRow}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.emptyBenefitText}>Real instructors reviewing your strike forms</Text>
              </View>
              <View style={styles.emptyBenefitRow}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.emptyBenefitText}>Direct 1-on-1 messaging & strike troubleshooting</Text>
              </View>
              <View style={styles.emptyBenefitRow}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.emptyBenefitText}>Official sash evaluations and Dan advancement</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.findCoachBtn}
              onPress={handleFindCoach}
              activeOpacity={0.88}>
              <Ionicons name="search" size={18} color="#FFFFFF" />
              <Text style={styles.findCoachBtnText}>Find a Certified Guro</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: MartialTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  contextBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  contextBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextBannerTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.8,
  },
  contextBannerText: {
    fontSize: 12.5,
    color: '#78350F',
    lineHeight: 18,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  loadingText: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '600',
  },
  activeHubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FDE68A',
    ...createShadow({ offset: { width: 0, height: 4 }, opacity: 0.06, radius: 8, elevation: 3 }),
    gap: 16,
  },
  pendingHubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    gap: 16,
  },
  emptyHubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...createShadow({ offset: { width: 0, height: 4 }, opacity: 0.05, radius: 8, elevation: 2 }),
    gap: 12,
  },
  emptyIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  emptyBenefitsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    gap: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyBenefitText: {
    fontSize: 12.5,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  findCoachBtn: {
    backgroundColor: MartialTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    width: '100%',
    marginTop: 6,
    ...createShadow({ color: MartialTheme.colors.primary, offset: { width: 0, height: 3 }, opacity: 0.25, radius: 6, elevation: 3 }),
  },
  findCoachBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  badgeTagCoach: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeTagCoachText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D97706',
  },
  badgeTagPending: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeTagPendingText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
  },
  unreadCounterTag: {
    backgroundColor: '#DC2626',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  unreadCounterTagText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.primary,
  },
  connectedCoachInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  connectedCoachBio: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
  },
  perksList: {
    gap: 8,
    paddingVertical: 4,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkText: {
    fontSize: 12.5,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  messageCoachBtn: {
    backgroundColor: MartialTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    width: '100%',
    ...createShadow({ color: MartialTheme.colors.primary, offset: { width: 0, height: 3 }, opacity: 0.25, radius: 5, elevation: 3 }),
  },
  messageCoachBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leaveCoachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  leaveCoachBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  pendingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  pendingNoticeText: {
    fontSize: 12.5,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },
  cancelPendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelPendingBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
});

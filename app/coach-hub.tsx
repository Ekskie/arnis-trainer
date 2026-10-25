import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
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

import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { MentorshipRequest, MentorshipService } from '@/services/mentorshipService';
import { CoachCharacter } from '@/components/ui/CoachCharacter';

export default function CoachHubScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
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

  const handleOpenAiCoach = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/chat' as any,
      params,
    });
  };

  const handleOpenHumanCoach = () => {
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

  const handleLeaveCoach = () => {
    if (!mentorship) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Leave Coach?',
      `Are you sure you want to end your mentorship with ${mentorship.coach?.display_name || 'your Guro'}? You will be able to browse and connect with another coach. Your past evaluations and chat history will remain safe.`,
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
          <Text style={styles.headerTitle}>Coach Hub</Text>
          <Text style={styles.headerSubtitle}>Choose your martial coaching guide</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Intro Banner */}
        <View style={styles.introBanner}>
          <Text style={styles.introHeading}>HOW WOULD YOU LIKE GUIDANCE?</Text>
          <Text style={styles.introSubtext}>
            Get instant automated AI pose corrections 24/7 or consult with a certified human Guro instructor for 1-on-1 mentorship.
          </Text>
        </View>

        {/* --- CARD 1: GURO AI SPARRING ASSISTANT --- */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={handleOpenAiCoach}
          activeOpacity={0.88}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.avatarCircle, { backgroundColor: '#DCFCE7' }]}>
              <CoachCharacter pose="waving" size={54} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeTagAi}>
                <Text style={styles.badgeTagAiText}>⚡ 24/7 INSTANT AI</Text>
              </View>
              <Text style={styles.cardTitle}>Guro AI Assistant</Text>
              <Text style={styles.cardSubtitle}>Automated Sparring & Form Diagnostic</Text>
            </View>
          </View>

          <Text style={styles.cardDesc}>
            Instant feedback on strike angles, chambering, Kalasag shield guard, and customized correction protocols calibrated to the 12 canonical strikes.
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.featurePillRow}>
              <Text style={styles.featurePill}>⚡ Instant replies</Text>
              <Text style={styles.featurePill}>📐 Angle analysis</Text>
              <Text style={styles.featurePill}>🛡️ Zero wait</Text>
            </View>
            <View style={styles.actionBtnAi}>
              <Text style={styles.actionBtnAiText}>Start AI Diagnostic Chat</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        {/* --- CARD 2: HUMAN GURO COACH --- */}
        <TouchableOpacity
          style={[styles.hubCard, styles.hubCardCoach]}
          onPress={handleOpenHumanCoach}
          activeOpacity={0.88}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.avatarCircle, { backgroundColor: '#FEF3C7', overflow: 'hidden' }]}>
              {mentorship?.coach?.avatar_url ? (
                <Image source={{ uri: mentorship.coach.avatar_url }} style={styles.hubAvatarImg} />
              ) : (
                <MaterialCommunityIcons name="shield-account" size={36} color="#D97706" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.badgeTagCoach}>
                  <Text style={styles.badgeTagCoachText}>🥋 CERTIFIED GURO</Text>
                </View>
                {unreadCount > 0 && mentorship?.status === 'accepted' && (
                  <View style={styles.unreadCounterTag}>
                    <Text style={styles.unreadCounterTagText}>{unreadCount} NEW</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle}>Human Guro Coach</Text>
              <Text style={styles.cardSubtitle}>
                {mentorship?.status === 'accepted'
                  ? `Connected with ${mentorship.coach?.display_name || 'Coach'}`
                  : mentorship?.status === 'pending'
                  ? 'Request Pending Review'
                  : 'Personal Martial Mentorship'}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#D97706" style={{ marginVertical: 12 }} />
          ) : mentorship?.status === 'accepted' ? (
            <>
              <View style={styles.connectedCoachInfo}>
                <Text style={styles.connectedCoachRank}>
                  {mentorship.coach?.rank_sash || 'Master Guro'}
                </Text>
                <Text style={styles.connectedCoachBio} numberOfLines={2}>
                  {mentorship.coach?.bio || 'Certified Arnis instructor reviewing your practice attempts.'}
                </Text>
              </View>
              <Text style={styles.cardDesc}>
                Your Guro can monitor your practice evaluations, watch permitted practice videos, and chat with you 1-on-1.
              </Text>
            </>
          ) : mentorship?.status === 'pending' ? (
            <View style={styles.pendingStatusBox}>
              <Ionicons name="time" size={16} color="#D97706" />
              <Text style={styles.pendingStatusText}>
                Your request to <Text style={{ fontWeight: '800' }}>{mentorship.coach?.display_name}</Text> is awaiting confirmation.
              </Text>
            </View>
          ) : (
            <Text style={styles.cardDesc}>
              No coach connected yet. Connect with a verified instructor to review your practice recordings, inspect your sash progress, and give real human guidance.
            </Text>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.featurePillRow}>
              <Text style={styles.featurePill}>🎥 Video reviews</Text>
              <Text style={styles.featurePill}>🥋 Sash guidance</Text>
              <Text style={styles.featurePill}>💬 1-on-1 chat</Text>
            </View>

            <View style={[styles.actionBtnAi, styles.actionBtnCoach]}>
              <Text style={styles.actionBtnAiText}>
                {mentorship?.status === 'accepted'
                  ? `Message Guro Coach${unreadCount > 0 ? ` (${unreadCount} new)` : ''}`
                  : mentorship?.status === 'pending'
                  ? 'View Request Status'
                  : 'Find a Certified Coach'}
              </Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </View>

            {mentorship?.status === 'accepted' && (
              <TouchableOpacity
                style={styles.leaveCoachBtn}
                onPress={handleLeaveCoach}
                activeOpacity={0.7}>
                <Ionicons name="exit-outline" size={13} color="#DC2626" />
                <Text style={styles.leaveCoachBtnText}>Leave Coach / Switch Mentorship</Text>
              </TouchableOpacity>
            )}

            {mentorship?.status === 'pending' && (
              <TouchableOpacity
                style={styles.leaveCoachBtn}
                onPress={handleCancelPending}
                activeOpacity={0.7}>
                <Ionicons name="close-circle-outline" size={13} color="#DC2626" />
                <Text style={styles.leaveCoachBtnText}>Cancel Pending Request</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
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
  introBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  introHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  introSubtext: {
    fontSize: 12.5,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 18,
  },
  hubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: '#DCFCE7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    gap: 12,
  },
  hubCardCoach: {
    borderColor: '#FDE68A',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubAvatarImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  badgeTagAi: {
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeTagAiText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
  },
  badgeTagCoach: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeTagCoachText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D97706',
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
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: MartialTheme.colors.textSecondary,
  },
  cardDesc: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 19,
  },
  connectedCoachInfo: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  connectedCoachRank: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 2,
  },
  connectedCoachBio: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 15,
  },
  pendingStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  pendingStatusText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  featurePillRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  featurePill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  actionBtnAi: {
    backgroundColor: MartialTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    width: '100%',
  },
  actionBtnCoach: {
    backgroundColor: '#D97706',
  },
  actionBtnAiText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leaveCoachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  leaveCoachBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
});

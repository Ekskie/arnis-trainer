import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { MentorshipRequest, MentorshipService } from '@/services/mentorshipService';
import { UserProfile } from '@/services/supabase';

export default function CoachConnectScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mentorship, setMentorship] = useState<MentorshipRequest | null>(null);
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<UserProfile | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const [status, coachList] = await Promise.all([
        MentorshipService.getStudentMentorship(user.id),
        MentorshipService.getAvailableCoaches(),
      ]);
      setMentorship(status);
      setCoaches(coachList);
    } catch (e) {
      console.error('Failed to load mentorship data:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const handleLeaveCoach = () => {
    if (!mentorship) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Leave Coach?',
      `Are you sure you want to end your mentorship with ${mentorship.coach?.display_name || 'your Guro'}? You will be free to connect with another instructor. Your evaluations and chat history remain safe.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Coach',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await MentorshipService.endMentorship(mentorship.id);
            setMentorship(null);
            await loadData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Mentorship Ended', 'You can now select and connect with a new coach.');
          },
        },
      ]
    );
  };

  const handleOpenRequest = (coach: UserProfile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mentorship?.status === 'accepted' && mentorship.coach) {
      Alert.alert(
        'Switch Coach?',
        `You are currently mentored by ${mentorship.coach.display_name}. Requesting ${coach.display_name} will end your current mentorship. Do you want to continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Switch Coach',
            onPress: () => {
              setSelectedCoach(coach);
              setRequestNote(
                'Magandang araw po Guro! I would like to request your guidance and feedback on my strike form.'
              );
              setShowRequestModal(true);
            },
          },
        ]
      );
      return;
    }

    setSelectedCoach(coach);
    setRequestNote(
      'Magandang araw po Guro! I would like to request your guidance and feedback on my strike form.'
    );
    setShowRequestModal(true);
  };

  const handleSendRequest = async () => {
    if (!user || !selectedCoach) return;
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const res = await MentorshipService.sendMentorshipRequest(
      user.id,
      selectedCoach.id,
      requestNote.trim()
    );

    setIsSubmitting(false);
    setShowRequestModal(false);

    if (res.error) {
      Alert.alert('Request Failed', res.error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    }
  };

  const handleCancelRequest = async () => {
    if (!mentorship) return;

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel your pending mentorship request?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await MentorshipService.cancelMentorshipRequest(mentorship.id);
            loadData();
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Guro Mentorship</Text>
          <Text style={styles.headerSubtitle}>Direct Guidance from Certified Coaches</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={MartialTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading coaches & status...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Active Accepted Coach Banner */}
          {mentorship?.status === 'accepted' && mentorship.coach && (
            <View style={styles.activeCoachCard}>
              <View style={styles.activeBadgeRow}>
                <Ionicons name="shield-checkmark" size={16} color="#15803D" />
                <Text style={styles.activeBadgeText}>ACTIVE GURO CONNECTION</Text>
              </View>

              <View style={styles.activeCoachInfoRow}>
                <View style={styles.coachAvatarCircle}>
                  {mentorship.coach.avatar_url ? (
                    <Image source={{ uri: mentorship.coach.avatar_url }} style={styles.coachAvatarImg} />
                  ) : (
                    <MaterialCommunityIcons name="karate" size={36} color="#15803D" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeCoachName}>{mentorship.coach.display_name}</Text>
                  <Text style={styles.activeCoachRank}>{mentorship.coach.rank_sash || 'Master Guro'}</Text>
                  <Text style={styles.activeCoachBio} numberOfLines={2}>
                    {mentorship.coach.bio || 'Certified Arnis Master Instructor'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.chatCoachButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/direct-chat/${mentorship.coach_id}` as any);
                }}
                activeOpacity={0.88}>
                <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
                <Text style={styles.chatCoachButtonText}>Message Guro Directly</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.leaveCoachBtn}
                onPress={handleLeaveCoach}
                activeOpacity={0.75}>
                <Ionicons name="person-remove-outline" size={15} color="#DC2626" />
                <Text style={styles.leaveCoachBtnText}>Leave Coach / Switch Mentorship</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pending Request Banner */}
          {mentorship?.status === 'pending' && (
            <View style={styles.pendingCard}>
              <View style={styles.pendingHeaderRow}>
                <Ionicons name="hourglass-outline" size={20} color="#D97706" />
                <Text style={styles.pendingTitle}>Mentorship Request Pending</Text>
              </View>
              <Text style={styles.pendingDesc}>
                You sent a request to{' '}
                <Text style={{ fontWeight: '800' }}>
                  {mentorship.coach?.display_name || 'your selected coach'}
                </Text>
                . Once accepted, they can review your strike evaluations and provide direct feedback.
              </Text>

              <TouchableOpacity
                style={styles.cancelRequestBtn}
                onPress={handleCancelRequest}
                activeOpacity={0.7}>
                <Text style={styles.cancelRequestBtnText}>Cancel Request</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Coach Directory Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {mentorship?.status === 'accepted' ? 'ALL ACADEMY COACHES' : 'SELECT A GURO FOR GUIDANCE'}
            </Text>
            <View style={styles.badgeCounter}>
              <Text style={styles.badgeCounterText}>{coaches.length} Available</Text>
            </View>
          </View>

          {coaches.map((coach) => {
            const isMyCoach = mentorship?.coach_id === coach.id && mentorship.status === 'accepted';
            const isPendingCoach = mentorship?.coach_id === coach.id && mentorship.status === 'pending';

            return (
              <View key={coach.id} style={styles.coachCard}>
                <View style={styles.coachCardHeader}>
                  <View style={styles.coachCardAvatar}>
                    {coach.avatar_url ? (
                      <Image source={{ uri: coach.avatar_url }} style={styles.coachCardAvatarImg} />
                    ) : (
                      <MaterialCommunityIcons name="sword" size={24} color="#D97706" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coachName}>{coach.display_name}</Text>
                    <View style={styles.rankPill}>
                      <Text style={styles.rankPillText}>{coach.rank_sash || 'Certified Guro'}</Text>
                    </View>
                  </View>
                  {isMyCoach && (
                    <View style={styles.myCoachTag}>
                      <Text style={styles.myCoachTagText}>Connected</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.coachBioText}>
                  {coach.bio || 'Experienced practitioner and instructor in traditional and sports Arnis.'}
                </Text>

                <View style={styles.coachActionRow}>
                  {isMyCoach ? (
                    <TouchableOpacity
                      style={styles.connectedBtn}
                      onPress={() => router.push(`/direct-chat/${coach.id}` as any)}>
                      <Ionicons name="chatbubbles" size={16} color="#15803D" />
                      <Text style={styles.connectedBtnText}>Direct Message</Text>
                    </TouchableOpacity>
                  ) : isPendingCoach ? (
                    <View style={styles.pendingTag}>
                      <Text style={styles.pendingTagText}>Request Sent</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.requestCoachBtn}
                      onPress={() => handleOpenRequest(coach)}
                      activeOpacity={0.85}>
                      <Ionicons name="person-add" size={16} color="#FFFFFF" />
                      <Text style={styles.requestCoachBtnText}>Request Mentorship</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Intro Note Modal */}
      <Modal
        visible={showRequestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequestModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Mentorship</Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={24} color={MartialTheme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCoachTarget}>
              Guro: <Text style={{ fontWeight: '800' }}>{selectedCoach?.display_name}</Text>
            </Text>

            <Text style={styles.modalLabel}>INTRODUCTORY NOTE OR GOALS</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              value={requestNote}
              onChangeText={setRequestNote}
              placeholder="Tell your coach about your background or what strikes you want to focus on..."
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSendRequest}
              disabled={isSubmitting}
              activeOpacity={0.88}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.modalSubmitBtnText}>Submit Request to Guro</Text>
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
    backgroundColor: '#FFFFFF',
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
  headerTitleContainer: {
    flex: 1,
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
  centerContainer: {
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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  activeCoachCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#86EFAC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  activeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  activeCoachInfoRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  coachAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coachAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  activeCoachName: {
    fontSize: 17,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginBottom: 2,
  },
  activeCoachRank: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.primary,
    marginBottom: 4,
  },
  activeCoachBio: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 16,
  },
  chatCoachButton: {
    backgroundColor: MartialTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.primaryDark,
    gap: 8,
  },
  chatCoachButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  leaveCoachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    gap: 6,
    marginTop: 8,
  },
  leaveCoachBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingDesc: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
    marginBottom: 12,
  },
  cancelRequestBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  cancelRequestBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
  },
  badgeCounter: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCounterText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '700',
  },
  coachCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  coachCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  coachCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coachCardAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  rankPill: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  rankPillText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '700',
  },
  myCoachTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  myCoachTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  coachBioText: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  coachActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  requestCoachBtn: {
    backgroundColor: MartialTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  requestCoachBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  connectedBtn: {
    backgroundColor: '#DCFCE7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  connectedBtnText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '800',
  },
  pendingTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pendingTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  modalCoachTarget: {
    fontSize: 14,
    color: MartialTheme.colors.textSecondary,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    padding: 12,
    fontSize: 14,
    color: MartialTheme.colors.text,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalSubmitBtn: {
    backgroundColor: MartialTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.primaryDark,
    gap: 8,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

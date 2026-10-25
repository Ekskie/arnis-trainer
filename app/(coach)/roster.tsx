import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
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

export default function CoachRosterScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<MentorshipRequest[]>([]);
  const [students, setStudents] = useState<MentorshipRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRoster = async () => {
    if (!user) return;
    try {
      const [pending, accepted] = await Promise.all([
        MentorshipService.getCoachPendingRequests(user.id),
        MentorshipService.getCoachStudents(user.id),
      ]);
      setPendingRequests(pending);
      setStudents(accepted);
    } catch (e) {
      console.error('Failed to load roster:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRoster();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRoster();
  };

  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await MentorshipService.respondToRequest(requestId, status);
    if (res.error) {
      Alert.alert('Action Failed', res.error.message);
    } else {
      Haptics.notificationAsync(
        status === 'accepted'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      loadRoster();
    }
  };

  const filteredStudents = students.filter((req) => {
    const name = req.student?.display_name?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Coach Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.crestCircle}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.crestAvatarImg} />
            ) : (
              <MaterialCommunityIcons name="shield-sword" size={24} color="#D97706" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.coachName}>{profile?.display_name || 'Guro Instructor'}</Text>
            <Text style={styles.coachRank}>{profile?.rank_sash || 'Certified Master Instructor'}</Text>
          </View>
        </View>

        {/* Quick Stats Pill Row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statNum}>{students.length}</Text>
            <Text style={styles.statLabel}>Active Students</Text>
          </View>
          <View style={[styles.statPill, pendingRequests.length > 0 && styles.statPillAlert]}>
            <Text style={[styles.statNum, pendingRequests.length > 0 && { color: '#D97706' }]}>
              {pendingRequests.length}
            </Text>
            <Text style={styles.statLabel}>Pending Requests</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={styles.loadingText}>Loading students & requests...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}>
          {/* Pending Mentorship Requests Section */}
          {pendingRequests.length > 0 && (
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="time" size={16} color="#D97706" />
                <Text style={styles.sectionTitlePending}>PENDING REQUESTS ({pendingRequests.length})</Text>
              </View>

              {pendingRequests.map((req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestCardHeader}>
                    <View style={styles.studentAvatarMini}>
                      {req.student?.avatar_url ? (
                        <Image
                          source={{ uri: req.student.avatar_url }}
                          style={styles.studentAvatarMiniImg}
                        />
                      ) : (
                        <Ionicons name="person" size={18} color="#15803D" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestStudentName}>
                        {req.student?.display_name || 'Student'}
                      </Text>
                      <Text style={styles.requestStudentSash}>
                        {req.student?.rank_sash || 'White Sash'}
                      </Text>
                    </View>
                  </View>

                  {req.note ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteText}>{`"${req.note}"`}</Text>
                    </View>
                  ) : null}

                  <View style={styles.requestActionsRow}>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleRespondRequest(req.id, 'declined')}
                      activeOpacity={0.7}>
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleRespondRequest(req.id, 'accepted')}
                      activeOpacity={0.88}>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.acceptBtnText}>Accept Mentorship</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Active Students Section */}
          <View style={styles.sectionBox}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="people" size={16} color="#15803D" />
              <Text style={styles.sectionTitle}>MY STUDENTS ({students.length})</Text>
            </View>

            {/* Search Bar */}
            {students.length > 0 && (
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search students by name..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {filteredStudents.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="karate" size={40} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No students found matching search' : 'No connected students yet'}
                </Text>
                <Text style={styles.emptyDesc}>
                  When students send you a mentorship request and you accept, their training journey and practice evaluations will appear here.
                </Text>
              </View>
            ) : (
              filteredStudents.map((req) => {
                const s = req.student;
                if (!s) return null;

                return (
                  <View key={req.id} style={styles.studentCard}>
                    <View style={styles.studentCardTop}>
                      <View style={styles.studentAvatar}>
                        {s.avatar_url ? (
                          <Image source={{ uri: s.avatar_url }} style={styles.studentAvatarImg} />
                        ) : (
                          <Ionicons name="person" size={24} color="#15803D" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{s.display_name}</Text>
                        <View style={styles.sashBadge}>
                          <Text style={styles.sashBadgeText}>{s.rank_sash || 'White Sash'}</Text>
                        </View>
                      </View>

                      {/* Quick Chat Button */}
                      <TouchableOpacity
                        style={styles.chatIconButton}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(`/direct-chat/${s.id || req.student_id}` as any);
                        }}
                        activeOpacity={0.7}>
                        <Ionicons name="chatbubbles" size={18} color="#D97706" />
                      </TouchableOpacity>
                    </View>

                    {/* Action button to inspect student progress & journey */}
                    <TouchableOpacity
                      style={styles.inspectButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/(coach)/student/${s.id}` as any);
                      }}
                      activeOpacity={0.88}>
                      <Ionicons name="analytics" size={16} color="#FFFFFF" />
                      <Text style={styles.inspectButtonText}>Inspect Journey & Practice Form</Text>
                      <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  crestCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    overflow: 'hidden',
  },
  crestAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  coachName: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  coachRank: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    alignItems: 'center',
  },
  statPillAlert: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '700',
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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 18,
  },
  sectionBox: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
  },
  sectionTitlePending: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.8,
  },
  requestCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    gap: 10,
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentAvatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  studentAvatarMiniImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  requestStudentName: {
    fontSize: 15,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  requestStudentSash: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  noteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  noteText: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  requestActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#15803D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: MartialTheme.colors.text,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    gap: 8,
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  studentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
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
  studentName: {
    fontSize: 16,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginBottom: 4,
  },
  sashBadge: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sashBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  chatIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inspectButton: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#B45309',
    gap: 6,
  },
  inspectButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

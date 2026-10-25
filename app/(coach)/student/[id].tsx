import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { ALL_CURRICULUM_LESSONS } from '@/constants/curriculumStore';
import {
  CloudCurriculumItem,
  CloudPracticeSession,
  CloudSyncService,
} from '@/services/cloudSyncService';
import { UserProfile } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MentorshipService } from '@/services/mentorshipService';

function SharedVideoItem({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
  });

  return (
    <View style={styles.videoPlayerContainer}>
      <VideoView
        style={styles.videoPlayer}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
      <View style={styles.videoControlsHint}>
        <Ionicons name="play-circle-outline" size={14} color="#FFFFFF" />
        <Text style={styles.videoControlsText}>Student Shared Practice Video</Text>
      </View>
    </View>
  );
}

export default function StudentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'evaluations' | 'journey'>('evaluations');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<CloudPracticeSession[]>([]);
  const [curriculum, setCurriculum] = useState<CloudCurriculumItem[]>([]);
  const [isMentorshipActive, setIsMentorshipActive] = useState<boolean>(true);
  const [isReleased, setIsReleased] = useState<boolean>(false);

  const handleEndMentorship = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'End Mentorship?',
      `Are you sure you want to release ${profile?.display_name || 'this student'} from your roster? They will be free to connect with another instructor. Past evaluations and chat messages will remain safely preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release Student',
          style: 'destructive',
          onPress: async () => {
            if (!user || !id) return;
            const requests = await MentorshipService.getCoachStudents(user.id);
            const req = requests.find((r) => r.student_id === id);
            if (req) {
              await MentorshipService.endMentorship(req.id);
            }
            setIsMentorshipActive(false);
            setIsReleased(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              'Student Released',
              `${profile?.display_name || 'Student'} has been released from your active roster. You can still inspect past evaluations or return to the roster.`,
              [
                { text: 'Stay Here', style: 'cancel' },
                {
                  text: 'Back to Roster',
                  onPress: () => router.replace('/(coach)/roster' as any),
                },
              ]
            );
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    if (user) {
      MentorshipService.getCoachStudents(user.id).then((reqs) => {
        const found = reqs.some((r) => r.student_id === id);
        setIsMentorshipActive(found);
      });
    }

    CloudSyncService.fetchStudentDataForCoach(id)
      .then((data) => {
        setProfile(data.profile);
        setSessions(data.sessions);
        setCurriculum(data.curriculum);
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return MartialTheme.colors.primary;
    if (score >= 70) return MartialTheme.colors.bamboo;
    return '#EF4444';
  };

  const completedLessonCount = curriculum.filter(
    (c) => c.status === 'mastered' || c.status === 'assessed'
  ).length;

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
          <Text style={styles.headerTitle}>{profile?.display_name || 'Student Profile'}</Text>
          <Text style={styles.headerSubtitle}>Trainee Progress & Journey Inspector</Text>
        </View>
        <TouchableOpacity
          style={styles.headerChatBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/direct-chat/${id}` as any);
          }}
          activeOpacity={0.8}>
          <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={styles.loadingText}>Fetching student journey and evaluation records...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Student Overview Card */}
          <View style={styles.overviewCard}>
            {/* Released Status Banner */}
            {(!isMentorshipActive || isReleased) && (
              <View style={styles.releasedBanner}>
                <Ionicons name="information-circle" size={18} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.releasedBannerTitle}>STUDENT RELEASED · Mentorship Ended</Text>
                  <Text style={styles.releasedBannerDesc}>
                    This student is not in your active roster. Past evaluations and form metrics remain viewable.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.overviewHeader}>
              <View style={styles.avatarLarge}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarLargeImg} />
                ) : (
                  <Ionicons name="person" size={32} color="#15803D" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentNameLarge}>{profile?.display_name}</Text>
                <View style={styles.sashBadge}>
                  <Text style={styles.sashBadgeText}>{profile?.rank_sash || 'White Sash'}</Text>
                </View>
                <Text style={styles.studentEmail}>{profile?.email || 'Student Trainee'}</Text>
              </View>

              <View style={{ gap: 6, alignItems: 'flex-end' }}>
                <TouchableOpacity
                  style={styles.messageStudentBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/direct-chat/${id}` as any);
                  }}
                  activeOpacity={0.8}>
                  <Ionicons name="chatbubbles" size={14} color="#FFFFFF" />
                  <Text style={styles.messageStudentBtnText}>Message</Text>
                </TouchableOpacity>

                {isMentorshipActive && !isReleased ? (
                  <TouchableOpacity
                    style={styles.releaseStudentHeaderBtn}
                    onPress={handleEndMentorship}
                    activeOpacity={0.7}>
                    <Ionicons name="person-remove-outline" size={12} color="#DC2626" />
                    <Text style={styles.releaseStudentHeaderBtnText}>Release</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.releasedPill}>
                    <Text style={styles.releasedPillText}>Released</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Metrics Bar */}
            <View style={styles.metricsBar}>
              <View style={styles.metricItem}>
                <Text style={styles.metricNum}>{sessions.length}</Text>
                <Text style={styles.metricLabel}>Evaluations</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricNum}>{completedLessonCount}</Text>
                <Text style={styles.metricLabel}>Lessons Done</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricNum}>
                  {sessions.length > 0
                    ? Math.round(
                        sessions.reduce((a, b) => a + Number(b.score), 0) / sessions.length
                      )
                    : 0}
                  %
                </Text>
                <Text style={styles.metricLabel}>Avg Score</Text>
              </View>
            </View>
          </View>

          {/* Segmented Tab Selector */}
          <View style={styles.tabSelector}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'evaluations' && styles.tabButtonActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('evaluations');
              }}>
              <MaterialCommunityIcons
                name="sword-cross"
                size={16}
                color={activeTab === 'evaluations' ? '#FFFFFF' : '#4B5563'}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'evaluations' && styles.tabButtonTextActive,
                ]}>
                Practice Evaluations ({sessions.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'journey' && styles.tabButtonActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('journey');
              }}>
              <Ionicons
                name="map"
                size={16}
                color={activeTab === 'journey' ? '#FFFFFF' : '#4B5563'}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'journey' && styles.tabButtonTextActive,
                ]}>
                Journey Map
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: PRACTICE EVALUATIONS */}
          {activeTab === 'evaluations' && (
            <View style={styles.tabContent}>
              {sessions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <MaterialCommunityIcons name="sword" size={36} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No Practice Sessions Yet</Text>
                  <Text style={styles.emptyDesc}>
                    {"This student hasn't recorded any camera strike tests yet. Encourage them in chat to begin practicing!"}
                  </Text>
                </View>
              ) : (
                sessions.map((session) => (
                  <View key={session.id} style={styles.sessionCard}>
                    {/* Session Header */}
                    <View style={styles.sessionHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionStrikeName}>{session.strike_name}</Text>
                        <Text style={styles.sessionDate}>{session.date}</Text>
                      </View>
                      <View
                        style={[
                          styles.sessionScoreBadge,
                          { backgroundColor: getScoreColor(session.score) },
                        ]}>
                        <Text style={styles.sessionScoreText}>{session.score}%</Text>
                        <Text style={styles.sessionGradeText}>Grade {session.grade}</Text>
                      </View>
                    </View>

                    {/* Biomechanical Breakdown */}
                    {session.breakdown && (
                      <View style={styles.breakdownBox}>
                        <Text style={styles.breakdownTitle}>POSTURE & ALIGNMENT METRICS</Text>
                        <View style={styles.breakdownGrid}>
                          {session.breakdown.elbow && (
                            <View style={styles.breakdownItem}>
                              <Text style={styles.breakdownLabel}>Elbow Angle</Text>
                              <Text style={styles.breakdownVal}>
                                {Math.round(session.breakdown.elbow.actual)}° (Ideal:{' '}
                                {session.breakdown.elbow.ideal}°)
                              </Text>
                            </View>
                          )}
                          {session.breakdown.shoulder && (
                            <View style={styles.breakdownItem}>
                              <Text style={styles.breakdownLabel}>Shoulder Angle</Text>
                              <Text style={styles.breakdownVal}>
                                {Math.round(session.breakdown.shoulder.actual)}° (Ideal:{' '}
                                {session.breakdown.shoulder.ideal}°)
                              </Text>
                            </View>
                          )}
                          {session.breakdown.guard && (
                            <View style={styles.breakdownItem}>
                              <Text style={styles.breakdownLabel}>Kalasag Shield</Text>
                              <Text style={styles.breakdownVal}>
                                {session.breakdown.guard.score}%
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Snapshot Photo if available */}
                    {session.snapshot_url && (
                      <View style={styles.mediaBox}>
                        <Text style={styles.mediaLabel}>IMPACT ZONE SNAPSHOT</Text>
                        <Image
                          source={{ uri: session.snapshot_url }}
                          style={styles.snapshotImage}
                          resizeMode="contain"
                        />
                      </View>
                    )}

                    {/* Video Player or Privacy Lock Badge */}
                    {session.is_shared_with_coach && session.video_url ? (
                      <View style={styles.mediaBox}>
                        <View style={styles.videoTitleRow}>
                          <Ionicons name="videocam" size={16} color="#15803D" />
                          <Text style={styles.mediaLabelShared}>STUDENT SHARED VIDEO</Text>
                        </View>
                        <SharedVideoItem videoUrl={session.video_url} />
                      </View>
                    ) : (
                      <View style={styles.videoPrivateRow}>
                        <Ionicons name="lock-closed" size={14} color="#6B7280" />
                        <Text style={styles.videoPrivateText}>
                          Student kept video private on local device
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 2: JOURNEY MAP */}
          {activeTab === 'journey' && (
            <View style={styles.tabContent}>
              <View style={styles.journeyOverviewBox}>
                <Text style={styles.journeyOverviewTitle}>CURRICULUM COMPLETION</Text>
                <Text style={styles.journeyOverviewStat}>
                  {completedLessonCount} of {ALL_CURRICULUM_LESSONS.length} Total Lessons Completed
                </Text>
              </View>

              {ALL_CURRICULUM_LESSONS.map((lesson, idx) => {
                const rec = curriculum.find((c) => c.lesson_id === lesson.id);
                const isMastered = rec?.status === 'mastered' || (rec?.score && rec.score >= 85);
                const isDone = Boolean(rec && rec.status !== 'not_started');

                return (
                  <View key={lesson.id} style={styles.lessonRowCard}>
                    <View
                      style={[
                        styles.lessonIndexBadge,
                        isMastered
                          ? { backgroundColor: '#DCFCE7' }
                          : isDone
                          ? { backgroundColor: '#FEF3C7' }
                          : null,
                      ]}>
                      <Ionicons
                        name={isMastered ? 'checkmark-circle' : isDone ? 'time' : 'ellipse-outline'}
                        size={18}
                        color={isMastered ? '#15803D' : isDone ? '#D97706' : '#9CA3AF'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonRowTitle}>{lesson.title}</Text>
                      <Text style={styles.lessonRowSubtitle}>
                        Level {lesson.levelNumber} · Lesson {lesson.lessonNumber}
                      </Text>
                    </View>

                    {rec ? (
                      <View style={styles.lessonStatusBadge}>
                        <Text style={styles.lessonStatusText}>
                          {rec.score ? `${rec.score}%` : 'Done'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.lessonPendingText}>Not Started</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Release / End Mentorship Section */}
          <View style={styles.dangerZoneBox}>
            {isMentorshipActive && !isReleased ? (
              <TouchableOpacity
                style={styles.releaseStudentFullBtn}
                onPress={handleEndMentorship}
                activeOpacity={0.8}>
                <Ionicons name="person-remove-outline" size={16} color="#DC2626" />
                <Text style={styles.releaseStudentFullBtnText}>End Mentorship & Release Student</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.returnRosterBtn}
                onPress={() => router.replace('/(coach)/roster' as any)}
                activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={16} color="#B45309" />
                <Text style={styles.returnRosterBtnText}>Back to Student Roster</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* Floating Bottom Bar: Direct Chat CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatCTA}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/direct-chat/${id}` as any);
          }}
          activeOpacity={0.88}>
          <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
          <Text style={styles.chatCTAText}>Message {profile?.display_name || 'Student'}</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 17,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
  },
  headerChatBtn: {
    backgroundColor: '#D97706',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 90,
    gap: 16,
  },
  overviewCard: {
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
    gap: 14,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLargeImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  studentNameLarge: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginBottom: 4,
  },
  sashBadge: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  sashBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  studentEmail: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
  },
  messageStudentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
    alignSelf: 'center',
  },
  messageStudentBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricNum: {
    fontSize: 17,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '700',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: MartialTheme.colors.border,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#D97706',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    gap: 14,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  emptyDesc: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    gap: 12,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionStrikeName: {
    fontSize: 16,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
  },
  sessionScoreBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sessionScoreText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sessionGradeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  breakdownBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  breakdownItem: {
    flex: 1,
    minWidth: 100,
  },
  breakdownLabel: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    marginBottom: 2,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  mediaBox: {
    marginTop: 4,
  },
  mediaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  mediaLabelShared: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  videoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  snapshotImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#000000',
  },
  videoPlayerContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  videoPlayer: {
    width: '100%',
    height: 200,
  },
  videoControlsHint: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  videoControlsText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  videoPrivateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  videoPrivateText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  journeyOverviewBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  journeyOverviewTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  journeyOverviewStat: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  lessonRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    gap: 12,
  },
  lessonIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonRowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginBottom: 2,
  },
  lessonRowSubtitle: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
  },
  lessonStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lessonStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  lessonPendingText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
  },
  chatCTA: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#B45309',
    gap: 8,
  },
  chatCTAText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  releaseStudentHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  releaseStudentHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  dangerZoneBox: {
    marginTop: 20,
    marginBottom: 80,
    alignItems: 'center',
  },
  releaseStudentFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  releaseStudentFullBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
  releasedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
    marginBottom: 10,
  },
  releasedBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  releasedBannerDesc: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
  },
  releasedPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  releasedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  returnRosterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    gap: 8,
    width: '100%',
  },
  returnRosterBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
});

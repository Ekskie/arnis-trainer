import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MartialTheme, createShadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  SessionItem,
  getHistory,
  updateSessionSharing,
  bulkSetSessionsSharing,
  getAutoShareCoachPreference,
  setAutoShareCoachPreference,
  getShareTelemetryPreference,
  setShareTelemetryPreference,
} from '@/constants/historyStore';
import { CloudSyncService } from '@/services/cloudSyncService';
import { MentorshipRequest, MentorshipService } from '@/services/mentorshipService';

interface CoachSharedDataModalProps {
  visible: boolean;
  onClose: () => void;
  onSessionsUpdated?: () => void;
}

type FilterTab = 'all' | 'shared' | 'private';

export default function CoachSharedDataModal({
  visible,
  onClose,
  onSessionsUpdated,
}: CoachSharedDataModalProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mentorship, setMentorship] = useState<MentorshipRequest | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [autoShareEnabled, setAutoShareEnabled] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [syncingSessionId, setSyncingSessionId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showTransparencyDetails, setShowTransparencyDetails] = useState(false);

  // Load initial data whenever modal becomes visible
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load preferences
      const [autoShare, telemetry] = await Promise.all([
        getAutoShareCoachPreference(),
        getShareTelemetryPreference(),
      ]);
      setAutoShareEnabled(autoShare);
      setTelemetryEnabled(telemetry);

      // 2. Load mentorship info
      if (user?.id) {
        try {
          const mentorReq = await MentorshipService.getStudentMentorship(user.id);
          setMentorship(mentorReq);
        } catch (e) {
          console.warn('[CoachSharedDataModal] Error fetching mentorship:', e);
        }
      }

      // 3. Load practice sessions
      const loadedSessions = await getHistory(user?.id);
      setSessions(loadedSessions);
    } catch (err) {
      console.warn('[CoachSharedDataModal] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  // Toggle Global Auto-Share
  const handleToggleAutoShare = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAutoShareEnabled(val);
    await setAutoShareCoachPreference(val);
  };

  // Toggle Biomechanical Telemetry
  const handleToggleTelemetry = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTelemetryEnabled(val);
    await setShareTelemetryPreference(val);
  };

  // Toggle Individual Session Sharing
  const handleToggleSession = async (session: SessionItem, newVal: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncingSessionId(session.id);

    // Optimistically update local state
    setSessions((prev) =>
      prev.map((s) => (s.id === session.id ? { ...s, isSharedWithCoach: newVal } : s))
    );

    try {
      // Update local AsyncStorage
      await updateSessionSharing(session.id, newVal, user?.id);

      // Sync to Supabase if signed in
      if (user?.id) {
        await CloudSyncService.updateSessionSharing(user.id, session.id, newVal, session);
      }

      if (onSessionsUpdated) {
        onSessionsUpdated();
      }
    } catch (err) {
      console.error('[CoachSharedDataModal] Toggle session error:', err);
      // Revert on error
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, isSharedWithCoach: !newVal } : s))
      );
      Alert.alert('Update Failed', 'Could not update sharing permissions for this recording.');
    } finally {
      setSyncingSessionId(null);
    }
  };

  // Bulk: Make All Private
  const handleMakeAllPrivate = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Make All Recordings Private?',
      'This will immediately revoke your coach\'s access to all practice videos. Your coach will see a private lock icon.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make All Private',
          style: 'destructive',
          onPress: async () => {
            setIsBulkProcessing(true);
            try {
              // 1. Update local store
              await bulkSetSessionsSharing(user?.id, false);

              // 2. Update Supabase
              if (user?.id) {
                await CloudSyncService.bulkUpdateSharing(user.id, false);
              }

              // 3. Update view
              setSessions((prev) => prev.map((s) => ({ ...s, isSharedWithCoach: false })));

              if (onSessionsUpdated) {
                onSessionsUpdated();
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Privacy Updated', 'All recordings are now private to your device.');
            } catch (e) {
              console.error('[CoachSharedDataModal] Bulk revoke error:', e);
              Alert.alert('Error', 'Failed to update all sessions.');
            } finally {
              setIsBulkProcessing(false);
            }
          },
        },
      ]
    );
  };

  // Bulk: Share All Completed
  const handleShareAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Share All Recordings?',
      'This will authorize your coach to review all recorded practice sessions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share All',
          onPress: async () => {
            setIsBulkProcessing(true);
            try {
              // 1. Update local store
              await bulkSetSessionsSharing(user?.id, true);

              // 2. Update Supabase
              if (user?.id) {
                await CloudSyncService.bulkUpdateSharing(user.id, true);
              }

              // 3. Update view
              setSessions((prev) => prev.map((s) => ({ ...s, isSharedWithCoach: true })));

              if (onSessionsUpdated) {
                onSessionsUpdated();
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Shared with Coach', 'All recorded sessions are now shared with your coach.');
            } catch (e) {
              console.error('[CoachSharedDataModal] Bulk share error:', e);
              Alert.alert('Error', 'Failed to update all sessions.');
            } finally {
              setIsBulkProcessing(false);
            }
          },
        },
      ]
    );
  };

  const sharedCount = sessions.filter((s) => s.isSharedWithCoach).length;
  const privateCount = sessions.length - sharedCount;

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'shared') return Boolean(s.isSharedWithCoach);
    if (filter === 'private') return !s.isSharedWithCoach;
    return true;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.headerBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#15803D" />
                <Text style={styles.headerBadgeText}>STUDENT PRIVACY MANAGER</Text>
              </View>
              <Text style={styles.headerTitle}>Coach Shared Data</Text>
              <Text style={styles.headerSub}>Manage what your Guro coach can view</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={MartialTheme.colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={MartialTheme.colors.primary} />
              <Text style={styles.loadingText}>Loading privacy controls...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {/* Connected Coach Banner */}
              <View style={styles.coachCard}>
                <View style={styles.coachCardHeader}>
                  <View style={styles.coachAvatarBox}>
                    {mentorship?.coach?.avatar_url ? (
                      <Image source={{ uri: mentorship.coach.avatar_url }} style={styles.coachAvatarImg} />
                    ) : (
                      <MaterialCommunityIcons name="shield-account" size={32} color="#D97706" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.coachStatusRow}>
                      <View style={mentorship?.status === 'accepted' ? styles.statusBadgeActive : styles.statusBadgeNone}>
                        <Text style={mentorship?.status === 'accepted' ? styles.statusBadgeActiveText : styles.statusBadgeNoneText}>
                          {mentorship?.status === 'accepted' ? '● MENTORSHIP ACTIVE' : '○ NO ACTIVE COACH'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.coachName}>
                      {mentorship?.coach?.display_name || 'No Coach Connected'}
                    </Text>
                    <Text style={styles.coachRank}>
                      {mentorship?.coach?.rank_sash || 'Settings will apply once coach connects'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.coachCardNote}>
                  {mentorship?.status === 'accepted'
                    ? `Your coach ${mentorship.coach?.display_name} only receives videos and telemetry that you choose to share below.`
                    : 'When you link a coach from Coach Hub, your sharing settings below will determine their access.'}
                </Text>
              </View>

              {/* Quick Stat Tiles */}
              <View style={styles.statGrid}>
                <View style={styles.statTile}>
                  <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="videocam" size={18} color="#15803D" />
                  </View>
                  <Text style={styles.statVal}>{sharedCount}</Text>
                  <Text style={styles.statLbl}>VIDEOS SHARED</Text>
                </View>

                <View style={styles.statTile}>
                  <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="lock-closed" size={18} color="#7C3AED" />
                  </View>
                  <Text style={styles.statVal}>{privateCount}</Text>
                  <Text style={styles.statLbl}>PRIVATE VIDEOS</Text>
                </View>

                <View style={styles.statTile}>
                  <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="analytics" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.statVal}>{telemetryEnabled ? 'Active' : 'Off'}</Text>
                  <Text style={styles.statLbl}>TELEMETRY</Text>
                </View>
              </View>

              {/* What Data is Shared Accordion */}
              <TouchableOpacity
                style={styles.transparencyAccordion}
                activeOpacity={0.8}
                onPress={() => setShowTransparencyDetails(!showTransparencyDetails)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="information-circle" size={20} color={MartialTheme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.transparencyAccordionTitle}>What Data is Shared with Coach?</Text>
                </View>
                <Ionicons
                  name={showTransparencyDetails ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={MartialTheme.colors.textMuted}
                />
              </TouchableOpacity>

              {showTransparencyDetails && (
                <View style={styles.transparencyBox}>
                  <View style={styles.dataCategoryRow}>
                    <Ionicons name="videocam-outline" size={18} color="#2563EB" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.dataCategoryTitle}>Practice Recordings (MP4)</Text>
                      <Text style={styles.dataCategoryDesc}>
                        High-definition camera recording of your practice repetitions. You can toggle each video on/off individually below.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dataCategoryRow}>
                    <Ionicons name="camera-outline" size={18} color="#16A34A" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.dataCategoryTitle}>Impact Zone Snapshots (JPEG)</Text>
                      <Text style={styles.dataCategoryDesc}>
                        Single keyframe photo captured at the exact apex of strike impact to examine body alignment.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dataCategoryRow}>
                    <Ionicons name="body-outline" size={18} color="#9333EA" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.dataCategoryTitle}>4-Pillar Biomechanical Telemetry</Text>
                      <Text style={styles.dataCategoryDesc}>
                        Joint angle measurements (elbow, shoulder, wrist, knee) and motor precision scores across Striking Arm, Kalasag Guard, Tindig Stance, and Pitik Snap.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dataCategoryRow}>
                    <Ionicons name="ribbon-outline" size={18} color="#D97706" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.dataCategoryTitle}>Curriculum Journey Milestones</Text>
                      <Text style={styles.dataCategoryDesc}>
                        Completed lessons, quiz certifications, and official Arnis syllabus progression status.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Global Preferences Section */}
              <Text style={styles.sectionHeader}>GLOBAL SHARING PREFERENCES</Text>
              <View style={styles.prefsCard}>
                {/* Auto-share switch */}
                <View style={styles.prefRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.prefTitle}>Auto-Share Future Practice Videos</Text>
                    <Text style={styles.prefDesc}>
                      Automatically allow your coach to review new practice recordings immediately after completion.
                    </Text>
                  </View>
                  <Switch
                    value={autoShareEnabled}
                    onValueChange={handleToggleAutoShare}
                    trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                    thumbColor={autoShareEnabled ? '#16A34A' : '#94A3B8'}
                  />
                </View>

                <View style={styles.prefDivider} />

                {/* Telemetry switch */}
                <View style={styles.prefRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.prefTitle}>Share Posture Telemetry</Text>
                    <Text style={styles.prefDesc}>
                      Allow coach to inspect 4-pillar angular breakdowns (Striking Arm, Guard, Stance, Wrist Snap).
                    </Text>
                  </View>
                  <Switch
                    value={telemetryEnabled}
                    onValueChange={handleToggleTelemetry}
                    trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                    thumbColor={telemetryEnabled ? '#2563EB' : '#94A3B8'}
                  />
                </View>
              </View>

              {/* Quick Action Bulk Buttons */}
              <View style={styles.bulkActionRow}>
                <TouchableOpacity
                  style={styles.bulkBtnPrivate}
                  onPress={handleMakeAllPrivate}
                  disabled={isBulkProcessing || sharedCount === 0}
                  activeOpacity={0.75}>
                  <Ionicons name="lock-closed" size={14} color="#DC2626" />
                  <Text style={styles.bulkBtnPrivateText}>Make All Private</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bulkBtnShare}
                  onPress={handleShareAll}
                  disabled={isBulkProcessing || privateCount === 0}
                  activeOpacity={0.75}>
                  <Ionicons name="checkmark-done" size={15} color="#15803D" />
                  <Text style={styles.bulkBtnShareText}>Share All</Text>
                </TouchableOpacity>
              </View>

              {/* Recorded Practice Sessions Header & Filter */}
              <View style={styles.sessionHeaderRow}>
                <View>
                  <Text style={styles.sectionHeader}>RECORDED SESSIONS ({sessions.length})</Text>
                  <Text style={styles.sessionSub}>Toggle coach access individually per attempt</Text>
                </View>
              </View>

              {/* Filter Pills */}
              <View style={styles.filterPillsRow}>
                <TouchableOpacity
                  style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
                  onPress={() => setFilter('all')}>
                  <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>
                    All ({sessions.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, filter === 'shared' && styles.filterPillActive]}
                  onPress={() => setFilter('shared')}>
                  <Text style={[styles.filterPillText, filter === 'shared' && styles.filterPillTextActive]}>
                    Shared ({sharedCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, filter === 'private' && styles.filterPillActive]}
                  onPress={() => setFilter('private')}>
                  <Text style={[styles.filterPillText, filter === 'private' && styles.filterPillTextActive]}>
                    Private ({privateCount})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sessions List */}
              {filteredSessions.length === 0 ? (
                <View style={styles.emptySessionsCard}>
                  <Ionicons name="videocam-off-outline" size={32} color="#94A3B8" />
                  <Text style={styles.emptySessionsTitle}>No recordings found</Text>
                  <Text style={styles.emptySessionsDesc}>
                    {filter === 'shared'
                      ? 'You have not shared any practice recordings with your coach yet.'
                      : filter === 'private'
                      ? 'No private recordings found. All sessions are shared!'
                      : 'Complete a practice drill to record your strike attempts.'}
                  </Text>
                </View>
              ) : (
                filteredSessions.map((item) => {
                  const isShared = Boolean(item.isSharedWithCoach);
                  const isSyncing = syncingSessionId === item.id;
                  const hasVideo = Boolean(item.userVideoUri || item.replayVideoBase64);

                  return (
                    <View key={item.id} style={styles.sessionCard}>
                      <View style={styles.sessionCardTop}>
                        {/* Strike Icon or Thumbnail */}
                        <View
                          style={[
                            styles.sessionThumbBox,
                            { backgroundColor: isShared ? '#DCFCE7' : '#F1F5F9' },
                          ]}>
                          <MaterialCommunityIcons
                            name={item.routineId ? 'sword-cross' : 'sword'}
                            size={20}
                            color={isShared ? '#15803D' : '#64748B'}
                          />
                        </View>

                        <View style={{ flex: 1, marginHorizontal: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.sessionTitle} numberOfLines={1}>
                              {item.strikeName}
                            </Text>
                            {item.routineId && (
                              <View style={styles.anyoBadge}>
                                <Text style={styles.anyoBadgeText}>ANYO</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.sessionDate}>{item.date}</Text>
                        </View>

                        {/* Score & Grade */}
                        <View style={styles.scorePill}>
                          <Text style={styles.scorePillText}>{item.score}%</Text>
                          <Text style={styles.scoreGradeText}>{item.grade}</Text>
                        </View>
                      </View>

                      {/* Divider */}
                      <View style={styles.sessionCardDivider} />

                      {/* Sharing Status & Instant Switch */}
                      <View style={styles.sessionActionRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          {isShared ? (
                            <View style={styles.sharedBadge}>
                              <Ionicons name="checkmark-circle" size={13} color="#15803D" />
                              <Text style={styles.sharedBadgeText}>Shared with Coach</Text>
                            </View>
                          ) : (
                            <View style={styles.privateBadge}>
                              <Ionicons name="lock-closed" size={12} color="#64748B" />
                              <Text style={styles.privateBadgeText}>Private (Device Only)</Text>
                            </View>
                          )}

                          {hasVideo && (
                            <View style={styles.hasVideoTag}>
                              <Ionicons name="videocam" size={10} color="#2563EB" />
                              <Text style={styles.hasVideoTagText}>Video</Text>
                            </View>
                          )}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {isSyncing && (
                            <ActivityIndicator
                              size="small"
                              color={MartialTheme.colors.primary}
                              style={{ marginRight: 8 }}
                            />
                          )}
                          <Switch
                            value={isShared}
                            onValueChange={(val) => handleToggleSession(item, val)}
                            trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                            thumbColor={isShared ? '#16A34A' : '#94A3B8'}
                            disabled={isSyncing || isBulkProcessing}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: MartialTheme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
    ...createShadow({ color: '#000000', offset: { width: 0, height: -4 }, opacity: 0.25, radius: 12, elevation: 10 }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  headerSub: {
    fontSize: 12,
    color: MartialTheme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: MartialTheme.colors.textMuted,
    fontWeight: '600',
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 30,
  },
  coachCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  coachCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#D97706',
  },
  coachAvatarImg: {
    width: '100%',
    height: '100%',
  },
  coachStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  statusBadgeActiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  statusBadgeNone: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  statusBadgeNoneText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  coachName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78350F',
  },
  coachRank: {
    fontSize: 12,
    color: '#92400E',
  },
  coachCardNote: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 8,
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
    paddingTop: 6,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  statLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  transparencyAccordion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  transparencyAccordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.text,
  },
  transparencyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  dataCategoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dataCategoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: MartialTheme.colors.text,
  },
  dataCategoryDesc: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    lineHeight: 15,
    marginTop: 1,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  sessionSub: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    marginTop: -4,
    marginBottom: 8,
  },
  prefsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.text,
  },
  prefDesc: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    lineHeight: 15,
    marginTop: 2,
  },
  prefDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  bulkActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  bulkBtnPrivate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bulkBtnPrivateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  bulkBtnShare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  bulkBtnShareText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: MartialTheme.colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: MartialTheme.colors.textMuted,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptySessionsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  emptySessionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: MartialTheme.colors.text,
    marginTop: 8,
  },
  emptySessionsDesc: {
    fontSize: 12,
    color: MartialTheme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 4,
    lineHeight: 16,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionThumbBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.text,
  },
  anyoBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  anyoBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  sessionDate: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    marginTop: 1,
  },
  scorePill: {
    alignItems: 'flex-end',
  },
  scorePillText: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.primary,
  },
  scoreGradeText: {
    fontSize: 10,
    fontWeight: '600',
    color: MartialTheme.colors.textMuted,
  },
  sessionCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  sessionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sharedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  privateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  hasVideoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  hasVideoTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});

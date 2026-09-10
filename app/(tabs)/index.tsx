import { AppTutorialModal } from '@/components/AppTutorialModal';
import {
  getHistory,
  getStrikeMasteryStats,
  MasteryStats,
  SessionItem,
  StrikeMasteryItem,
} from '@/constants/historyStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TUTORIAL_STORAGE_KEY = '@arnis_tutorial_seen_v1';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const [lastSession, setLastSession] = useState<SessionItem | null>(null);
  const [masteryStats, setMasteryStats] = useState<MasteryStats>(() => getStrikeMasteryStats([]));
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Check if first-time user to automatically prompt the interactive tutorial
  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_STORAGE_KEY).then((seen) => {
      if (!seen) {
        const timer = setTimeout(() => {
          setShowTutorialModal(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  // Fetch the latest session and mastery stats when the dashboard comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      getHistory().then((history) => {
        if (isMounted && history) {
          if (history.length > 0) {
            setLastSession(history[0]);
          } else {
            setLastSession(null);
          }
          setMasteryStats(getStrikeMasteryStats(history));
        }
      });
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#10B981'; // Green
    if (score >= 85) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Orange
    if (score > 0) return '#EF4444'; // Red
    return '#475569'; // Muted
  };

  // Smart training recommendation based on weakest strike or next unattempted strike
  const recommendedStrike: StrikeMasteryItem | undefined = useMemo(() => {
    if (masteryStats.weakestStrike && masteryStats.weakestStrike.bestScore < 85) {
      return masteryStats.weakestStrike;
    }
    const unattempted = masteryStats.strikes.find((s) => s.attempts === 0);
    if (unattempted) {
      return unattempted;
    }
    return masteryStats.strikes[0];
  }, [masteryStats]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/favicon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>POSEFIX-ARNIS</Text>
            <Text style={styles.headerSubtitle}>Real-time AI Form Coach</Text>
          </View>
        </View>

        {/* Tutorial / Help Demo Trigger Button */}
        <TouchableOpacity
          style={styles.headerTutorialBtn}
          activeOpacity={0.8}
          onPress={() => setShowTutorialModal(true)}
        >
          <Ionicons name="help-circle-outline" size={16} color="#F59E0B" style={{ marginRight: 4 }} />
          <Text style={styles.headerTutorialBtnText}>Guide</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* FOCUS BLOCK 1: HERO DAILY ACTION CARD */}
        <View style={styles.heroCard}>
          {/* Top meta row: Rank Title & Mastery Badge */}
          <View style={styles.heroTopRow}>
            <View style={styles.rankPill}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#F59E0B" style={{ marginRight: 5 }} />
              <Text style={styles.rankPillText} numberOfLines={1}>
                {masteryStats.rankTitle}
              </Text>
            </View>
            <View style={styles.masteryPill}>
              <Text style={styles.masteryPillText}>
                {masteryStats.overallMastery}% Mastery
              </Text>
            </View>
          </View>

          {/* Recommended Strike / Training Focus */}
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationLabel}>
              {masteryStats.totalSessions === 0 ? 'RECOMMENDED FIRST STRIKE' : 'DAILY PRACTICE FOCUS'}
            </Text>
            <Text style={styles.recommendationTitle}>
              {recommendedStrike ? `${recommendedStrike.name} · ${recommendedStrike.target}` : 'Strike 1 · Left Temple'}
            </Text>
            <Text style={styles.recommendationSub}>
              {recommendedStrike && recommendedStrike.attempts > 0
                ? `Current Best: ${recommendedStrike.bestScore}% (${recommendedStrike.grade}) · Focus on clean elbow and wrist alignment.`
                : 'Perform your first evaluation to capture real-time biomechanical angles and form scoring.'}
            </Text>
          </View>

          {/* Primary & Secondary Action CTAs */}
          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/evaluate',
                  params: { strikeId: recommendedStrike ? recommendedStrike.id : 'strike_1' },
                })
              }
            >
              <MaterialCommunityIcons name="target" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionButtonText}>
                {masteryStats.totalSessions === 0 ? 'Start First Check' : 'Start Practice'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              activeOpacity={0.8}
              onPress={() => router.push('/explore')}
            >
              <Ionicons name="book-outline" size={16} color="#CBD5E1" style={{ marginRight: 6 }} />
              <Text style={styles.secondaryActionButtonText}>Lessons</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FOCUS BLOCK 2: RECENT EVALUATION SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>RECENT EVALUATION</Text>
          {lastSession && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/history')}
            >
              <Text style={styles.sectionHeaderLink}>Full History →</Text>
            </TouchableOpacity>
          )}
        </View>

        {lastSession ? (
          <TouchableOpacity
            style={styles.lastSessionCard}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/evaluate',
                params: { strikeId: lastSession.strikeId },
              })
            }
          >
            <View
              style={[
                styles.scoreCircle,
                { borderColor: getScoreColor(lastSession.score) },
              ]}
            >
              <Text style={styles.scoreText}>{lastSession.score}</Text>
              <Text style={styles.scoreUnit}>%</Text>
            </View>

            <View style={styles.sessionDetails}>
              <View style={styles.sessionTitleRow}>
                <Text style={styles.sessionTitle}>{lastSession.strikeName}</Text>
                <View
                  style={[
                    styles.gradePill,
                    { backgroundColor: getScoreColor(lastSession.score) + '22' },
                  ]}
                >
                  <Text
                    style={[
                      styles.gradeText,
                      { color: getScoreColor(lastSession.score) },
                    ]}
                  >
                    {lastSession.grade}
                  </Text>
                </View>
              </View>
              <Text style={styles.sessionSub} numberOfLines={1}>
                {lastSession.description}
              </Text>
              <Text style={styles.sessionDate}>
                {lastSession.date ? lastSession.date.split(' · ')[0] : 'Recent'}
              </Text>
            </View>

            <View style={styles.retryBtn}>
              <Ionicons name="refresh" size={15} color="#94A3B8" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptySessionCard}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="target-variant" size={24} color="#64748B" />
            </View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.emptyTitle}>No evaluations recorded yet</Text>
              <Text style={styles.emptySub}>
                Position your phone camera and execute strikes with real-time pose tracking.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push('/evaluate')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>Try Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* FOCUS BLOCK 3: 12 STRIKES MASTERY SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>12 STRIKES MASTERY</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/history')}
          >
            <Text style={styles.sectionHeaderLink}>Full Radar →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.masterySummaryCard}>
          {/* Progress bar */}
          <View style={styles.masteryProgressWrapper}>
            <View style={styles.masteryProgressHeader}>
              <Text style={styles.masteryProgressLabel}>Mastery Level</Text>
              <Text style={styles.masteryProgressCount}>
                <Text style={styles.masteryProgressHighlight}>{masteryStats.masteredCount}</Text> of 12 Mastered (≥85%)
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(3, masteryStats.overallMastery)}%` },
                ]}
              />
            </View>
          </View>

          {/* 12 Strikes Matrix Grid (Interactive strike chip selector) */}
          <View style={styles.strikeChipsContainer}>
            <Text style={styles.strikeChipsLabel}>TAP A STRIKE TO TRAIN</Text>
            <View style={styles.strikeChipsGrid}>
              {masteryStats.strikes.map((st) => {
                const scoreColor = getScoreColor(st.bestScore);
                const hasScore = st.bestScore > 0;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[
                      styles.strikeChip,
                      hasScore && {
                        borderColor: scoreColor + '60',
                        backgroundColor: scoreColor + '15',
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/evaluate',
                        params: { strikeId: st.id },
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.strikeChipNum,
                        hasScore ? { color: scoreColor } : { color: '#64748B' },
                      ]}
                    >
                      S{st.strikeNumber}
                    </Text>
                    {hasScore && (
                      <View style={[styles.strikeChipDot, { backgroundColor: scoreColor }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Strengths & Focus Areas */}
          <View style={styles.highlightsRow}>
            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>STRONGEST</Text>
              <Text style={styles.highlightValue} numberOfLines={1}>
                {masteryStats.strongestStrike
                  ? `${masteryStats.strongestStrike.name} (${masteryStats.strongestStrike.bestScore}%)`
                  : '—'}
              </Text>
            </View>

            <View style={styles.highlightDivider} />

            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>FOCUS AREA</Text>
              <Text style={styles.highlightValue} numberOfLines={1}>
                {masteryStats.weakestStrike
                  ? `${masteryStats.weakestStrike.name} (${masteryStats.weakestStrike.bestScore}%)`
                  : 'Strike 1'}
              </Text>
            </View>
          </View>

          {/* Action Link to Full Radar Analytics in History */}
          <TouchableOpacity
            style={styles.viewRadarBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/history')}
          >
            <MaterialCommunityIcons name="spider-web" size={16} color="#D24B38" style={{ marginRight: 6 }} />
            <Text style={styles.viewRadarBtnText}>Open 12-Axis Radar & Biomechanics</Text>
            <Ionicons name="arrow-forward" size={14} color="#D24B38" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Interactive App Demo Tutorial Walkthrough Modal */}
      <AppTutorialModal
        visible={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
        onNavigateToPractice={(strikeId) => {
          router.push({
            pathname: '/evaluate',
            params: { strikeId: strikeId || 'strike_1' },
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1020',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTutorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTutorialBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  logoContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // HERO CARD
  heroCard: {
    borderRadius: 18,
    backgroundColor: '#161930',
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#232A46',
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E243D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    flexShrink: 1,
    marginRight: 8,
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  masteryPill: {
    backgroundColor: '#D24B3820',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D24B3840',
  },
  masteryPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B57',
    letterSpacing: 0.4,
  },
  recommendationBox: {
    marginBottom: 18,
  },
  recommendationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  recommendationTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  recommendationSub: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#D24B38',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryActionButtonText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 13,
  },

  // SECTION HEADERS
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.4,
  },
  sectionHeaderLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },

  // LAST SESSION
  lastSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3.5,
    backgroundColor: '#121426',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  scoreUnit: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: -2,
  },
  sessionDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gradePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sessionSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 3,
  },
  sessionDate: {
    fontSize: 11,
    color: '#64748B',
  },
  retryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E243D',
  },
  retryBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },

  // EMPTY SESSION CARD
  emptySessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 24,
  },
  emptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E243D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  emptyActionBtn: {
    backgroundColor: '#D24B38',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // MASTERY SUMMARY CARD
  masterySummaryCard: {
    backgroundColor: '#161930',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  masteryProgressWrapper: {
    marginBottom: 16,
  },
  masteryProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  masteryProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  masteryProgressCount: {
    fontSize: 11,
    color: '#94A3B8',
  },
  masteryProgressHighlight: {
    color: '#10B981',
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E243D',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#D24B38',
  },

  // STRIKE CHIPS
  strikeChipsContainer: {
    marginBottom: 16,
  },
  strikeChipsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  strikeChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  strikeChip: {
    width: (width - 32 - 36 - 40) / 6, // 6 chips per row cleanly fitting screen
    minWidth: 42,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1A1E38',
    borderWidth: 1,
    borderColor: '#242B4C',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  strikeChipNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  strikeChipDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // HIGHLIGHTS ROW
  highlightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121428',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1C213E',
  },
  highlightItem: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 2,
  },
  highlightValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  highlightDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#242B4C',
    marginHorizontal: 12,
  },

  // VIEW RADAR BTN
  viewRadarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#D24B3815',
    borderWidth: 1,
    borderColor: '#D24B3840',
  },
  viewRadarBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B57',
  },
});

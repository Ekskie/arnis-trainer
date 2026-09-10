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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { AppTutorialModal } from '@/components/AppTutorialModal';
import { TechniqueLessonModal } from '@/components/TechniqueLessonModal';
import { TodaysTrainingModal } from '@/components/TodaysTrainingModal';
import { WhyFailedModal } from '@/components/WhyFailedModal';
import { SafetyCheckModal } from '@/components/SafetyCheckModal';
import {
  ALL_CURRICULUM_LESSONS,
  CurriculumLesson,
  CurriculumProgress,
  getCurriculumProgress,
} from '@/constants/curriculumStore';
import {
  getHistory,
  getStrikeMasteryStats,
  MasteryStats,
  SessionItem,
  StrikeMasteryItem,
} from '@/constants/historyStore';

const { width } = Dimensions.get('window');
const TUTORIAL_STORAGE_KEY = '@arnis_tutorial_seen_v1';

export default function HomeDashboardScreen() {
  const router = useRouter();

  const [lastSession, setLastSession] = useState<SessionItem | null>(null);
  const [masteryStats, setMasteryStats] = useState<MasteryStats>(() => getStrikeMasteryStats([]));
  const [curriculumProgress, setCurriculumProgress] = useState<CurriculumProgress>({
    completedLessonIds: [],
    currentLessonId: 'les_0_1',
    totalLessons: ALL_CURRICULUM_LESSONS.length,
    completedCount: 0,
    progressPercentage: 0,
  });

  // Modal States
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showTodaysTrainingModal, setShowTodaysTrainingModal] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyTargetRoute, setSafetyTargetRoute] = useState<{ pathname: string; params?: any } | null>(null);

  // Technique Lesson Modal (triggered when tapping Continue Training or strike card)
  const [selectedLesson, setSelectedLesson] = useState<CurriculumLesson | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // First-time user tutorial prompt
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

  // Refresh progress and history on screen focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      getHistory().then((history) => {
        if (isMounted) {
          if (history && history.length > 0) {
            setLastSession(history[0]);
          } else {
            setLastSession(null);
          }
          setMasteryStats(getStrikeMasteryStats(history || []));
        }
      });

      getCurriculumProgress().then((prog) => {
        if (isMounted) {
          setCurriculumProgress(prog);
        }
      });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Identify next lesson for the CONTINUE TRAINING hero button
  const continueLesson: CurriculumLesson = useMemo(() => {
    const found = ALL_CURRICULUM_LESSONS.find(l => l.id === curriculumProgress.currentLessonId);
    return found || ALL_CURRICULUM_LESSONS[0];
  }, [curriculumProgress]);

  // Index number of current lesson
  const currentLessonIndex = useMemo(() => {
    const idx = ALL_CURRICULUM_LESSONS.findIndex(l => l.id === continueLesson.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [continueLesson]);

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#10B981'; // Green
    if (score >= 85) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Orange
    if (score > 0) return '#EF4444'; // Red
    return '#475569';
  };

  const handleContinueTrainingPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedLesson(continueLesson);
    setShowLessonModal(true);
  };

  const handleOpenStrikeLesson = (strikeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lesson = ALL_CURRICULUM_LESSONS.find(l => l.strikeKey === strikeId || l.id === strikeId);
    if (lesson) {
      setSelectedLesson(lesson);
      setShowLessonModal(true);
    } else {
      router.push({
        pathname: '/evaluate',
        params: { strikeId },
      });
    }
  };

  const handleSafeNavigation = (pathname: any, params?: any) => {
    // Prompt safety checklist before entering camera training
    if (pathname === '/evaluate') {
      setSafetyTargetRoute({ pathname, params });
      setShowSafetyModal(true);
    } else {
      router.push({ pathname, params });
    }
  };

  const confirmSafetyAndProceed = () => {
    setShowSafetyModal(false);
    if (safetyTargetRoute) {
      router.push(safetyTargetRoute as any);
      setSafetyTargetRoute(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top App Header */}
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
            <Text style={styles.headerTitle}>🥋 ARNIS TRAINER</Text>
            <Text style={styles.headerSubtitle}>Digital Filipino Martial Arts Academy</Text>
          </View>
        </View>

        {/* Header Action Buttons: Ask Coach & Guide */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.coachHeaderBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/chat')}
          >
            <MaterialCommunityIcons name="chat-question" size={16} color="#38BDF8" style={{ marginRight: 4 }} />
            <Text style={styles.coachHeaderBtnText}>Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guideHeaderBtn}
            activeOpacity={0.8}
            onPress={() => setShowTutorialModal(true)}
          >
            <Ionicons name="help-circle-outline" size={16} color="#F59E0B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* PERSONALIZED GREETING & WHAT SHOULD I DO NOW? */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>{greeting}, Dennrick!</Text>
          <Text style={styles.greetingSub}>
            Here is your next lesson in the curriculum.
          </Text>
        </View>

        {/* TOP HERO: WHAT SHOULD I DO NOW? */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.trainingTag}>
              <MaterialCommunityIcons name="compass" size={13} color="#D24B38" style={{ marginRight: 4 }} />
              <Text style={styles.trainingTagText}>WHAT SHOULD I DO NOW?</Text>
            </View>

            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>
                {curriculumProgress.progressPercentage}% Complete
              </Text>
            </View>
          </View>

          {/* Current Level & Lesson Number */}
          <View style={styles.currentLevelInfo}>
            <Text style={styles.currentLevelName}>
              {continueLesson.levelNumber === 0
                ? 'LEVEL 0 — ORIENTATION'
                : continueLesson.levelNumber === 1
                ? 'LEVEL 1 — FUNDAMENTALS'
                : continueLesson.levelNumber === 2
                ? 'LEVEL 2 — THE 12 STRIKES'
                : continueLesson.levelNumber === 3
                ? 'LEVEL 3 — COMBINATIONS & DRILLS'
                : 'LEVEL 4 — ASSESSMENT'}
            </Text>
            <Text style={styles.currentLessonNumber}>
              Lesson {currentLessonIndex} of {curriculumProgress.totalLessons} · {continueLesson.durationMinutes} min
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(5, curriculumProgress.progressPercentage)}%` },
                ]}
              />
            </View>
          </View>

          {/* Prominent START / CONTINUE LESSON Button */}
          <TouchableOpacity
            style={styles.continueTrainingBtn}
            activeOpacity={0.85}
            onPress={handleContinueTrainingPress}
          >
            <View style={styles.continueBtnLeft}>
              <View style={styles.playIconBox}>
                <Ionicons name="play" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.continueBtnLabel}>
                  {curriculumProgress.completedLessonIds.includes(continueLesson.id)
                    ? 'REVIEW LESSON'
                    : 'CONTINUE LESSON'}
                </Text>
                <Text style={styles.continueBtnLessonTitle} numberOfLines={1}>
                  {continueLesson.title}
                </Text>
                <Text style={styles.continueBtnSubtitle} numberOfLines={1}>
                  {continueLesson.beginnerSummary || continueLesson.subtitle}
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          {/* Today's Goal Row */}
          <View style={styles.heroGoalRow}>
            <Ionicons name="flag-outline" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.heroGoalText} numberOfLines={1}>
              <Text style={{ fontWeight: 'bold', color: '#F59E0B' }}>Today&apos;s Goal: </Text>
              {continueLesson.purpose || continueLesson.beginnerSummary || continueLesson.title}
            </Text>
          </View>
        </View>

        {/* 4 CORE NAVIGATION ACTION LAUNCHERS */}
        <View style={styles.navGrid}>
          {/* 1. Learn */}
          <TouchableOpacity
            style={styles.navCard}
            activeOpacity={0.8}
            onPress={() => router.push('/explore')}
          >
            <View style={[styles.navIconBox, { backgroundColor: '#3B82F620', borderColor: '#3B82F650' }]}>
              <MaterialCommunityIcons name="book-education" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.navCardTitle}>Learn</Text>
            <Text style={styles.navCardSub}>All Lessons</Text>
          </TouchableOpacity>

          {/* 2. Practice */}
          <TouchableOpacity
            style={styles.navCard}
            activeOpacity={0.8}
            onPress={() => handleSafeNavigation('/evaluate', { mode: 'guided' })}
          >
            <View style={[styles.navIconBox, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B50' }]}>
              <MaterialCommunityIcons name="karate" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.navCardTitle}>Practice</Text>
            <Text style={styles.navCardSub}>Guided Coach</Text>
          </TouchableOpacity>

          {/* 3. Evaluate */}
          <TouchableOpacity
            style={styles.navCard}
            activeOpacity={0.8}
            onPress={() => handleSafeNavigation('/evaluate', { mode: 'test' })}
          >
            <View style={[styles.navIconBox, { backgroundColor: '#D24B3820', borderColor: '#D24B3850' }]}>
              <MaterialCommunityIcons name="camera-iris" size={24} color="#D24B38" />
            </View>
            <Text style={styles.navCardTitle}>Evaluate</Text>
            <Text style={styles.navCardSub}>Camera AI</Text>
          </TouchableOpacity>

          {/* 4. Progress */}
          <TouchableOpacity
            style={styles.navCard}
            activeOpacity={0.8}
            onPress={() => router.push('/history')}
          >
            <View style={[styles.navIconBox, { backgroundColor: '#10B98120', borderColor: '#10B98150' }]}>
              <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={24} color="#10B981" />
            </View>
            <Text style={styles.navCardTitle}>Progress</Text>
            <Text style={styles.navCardSub}>Scores & Radar</Text>
          </TouchableOpacity>
        </View>

        {/* TODAY'S TRAINING MICRO-SESSION CARD */}
        <View style={styles.todaysTrainingCard}>
          <View style={styles.todaysHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.fireIconCircle}>
                <Ionicons name="flame" size={18} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.todaysTitle}>TODAY&apos;S TRAINING</Text>
                <Text style={styles.todaysSubtitle}>🔥 10–15 min daily micro-workout</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.startTodaysBtn}
              activeOpacity={0.85}
              onPress={() => setShowTodaysTrainingModal(true)}
            >
              <Text style={styles.startTodaysBtnText}>START</Text>
              <Ionicons name="play" size={13} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          {/* Micro Routine Steps List */}
          <View style={styles.todaysStepsList}>
            <View style={styles.todaysStepItem}>
              <Text style={styles.stepBullet}>1.</Text>
              <Text style={styles.stepItemName}>Stance Drill</Text>
              <Text style={styles.stepItemTime}>2 min</Text>
            </View>
            <View style={styles.todaysStepItem}>
              <Text style={styles.stepBullet}>2.</Text>
              <Text style={styles.stepItemName}>Grip & Guard</Text>
              <Text style={styles.stepItemTime}>2 min</Text>
            </View>
            <View style={styles.todaysStepItem}>
              <Text style={styles.stepBullet}>3.</Text>
              <Text style={styles.stepItemName}>Strike 1 Practice</Text>
              <Text style={styles.stepItemTime}>3 min</Text>
            </View>
            <View style={styles.todaysStepItem}>
              <Text style={styles.stepBullet}>4.</Text>
              <Text style={styles.stepItemName}>Strike 2 Practice</Text>
              <Text style={styles.stepItemTime}>3 min</Text>
            </View>
            <View style={styles.todaysStepItem}>
              <Text style={styles.stepBullet}>5.</Text>
              <Text style={styles.stepItemName}>AI Quick Test</Text>
              <Text style={styles.stepItemTime}>2 min</Text>
            </View>
          </View>
        </View>

        {/* RECENT EVALUATION SECTION WITH "WHY?" BUTTON */}
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
          <View style={styles.lastSessionCard}>
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

            {/* Diagnostic Action: "Why?" button & Retry */}
            <View style={styles.sessionActionsColumn}>
              <TouchableOpacity
                style={styles.whyBtn}
                onPress={() => setShowWhyModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="help-circle" size={14} color="#38BDF8" style={{ marginRight: 3 }} />
                <Text style={styles.whyBtnText}>Why?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() =>
                  handleSafeNavigation('/evaluate', { strikeId: lastSession.strikeId })
                }
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={13} color="#94A3B8" />
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptySessionCard}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="target-variant" size={24} color="#64748B" />
            </View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.emptyTitle}>No evaluations recorded yet</Text>
              <Text style={styles.emptySub}>
                Set up your camera and perform your first strike check to establish your baseline.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => handleSafeNavigation('/evaluate')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>Try Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 12 STRIKES MASTERY MATRIX */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>12 CANONICAL STRIKES</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/explore')}
          >
            <Text style={styles.sectionHeaderLink}>Curriculum →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.masterySummaryCard}>
          <View style={styles.masteryProgressHeader}>
            <Text style={styles.masteryProgressLabel}>Technique Mastery</Text>
            <Text style={styles.masteryProgressCount}>
              <Text style={styles.masteryProgressHighlight}>{masteryStats.masteredCount}</Text> of 12 Mastered (≥85%)
            </Text>
          </View>

          {/* Interactive Chips */}
          <View style={styles.strikeChipsGrid}>
            {masteryStats.strikes.map((st) => {
              const scoreColor = getScoreColor(st.bestScore);
              const hasScore = st.bestScore > 0;
              const isMastered = st.isMastered;

              return (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.strikeChip,
                    hasScore && {
                      borderColor: scoreColor + '60',
                      backgroundColor: scoreColor + '15',
                    },
                    isMastered && {
                      borderColor: '#10B981',
                      backgroundColor: '#10B98120',
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleOpenStrikeLesson(st.id)}
                >
                  <Text
                    style={[
                      styles.strikeChipNum,
                      hasScore ? { color: scoreColor } : { color: '#64748B' },
                      isMastered && { color: '#10B981', fontWeight: '900' },
                    ]}
                  >
                    {isMastered ? `✓ S${st.strikeNumber}` : `S${st.strikeNumber}`}
                  </Text>
                  {hasScore && !isMastered && (
                    <View style={[styles.strikeChipDot, { backgroundColor: scoreColor }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom Link to Progress */}
          <TouchableOpacity
            style={styles.viewRadarBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/history')}
          >
            <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={16} color="#D24B38" style={{ marginRight: 6 }} />
            <Text style={styles.viewRadarBtnText}>See My Progress & Technique Breakdown</Text>
            <Ionicons name="arrow-forward" size={14} color="#D24B38" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL 1: Technique Lesson (What, Why, Video Demo, Coach Steps, Try It) */}
      <TechniqueLessonModal
        visible={showLessonModal}
        lesson={selectedLesson}
        onClose={() => setShowLessonModal(false)}
        onStartMode={(mode, strikeId) => {
          handleSafeNavigation('/evaluate', { strikeId, mode });
        }}
        bestScore={
          masteryStats.strikes.find(s => s.id === selectedLesson?.strikeKey)?.bestScore || 0
        }
        grade={
          masteryStats.strikes.find(s => s.id === selectedLesson?.strikeKey)?.grade || 'Unranked'
        }
      />

      {/* MODAL 2: Today's Training Micro-Workout Runner */}
      <TodaysTrainingModal
        visible={showTodaysTrainingModal}
        onClose={() => setShowTodaysTrainingModal(false)}
        onStartCameraTest={(strikeId) => {
          handleSafeNavigation('/evaluate', { strikeId, mode: 'test' });
        }}
      />

      {/* MODAL 3: Why Did I Get X%? Diagnostic Breakdown */}
      {lastSession && (
        <WhyFailedModal
          visible={showWhyModal}
          onClose={() => setShowWhyModal(false)}
          overallScore={lastSession.score}
          grade={lastSession.grade}
          strikeName={lastSession.strikeName}
          strikeId={lastSession.strikeId}
          breakdown={{
            elbowScore: lastSession.breakdown?.elbow?.score,
            bodyScore: lastSession.breakdown?.stance?.score || lastSession.breakdown?.knee?.score,
            guardScore: lastSession.breakdown?.guard?.score,
            wristScore: lastSession.breakdown?.wrist?.score,
          }}
          onPracticeLesson={(lessonId) => {
            const l = ALL_CURRICULUM_LESSONS.find(item => item.id === lessonId || item.strikeKey === lessonId);
            if (l) {
              setSelectedLesson(l);
              setShowLessonModal(true);
            } else {
              handleSafeNavigation('/evaluate', { strikeId: lessonId });
            }
          }}
        />
      )}

      {/* MODAL 4: Safety Checklist Before Camera Evaluation */}
      <SafetyCheckModal
        visible={showSafetyModal}
        onDismiss={() => setShowSafetyModal(false)}
        onConfirm={confirmSafetyAndProceed}
        title="BEFORE YOU START"
        strikeName={continueLesson.title}
      />

      {/* MODAL 5: Interactive App Guide Walkthrough */}
      <AppTutorialModal
        visible={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
        onNavigateToPractice={(strikeId) => {
          handleSafeNavigation('/evaluate', { strikeId: strikeId || 'strike_1' });
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1020',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  logoImage: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C720',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#38BDF850',
  },
  coachHeaderBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  guideHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // GREETING
  greetingContainer: {
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  greetingSub: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 17,
  },

  // HERO CARD
  heroCard: {
    borderRadius: 20,
    backgroundColor: '#161930',
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#262F52',
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trainingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D24B3815',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D24B3830',
  },
  trainingTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF7B68',
    letterSpacing: 0.8,
  },
  progressPill: {
    backgroundColor: '#1E2548',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  currentLevelInfo: {
    marginBottom: 8,
  },
  currentLevelName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  currentLessonNumber: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  progressBarWrapper: {
    marginBottom: 14,
    marginTop: 4,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#101428',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#D24B38',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLessonCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  progressRankLabel: {
    fontSize: 10.5,
    color: '#F59E0B',
    fontWeight: '700',
  },

  // PROMINENT CONTINUE TRAINING BUTTON
  continueTrainingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D24B38',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  continueBtnLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    opacity: 0.85,
  },
  continueBtnLessonTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
  },
  continueBtnSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  heroGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1020',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  heroGoalText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 11.5,
  },

  // 4 NAVIGATION CARDS
  navGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  navCard: {
    flex: 1,
    backgroundColor: '#161930',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22294A',
  },
  navIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  navCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  navCardSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },

  // TODAY'S TRAINING CARD
  todaysTrainingCard: {
    backgroundColor: '#161930',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262F52',
    marginBottom: 24,
  },
  todaysHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fireIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  todaysTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  todaysSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  startTodaysBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  startTodaysBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F1020',
    letterSpacing: 0.5,
  },
  todaysStepsList: {
    backgroundColor: '#101428',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  todaysStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBullet: {
    width: 20,
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  stepItemName: {
    flex: 1,
    fontSize: 12,
    color: '#E2E8F0',
  },
  stepItemTime: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
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
    color: '#38BDF8',
  },

  // RECENT EVALUATION
  lastSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#20284A',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    backgroundColor: '#121426',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scoreText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 20,
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
    gap: 6,
    marginBottom: 3,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gradePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  sessionSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 10,
    color: '#64748B',
  },
  sessionActionsColumn: {
    gap: 6,
    alignItems: 'center',
  },
  whyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF820',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF850',
  },
  whyBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#38BDF8',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1A213D',
  },
  retryBtnText: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 3,
  },

  // EMPTY SESSION
  emptySessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#20284A',
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
    fontSize: 13,
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
    fontSize: 11,
    fontWeight: '800',
  },

  // MASTERY SUMMARY CARD
  masterySummaryCard: {
    backgroundColor: '#161930',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#20284A',
    marginBottom: 20,
  },
  masteryProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  strikeChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  strikeChip: {
    width: (width - 32 - 32 - 40) / 6,
    minWidth: 42,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#181E38',
    borderWidth: 1,
    borderColor: '#242B4C',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  strikeChipNum: {
    fontSize: 11,
    fontWeight: '700',
  },
  strikeChipDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  viewRadarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#20284A',
  },
  viewRadarBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D24B38',
  },
});

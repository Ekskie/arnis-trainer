import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import {
  ALL_CURRICULUM_LESSONS,
  CurriculumLesson,
  CurriculumProgress,
  getCurriculumProgress,
  getStageSummary,
} from '@/constants/curriculumStore';
import {
  getGamificationStats,
  GamificationStats,
} from '@/constants/gamificationStore';
import { CoachCharacter } from '@/components/ui/CoachCharacter';
import { TactileButton } from '@/components/ui/TactileButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeDashboardScreen() {
  const router = useRouter();

  const [gamification, setGamification] = useState<GamificationStats>({
    streakDays: 3,
    lastTrainedDate: '',
    totalXp: 120,
    hearts: 5,
    level: 1,
  });

  const [curriculumProgress, setCurriculumProgress] = useState<CurriculumProgress>({
    completedLessonIds: [],
    currentLessonId: 'les_0_1',
    totalLessons: ALL_CURRICULUM_LESSONS.length,
    completedCount: 0,
    progressPercentage: 0,
  });

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! 👋';
    if (hour < 18) return 'Good afternoon! 👋';
    return 'Good evening! 👋';
  }, []);

  // Refresh progress and stats on focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;

      getGamificationStats().then((stats) => {
        if (isMounted) setGamification(stats);
      });

      getCurriculumProgress().then((prog) => {
        if (isMounted) setCurriculumProgress(prog);
      });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Next lesson to train
  const nextLesson: CurriculumLesson = useMemo(() => {
    const found = ALL_CURRICULUM_LESSONS.find(
      (l) => l.id === curriculumProgress.currentLessonId
    );
    return found || ALL_CURRICULUM_LESSONS[0];
  }, [curriculumProgress.currentLessonId]);

  const stageSummary = useMemo(() => {
    return getStageSummary(nextLesson.levelNumber, curriculumProgress.completedLessonIds);
  }, [nextLesson.levelNumber, curriculumProgress.completedLessonIds]);

  const handleStartLesson = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push(`/lesson/${nextLesson.id}` as any);
  };

  const handleViewJourney = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/explore' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* --- TOP STATUS BAR (Gamification Badges) --- */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Text style={styles.logoIcon}>🥋</Text>
          <Text style={styles.logoText}>POSEFIX</Text>
        </View>

        <View style={styles.statsBadgesRow}>
          {/* Streak Badge */}
          <View style={styles.streakBadge}>
            <Text style={styles.badgeEmoji}>🔥</Text>
            <Text style={styles.streakBadgeText}>{gamification.streakDays}</Text>
          </View>

          {/* XP Badge */}
          <View style={styles.xpBadge}>
            <Text style={styles.badgeEmoji}>⭐</Text>
            <Text style={styles.xpBadgeText}>{gamification.totalXp}</Text>
          </View>

          {/* Hearts Badge */}
          <View style={styles.heartsBadge}>
            <Ionicons name="heart" size={16} color={MartialTheme.colors.heartRed} />
            <Text style={styles.heartsBadgeText}>{gamification.hearts}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* --- COACH GREETING HERO --- */}
        <View style={styles.heroSection}>
          <View style={styles.heroSpeechBubble}>
            <Text style={styles.greetingTitle}>{greeting}</Text>
            <Text style={styles.greetingSubtitle}>Ready to train today?</Text>
            <View style={styles.speechBubbleArrow} />
          </View>

          {/* Mascot Character waving */}
          <CoachCharacter pose="waving" size={125} style={styles.heroCoach} />
        </View>

        {/* --- PRIORITY 1: DOMINANT NEXT LESSON CARD --- */}
        <View style={styles.lessonCard}>
          <View style={styles.lessonCardHeader}>
            <View style={styles.stageTagBox}>
              <Text style={styles.stageTagText}>CONTINUE LEARNING</Text>
            </View>
            <View style={styles.durationTagBox}>
              <Text style={styles.durationTagText}>⏱ {nextLesson.durationMinutes} min</Text>
            </View>
          </View>

          {/* Lesson Node Icon & Stage Title */}
          <View style={styles.lessonIdentityRow}>
            <View style={styles.lessonNodeBadge}>
              <Text style={styles.lessonNodeNum}>● {nextLesson.lessonNumber}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lessonStageName}>{stageSummary.name}</Text>
              <Text style={styles.lessonTitle}>{nextLesson.title}</Text>
            </View>
          </View>

          {/* Short Friendly Hook */}
          <Text style={styles.lessonHook} numberOfLines={2}>
            {nextLesson.beginnerSummary || nextLesson.subtitle}
          </Text>

          {/* Dominant 3D Tactile CTA */}
          <TactileButton
            title="START LESSON →"
            variant="primary"
            size="lg"
            onPress={handleStartLesson}
            style={{ marginTop: 16 }}
          />
        </View>

        {/* --- PRIORITY 2: YOUR JOURNEY STEPPING STONES --- */}
        <View style={styles.journeyCard}>
          <View style={styles.journeyCardHeader}>
            <Text style={styles.journeySectionTitle}>YOUR JOURNEY</Text>
            <TouchableOpacity onPress={handleViewJourney} activeOpacity={0.7}>
              <Text style={styles.viewJourneyLink}>Open Map →</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.journeyStageTitle}>{stageSummary.name}</Text>

          {/* Stepping Stones Mini Path */}
          <View style={styles.steppingStonesRow}>
            {[0, 1, 2, 3, 4].map((stepIdx) => {
              const isCompletedStep = stepIdx < stageSummary.completed;
              const isCurrentStep = stepIdx === stageSummary.completed;

              return (
                <React.Fragment key={stepIdx}>
                  <View
                    style={[
                      styles.stoneDot,
                      isCompletedStep && styles.stoneDotCompleted,
                      isCurrentStep && styles.stoneDotCurrent,
                    ]}
                  >
                    {isCompletedStep ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : isCurrentStep ? (
                      <Ionicons name="play" size={11} color="#FFFFFF" />
                    ) : null}
                  </View>
                  {stepIdx < 4 && (
                    <View
                      style={[
                        styles.stoneLine,
                        isCompletedStep && styles.stoneLineCompleted,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          <Text style={styles.journeyProgressLabel}>
            {stageSummary.completed} of {stageSummary.total} lessons complete
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoIcon: {
    fontSize: 20,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    color: MartialTheme.colors.primary,
  },
  statsBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 3,
  },
  streakBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#C2410C',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 3,
  },
  xpBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#B45309',
  },
  heartsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 3,
  },
  heartsBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
  },
  badgeEmoji: {
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  heroSpeechBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    position: 'relative',
    marginRight: 14,
  },
  speechBubbleArrow: {
    position: 'absolute',
    right: -10,
    top: '40%',
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  greetingSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: MartialTheme.colors.textSecondary,
    marginTop: 2,
  },
  heroCoach: {
    marginRight: -4,
  },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 5,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  lessonCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  stageTagBox: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stageTagText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  durationTagBox: {
    backgroundColor: MartialTheme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
  },
  lessonIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  lessonNodeBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F59E0B',
    borderBottomWidth: 3,
    borderBottomColor: '#B45309',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonNodeNum: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  lessonStageName: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.bambooDark,
    textTransform: 'uppercase',
  },
  lessonTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 1,
  },
  lessonHook: {
    fontSize: 13.5,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 19,
    marginTop: 4,
  },
  journeyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  journeyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  journeySectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 1,
  },
  viewJourneyLink: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.primary,
  },
  journeyStageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginBottom: 14,
  },
  steppingStonesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  stoneDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E0D3',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#D5CEBF',
  },
  stoneDotCompleted: {
    backgroundColor: '#16A34A',
    borderBottomColor: '#14532D',
  },
  stoneDotCurrent: {
    backgroundColor: '#F59E0B',
    borderBottomColor: '#B45309',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FEF3C7',
  },
  stoneLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E5E0D3',
    marginHorizontal: 4,
  },
  stoneLineCompleted: {
    backgroundColor: '#86EFAC',
  },
  journeyProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
  },
});

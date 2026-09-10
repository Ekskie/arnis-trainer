import React, { useState, useEffect, useMemo } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import {
  ALL_CURRICULUM_LESSONS,
  CurriculumLesson,
  getCurriculumProgress,
  markLessonCompleted,
} from '@/constants/curriculumStore';
import { addXpAndStreak } from '@/constants/gamificationStore';
import { LOCAL_STRIKE_VIDEOS } from '@/constants/strikeVideos';
import { CoachCharacter } from '@/components/ui/CoachCharacter';
import { TactileButton } from '@/components/ui/TactileButton';
import { LessonProgressBar } from '@/components/ui/LessonProgressBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LessonStepType = 'concept' | 'visual' | 'remember' | 'interactive_check' | 'celebration';

export default function LessonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const lesson: CurriculumLesson = useMemo(() => {
    const found = ALL_CURRICULUM_LESSONS.find((l) => l.id === id);
    return found || ALL_CURRICULUM_LESSONS[0];
  }, [id]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [earnedXp, setEarnedXp] = useState(10);
  const [newStreak, setNewStreak] = useState(3);

  // Steps definition: Rapid 4 to 5 screen sequence
  const steps: LessonStepType[] = useMemo(() => {
    if (lesson.isStrike) {
      return ['concept', 'visual', 'remember', 'celebration'];
    }
    return ['concept', 'visual', 'remember', 'interactive_check', 'celebration'];
  }, [lesson.isStrike]);

  const currentStep = steps[currentStepIndex] || 'concept';

  // Video setup if strike or video available
  const videoSource = useMemo(() => {
    if (lesson.strikeKey && LOCAL_STRIKE_VIDEOS[lesson.strikeKey]) {
      return LOCAL_STRIKE_VIDEOS[lesson.strikeKey];
    }
    return null;
  }, [lesson.strikeKey]);

  const player = useVideoPlayer(videoSource || '', (p) => {
    p.loop = true;
    p.muted = true;
  });

  const handleNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIndex < steps.length - 2) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else if (currentStepIndex === steps.length - 2) {
      // Reaching celebration step: award XP and mark complete!
      addXpAndStreak(10).then((stats) => {
        setEarnedXp(10);
        setNewStreak(stats.streakDays);
      });
      markLessonCompleted(lesson.id);
      setCurrentStepIndex(steps.length - 1);
    }
  };

  const handleFinishAndExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/explore' as any);
  };

  const handleStartCameraDrill = (mode: 'follow' | 'guided' | 'test') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({
      pathname: '/evaluate' as any,
      params: {
        strikeId: lesson.id,
        lessonId: lesson.id,
        mode,
      },
    });
  };

  const toggleCheckItem = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Find next lesson
  const nextLesson = useMemo(() => {
    const currIdx = ALL_CURRICULUM_LESSONS.findIndex((l) => l.id === lesson.id);
    if (currIdx >= 0 && currIdx < ALL_CURRICULUM_LESSONS.length - 1) {
      return ALL_CURRICULUM_LESSONS[currIdx + 1];
    }
    return null;
  }, [lesson.id]);

  const handleGoToNextLesson = () => {
    if (nextLesson) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.replace(`/lesson/${nextLesson.id}` as any);
    } else {
      handleFinishAndExit();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* --- DUOLINGO TOP PROGRESS BAR --- */}
      <LessonProgressBar
        currentStep={currentStepIndex + 1}
        totalSteps={steps.length}
        onClose={() => router.back()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ======================================================= */}
        {/* SCREEN 1: BIG CONCEPT                                   */}
        {/* ======================================================= */}
        {currentStep === 'concept' && (
          <View style={styles.stepContainer}>
            <CoachCharacter pose="waving" size={135} style={{ marginBottom: 16 }} />

            <View style={styles.conceptBadge}>
              <Text style={styles.conceptBadgeText}>LESSON {lesson.lessonNumber}</Text>
            </View>

            <Text style={styles.stepTitle}>{lesson.title}</Text>
            {lesson.filipinoTitle && (
              <Text style={styles.stepFilipinoSubtitle}>{lesson.filipinoTitle}</Text>
            )}

            <Text style={styles.stepParagraph}>
              {lesson.beginnerSummary || lesson.description}
            </Text>

            {lesson.filipinoTermNote && (
              <View style={styles.filipinoNoteBox}>
                <Ionicons name="bulb-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={styles.filipinoNoteText}>{lesson.filipinoTermNote}</Text>
              </View>
            )}

            <View style={{ flex: 1 }} />

            <TactileButton
              title="CONTINUE"
              variant="primary"
              size="lg"
              onPress={handleNextStep}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        {/* ======================================================= */}
        {/* SCREEN 2: EXAMINE / WATCH DEMONSTRATION                */}
        {/* ======================================================= */}
        {currentStep === 'visual' && (
          <View style={styles.stepContainer}>
            <Text style={styles.visualHeaderTitle}>
              {lesson.isStrike ? 'WATCH THE MOVEMENT' : 'KEY PRINCIPLES'}
            </Text>
            <Text style={styles.visualHeaderSubtitle}>
              {lesson.isStrike
                ? 'Watch the correct trajectory, stance, and stick control.'
                : 'Keep these fundamental rules in mind as you train.'}
            </Text>

            {videoSource ? (
              <View style={styles.videoPlayerContainer}>
                <VideoView
                  player={player}
                  style={styles.videoPlayer}
                  allowsFullscreen={false}
                  nativeControls={false}
                />
              </View>
            ) : (
              <CoachCharacter pose="stance" size={135} style={{ marginVertical: 12 }} />
            )}

            {/* 3 Simple Watch Cues */}
            <View style={styles.watchCuesCard}>
              <Text style={styles.watchCuesTitle}>WATCH FOR:</Text>
              {(lesson.whatYouWillLearn || [
                'Chamber position before the motion begins',
                'Smooth diagonal arc trajectory without overswinging',
                'Controlled recovery back to your ready guard stance',
              ]).map((cue, idx) => (
                <View key={idx} style={styles.cueRow}>
                  <Text style={styles.cueDot}>→</Text>
                  <Text style={styles.cueText}>{cue}</Text>
                </View>
              ))}
            </View>

            <View style={{ flex: 1 }} />

            <TactileButton
              title="GOT IT, CONTINUE"
              variant="primary"
              size="lg"
              onPress={handleNextStep}
              style={{ marginTop: 20 }}
            />
          </View>
        )}

        {/* ======================================================= */}
        {/* SCREEN 3: REMEMBER (3 RULES ONLY)                       */}
        {/* ======================================================= */}
        {currentStep === 'remember' && (
          <View style={styles.stepContainer}>
            <View style={styles.coachSpeechRow}>
              <CoachCharacter pose="thinking" size={90} />
              <View style={styles.speechBubble}>
                <Text style={styles.speechBubbleText}>
                  "That's all you need to remember for your practice!"
                </Text>
              </View>
            </View>

            <Text style={styles.rememberHeaderTitle}>REMEMBER 3 THINGS</Text>

            <View style={styles.rulesStack}>
              <View style={styles.ruleCard}>
                <View style={styles.ruleBadge}>
                  <Text style={styles.ruleBadgeText}>①</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleTitle}>Start in Guard (Tindig)</Text>
                  <Text style={styles.ruleSub}>Left check hand at chest, stick chambered by your ear.</Text>
                </View>
              </View>

              <View style={styles.ruleCard}>
                <View style={[styles.ruleBadge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.ruleBadgeText}>②</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleTitle}>Controlled Trajectory</Text>
                  <Text style={styles.ruleSub}>Move diagonally with relaxed snap, never a wild swing.</Text>
                </View>
              </View>

              <View style={styles.ruleCard}>
                <View style={[styles.ruleBadge, { backgroundColor: '#EA580C' }]}>
                  <Text style={styles.ruleBadgeText}>③</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleTitle}>Return to Guard (Bawi)</Text>
                  <Text style={styles.ruleSub}>Always snap back into your protective shield stance.</Text>
                </View>
              </View>
            </View>

            <View style={{ flex: 1 }} />

            {lesson.isStrike ? (
              <View style={{ gap: 10, marginTop: 20 }}>
                <TactileButton
                  title="PRACTICE WITH CAMERA →"
                  variant="primary"
                  size="lg"
                  onPress={() => handleStartCameraDrill('guided')}
                />
                <TactileButton
                  title="I'M READY (MARK STEP COMPLETE)"
                  variant="secondary"
                  size="md"
                  onPress={handleNextStep}
                />
              </View>
            ) : (
              <TactileButton
                title="I'M READY →"
                variant="primary"
                size="lg"
                onPress={handleNextStep}
                style={{ marginTop: 20 }}
              />
            )}
          </View>
        )}

        {/* ======================================================= */}
        {/* SCREEN 4: INTERACTIVE CHECK (FOR ORIENTATION)            */}
        {/* ======================================================= */}
        {currentStep === 'interactive_check' && (
          <View style={styles.stepContainer}>
            <Text style={styles.checkHeaderTitle}>QUICK SAFETY CHECK</Text>
            <Text style={styles.checkHeaderSubtitle}>
              Tap each item once you have verified it in your space:
            </Text>

            <View style={styles.checklistStack}>
              {[
                { title: 'Clear 6-Foot Training Area', desc: 'No tables, pets, or bystanders within stick reach.' },
                { title: 'Check Ceiling Clearance', desc: 'Ensure you can swing upward without touching fans or lights.' },
                { title: 'Secure Grip & Calm Focus', desc: 'Hold stick 2 inches from base; keep relaxed wrists.' },
              ].map((item, idx) => {
                const isChecked = !!checkedItems[idx];
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => toggleCheckItem(idx)}
                    style={[
                      styles.checkItemCard,
                      isChecked && styles.checkItemCardSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkCircle,
                        isChecked && styles.checkCircleSelected,
                      ]}
                    >
                      {isChecked && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.checkItemTitle, isChecked && styles.checkItemTitleSelected]}>
                        {item.title}
                      </Text>
                      <Text style={styles.checkItemDesc}>{item.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flex: 1 }} />

            <TactileButton
              title="COMPLETE CHECKLIST →"
              variant="primary"
              size="lg"
              onPress={handleNextStep}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        {/* ======================================================= */}
        {/* SCREEN 5: CELEBRATION & REWARD                           */}
        {/* ======================================================= */}
        {currentStep === 'celebration' && (
          <View style={styles.celebrationContainer}>
            <CoachCharacter pose="celebrating" size={150} />

            <Text style={styles.celebrationHeroTitle}>GREAT JOB! 🎉</Text>
            <Text style={styles.celebrationHeroSub}>Lesson Complete!</Text>

            {/* Gamification Reward Badges */}
            <View style={styles.rewardBadgesRow}>
              <View style={styles.xpRewardBox}>
                <Text style={styles.rewardBoxEmoji}>⭐</Text>
                <Text style={styles.rewardBoxValue}>+{earnedXp} XP</Text>
                <Text style={styles.rewardBoxLabel}>EARNED</Text>
              </View>

              <View style={styles.streakRewardBox}>
                <Text style={styles.rewardBoxEmoji}>🔥</Text>
                <Text style={styles.rewardBoxValue}>{newStreak} DAYS</Text>
                <Text style={styles.rewardBoxLabel}>STREAK</Text>
              </View>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryBoxTitle}>You Mastered:</Text>
              <Text style={styles.summaryBoxLesson}>{lesson.title}</Text>
            </View>

            <View style={{ flex: 1 }} />

            {nextLesson ? (
              <TactileButton
                title={`NEXT: ${nextLesson.title.toUpperCase()} →`}
                variant="primary"
                size="lg"
                onPress={handleGoToNextLesson}
                style={{ marginTop: 20 }}
              />
            ) : null}

            <TactileButton
              title="BACK TO JOURNEY MAP"
              variant="secondary"
              size="md"
              onPress={handleFinishAndExit}
              style={{ marginTop: 10 }}
            />
          </View>
        )}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 16,
    alignItems: 'center',
  },
  conceptBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
  },
  conceptBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.8,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    textAlign: 'center',
  },
  stepFilipinoSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: MartialTheme.colors.bambooDark,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  stepParagraph: {
    fontSize: 15,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  filipinoNoteBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  filipinoNoteText: {
    flex: 1,
    fontSize: 12.5,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '600',
  },
  visualHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    textAlign: 'center',
  },
  visualHeaderSubtitle: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  videoPlayerContainer: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    backgroundColor: '#000',
    marginBottom: 16,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  watchCuesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  watchCuesTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: MartialTheme.colors.primary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  cueDot: {
    fontSize: 14,
    fontWeight: '900',
    color: MartialTheme.colors.primary,
    marginRight: 8,
  },
  cueText: {
    flex: 1,
    fontSize: 13,
    color: MartialTheme.colors.text,
    lineHeight: 18,
    fontWeight: '600',
  },
  coachSpeechRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    marginLeft: 10,
  },
  speechBubbleText: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.text,
    lineHeight: 18,
  },
  rememberHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginBottom: 14,
    textAlign: 'left',
    width: '100%',
  },
  rulesStack: {
    width: '100%',
    gap: 10,
  },
  ruleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    gap: 12,
  },
  ruleBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  ruleSub: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  checkHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    textAlign: 'center',
  },
  checkHeaderSubtitle: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  checklistStack: {
    width: '100%',
    gap: 12,
  },
  checkItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    gap: 14,
  },
  checkItemCardSelected: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
    borderBottomColor: '#166534',
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  checkItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  checkItemTitleSelected: {
    color: '#15803D',
  },
  checkItemDesc: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  celebrationContainer: {
    flex: 1,
    paddingTop: 30,
    alignItems: 'center',
  },
  celebrationHeroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#15803D',
    marginTop: 16,
  },
  celebrationHeroSub: {
    fontSize: 16,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
    marginTop: 4,
  },
  rewardBadgesRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 24,
  },
  xpRewardBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderBottomWidth: 4,
    borderBottomColor: '#D97706',
  },
  streakRewardBox: {
    backgroundColor: '#FFEDD5',
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderBottomWidth: 4,
    borderBottomColor: '#EA580C',
  },
  rewardBoxEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  rewardBoxValue: {
    fontSize: 17,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  rewardBoxLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  summaryBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  summaryBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryBoxLesson: {
    fontSize: 16,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 4,
  },
});

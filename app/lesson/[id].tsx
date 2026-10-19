import React, { useState, useMemo, useEffect } from 'react';
import {
  Image,
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
  getLessonQuizQuestions,
  LessonQuizQuestion,
  markLessonCompleted,
} from '@/constants/curriculumStore';
import {
  addXpAndStreak,
  getGamificationStats,
  getSashRankByLevel,
  SashRankInfo,
} from '@/constants/gamificationStore';
import { LOCAL_STRIKE_VIDEOS } from '@/constants/strikeVideos';
import { STRIKE_RULES } from '@/constants/strikeRules';
import { CoachCharacter } from '@/components/ui/CoachCharacter';
import { TactileButton } from '@/components/ui/TactileButton';
import { LessonProgressBar } from '@/components/ui/LessonProgressBar';
import { SashPromotionModal } from '@/components/ui/SashPromotionModal';

type LessonStepType = 'concept' | 'visual' | 'quiz' | 'remember' | 'celebration';

export default function LessonScreen() {
  const router = useRouter();
  const { id, completedFromDrill, earnedScore } = useLocalSearchParams<{
    id: string;
    completedFromDrill?: string;
    earnedScore?: string;
  }>();

  const lesson: CurriculumLesson = useMemo(() => {
    const found = ALL_CURRICULUM_LESSONS.find((l) => l.id === id);
    return found || ALL_CURRICULUM_LESSONS[0];
  }, [id]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userSash, setUserSash] = useState<SashRankInfo | undefined>(undefined);
  const [earnedXp, setEarnedXp] = useState(10);
  const [newStreak, setNewStreak] = useState(3);
  const [isPlaying, setIsPlaying] = useState(true);
  const [promotionModalRank, setPromotionModalRank] = useState<{ newRank: SashRankInfo; level: number } | null>(null);

  // SoloCode Questionnaire State
  const quizQuestions: LessonQuizQuestion[] = useMemo(() => {
    return getLessonQuizQuestions(lesson);
  }, [lesson]);

  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizStatus, setQuizStatus] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');

  // Load sash rank on mount
  useEffect(() => {
    getGamificationStats().then((stats) => {
      const sash = getSashRankByLevel(stats.level);
      setUserSash(sash);
    });
  }, []);

  // Steps definition: 5 screen pedagogical progression
  const steps: LessonStepType[] = useMemo(() => {
    return ['concept', 'visual', 'quiz', 'remember', 'celebration'];
  }, []);

  // Handle return from camera drill
  useEffect(() => {
    if (completedFromDrill === '1') {
      const celebrationIndex = steps.length - 1;
      setCurrentStepIndex(celebrationIndex);
      const bonusXp = earnedScore && parseInt(earnedScore, 10) >= 85 ? 15 : 10;
      setEarnedXp(bonusXp);
      getGamificationStats().then((stats) => {
        setNewStreak(stats.streakDays);
        if (stats.level) {
          const sash = getSashRankByLevel(stats.level);
          setUserSash(sash);
        }
      });
      markLessonCompleted(lesson.id);
    } else if (completedFromDrill === '0') {
      const rememberIdx = steps.indexOf('remember');
      if (rememberIdx >= 0) {
        setCurrentStepIndex(rememberIdx);
      }
    }
  }, [completedFromDrill, earnedScore, steps, lesson.id]);

  const currentStep = steps[currentStepIndex] || 'concept';

  // Video setup with asset URI resolution for Expo Go / native compatibility
  const videoSource = useMemo(() => {
    if (lesson.strikeKey && LOCAL_STRIKE_VIDEOS[lesson.strikeKey]) {
      const raw = LOCAL_STRIKE_VIDEOS[lesson.strikeKey];
      try {
        const resolved = Image.resolveAssetSource(raw);
        return resolved?.uri ? { uri: resolved.uri } : raw;
      } catch {
        return raw;
      }
    }
    return null;
  }, [lesson.strikeKey]);

  const player = useVideoPlayer(videoSource, (p) => {
    if (!p) return;
    try {
      p.loop = true;
      p.muted = true;
      p.play();
    } catch {
      // ignore
    }
  });

  // Play video when entering visual step; pause when leaving
  useEffect(() => {
    if (!player) return;
    if (currentStep === 'visual') {
      try {
        player.play();
        setIsPlaying(true);
      } catch {
        // ignore
      }
    } else {
      try {
        player.pause();
        setIsPlaying(false);
      } catch {
        // ignore
      }
    }
  }, [currentStep, player]);

  const togglePlayback = () => {
    if (!player) return;
    try {
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch {
      // ignore
    }
  };

  const handleNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIndex < steps.length - 2) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else if (currentStepIndex === steps.length - 2) {
      // Reaching celebration step: award XP and mark complete!
      addXpAndStreak(10).then((stats) => {
        setEarnedXp(10);
        setNewStreak(stats.streakDays);
        if (stats.isPromoted && stats.newRank) {
          setPromotionModalRank({ newRank: stats.newRank, level: stats.level });
        }
      });
      markLessonCompleted(lesson.id);
      setCurrentStepIndex(steps.length - 1);
    }
  };

  const handleFinishAndExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      player?.pause();
    } catch {
      // ignore
    }
    router.replace('/explore' as any);
  };

  const handleStartCameraDrill = (drillMode: 'follow' | 'guided' | 'test') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      player?.pause();
    } catch {
      // ignore
    }
    const targetStrikeId = lesson.strikeKey || (STRIKE_RULES[lesson.id] ? lesson.id : 'strike_1');
    router.navigate({
      pathname: '/evaluate' as any,
      params: {
        strikeId: targetStrikeId,
        lessonId: lesson.id,
        mode: drillMode,
        source: 'lesson',
      },
    });
  };

  const currentQuestion = quizQuestions[quizQuestionIndex] || quizQuestions[0];

  const handleSelectOption = (idx: number) => {
    if (quizStatus === 'correct') return; // locked once solved
    Haptics.selectionAsync();
    setSelectedOption(idx);
    setQuizStatus('unanswered');
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || !currentQuestion) return;
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setQuizStatus('correct');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setQuizStatus('incorrect');
    }
  };

  const handleQuizContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (quizQuestionIndex < quizQuestions.length - 1) {
      setQuizQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setQuizStatus('unanswered');
    } else {
      // Advance to next step in lesson (remember)
      handleNextStep();
    }
  };

  const handleQuizRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(null);
    setQuizStatus('unanswered');
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
      {/* --- DUOLINGO TOP PROGRESS BAR WITH SASH BADGE --- */}
      <LessonProgressBar
        currentStep={currentStepIndex + 1}
        totalSteps={steps.length}
        sashInfo={userSash}
        onClose={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/explore' as any);
          }
        }}
      />

      <View style={styles.lessonSubHeader}>
        <Text style={styles.lessonStepIndicator}>
          STEP {currentStepIndex + 1} OF {steps.length}
        </Text>
        <TouchableOpacity
          style={styles.askCoachLessonBtn}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({
              pathname: '/chat' as any,
              params: {
                lessonId: lesson.id,
              },
            });
          }}
        >
          <Text style={styles.askCoachLessonBtnText}>🥋 Ask Coach</Text>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={MartialTheme.colors.primaryDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          currentStep === 'quiz' && quizStatus !== 'unanswered' && { paddingBottom: 240 },
        ]}
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
                  allowsPictureInPicture={false}
                  nativeControls={false}
                  contentFit="cover"
                  surfaceType="textureView"
                />
                <TouchableOpacity
                  style={styles.videoPlayToggleBadge}
                  onPress={togglePlayback}
                  activeOpacity={0.8}
                >
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.videoPlayToggleText}>{isPlaying ? 'Pause' : 'Play'}</Text>
                </TouchableOpacity>
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
        {/* SCREEN 3: SOLOCODE QUESTIONNAIRE CHECKPOINT             */}
        {/* ======================================================= */}
        {currentStep === 'quiz' && currentQuestion && (
          <View style={styles.stepContainer}>
            {/* Header & Checkpoint Status */}
            <View style={styles.quizHeaderRow}>
              <View style={styles.quizBadge}>
                <Ionicons name="school-outline" size={14} color="#4338CA" style={{ marginRight: 5 }} />
                <Text style={styles.quizBadgeText}>
                  CHECKPOINT • {quizQuestionIndex + 1}/{quizQuestions.length}
                </Text>
              </View>
              <View style={styles.freePracticePill}>
                <Ionicons name="sparkles" size={12} color="#15803D" style={{ marginRight: 4 }} />
                <Text style={styles.freePracticePillText}>UNLIMITED TRIES</Text>
              </View>
            </View>

            <Text style={styles.quizQuestionPrompt}>
              {currentQuestion.question}
            </Text>

            {/* Option Cards */}
            <View style={styles.quizOptionsStack}>
              {currentQuestion.options.map((optionText, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrectSelected = isSelected && quizStatus === 'correct';
                const isIncorrectSelected = isSelected && quizStatus === 'incorrect';
                const optionLetter = ['A', 'B', 'C', 'D'][idx] || `${idx + 1}`;

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => handleSelectOption(idx)}
                    disabled={quizStatus === 'correct'}
                    style={[
                      styles.quizOptionCard,
                      isSelected && styles.quizOptionCardSelected,
                      isCorrectSelected && styles.quizOptionCardCorrect,
                      isIncorrectSelected && styles.quizOptionCardIncorrect,
                    ]}
                  >
                    {/* Letter Badge */}
                    <View
                      style={[
                        styles.optionLetterBadge,
                        isSelected && styles.optionLetterBadgeSelected,
                        isCorrectSelected && styles.optionLetterBadgeCorrect,
                        isIncorrectSelected && styles.optionLetterBadgeIncorrect,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLetterText,
                          isSelected && styles.optionLetterTextSelected,
                          (isCorrectSelected || isIncorrectSelected) && { color: '#FFFFFF' },
                        ]}
                      >
                        {optionLetter}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.quizOptionText,
                        isSelected && styles.quizOptionTextSelected,
                        isCorrectSelected && styles.quizOptionTextCorrect,
                        isIncorrectSelected && styles.quizOptionTextIncorrect,
                      ]}
                    >
                      {optionText}
                    </Text>

                    {isCorrectSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#15803D" style={{ marginLeft: 6 }} />
                    )}
                    {isIncorrectSelected && (
                      <Ionicons name="close-circle" size={24} color="#DC2626" style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flex: 1, minHeight: 24 }} />

            {/* Check Answer Button (only visible when feedback drawer is not open) */}
            {quizStatus === 'unanswered' && (
              <TactileButton
                title={selectedOption !== null ? "CHECK ANSWER 🚀" : "SELECT AN OPTION"}
                variant={selectedOption !== null ? "primary" : "secondary"}
                size="lg"
                disabled={selectedOption === null}
                onPress={handleCheckAnswer}
                style={{ marginTop: 24, width: '100%' }}
              />
            )}
          </View>
        )}

        {/* ======================================================= */}
        {/* SCREEN 4: REMEMBER (3 RULES ONLY)                       */}
        {/* ======================================================= */}
        {currentStep === 'remember' && (
          <View style={styles.stepContainer}>
            <View style={styles.coachSpeechRow}>
              <CoachCharacter pose="thinking" size={90} />
              <View style={styles.speechBubble}>
                <Text style={styles.speechBubbleText}>
                  {"\"Keep these key rules in mind as you train!\""}
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

            <View style={{ flex: 1, minHeight: 20 }} />

            {lesson.isStrike ? (
              <View style={{ gap: 10, marginTop: 20, width: '100%' }}>
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
                style={{ marginTop: 20, width: '100%' }}
              />
            )}
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

      {/* SoloCode Bottom Feedback Drawer */}
      {currentStep === 'quiz' && quizStatus !== 'unanswered' && currentQuestion && (
        <View
          style={[
            styles.feedbackDrawer,
            quizStatus === 'correct' ? styles.feedbackDrawerCorrect : styles.feedbackDrawerIncorrect,
          ]}
        >
          <View style={styles.feedbackContent}>
            <View style={styles.feedbackHeaderRow}>
              <View
                style={[
                  styles.feedbackIconBadge,
                  quizStatus === 'correct' ? styles.feedbackIconBadgeCorrect : styles.feedbackIconBadgeIncorrect,
                ]}
              >
                <Ionicons
                  name={quizStatus === 'correct' ? 'checkmark' : 'alert'}
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <Text
                style={[
                  styles.feedbackTitle,
                  quizStatus === 'correct' ? styles.feedbackTitleCorrect : styles.feedbackTitleIncorrect,
                ]}
              >
                {quizStatus === 'correct' ? 'TAMA! CORRECT! 🎉' : 'SUBUKAN MULI! NOT QUITE 💡'}
              </Text>
            </View>

            <Text
              style={[
                styles.feedbackBodyText,
                quizStatus === 'correct' ? styles.feedbackBodyTextCorrect : styles.feedbackBodyTextIncorrect,
              ]}
            >
              {quizStatus === 'correct'
                ? currentQuestion.explanation
                : currentQuestion.hint || 'Review the lesson breakdown above and give it another try!'}
            </Text>

            {quizStatus === 'correct' ? (
              <TactileButton
                title={quizQuestionIndex < quizQuestions.length - 1 ? "NEXT QUESTION →" : "CONTINUE →"}
                variant="primary"
                size="lg"
                onPress={handleQuizContinue}
                style={styles.feedbackBtn}
              />
            ) : (
              <TactileButton
                title="TRY AGAIN ↺"
                variant="secondary"
                size="lg"
                onPress={handleQuizRetry}
                style={styles.feedbackBtn}
              />
            )}
          </View>
        </View>
      )}

      {/* Sash Promotion Ceremony Modal */}
      {promotionModalRank && (
        <SashPromotionModal
          visible={!!promotionModalRank}
          onClose={() => setPromotionModalRank(null)}
          newRank={promotionModalRank.newRank}
          currentLevel={promotionModalRank.level}
        />
      )}
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
  lessonSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  lessonStepIndicator: {
    fontSize: 10.5,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 0.5,
  },
  askCoachLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  askCoachLessonBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.primaryDark,
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
  videoPlayToggleBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 39, 33, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  videoPlayToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
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
  // SoloCode Quiz Styles
  quizHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  quizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  quizBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4338CA',
    letterSpacing: 0.5,
  },
  freePracticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  freePracticePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  quizQuestionPrompt: {
    fontSize: 19,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    textAlign: 'left',
    width: '100%',
    lineHeight: 26,
    marginBottom: 20,
  },
  quizOptionsStack: {
    width: '100%',
    gap: 12,
  },
  quizOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    gap: 12,
  },
  quizOptionCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#F5F7FF',
    borderBottomColor: '#4F46E5',
  },
  quizOptionCardCorrect: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
    borderBottomColor: '#166534',
  },
  quizOptionCardIncorrect: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    borderBottomColor: '#991B1B',
  },
  optionLetterBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  optionLetterBadgeSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#4F46E5',
  },
  optionLetterBadgeCorrect: {
    backgroundColor: '#15803D',
    borderColor: '#166534',
  },
  optionLetterBadgeIncorrect: {
    backgroundColor: '#DC2626',
    borderColor: '#991B1B',
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#475569',
  },
  optionLetterTextSelected: {
    color: '#FFFFFF',
  },
  quizOptionText: {
    flex: 1,
    fontSize: 14,
    color: MartialTheme.colors.text,
    fontWeight: '700',
    lineHeight: 20,
  },
  quizOptionTextSelected: {
    color: '#312E81',
  },
  quizOptionTextCorrect: {
    color: '#14532D',
  },
  quizOptionTextIncorrect: {
    color: '#7F1D1D',
  },

  // SoloCode Feedback Bottom Drawer
  feedbackDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 99,
  },
  feedbackDrawerCorrect: {
    backgroundColor: '#DCFCE7',
    borderTopWidth: 3,
    borderColor: '#22C55E',
  },
  feedbackDrawerIncorrect: {
    backgroundColor: '#FEE2E2',
    borderTopWidth: 3,
    borderColor: '#EF4444',
  },
  feedbackContent: {
    width: '100%',
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  feedbackIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackIconBadgeCorrect: {
    backgroundColor: '#15803D',
  },
  feedbackIconBadgeIncorrect: {
    backgroundColor: '#DC2626',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  feedbackTitleCorrect: {
    color: '#15803D',
  },
  feedbackTitleIncorrect: {
    color: '#B91C1C',
  },
  feedbackBodyText: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  feedbackBodyTextCorrect: {
    color: '#166534',
  },
  feedbackBodyTextIncorrect: {
    color: '#991B1B',
  },
  feedbackBtn: {
    width: '100%',
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

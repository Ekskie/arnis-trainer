import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';

import { useAuth } from '@/contexts/AuthContext';
import { CloudSyncService } from '@/services/cloudSyncService';
import { MartialTheme } from '@/constants/theme';
import { StrikeRule } from '@/constants/strikeRules';
import { StrikeEvaluationResult } from '@/engine/evaluation/evaluationTypes';
import { SessionImprovement } from '@/hooks/usePracticeSession';
import { CoachCharacter } from '@/components/ui/CoachCharacter';
import { WhyFailedModal } from '@/components/WhyFailedModal';
import { TactileButton } from '@/components/ui/TactileButton';
import { CoachVsYou } from '@/components/comparison/CoachVsYou';
import { ComparisonPlayer } from '@/components/comparison/ComparisonPlayer';
import { SashPromotionModal } from '@/components/ui/SashPromotionModal';
import { getCoachReference } from '@/constants/referenceStore';
import { getGamificationStats, getSashRankByLevel, SashRankInfo } from '@/constants/gamificationStore';
import { markLessonCompleted, PASSING_SCORE_THRESHOLD } from '@/constants/curriculumStore';
import { calculateStarCount } from '@/engine/evaluation/scoreCalculator';
import {
  AnyoRoutine,
  AnyoStepResult,
  getHistory,
  updateSessionSharing,
  updateSessionVideo,
  getAutoShareCoachPreference,
} from '@/constants/historyStore';

export interface PracticeResultProps {
  result: StrikeEvaluationResult;
  improvement: SessionImprovement;
  strikeRule: StrikeRule;
  promotionResult?: { newRank: SashRankInfo; level: number } | null;
  lastSnapshot?: string | null;
  lastReplayVideo?: string | null;
  lastImpactMeta?: {
    impactFrame?: number;
    impactTime?: number;
    coachImpactTime?: number;
    confidence?: number;
    actualAngles?: {
      elbow?: number;
      shoulder?: number;
      knee?: number;
      wrist?: number;
    };
  };
  isFromLesson?: boolean;
  practiceMode?: 'follow' | 'guided' | 'test';
  activeRoutine?: AnyoRoutine | null;
  anyoStepScores?: AnyoStepResult[];
  onPracticeAnyoAgain?: () => void;
  onNextRoutine?: () => void;
  onRetry: () => void;
  onRetest?: () => void;
  onNextStrike?: () => void;
  onExit: () => void;
  onContinueLesson?: () => void;
  onExitLesson?: () => void;
}

function PracticeResultVideoPlayer({ videoUri }: { videoUri: string }) {
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.play();
  });

  React.useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        // ignore
      }
    };
  }, [player]);

  return (
    <View style={styles.nativeVideoContainer}>
      <VideoView
        player={player}
        style={styles.nativeVideoView}
        allowsFullscreen
        allowsPictureInPicture={false}
        contentFit="contain"
      />
    </View>
  );
}

export function PracticeResult({
  result,
  improvement,
  strikeRule,
  promotionResult,
  lastSnapshot,
  lastReplayVideo,
  lastImpactMeta,
  isFromLesson,
  practiceMode,
  activeRoutine,
  anyoStepScores,
  onPracticeAnyoAgain,
  onNextRoutine,
  onRetry,
  onRetest,
  onNextStrike,
  onExit,
  onContinueLesson,
  onExitLesson,
}: PracticeResultProps) {
  const router = useRouter();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showComparisonPlayer, setShowComparisonPlayer] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(true);
  const [sashInfo, setSashInfo] = useState<SashRankInfo>(() => getSashRankByLevel(1));

  const { user } = useAuth();
  const [attachedVideoUri, setAttachedVideoUri] = useState<string | null>(lastReplayVideo || null);
  const [isPickingVideo, setIsPickingVideo] = useState(false);
  const [shareVideoWithCoach, setShareVideoWithCoach] = useState(false);
  const [isSyncingVideo, setIsSyncingVideo] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  React.useEffect(() => {
    getGamificationStats(user?.id).then((g) => {
      setSashInfo(getSashRankByLevel(g.level));
    });
  }, [user?.id]);

  const coachRef = getCoachReference(strikeRule.id);

  // Auto-sync metrics upon result view for authenticated students
  React.useEffect(() => {
    let isMounted = true;
    getAutoShareCoachPreference().then((autoShare) => {
      if (isMounted && autoShare) {
        setShareVideoWithCoach(true);
      }
    });

    if (user) {
      const effectiveId = activeRoutine ? activeRoutine.id : strikeRule.id;
      const effectiveName = activeRoutine ? activeRoutine.name : strikeRule.name;
      const effectiveDesc = activeRoutine
        ? `Anyo Routine (${anyoStepScores?.length || activeRoutine.strikes.length} strikes)`
        : strikeRule.desc;

      const sessionItem = {
        id: 'session_' + Date.now(),
        strikeId: effectiveId,
        strikeName: effectiveName,
        description: effectiveDesc,
        score: result.score,
        grade: result.grade,
        date: new Date().toLocaleDateString(),
        snapshotBase64: lastSnapshot || undefined,
        replayVideoBase64: attachedVideoUri || lastReplayVideo || undefined,
        userVideoUri: attachedVideoUri || undefined,
        breakdown: {
          elbow: { score: result.elbowScore, actual: lastImpactMeta?.actualAngles?.elbow || 0, ideal: coachRef.angles.elbow || 45 },
          shoulder: { score: result.shoulderScore, actual: lastImpactMeta?.actualAngles?.shoulder || 0, ideal: coachRef.angles.shoulder || 55 },
          wrist: { score: result.wristScore, actual: lastImpactMeta?.actualAngles?.wrist || 0, ideal: coachRef.angles.wrist || 90 },
        },
      };

      getAutoShareCoachPreference().then(async (autoShare) => {
        const res = await CloudSyncService.syncPracticeSession(user.id, sessionItem as any, autoShare);
        if (isMounted && res?.error) {
          setSyncStatus(`Cloud sync pending: ${res.error.message}`);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, strikeRule.id, activeRoutine?.id, result.score, attachedVideoUri]);

  // Pick screen recording or practice video from gallery
  const handlePickVideo = async () => {
    try {
      setIsPickingVideo(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        const videoUri = res.assets[0].uri;
        setAttachedVideoUri(videoUri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Update local session
        const history = await getHistory(user?.id);
        if (history.length > 0) {
          const targetSessionId = history[0].id;
          await updateSessionVideo(targetSessionId, videoUri, user?.id);

          // If student already has sharing toggled ON, sync to cloud
          if (shareVideoWithCoach && user?.id) {
            setIsSyncingVideo(true);
            setSyncStatus('Uploading attached video for coach review...');
            await CloudSyncService.updateSessionSharing(user.id, targetSessionId, true, {
              ...history[0],
              userVideoUri: videoUri,
            });
            setIsSyncingVideo(false);
            setSyncStatus('Video shared with Coach! 🥋');
          }
        }
      }
    } catch (err: any) {
      console.warn('[PracticeResult] Error selecting video:', err);
      Alert.alert('Selection Error', 'Failed to pick video from gallery.');
    } finally {
      setIsPickingVideo(false);
    }
  };

  const handleToggleShareVideo = async (value: boolean) => {
    setShareVideoWithCoach(value);
    if (!user) {
      if (value) {
        setShareVideoWithCoach(false);
        Alert.alert(
          'Sign In Required',
          'Please sign in or create an account to share practice recordings with certified coaches.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In / Register',
              onPress: () => router.push('/(auth)/login' as any),
            },
          ]
        );
      }
      return;
    }

    if (value) {
      const activeVideo = attachedVideoUri || lastReplayVideo;
      if (activeVideo || lastSnapshot) {
        setIsSyncingVideo(true);
        setSyncStatus('Uploading for coach review...');
        const effectiveId = activeRoutine ? activeRoutine.id : strikeRule.id;
        const effectiveName = activeRoutine ? activeRoutine.name : strikeRule.name;
        const effectiveDesc = activeRoutine
          ? `Anyo Routine (${anyoStepScores?.length || activeRoutine.strikes.length} strikes)`
          : strikeRule.desc;

        const sessionItem = {
          id: 'session_' + Date.now(),
          strikeId: effectiveId,
          strikeName: effectiveName,
          description: effectiveDesc,
          score: result.score,
          grade: result.grade,
          date: new Date().toLocaleDateString(),
          snapshotBase64: lastSnapshot || undefined,
          replayVideoBase64: undefined,
          userVideoUri: activeVideo || undefined,
          breakdown: {
            elbow: { score: result.elbowScore, actual: lastImpactMeta?.actualAngles?.elbow || 0, ideal: coachRef.angles.elbow || 45 },
            shoulder: { score: result.shoulderScore, actual: lastImpactMeta?.actualAngles?.shoulder || 0, ideal: coachRef.angles.shoulder || 55 },
            wrist: { score: result.wristScore, actual: lastImpactMeta?.actualAngles?.wrist || 0, ideal: coachRef.angles.wrist || 90 },
            guard: { score: result.guardScore, actual: 0, ideal: 70 },
            stance: { score: result.stanceScore, actual: lastImpactMeta?.actualAngles?.knee || 0, ideal: 145 },
          },
        };

        const res = await CloudSyncService.syncPracticeSession(user.id, sessionItem as any, true);
        setIsSyncingVideo(false);
        if (res.error) {
          setSyncStatus('Failed to upload video');
        } else {
          setSyncStatus('Shared with Coach! 🥋');
        }

        // Update local session in history store
        const history = await getHistory(user.id);
        if (history.length > 0) {
          await updateSessionSharing(history[0].id, true, user.id);
        }
      }
    } else {
      // Revoke sharing
      const history = await getHistory(user.id);
      if (history.length > 0) {
        await updateSessionSharing(history[0].id, false, user.id);
        await CloudSyncService.updateSessionSharing(user.id, history[0].id, false);
      }
      setSyncStatus('Recording kept private to device 🔒');
    }
  };

  const isPassed = result.score >= PASSING_SCORE_THRESHOLD; // 75%
  const isMastered = improvement.isMastered || result.score >= 85;

  // Ensure passed strike is marked completed in curriculum to unlock the next strike
  React.useEffect(() => {
    if (isPassed && strikeRule?.id) {
      markLessonCompleted(strikeRule.id, user?.id).catch(() => {});
    }
  }, [isPassed, strikeRule?.id, user?.id]);

  const isAnyo = Boolean(activeRoutine && anyoStepScores && anyoStepScores.length > 0);
  const anyoAvgScore = React.useMemo(() => {
    if (!anyoStepScores || anyoStepScores.length === 0) return result.score;
    const sum = anyoStepScores.reduce((acc, s) => acc + (s.score || 0), 0);
    return Math.round(sum / anyoStepScores.length);
  }, [anyoStepScores, result.score]);

  const anyoCadenceSec = React.useMemo(() => {
    if (!anyoStepScores || anyoStepScores.length === 0) return '1.20';
    const totalMs = anyoStepScores.reduce((acc, s) => acc + (s.durationMs || 1200), 0);
    return (totalMs / anyoStepScores.length / 1000).toFixed(2);
  }, [anyoStepScores]);

  const anyoStars = React.useMemo(() => {
    return calculateStarCount(anyoAvgScore);
  }, [anyoAvgScore]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return MartialTheme.colors.primary;
    if (score >= 75) return MartialTheme.colors.bamboo;
    return '#EF4444';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isAnyo && activeRoutine
            ? `${activeRoutine.name} Results`
            : isMastered
            ? 'Mastery Achieved! 🏆'
            : 'Practice Results'}
        </Text>
        <TouchableOpacity onPress={isFromLesson ? (onExitLesson || onExit) : onExit} style={styles.closeHeaderBtn}>
          <Ionicons name="close" size={24} color={MartialTheme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* --- 1. HERO CARD: ANYO KATA OR CELEBRATION REWARD --- */}
        {isAnyo && activeRoutine && anyoStepScores ? (
          <View style={[styles.rewardCard, anyoAvgScore >= 80 && styles.rewardCardMastered]}>
            <CoachCharacter
              pose={anyoAvgScore >= 80 ? 'celebrating' : 'stance'}
              size={110}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.rewardHeading, anyoAvgScore >= 80 && styles.rewardHeadingMastered]}>
              {anyoAvgScore >= 85 ? '🎉 ANYO KATA MASTERED!' : '🎉 ANYO KATA COMPLETED!'}
            </Text>

            <Text style={styles.strikeTitle}>
              {activeRoutine.name}
            </Text>
            <Text style={styles.anyoSubtitle}>
              {activeRoutine.subtitle}
            </Text>

            {/* Big Score & Stars Row */}
            <View style={styles.scoreContainer}>
              <Text style={[styles.bigScoreText, { color: getScoreColor(anyoAvgScore) }]}>
                {anyoAvgScore}%
              </Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((st) => (
                  <Ionicons
                    key={st}
                    name={st <= anyoStars ? 'star' : 'star-outline'}
                    size={24}
                    color={st <= anyoStars ? MartialTheme.colors.bamboo : '#D1D5DB'}
                    style={{ marginHorizontal: 2 }}
                  />
                ))}
              </View>

              {/* Rhythm Metric Badge */}
              <View style={styles.rhythmContainer}>
                <Ionicons name="speedometer-outline" size={16} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={styles.rhythmText}>
                  {anyoCadenceSec}s per strike · Fluid Agos Rhythm
                </Text>
              </View>
            </View>

            {/* Anyo Step Breakdown Cards */}
            <View style={styles.anyoBreakdownSection}>
              <Text style={styles.anyoBreakdownHeading}>KATA STRIKE SEQUENCE</Text>
              {anyoStepScores.map((step, idx) => (
                <View key={step.stepIndex ?? idx} style={styles.anyoStepCard}>
                  <View style={styles.anyoStepHeaderRow}>
                    <View style={styles.anyoStepIndexBadge}>
                      <Text style={styles.anyoStepIndexText}>#{idx + 1}</Text>
                    </View>
                    <Text style={styles.anyoStepNameText} numberOfLines={1}>
                      {step.strikeName}
                    </Text>
                    <View style={[styles.anyoStepScoreBadge, { backgroundColor: getScoreColor(step.score) + '20' }]}>
                      <Text style={[styles.anyoStepScoreText, { color: getScoreColor(step.score) }]}>
                        {step.score}% ({step.grade})
                      </Text>
                    </View>
                  </View>
                  <View style={styles.anyoStepDetailsRow}>
                    <Text style={styles.anyoStepDurationText}>
                      ⏱ {((step.durationMs || 0) / 1000).toFixed(1)}s
                    </Text>
                    {step.breakdown?.elbow?.actual != null && (
                      <Text style={styles.anyoStepAngleText}>
                        Elbow: {Math.round(step.breakdown.elbow.actual)}°
                      </Text>
                    )}
                    {step.breakdown?.shoulder?.actual != null && (
                      <Text style={styles.anyoStepAngleText}>
                        Shoulder: {Math.round(step.breakdown.shoulder.actual)}°
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Hero Actions Row */}
            <View style={styles.anyoHeroActionsRow}>
              <TouchableOpacity
                style={styles.anyoPracticeAgainBtn}
                activeOpacity={0.8}
                onPress={onPracticeAnyoAgain || onRetry}
              >
                <Ionicons name="repeat" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.anyoPracticeAgainText}>PRACTICE AGAIN</Text>
              </TouchableOpacity>
              {onNextRoutine && (
                <TouchableOpacity
                  style={styles.anyoNextBtn}
                  activeOpacity={0.8}
                  onPress={onNextRoutine}
                >
                  <Text style={styles.anyoNextBtnText}>NEXT ROUTINE</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.rewardCard, isMastered && styles.rewardCardMastered]}>
            {/* Coach Character Celebration or Encouragement */}
            <CoachCharacter
              pose={isPassed ? (isMastered ? 'celebrating' : 'stance') : 'thinking'}
              size={110}
              style={{ marginBottom: 6 }}
            />

            {/* Mastered / Passed / Needs Correction Heading */}
            <Text style={[styles.rewardHeading, isMastered && styles.rewardHeadingMastered]}>
              {isMastered ? '🎉 STRIKE MASTERED!' : isPassed ? '🎉 TECHNIQUE PASSED!' : '⚠️ NEEDS CORRECTION'}
            </Text>

            {isPassed ? (
              <View style={styles.masteredBanner}>
                <Text style={styles.masteredBannerText}>
                  {"You've unlocked the next technique!"}
                </Text>
              </View>
            ) : (
              <View style={[styles.masteredBanner, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                <Text style={[styles.masteredBannerText, { color: '#DC2626' }]}>
                  {"Score 75%+ (Grade C) to pass and unlock the next strike."}
                </Text>
              </View>
            )}

            <Text style={styles.strikeTitle}>
              Strike {strikeRule.strikeNumber} — {strikeRule.target.split('/')[0].trim()}
            </Text>

            {/* Big Score & Stars Row */}
            <View style={styles.scoreContainer}>
              <Text style={[styles.bigScoreText, { color: getScoreColor(result.score) }]}>
                {result.score}%
              </Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((st) => (
                  <Ionicons
                    key={st}
                    name={st <= result.stars ? 'star' : 'star-outline'}
                    size={24}
                    color={st <= result.stars ? MartialTheme.colors.bamboo : '#D1D5DB'}
                    style={{ marginHorizontal: 2 }}
                  />
                ))}
              </View>

              {/* Sash Rank Badge */}
              <View
                style={[
                  styles.resultSashBadge,
                  {
                    backgroundColor: sashInfo.sashColor,
                    borderColor: sashInfo.borderColor,
                  },
                ]}
              >
                <MaterialCommunityIcons name="sword-cross" size={12} color={sashInfo.textColor} />
                <Text style={[styles.resultSashBadgeText, { color: sashInfo.textColor }]}>
                  {sashInfo.shortName} Rank
                </Text>
              </View>

              {/* Score Delta or Personal Best */}
              {improvement.previousBest > 0 && (
                <View style={styles.deltaPill}>
                  {improvement.delta > 0 ? (
                    <Text style={styles.deltaPillPositive}>
                      ↑ +{improvement.delta} points from last time!
                    </Text>
                  ) : improvement.delta === 0 ? (
                    <Text style={styles.deltaPillNeutral}>= Steady performance</Text>
                  ) : (
                    <Text style={styles.deltaPillNeutral}>
                      Previous best: {improvement.previousBest}%
                    </Text>
                  )}
                </View>
              )}
              {improvement.isNewPersonalBest && (
                <View style={styles.personalBestBadge}>
                  <Ionicons name="sparkles" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.personalBestText}>NEW PERSONAL BEST!</Text>
                </View>
              )}
            </View>

            {/* Coach Advice Speech Bubble */}
            <View style={styles.coachQuoteBubble}>
              <Text style={styles.coachQuoteLabel}>COACH SAYS</Text>
              <Text style={styles.coachQuoteText}>{`"${result.feedback.advice}"`}</Text>
            </View>

            {/* Pedagogical Form Checklist: What Went Well & Try This Next */}
            <View style={styles.feedbackSection}>
              {/* What Went Well */}
              <View style={styles.feedbackGroup}>
                <Text style={styles.feedbackGroupTitle}>WHAT WENT WELL</Text>
                {result.feedback.positives.length > 0 ? (
                  result.feedback.positives.map((pos, idx) => (
                    <View key={`pos_${idx}`} style={styles.feedbackItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#15803D" style={{ marginRight: 8 }} />
                      <Text style={styles.feedbackItemPosText}>{pos}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.feedbackItem}>
                    <Ionicons name="checkmark-circle" size={18} color="#15803D" style={{ marginRight: 8 }} />
                    <Text style={styles.feedbackItemPosText}>Solid effort and chamber engagement</Text>
                  </View>
                )}
              </View>

              {/* Try This Next */}
              <View style={styles.feedbackGroup}>
                <Text style={styles.feedbackGroupTitle}>TRY THIS NEXT</Text>
                {result.feedback.improvements.length > 0 ? (
                  result.feedback.improvements.map((imp, idx) => (
                    <View key={`imp_${idx}`} style={styles.feedbackItem}>
                      <Ionicons name="arrow-forward-circle" size={18} color={MartialTheme.colors.bambooDark} style={{ marginRight: 8 }} />
                      <Text style={styles.feedbackItemImpText}>{imp}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.feedbackItem}>
                    <Ionicons name="arrow-forward-circle" size={18} color={MartialTheme.colors.bambooDark} style={{ marginRight: 8 }} />
                    <Text style={styles.feedbackItemImpText}>Practice with fluid speed and flow</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Diagnostic & Coach Guidance Actions Row */}
            <View style={styles.resultHelpActionsRow}>
              <TouchableOpacity
                style={styles.whyResultBtn}
                activeOpacity={0.8}
                onPress={() => setShowWhyModal(true)}
              >
                <Ionicons name="help-circle" size={15} color="#0284C7" style={{ marginRight: 5 }} />
                <Text style={styles.whyResultBtnText}>Why This Score? 🔍</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.askCoachResultBtn}
                activeOpacity={0.8}
                onPress={() => {
                  router.push({
                    pathname: '/coach-hub' as any,
                    params: {
                      strikeId: strikeRule.id,
                      strikeName: strikeRule.name,
                      recentScore: result.score.toString(),
                      weakness: result.feedback.improvements[0] || 'form alignment and recovery',
                      source: 'result',
                    },
                  });
                }}
              >
                <Ionicons name="chatbubble-ellipses" size={15} color="#065F46" style={{ marginRight: 5 }} />
                <Text style={styles.askCoachResultBtnText}>Ask Coach 💬</Text>
              </TouchableOpacity>
            </View>

          </View>
        )}

        {/* --- 2. 3-PHASE KINETIC SEQUENCE CARD (25% Chamber / 50% Apex / 25% Recovery) --- */}
        <View style={styles.kineticCard}>
          <View style={styles.kineticHeaderRow}>
            <View style={styles.kineticHeaderLeft}>
              <MaterialCommunityIcons name="timer-sand-complete" size={20} color={MartialTheme.colors.bambooDark} />
              <Text style={styles.kineticHeaderTitle}>Kinetic Strike Phases</Text>
            </View>
            <View style={styles.kineticFormulaBadge}>
              <Text style={styles.kineticFormulaBadgeText}>25% • 50% • 25% FORMULA</Text>
            </View>
          </View>
          <Text style={styles.kineticSubtitle}>
            Full Arnis strike evaluated across 3 canonical motion phases:
          </Text>

          <View style={styles.kineticPhasesRow}>
            {/* Phase 1: Chamber */}
            <View style={styles.phaseCol}>
              <View style={[styles.phaseIconContainer, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="shield-account" size={20} color="#2563EB" />
              </View>
              <Text style={styles.phaseLabel}>1. Chamber</Text>
              <Text style={styles.phaseWeight}>25% weight</Text>
              <Text style={[styles.phaseScore, { color: getScoreColor(result.kineticPhases?.chamber ?? result.pillarScores.stance) }]}>
                {result.kineticPhases?.chamber ?? result.pillarScores.stance}%
              </Text>
              <View style={styles.phaseProgressBarTrack}>
                <View
                  style={[
                    styles.phaseProgressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, result.kineticPhases?.chamber ?? result.pillarScores.stance))}%`,
                      backgroundColor: getScoreColor(result.kineticPhases?.chamber ?? result.pillarScores.stance),
                    },
                  ]}
                />
              </View>
              <Text style={styles.phaseDesc}>Ready & Guard</Text>
            </View>

            <View style={styles.phaseDivider} />

            {/* Phase 2: Apex Impact */}
            <View style={[styles.phaseCol, styles.phaseColApex]}>
              <View style={[styles.phaseIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="sword-cross" size={22} color="#D97706" />
              </View>
              <Text style={[styles.phaseLabel, { color: '#B45309' }]}>2. Apex Impact</Text>
              <Text style={styles.phaseWeight}>50% (Primary)</Text>
              <Text style={[styles.phaseScore, styles.phaseScoreApex, { color: getScoreColor(result.kineticPhases?.apex ?? result.score) }]}>
                {result.kineticPhases?.apex ?? result.score}%
              </Text>
              <View style={styles.phaseProgressBarTrack}>
                <View
                  style={[
                    styles.phaseProgressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, result.kineticPhases?.apex ?? result.score))}%`,
                      backgroundColor: getScoreColor(result.kineticPhases?.apex ?? result.score),
                    },
                  ]}
                />
              </View>
              <Text style={styles.phaseDesc}>Strike Trajectory</Text>
            </View>

            <View style={styles.phaseDivider} />

            {/* Phase 3: Recovery */}
            <View style={styles.phaseCol}>
              <View style={[styles.phaseIconContainer, { backgroundColor: '#ECFDF5' }]}>
                <MaterialCommunityIcons name="sync" size={20} color="#059669" />
              </View>
              <Text style={styles.phaseLabel}>3. Recovery</Text>
              <Text style={styles.phaseWeight}>25% weight</Text>
              <Text style={[styles.phaseScore, { color: getScoreColor(result.kineticPhases?.recovery ?? result.pillarScores.strikingArm) }]}>
                {result.kineticPhases?.recovery ?? result.pillarScores.strikingArm}%
              </Text>
              <View style={styles.phaseProgressBarTrack}>
                <View
                  style={[
                    styles.phaseProgressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, result.kineticPhases?.recovery ?? result.pillarScores.strikingArm))}%`,
                      backgroundColor: getScoreColor(result.kineticPhases?.recovery ?? result.pillarScores.strikingArm),
                    },
                  ]}
                />
              </View>
              <Text style={styles.phaseDesc}>Return to Kalasag</Text>
            </View>
          </View>

          {/* Formula summary footer */}
          <View style={styles.kineticFormulaFooter}>
            <Ionicons name="information-circle-outline" size={14} color={MartialTheme.colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.kineticFormulaFooterText}>
              Formula: (Chamber × 25%) + (Apex × 50%) + (Recovery × 25%) = {result.score}%
            </Text>
          </View>
        </View>

        {/* --- 3. COACH VS YOU POSTURE COMPARISON CARD --- */}
        <CoachVsYou
          strikeRule={strikeRule}
          coachReference={coachRef}
          userSnapshotUri={lastSnapshot}
          userScore={result.score}
          userPillars={{
            strikingArm: result.pillarScores.strikingArm,
            guard: result.pillarScores.guard,
            stance: result.pillarScores.stance,
            wrist: result.pillarScores.wrist,
          }}
          userActualAngles={lastImpactMeta?.actualAngles}
          userImpactTime={lastImpactMeta?.impactTime ?? 1.45}
          coachImpactTime={coachRef.impactTime}
          confidence={lastImpactMeta?.confidence ?? 0.85}
          onOpenVideoComparison={() => setShowComparisonPlayer(true)}
          hasUserVideo={Boolean(attachedVideoUri || lastReplayVideo)}
        />

        {/* --- 3. COLLAPSIBLE DETAILED BIOMECHANICAL ANALYSIS --- */}
        <TouchableOpacity
          style={styles.toggleDetailsBtn}
          activeOpacity={0.75}
          onPress={() => setShowTechnicalDetails(!showTechnicalDetails)}
        >
          <Ionicons
            name={showTechnicalDetails ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={MartialTheme.colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.toggleDetailsBtnText}>
            {showTechnicalDetails ? 'Hide Detailed Analysis' : 'View Detailed Analysis'}
          </Text>
        </TouchableOpacity>

        {showTechnicalDetails && (
          <View style={styles.technicalCard}>
            <Text style={styles.technicalCardTitle}>4-Pillar Biomechanical Alignment</Text>

            {/* Pillar 1: Striking Arm */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarTextRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="sword" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text style={styles.pillarLabel}>Striking Arm Trajectory</Text>
                </View>
                <Text style={[styles.pillarScore, { color: getScoreColor(result.pillarScores.strikingArm) }]}>
                  {result.pillarScores.strikingArm}%
                </Text>
              </View>
              <View style={styles.pillarTrack}>
                <View
                  style={[
                    styles.pillarFill,
                    {
                      width: `${result.pillarScores.strikingArm}%`,
                      backgroundColor: getScoreColor(result.pillarScores.strikingArm),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Pillar 2: Kalasag Guard */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarTextRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="shield-check" size={16} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.pillarLabel}>Check Hand Defense (Kalasag)</Text>
                </View>
                <Text style={[styles.pillarScore, { color: getScoreColor(result.pillarScores.guard) }]}>
                  {result.pillarScores.guard}%
                </Text>
              </View>
              <View style={styles.pillarTrack}>
                <View
                  style={[
                    styles.pillarFill,
                    {
                      width: `${result.pillarScores.guard}%`,
                      backgroundColor: getScoreColor(result.pillarScores.guard),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Pillar 3: Tindig Stance */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarTextRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="human-male-height" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.pillarLabel}>Base Stability (Tindig)</Text>
                </View>
                <Text style={[styles.pillarScore, { color: getScoreColor(result.pillarScores.stance) }]}>
                  {result.pillarScores.stance}%
                </Text>
              </View>
              <View style={styles.pillarTrack}>
                <View
                  style={[
                    styles.pillarFill,
                    {
                      width: `${result.pillarScores.stance}%`,
                      backgroundColor: getScoreColor(result.pillarScores.stance),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Pillar 4: Pitik Wrist */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarTextRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="flash" size={16} color="#8B5CF6" style={{ marginRight: 6 }} />
                  <Text style={styles.pillarLabel}>Wrist Snap & Alignment (Pitik)</Text>
                </View>
                <Text style={[styles.pillarScore, { color: getScoreColor(result.pillarScores.wrist) }]}>
                  {result.pillarScores.wrist}%
                </Text>
              </View>
              <View style={styles.pillarTrack}>
                <View
                  style={[
                    styles.pillarFill,
                    {
                      width: `${result.pillarScores.wrist}%`,
                      backgroundColor: getScoreColor(result.pillarScores.wrist),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Video Motion Replay or Screen Recording Attachment Card */}
            {attachedVideoUri ? (
              <View style={styles.mediaContainer}>
                <View style={styles.mediaHeaderRow}>
                  <Text style={styles.mediaHeading}>STRIKE MOTION REPLAY</Text>
                  <TouchableOpacity
                    style={styles.changeVideoBtn}
                    onPress={handlePickVideo}
                    disabled={isPickingVideo}
                    activeOpacity={0.75}>
                    <Ionicons name="swap-horizontal" size={13} color="#2563EB" />
                    <Text style={styles.changeVideoBtnText}>Change Video</Text>
                  </TouchableOpacity>
                </View>
                <PracticeResultVideoPlayer videoUri={attachedVideoUri} />
              </View>
            ) : (
              <>
                {/* Snapshot if available */}
                {lastSnapshot && (
                  <View style={styles.mediaContainer}>
                    <Text style={styles.mediaHeading}>IMPACT ZONE SNAPSHOT</Text>
                    <Image source={{ uri: lastSnapshot }} style={styles.snapshotImg} resizeMode="contain" />
                  </View>
                )}

                {/* Attach Video Action Card */}
                <View style={styles.attachVideoCard}>
                  <View style={styles.attachVideoIconBox}>
                    <MaterialCommunityIcons name="cellphone-play" size={26} color={MartialTheme.colors.primary} />
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.attachVideoTitle}>Attach Screen Recording</Text>
                    <Text style={styles.attachVideoDesc}>
                      Recorded your screen during this strike? Select the video to preview and share it with your Guro coach.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.attachVideoBtn}
                    onPress={handlePickVideo}
                    disabled={isPickingVideo}
                    activeOpacity={0.85}>
                    <Ionicons name="folder-open-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.attachVideoBtnText}>
                      {isPickingVideo ? 'Selecting...' : 'Select Video'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Diagnostic Button */}
            <TouchableOpacity
              style={styles.whyBtn}
              onPress={() => setShowWhyModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle" size={16} color="#0284C7" style={{ marginRight: 6 }} />
              <Text style={styles.whyBtnText}>Why Did I Get {result.score}%? (Diagnosis)</Text>
            </TouchableOpacity>

            {/* Research Shadow Telemetry (Non-Grading) */}
            {result.shadowEvaluation && (
              <View style={styles.shadowTelemetryBox}>
                <Text style={styles.shadowTelemetryHeading}>
                  SHADOW RESEARCH TELEMETRY (NON-GRADING)
                </Text>
                <Text style={styles.shadowTelemetryLine}>
                  Status: {result.shadowEvaluation.referenceStatus} · Frames:{' '}
                  {result.shadowEvaluation.measurementCoverage.validNormalizedFrames}/
                  {result.shadowEvaluation.measurementCoverage.totalFrames} (V2 shoulder scale:{' '}
                  {result.shadowEvaluation.normalizationMeta.fixedMedianShoulderWidthPx ?? 'N/A'}px)
                </Text>
                {result.shadowEvaluation.trajectoryMetrics && (
                  <Text style={styles.shadowTelemetryLine}>
                    DTW Mean/RMS Dist:{' '}
                    {result.shadowEvaluation.trajectoryMetrics.dtwMeanDistance.toFixed(3)} /{' '}
                    {result.shadowEvaluation.trajectoryMetrics.dtwRmsDistance.toFixed(3)} · Dir
                    Cosine:{' '}
                    {result.shadowEvaluation.trajectoryMetrics.directionCosineMean !== null
                      ? result.shadowEvaluation.trajectoryMetrics.directionCosineMean.toFixed(3)
                      : 'N/A'}{' '}
                    · Dir Agree:{' '}
                    {result.shadowEvaluation.trajectoryMetrics.directionAgreementFraction !== null
                      ? `${Math.round(
                          result.shadowEvaluation.trajectoryMetrics.directionAgreementFraction * 100
                        )}%`
                      : 'N/A'}
                  </Text>
                )}
                {result.shadowEvaluation.kinematicLandmarks && (
                  <Text style={styles.shadowTelemetryLine}>
                    Kinematic Peak Speed (non-impact):{' '}
                    {result.shadowEvaluation.kinematicLandmarks.userPeakWristSpeedNormPerSec?.toFixed(
                      2
                    ) ?? 'N/A'}{' '}
                    shld/s @ tNorm{' '}
                    {result.shadowEvaluation.kinematicLandmarks.userPeakSpeedTimeNorm ?? 'N/A'}
                  </Text>
                )}
                {result.shadowEvaluation.jointComparisons2D.map((jc, idx) => (
                  <Text key={`${jc.jointName}_${jc.phase}_${idx}`} style={styles.shadowTelemetryLine}>
                    2D {jc.jointName} ({jc.phase}) [{jc.reliabilityStatus}]: actual{' '}
                    {jc.actualAngle2D !== null ? `${jc.actualAngle2D}°` : 'N/A'} vs median{' '}
                    {jc.referenceMedian2D !== null ? `${jc.referenceMedian2D}°` : 'N/A'}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* --- COACH VIDEO SHARING PERMISSION CARD --- */}
        {(attachedVideoUri || lastReplayVideo || lastSnapshot) && (
          <View style={styles.shareCoachCard}>
            <View style={styles.shareCoachHeaderRow}>
              <View style={styles.shareCoachIconBadge}>
                <MaterialCommunityIcons name="shield-account" size={22} color="#15803D" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.shareCoachTitle}>Share Video with Coach</Text>
                <Text style={styles.shareCoachSubtitle}>
                  {attachedVideoUri
                    ? 'Allow your connected Guro to inspect this practice attempt and give form corrections.'
                    : 'Attach a screen recording above, then toggle this ON to submit it for your Guro coach to review.'}
                </Text>
              </View>
              <Switch
                value={shareVideoWithCoach}
                onValueChange={handleToggleShareVideo}
                disabled={isSyncingVideo}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={shareVideoWithCoach ? '#15803D' : '#9CA3AF'}
              />
            </View>

            <View style={styles.privacyNoteRow}>
              <Ionicons name="lock-closed" size={12} color="#6B7280" />
              <Text style={styles.privacyNoteText}>
                {shareVideoWithCoach
                  ? 'Video shared securely with your coach on cloud storage'
                  : 'Video stays private on your phone only (saves storage and bandwidth)'}
              </Text>
            </View>

            {syncStatus && (
              <View style={styles.syncStatusRow}>
                <Ionicons
                  name={syncStatus.includes('shared') || syncStatus.includes('Shared') ? 'checkmark-circle' : 'cloud-upload-outline'}
                  size={15}
                  color={syncStatus.includes('shared') || syncStatus.includes('Shared') ? '#15803D' : '#D97706'}
                />
                <Text style={[styles.syncStatusText, (syncStatus.includes('shared') || syncStatus.includes('Shared')) && { color: '#15803D' }]}>
                  {syncStatus}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Return to menu / lesson exit link */}
        <TouchableOpacity
          style={styles.outlineExitBtn}
          activeOpacity={0.8}
          onPress={isFromLesson ? (onExitLesson || onExit) : onExit}
        >
          <Text style={styles.outlineExitBtnText}>
            {isFromLesson ? 'Return to Lesson' : 'Back to Practice Menu'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Persistent Bottom Action Bar */}
      <View style={styles.bottomStickyBar}>
        {isAnyo ? (
          <View style={styles.stickyRow}>
            <View style={{ flex: 1.4 }}>
              <TactileButton
                title="PRACTICE AGAIN ⚔️"
                variant="primary"
                size="md"
                icon={<Ionicons name="repeat" size={16} color="#FFFFFF" />}
                onPress={onPracticeAnyoAgain || onRetry}
              />
            </View>
            {onNextRoutine && (
              <View style={{ flex: 1.2 }}>
                <TactileButton
                  title="NEXT ANYO →"
                  variant="bamboo"
                  size="md"
                  icon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
                  onPress={onNextRoutine}
                />
              </View>
            )}
            <TouchableOpacity
              style={styles.stickyIconBtn}
              onPress={onExit}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={MartialTheme.colors.text} />
              <Text style={styles.stickyIconBtnText}>Exit</Text>
            </TouchableOpacity>
          </View>
        ) : isFromLesson ? (
          isPassed ? (
            <View style={styles.stickyRow}>
              {onContinueLesson && (
                <View style={{ flex: 1.3 }}>
                  <TactileButton
                    title={practiceMode === 'test' ? "TEST PASSED! UNLOCK →" : "CONTINUE LESSON →"}
                    variant="primary"
                    size="md"
                    onPress={onContinueLesson}
                  />
                </View>
              )}
              {onRetest && (
                <View style={{ flex: 1 }}>
                  <TactileButton
                    title="RE-TEST ⚔️"
                    variant="bamboo"
                    size="md"
                    icon={<Ionicons name="flash" size={15} color="#FFFFFF" />}
                    onPress={onRetest}
                  />
                </View>
              )}
              <TouchableOpacity
                style={styles.stickyIconBtn}
                onPress={onRetry}
                activeOpacity={0.7}
              >
                <Ionicons name="fitness-outline" size={18} color={MartialTheme.colors.text} />
                <Text style={styles.stickyIconBtnText}>Warmup</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.stickyRow}>
              <View style={{ flex: 1.4 }}>
                <TactileButton
                  title="RE-TEST (75%+ TO PASS) ⚔️"
                  variant="primary"
                  size="md"
                  icon={<Ionicons name="flash" size={16} color="#FFFFFF" />}
                  onPress={onRetest || onRetry}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TactileButton
                  title="WARMUP"
                  variant="secondary"
                  size="md"
                  icon={<Ionicons name="fitness-outline" size={16} color={MartialTheme.colors.text} />}
                  onPress={onRetry}
                />
              </View>
            </View>
          )
        ) : (
          <View style={styles.stickyRow}>
            {isPassed ? (
              <>
                {onNextStrike ? (
                  <View style={{ flex: 1.4 }}>
                    <TactileButton
                      title={`STRIKE ${strikeRule.strikeNumber >= 12 ? 1 : strikeRule.strikeNumber + 1} →`}
                      variant="primary"
                      size="md"
                      onPress={onNextStrike}
                    />
                  </View>
                ) : null}
                {onRetest ? (
                  <View style={{ flex: 1 }}>
                    <TactileButton
                      title="RE-TEST ⚔️"
                      variant="bamboo"
                      size="md"
                      icon={<Ionicons name="flash" size={15} color="#FFFFFF" />}
                      onPress={onRetest}
                    />
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <TactileButton
                      title="WARMUP"
                      variant="secondary"
                      size="md"
                      icon={<Ionicons name="fitness-outline" size={15} color={MartialTheme.colors.text} />}
                      onPress={onRetry}
                    />
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={{ flex: 1.4 }}>
                  <TactileButton
                    title="RE-TEST (75%+ TO PASS) ⚔️"
                    variant="primary"
                    size="md"
                    icon={<Ionicons name="flash" size={15} color="#FFFFFF" />}
                    onPress={onRetest || onRetry}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TactileButton
                    title="WARMUP"
                    variant="secondary"
                    size="md"
                    icon={<Ionicons name="fitness-outline" size={15} color={MartialTheme.colors.text} />}
                    onPress={onRetry}
                  />
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* Diagnosis Modal */}
      <WhyFailedModal
        visible={showWhyModal}
        onClose={() => setShowWhyModal(false)}
        overallScore={result.score}
        grade={result.grade}
        strikeName={strikeRule.name}
        strikeId={strikeRule.id}
        breakdown={{
          directionScore: result.elbowScore,
          bodyScore: result.stanceScore,
          guardScore: result.guardScore,
          wristScore: result.wristScore,
        }}
        onPracticeLesson={(targetId) => {
          setShowWhyModal(false);
          if (targetId && targetId.startsWith('les_')) {
            router.push({
              pathname: `/lesson/${targetId}` as any,
            });
          } else {
            onRetry();
          }
        }}
        onRetryStrike={() => {
          setShowWhyModal(false);
          onRetry();
        }}
      />

      {/* Synchronized Dual Video Comparison Modal */}
      {showComparisonPlayer && (
        <ComparisonPlayer
          visible={showComparisonPlayer}
          onClose={() => setShowComparisonPlayer(false)}
          strikeRule={strikeRule}
          coachReference={coachRef}
          userVideoUri={attachedVideoUri || lastReplayVideo}
          userSnapshotUri={lastSnapshot}
          userImpactTime={lastImpactMeta?.impactTime ?? 1.45}
          coachImpactTime={coachRef.impactTime}
        />
      )}

      {/* Sash Rank Promotion Modal */}
      {promotionResult && (
        <SashPromotionModal
          visible={showPromotionModal}
          onClose={() => setShowPromotionModal(false)}
          newRank={promotionResult.newRank}
          currentLevel={promotionResult.level}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  resultSashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 8,
    marginBottom: 4,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultSashBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  closeHeaderBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // REWARD HERO CARD
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 16,
  },
  rewardCardMastered: {
    borderColor: '#86EFAC',
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  rewardHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  rewardHeadingMastered: {
    color: MartialTheme.colors.primaryDark,
  },
  masteredBanner: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  masteredBannerText: {
    fontSize: 12,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
  },
  strikeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    marginTop: 6,
  },

  // SCORE CONTAINER
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  bigScoreText: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 54,
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 6,
  },
  deltaPill: {
    marginTop: 4,
  },
  deltaPillPositive: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803D',
  },
  deltaPillNeutral: {
    fontSize: 12,
    fontWeight: '600',
    color: MartialTheme.colors.textMuted,
  },
  personalBestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.flame,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  personalBestText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // COACH QUOTE BUBBLE
  coachQuoteBubble: {
    width: '100%',
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    marginBottom: 16,
  },
  coachQuoteLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 1,
    marginBottom: 3,
  },
  coachQuoteText: {
    fontSize: 13,
    color: MartialTheme.colors.text,
    lineHeight: 18,
    fontWeight: '600',
  },

  // FEEDBACK SECTION (WHAT WENT WELL / TRY THIS NEXT)
  feedbackSection: {
    width: '100%',
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    marginBottom: 16,
    gap: 12,
  },
  feedbackGroup: {},
  feedbackGroupTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  feedbackItemPosText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  feedbackItemImpText: {
    fontSize: 13,
    fontWeight: '600',
    color: MartialTheme.colors.text,
    flex: 1,
  },

  resultHelpActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 14,
    marginBottom: 6,
  },
  whyResultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  whyResultBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  askCoachResultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  askCoachResultBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#065F46',
  },

  // ACTION BUTTONS
  actionButtonsCol: {
    width: '100%',
    gap: 10,
  },
  outlineExitBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineExitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
  },

  // TOGGLE DETAILS
  toggleDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  toggleDetailsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
  },

  // TECHNICAL CARD
  technicalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 16,
    gap: 10,
  },
  technicalCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  pillarItem: {
    gap: 4,
  },
  pillarTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: MartialTheme.colors.text,
  },
  pillarScore: {
    fontSize: 12,
    fontWeight: '900',
  },
  pillarTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  pillarFill: {
    height: '100%',
    borderRadius: 4,
  },
  mediaContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
    paddingTop: 10,
  },
  mediaHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  videoWrapper: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  snapshotImg: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#000000',
  },
  whyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 4,
  },
  whyBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0284C7',
  },

  // 3-PHASE KINETIC CARD
  kineticCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 16,
  },
  kineticHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kineticHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kineticHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: 0.3,
  },
  kineticFormulaBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  kineticFormulaBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  kineticSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: MartialTheme.colors.textMuted,
    marginBottom: 14,
  },
  kineticPhasesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: MartialTheme.colors.backgroundSecondary,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  phaseCol: {
    flex: 1,
    alignItems: 'center',
  },
  phaseColApex: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  phaseDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
    backgroundColor: MartialTheme.colors.border,
    marginHorizontal: 4,
  },
  phaseIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  phaseLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    textAlign: 'center',
  },
  phaseWeight: {
    fontSize: 9,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  phaseScore: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  phaseScoreApex: {
    fontSize: 20,
  },
  phaseProgressBarTrack: {
    width: '80%',
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  phaseProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  phaseDesc: {
    fontSize: 9.5,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
  },
  kineticFormulaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  kineticFormulaFooterText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
  },

  // STICKY BOTTOM ACTION BAR
  bottomStickyBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderTopColor: MartialTheme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  stickyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickyIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: MartialTheme.colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    minHeight: 46,
  },
  stickyIconBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginTop: 2,
  },

  // ANYO KATA RESULT HERO STYLES
  anyoSubtitle: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  rhythmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
  },
  rhythmText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B45309',
  },
  anyoBreakdownSection: {
    width: '100%',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
    paddingTop: 14,
  },
  anyoBreakdownHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  anyoStepCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  anyoStepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anyoStepIndexBadge: {
    backgroundColor: MartialTheme.colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  anyoStepIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  anyoStepNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  anyoStepScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  anyoStepScoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  anyoStepDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  anyoStepDurationText: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '600',
  },
  anyoStepAngleText: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    fontWeight: '500',
  },
  anyoHeroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    width: '100%',
  },
  anyoPracticeAgainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  anyoPracticeAgainText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  anyoNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.bambooDark,
    paddingVertical: 12,
    borderRadius: 10,
  },
  anyoNextBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shareCoachCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  shareCoachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareCoachIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCoachTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginBottom: 2,
  },
  shareCoachSubtitle: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 15,
  },
  privacyNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  privacyNoteText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    paddingHorizontal: 2,
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
  },
  nativeVideoContainer: {
    height: 220,
    backgroundColor: '#000000',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  nativeVideoView: {
    width: '100%',
    height: '100%',
  },
  mediaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  changeVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  changeVideoBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  attachVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    marginTop: 10,
    gap: 12,
  },
  attachVideoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachVideoTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#14532D',
  },
  attachVideoDesc: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
    marginTop: 2,
  },
  attachVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: MartialTheme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'center',
  },
  attachVideoBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shadowTelemetryBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 4,
  },
  shadowTelemetryHeading: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  shadowTelemetryLine: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
});

import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';

import { MartialTheme } from '@/constants/theme';
import { StrikeRule } from '@/constants/strikeRules';
import { StrikeEvaluationResult } from '@/engine/evaluation/evaluationTypes';
import { SessionImprovement } from '@/hooks/usePracticeSession';
import { CoachCharacter } from '@/components/ui/CoachCharacter';
import { WhyFailedModal } from '@/components/WhyFailedModal';
import { TactileButton } from '@/components/ui/TactileButton';
import { CoachVsYou } from '@/components/comparison/CoachVsYou';
import { ComparisonPlayer } from '@/components/comparison/ComparisonPlayer';
import { getCoachReference } from '@/constants/referenceStore';

export interface PracticeResultProps {
  result: StrikeEvaluationResult;
  improvement: SessionImprovement;
  strikeRule: StrikeRule;
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
    };
  };
  isFromLesson?: boolean;
  onRetry: () => void;
  onRetest?: () => void;
  onNextStrike?: () => void;
  onExit: () => void;
  onContinueLesson?: () => void;
  onExitLesson?: () => void;
}

export function PracticeResult({
  result,
  improvement,
  strikeRule,
  lastSnapshot,
  lastReplayVideo,
  lastImpactMeta,
  isFromLesson,
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

  const coachRef = getCoachReference(strikeRule.id);

  const isMastered = improvement.isMastered || result.score >= 85;

  const getScoreColor = (score: number) => {
    if (score >= 85) return MartialTheme.colors.primary;
    if (score >= 70) return MartialTheme.colors.bamboo;
    return '#EF4444';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isMastered ? 'Mastery Achieved! 🏆' : 'Practice Results'}
        </Text>
        <TouchableOpacity onPress={onExit} style={styles.closeHeaderBtn}>
          <Ionicons name="close" size={24} color={MartialTheme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* --- 1. CELEBRATION REWARD HERO CARD --- */}
        <View style={[styles.rewardCard, isMastered && styles.rewardCardMastered]}>
          {/* Coach Character Celebration or Encouragement */}
          <CoachCharacter
            pose={isMastered ? 'celebrating' : 'stance'}
            size={110}
            style={{ marginBottom: 6 }}
          />

          {/* Mastered / Nice Work Heading */}
          <Text style={[styles.rewardHeading, isMastered && styles.rewardHeadingMastered]}>
            {isMastered ? '🎉 STRIKE MASTERED!' : '🎉 NICE WORK!'}
          </Text>

          {isMastered && (
            <View style={styles.masteredBanner}>
              <Text style={styles.masteredBannerText}>
                {"You've unlocked the next technique!"}
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

          {/* Ask Coach Contextual Advice Button */}
          <TouchableOpacity
            style={styles.askCoachResultBtn}
            activeOpacity={0.8}
            onPress={() => {
              router.push({
                pathname: '/chat' as any,
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
            <Ionicons name="chatbubble-ellipses" size={16} color="#065F46" style={{ marginRight: 6 }} />
            <Text style={styles.askCoachResultBtnText}>💬 Ask Coach About This Score</Text>
          </TouchableOpacity>

        </View>

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
          hasUserVideo={!!lastReplayVideo}
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

            {/* Video Motion Replay if available */}
            {lastReplayVideo && (
              <View style={styles.mediaContainer}>
                <Text style={styles.mediaHeading}>VIDEO MOTION REPLAY</Text>
                <View style={styles.videoWrapper}>
                  <WebView
                    originWhitelist={['*']}
                    source={{
                      html: `
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                            <style>body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; } video { width: 100%; height: 100%; object-fit: contain; }</style>
                          </head>
                          <body><video src="${lastReplayVideo}" autoplay loop muted playsinline controls></video></body>
                        </html>
                      `,
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {/* Snapshot if available */}
            {lastSnapshot && !lastReplayVideo && (
              <View style={styles.mediaContainer}>
                <Text style={styles.mediaHeading}>IMPACT ZONE SNAPSHOT</Text>
                <Image source={{ uri: lastSnapshot }} style={styles.snapshotImg} resizeMode="contain" />
              </View>
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
        {isFromLesson ? (
          result.score >= 70 ? (
            <View style={styles.stickyRow}>
              {onContinueLesson && (
                <View style={{ flex: 1.3 }}>
                  <TactileButton
                    title="CONTINUE LESSON →"
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
                  title="RE-TEST FORM ⚔️"
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
            {onRetest && (
              <View style={{ flex: 1 }}>
                <TactileButton
                  title="RE-TEST ⚔️"
                  variant="primary"
                  size="md"
                  icon={<Ionicons name="flash" size={15} color="#FFFFFF" />}
                  onPress={onRetest}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <TactileButton
                title="WARMUP"
                variant={onRetest ? "secondary" : "primary"}
                size="md"
                icon={<Ionicons name="fitness-outline" size={15} color={onRetest ? MartialTheme.colors.text : "#FFFFFF"} />}
                onPress={onRetry}
              />
            </View>
            {onNextStrike && (
              <View style={{ flex: 1 }}>
                <TactileButton
                  title={`STRIKE ${strikeRule.strikeNumber >= 12 ? 1 : strikeRule.strikeNumber + 1} →`}
                  variant={isMastered ? 'primary' : 'bamboo'}
                  size="md"
                  onPress={onNextStrike}
                />
              </View>
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
        onPracticeLesson={() => {
          setShowWhyModal(false);
          onRetry();
        }}
      />

      {/* Synchronized Dual Video Comparison Modal */}
      <ComparisonPlayer
        visible={showComparisonPlayer}
        onClose={() => setShowComparisonPlayer(false)}
        strikeRule={strikeRule}
        coachReference={coachRef}
        userVideoUri={lastReplayVideo}
        userImpactTime={lastImpactMeta?.impactTime ?? 1.45}
        coachImpactTime={coachRef.impactTime}
      />
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

  askCoachResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 16,
    width: '100%',
    marginTop: 14,
    marginBottom: 10,
  },
  askCoachResultBtnText: {
    fontSize: 13,
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
});

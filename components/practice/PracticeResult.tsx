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

import { MartialTheme } from '@/constants/theme';
import { StrikeRule } from '@/constants/strikeRules';
import { StrikeEvaluationResult } from '@/engine/evaluation/evaluationTypes';
import { SessionImprovement } from '@/hooks/usePracticeSession';
import { CoachCharacter } from '@/components/ui/CoachCharacter';
import { WhyFailedModal } from '@/components/WhyFailedModal';
import { TactileButton } from '@/components/ui/TactileButton';

export interface PracticeResultProps {
  result: StrikeEvaluationResult;
  improvement: SessionImprovement;
  strikeRule: StrikeRule;
  lastSnapshot?: string | null;
  lastReplayVideo?: string | null;
  isFromLesson?: boolean;
  onRetry: () => void;
  onNextStrike?: () => void;
  onExit: () => void;
  onContinueLesson?: () => void;
}

export function PracticeResult({
  result,
  improvement,
  strikeRule,
  lastSnapshot,
  lastReplayVideo,
  isFromLesson,
  onRetry,
  onNextStrike,
  onExit,
  onContinueLesson,
}: PracticeResultProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);

  const isMastered = improvement.isMastered || result.score >= 85;

  const getScoreColor = (score: number) => {
    if (score >= 85) return MartialTheme.colors.primary;
    if (score >= 70) return MartialTheme.colors.bamboo;
    return '#EF4444';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isMastered ? 'Mastery Achieved! 🏆' : 'Practice Results'}
        </Text>
        <TouchableOpacity onPress={onExit} style={styles.closeHeaderBtn}>
          <Ionicons name="close" size={24} color={MartialTheme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          {/* Primary Action Buttons */}
          <View style={styles.actionButtonsCol}>
            {isFromLesson && onContinueLesson && (
              <TactileButton
                title="CONTINUE LESSON →"
                variant="primary"
                size="lg"
                onPress={onContinueLesson}
              />
            )}

            <TactileButton
              title={isMastered ? 'PRACTICE AGAIN' : 'TRY AGAIN'}
              variant={isFromLesson ? 'secondary' : 'primary'}
              size="lg"
              icon={<Ionicons name="refresh" size={18} color={isFromLesson ? MartialTheme.colors.text : '#FFFFFF'} />}
              onPress={onRetry}
            />

            {onNextStrike && !isFromLesson && (
              <TactileButton
                title={`NEXT: STRIKE ${strikeRule.strikeNumber >= 12 ? 1 : strikeRule.strikeNumber + 1} →`}
                variant={isMastered ? 'primary' : 'bamboo'}
                size="md"
                onPress={onNextStrike}
              />
            )}

            <TouchableOpacity style={styles.outlineExitBtn} activeOpacity={0.8} onPress={onExit}>
              <Text style={styles.outlineExitBtnText}>Back to Practice Menu</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- 2. COLLAPSIBLE DETAILED BIOMECHANICAL ANALYSIS --- */}
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
      </ScrollView>

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
});

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

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10B981';
    if (score >= 75) return '#3B82F6';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const isMastered = improvement.isMastered || result.score >= 85;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Practice Results</Text>
        <TouchableOpacity onPress={onExit} style={styles.closeHeaderBtn}>
          <Ionicons name="close" size={24} color={MartialTheme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. COACH RESULT HERO CARD */}
        <View style={styles.resultHeroCard}>
          <CoachCharacter pose={isMastered ? 'celebrating' : 'stance'} size={110} />

          <Text style={styles.feedbackGreeting}>{result.feedback.greeting}</Text>

          <Text style={styles.strikeTitle}>
            {strikeRule.name} — {strikeRule.target}
          </Text>

          {/* Big Score Row */}
          <View style={styles.scoreRow}>
            <Text style={[styles.bigScore, { color: getScoreColor(result.score) }]}>
              {result.score}%
            </Text>
            <View style={[styles.gradeBadge, { backgroundColor: getScoreColor(result.score) + '20' }]}>
              <Text style={[styles.gradeBadgeText, { color: getScoreColor(result.score) }]}>
                {result.grade}
              </Text>
            </View>
          </View>

          {/* Star Rating */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((st) => (
              <Ionicons
                key={st}
                name={st <= result.stars ? 'star' : 'star-outline'}
                size={22}
                color={st <= result.stars ? '#F59E0B' : '#D1D5DB'}
              />
            ))}
          </View>

          {/* Improvement Delta Banner */}
          {improvement.previousBest > 0 && (
            <View style={styles.deltaBanner}>
              <Text style={styles.deltaBannerText}>
                Previous: {improvement.previousBest}% → Current: {result.score}%
                {improvement.delta > 0 && (
                  <Text style={{ color: '#15803D', fontWeight: '900' }}>
                    {' '}(↑ +{improvement.delta} points!)
                  </Text>
                )}
              </Text>
            </View>
          )}

          {/* Coach Advice Speech Bubble */}
          <View style={styles.coachBubble}>
            <Text style={styles.coachBubbleLabel}>YOUR COACH SAYS</Text>
            <Text style={styles.coachBubbleText}>{`"${result.feedback.advice}"`}</Text>
          </View>

          {/* Pedagogical Checklist: Good vs. Improve */}
          <View style={styles.checklistCard}>
            <Text style={styles.checklistHeading}>FORM ANALYSIS</Text>

            {result.feedback.positives.map((pos, idx) => (
              <View key={`pos_${idx}`} style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={16} color="#15803D" style={{ marginRight: 6 }} />
                <Text style={styles.checklistPosText}>{pos}</Text>
              </View>
            ))}

            {result.feedback.improvements.map((imp, idx) => (
              <View key={`imp_${idx}`} style={styles.checklistItem}>
                <Ionicons name="alert-circle" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                <Text style={styles.checklistImpText}>{imp}</Text>
              </View>
            ))}
          </View>

          {/* Primary Action Buttons */}
          <View style={{ width: '100%', gap: 10, marginTop: 14 }}>
            {isFromLesson && onContinueLesson ? (
              <TactileButton
                title="CONTINUE LESSON →"
                variant="primary"
                size="lg"
                onPress={onContinueLesson}
              />
            ) : null}

            <TactileButton
              title="TRY AGAIN"
              variant={isFromLesson ? 'secondary' : 'primary'}
              size="lg"
              icon={<Ionicons name="refresh" size={18} color="#FFFFFF" />}
              onPress={onRetry}
            />

            {onNextStrike && !isFromLesson && (
              <TactileButton
                title={`NEXT: STRIKE ${strikeRule.strikeNumber >= 12 ? 1 : strikeRule.strikeNumber + 1} →`}
                variant="secondary"
                size="md"
                onPress={onNextStrike}
              />
            )}

            <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.8} onPress={onExit}>
              <Text style={styles.outlineBtnText}>Back to Practice Menu</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. COLLAPSIBLE BIOMECHANICAL DETAILS */}
        <TouchableOpacity
          style={styles.toggleBreakdownBtn}
          activeOpacity={0.7}
          onPress={() => setShowTechnicalDetails(!showTechnicalDetails)}
        >
          <Ionicons
            name={showTechnicalDetails ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={MartialTheme.colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.toggleBreakdownBtnText}>
            {showTechnicalDetails ? 'Hide Biomechanical Details' : 'View Detailed Biomechanical Analysis'}
          </Text>
        </TouchableOpacity>

        {showTechnicalDetails && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsHeading}>4-Pillar Kinetic Alignment</Text>

            {/* Pillar 1: Striking Arm */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarTextRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="sword" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text style={styles.pillarLabel}>Striking Arm Trajectory</Text>
                </View>
                <Text style={[styles.pillarScoreText, { color: getScoreColor(result.pillarScores.strikingArm) }]}>
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
                <Text style={[styles.pillarScoreText, { color: getScoreColor(result.pillarScores.guard) }]}>
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
                <Text style={[styles.pillarScoreText, { color: getScoreColor(result.pillarScores.stance) }]}>
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
                <Text style={[styles.pillarScoreText, { color: getScoreColor(result.pillarScores.wrist) }]}>
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

            {/* Video Replay if available */}
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
    padding: 20,
    paddingBottom: 40,
  },
  resultHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 14,
  },
  feedbackGreeting: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  strikeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  bigScore: {
    fontSize: 48,
    fontWeight: '900',
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 8,
  },
  deltaBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
    width: '100%',
  },
  deltaBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    textAlign: 'center',
  },
  coachBubble: {
    width: '100%',
    backgroundColor: '#FAF8F3',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E0D3',
    marginBottom: 12,
  },
  coachBubbleLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    color: MartialTheme.colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  coachBubbleText: {
    fontSize: 12.5,
    color: MartialTheme.colors.text,
    lineHeight: 18,
    fontWeight: '500',
  },
  checklistCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checklistHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checklistPosText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  checklistImpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  outlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 2,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  toggleBreakdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  toggleBreakdownBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 20,
    gap: 12,
  },
  detailsHeading: {
    fontSize: 13,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  pillarItem: {},
  pillarTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pillarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: MartialTheme.colors.text,
  },
  pillarScoreText: {
    fontSize: 12.5,
    fontWeight: '900',
  },
  pillarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  pillarFill: {
    height: '100%',
    borderRadius: 3,
  },
  mediaContainer: {
    marginTop: 6,
  },
  mediaHeading: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 6,
  },
  videoWrapper: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  snapshotImg: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  whyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 4,
  },
  whyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
});

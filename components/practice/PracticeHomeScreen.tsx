import React, { useEffect, useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { MartialTheme } from '@/constants/theme';
import { CoachCharacter } from '@/components/ui/CoachCharacter';
import { TactileButton } from '@/components/ui/TactileButton';
import {
  ANYO_ROUTINES_CATALOG,
  AnyoRoutine,
  getHistory,
  getStrikeMasteryStats,
  MasteryStats,
  SessionItem,
} from '@/constants/historyStore';
import { getGamificationStats } from '@/constants/gamificationStore';

export interface PracticeHomeScreenProps {
  onStartStrike: (strikeId: string, mode?: 'follow' | 'guided' | 'test') => void;
  onStartAnyo: (routine: AnyoRoutine) => void;
  onOpenVideoGuide: (strikeId?: string) => void;
  onOpenTutorial: () => void;
  stickColor: string;
  setStickColor: (color: string) => void;
  voiceFeedbackEnabled: boolean;
  setVoiceFeedbackEnabled: (enabled: boolean) => void;
}

export function PracticeHomeScreen({
  onStartStrike,
  onStartAnyo,
  onOpenVideoGuide,
  onOpenTutorial,
  stickColor,
  setStickColor,
  voiceFeedbackEnabled,
  setVoiceFeedbackEnabled,
}: PracticeHomeScreenProps) {
  const router = useRouter();
  const [streakDays, setStreakDays] = useState(1);
  const [historyList, setHistoryList] = useState<SessionItem[]>([]);
  const [masteryStats, setMasteryStats] = useState<MasteryStats>(() => getStrikeMasteryStats([]));
  const [showAllStrikes, setShowAllStrikes] = useState(false);
  const [showAnyoPicker, setShowAnyoPicker] = useState(false);

  useEffect(() => {
    async function loadData() {
      const gStats = await getGamificationStats();
      setStreakDays(gStats.streakDays || 1);
      const hist = await getHistory();
      setHistoryList(hist || []);
      setMasteryStats(getStrikeMasteryStats(hist || []));
    }
    loadData();
  }, []);

  // Determine the recommended strike from actual mastery stats
  const recommendedStrike = useMemo(() => {
    const strikes = masteryStats.strikes;
    if (historyList.length === 0 || strikes.length === 0) {
      return {
        id: 'strike_1',
        strikeNumber: 1,
        name: 'Strike 1 — Left Temple',
        target: 'Left Temple / Neck',
        isNew: true,
        lastScore: null,
        stars: 0,
        coachTip: "Welcome to practice! Let's start with Strike 1. We'll guide your chamber, check hand, and slice.",
      };
    }

    const attempted = strikes.filter((s) => s.attempts > 0);
    const unattempted = strikes.filter((s) => s.attempts === 0);

    let target = strikes[0];

    // Priority 1: attempted but unmastered (< 85), pick lowest bestScore to polish
    const imperfect = attempted.filter((s) => s.bestScore < 85);
    if (imperfect.length > 0) {
      imperfect.sort((a, b) => a.bestScore - b.bestScore);
      target = imperfect[0];
    } else if (unattempted.length > 0) {
      // Priority 2: next unattempted strike in canonical order
      target = unattempted[0];
    } else {
      // All mastered, pick lowest to maintain sharpness
      const sorted = [...strikes].sort((a, b) => a.bestScore - b.bestScore);
      target = sorted[0];
    }

    let stars = 0;
    if (target.bestScore >= 95) stars = 5;
    else if (target.bestScore >= 85) stars = 4;
    else if (target.bestScore >= 75) stars = 3;
    else if (target.bestScore >= 60) stars = 2;
    else if (target.bestScore > 0) stars = 1;

    let coachTip = "Focus on clean body alignment and pin your Kalasag guard firmly to your chest.";
    if (target.bestScore > 0 && target.bestScore < 75) {
      coachTip = "Let's make this one smoother. Keep your recovery controlled back to guard position.";
    } else if (target.bestScore >= 75 && target.bestScore < 85) {
      coachTip = "You're close to mastery! Concentrate on sharp wrist snap (Pitik) at impact.";
    } else if (target.bestScore >= 85) {
      coachTip = "Master level execution! Practice with speed, rhythm, and explosive flow.";
    }

    return {
      id: target.id,
      strikeNumber: target.strikeNumber,
      name: `Strike ${target.strikeNumber} — ${target.target.split('/')[0].trim()}`,
      target: target.target,
      isNew: target.attempts === 0,
      lastScore: target.bestScore > 0 ? target.bestScore : null,
      stars,
      coachTip,
    };
  }, [historyList, masteryStats]);

  const renderStars = (count: number, size = 16) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Ionicons
            key={s}
            name={s <= count ? 'star' : 'star-outline'}
            size={size}
            color={s <= count ? MartialTheme.colors.bamboo : '#D1D5DB'}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  const displayedStrikes = showAllStrikes
    ? masteryStats.strikes
    : masteryStats.strikes.slice(0, 4);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* --- TOP HEADER & STREAK --- */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>PRACTICE</Text>
          <Text style={styles.headerSubtitle}>Keep your momentum going!</Text>
        </View>

        <View style={styles.headerRightGroup}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {streakDays}d</Text>
          </View>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={onOpenTutorial}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="help-circle-outline" size={24} color={MartialTheme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- 1. TODAY'S PRACTICE / CONTINUE PRACTICING (DOMINANT HERO) --- */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.heroBadgePill}>
            <Text style={styles.heroBadgePillText}>
              {recommendedStrike.isNew ? '⭐ START HERE' : "⭐ TODAY'S PRACTICE"}
            </Text>
          </View>

          {recommendedStrike.lastScore !== null && (
            <View style={styles.heroScorePill}>
              <Text style={styles.heroScorePillText}>Best: {recommendedStrike.lastScore}%</Text>
            </View>
          )}
        </View>

        <Text style={styles.heroStrikeTitle}>{recommendedStrike.name}</Text>
        <Text style={styles.heroStrikeTarget}>{recommendedStrike.target}</Text>

        <View style={styles.heroStarsRow}>
          {renderStars(recommendedStrike.stars, 18)}
          {recommendedStrike.lastScore !== null && (
            <Text style={styles.heroAccuracyText}>{recommendedStrike.lastScore}%</Text>
          )}
        </View>

        {/* Coach Advice Speech Bubble */}
        <View style={styles.coachSpeechBubble}>
          <View style={styles.coachAvatarWrapper}>
            <CoachCharacter pose="thinking" size={46} />
          </View>
          <View style={styles.coachSpeechContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={styles.coachSpeechLabel}>COACH SAYS</Text>
              <TouchableOpacity
                style={styles.coachAskBtn}
                activeOpacity={0.75}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/chat' as any,
                    params: {
                      strikeId: recommendedStrike.id,
                      strikeName: `Strike ${recommendedStrike.strikeNumber}`,
                    },
                  });
                }}
              >
                <Text style={styles.coachAskBtnText}>💬 Ask Coach</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.coachSpeechText}>{`"${recommendedStrike.coachTip}"`}</Text>
          </View>
        </View>

        {/* Single Dominant CTA Button */}
        <TactileButton
          title={`PRACTICE STRIKE ${recommendedStrike.strikeNumber}`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onStartStrike(recommendedStrike.id, 'guided');
          }}
          variant="primary"
          size="lg"
          icon={<Ionicons name="play" size={18} color="#FFFFFF" />}
          style={{ width: '100%', marginTop: 6 }}
        />
      </View>

      {/* --- 2. YOUR STRIKES (MASTERY PROGRESSION LIST) --- */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>YOUR STRIKES</Text>
            <Text style={styles.sectionSub}>
              {masteryStats.masteredCount} of 12 Mastered
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAllStrikes(!showAllStrikes);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>
              {showAllStrikes ? 'Show Less ▴' : 'View all 12 →'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.strikesListCard}>
          {displayedStrikes.map((s) => {
            let starCount = 0;
            if (s.bestScore >= 95) starCount = 5;
            else if (s.bestScore >= 85) starCount = 4;
            else if (s.bestScore >= 75) starCount = 3;
            else if (s.bestScore >= 60) starCount = 2;
            else if (s.bestScore > 0) starCount = 1;

            const isCurrentFocus = s.id === recommendedStrike.id;
            const isPracticed = s.attempts > 0;

            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.strikeRow,
                  isCurrentFocus && styles.strikeRowFocus,
                ]}
                activeOpacity={0.75}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onStartStrike(s.id, 'guided');
                }}
              >
                {/* State Badge: Mastered (green check), Practiced (gold star), or Neutral */}
                <View
                  style={[
                    styles.strikeStateBadge,
                    s.isMastered && styles.strikeStateBadgeMastered,
                    !s.isMastered && isPracticed && styles.strikeStateBadgePracticed,
                    isCurrentFocus && styles.strikeStateBadgeFocus,
                  ]}
                >
                  {s.isMastered ? (
                    <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                  ) : isPracticed ? (
                    <Text style={styles.strikeNumTextPracticed}>{s.strikeNumber}</Text>
                  ) : (
                    <Text style={styles.strikeNumTextNeutral}>{s.strikeNumber}</Text>
                  )}
                </View>

                {/* Strike Information */}
                <View style={styles.strikeDetails}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.strikeTitleText}>
                      Strike {s.strikeNumber} — {s.target.split('/')[0].trim()}
                    </Text>
                    {isCurrentFocus && (
                      <View style={styles.focusPill}>
                        <Text style={styles.focusPillText}>FOCUS</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.strikeMetaRow}>
                    {isPracticed ? (
                      <>
                        {renderStars(starCount, 13)}
                        <Text style={styles.strikeScoreText}>{s.bestScore}%</Text>
                      </>
                    ) : (
                      <Text style={styles.notPracticedText}>○ Not practiced</Text>
                    )}
                  </View>
                </View>

                {/* Tap Action */}
                <View
                  style={[
                    styles.rowActionBtn,
                    s.isMastered && styles.rowActionBtnMastered,
                    isCurrentFocus && styles.rowActionBtnFocus,
                  ]}
                >
                  <Text
                    style={[
                      styles.rowActionBtnText,
                      s.isMastered && styles.rowActionBtnTextMastered,
                      isCurrentFocus && styles.rowActionBtnTextFocus,
                    ]}
                  >
                    {s.isMastered ? 'POLISH' : isPracticed ? 'PRACTICE' : 'TRY'}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={
                      s.isMastered
                        ? MartialTheme.colors.primaryDark
                        : isCurrentFocus
                        ? MartialTheme.colors.primaryDark
                        : MartialTheme.colors.textMuted
                    }
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* --- 3. TRAINING MODES (LEARNER-FIRST HIERARCHY) --- */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>HOW DO YOU WANT TO PRACTICE?</Text>
        <Text style={styles.sectionSub}>Choose your practice style for {recommendedStrike.name}</Text>

        <View style={styles.modesContainer}>
          {/* Mode 1: Guided Practice (RECOMMENDED / DEFAULT PATH) */}
          <TouchableOpacity
            style={[styles.modeCard, styles.modeCardRecommended]}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onStartStrike(recommendedStrike.id, 'guided');
            }}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="sparkles" size={22} color={MartialTheme.colors.primary} />
            </View>
            <View style={styles.modeCardContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.modeCardTitle}>Guided Practice</Text>
                <View style={styles.recommendedPill}>
                  <Text style={styles.recommendedPillText}>RECOMMENDED</Text>
                </View>
              </View>
              <Text style={styles.modeCardDesc}>
                Live coach feedback for Chamber, Strike, and Recovery
              </Text>
            </View>
            <Ionicons name="play-circle" size={24} color={MartialTheme.colors.primary} />
          </TouchableOpacity>

          {/* Mode 2: Follow the Coach */}
          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onStartStrike(recommendedStrike.id, 'follow');
            }}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="eye" size={20} color={MartialTheme.colors.bambooDark} />
            </View>
            <View style={styles.modeCardContent}>
              <Text style={styles.modeCardTitle}>Follow the Coach</Text>
              <Text style={styles.modeCardDesc}>
                Mirror instructor video demonstrations in real time
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MartialTheme.colors.border3D} />
          </TouchableOpacity>

          {/* Mode 3: Test Yourself */}
          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onStartStrike(recommendedStrike.id, 'test');
            }}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: '#FFEDD5' }]}>
              <MaterialCommunityIcons name="target" size={20} color={MartialTheme.colors.flame} />
            </View>
            <View style={styles.modeCardContent}>
              <Text style={styles.modeCardTitle}>Test Yourself</Text>
              <Text style={styles.modeCardDesc}>
                Timed 3-2-1 challenge to test your muscle memory
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MartialTheme.colors.border3D} />
          </TouchableOpacity>

          {/* Mode 4: Anyo & Combos */}
          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAnyoPicker(!showAnyoPicker);
            }}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <MaterialCommunityIcons name="sword-cross" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.modeCardContent}>
              <Text style={styles.modeCardTitle}>Anyo & Combos</Text>
              <Text style={styles.modeCardDesc}>
                Chain canonical strikes in fluid martial combinations
              </Text>
            </View>
            <Ionicons
              name={showAnyoPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={MartialTheme.colors.border3D}
            />
          </TouchableOpacity>

          {/* Collapsible Anyo Routines List */}
          {showAnyoPicker && (
            <View style={styles.anyoDrawer}>
              {ANYO_ROUTINES_CATALOG.map((routine) => (
                <TouchableOpacity
                  key={routine.id}
                  style={styles.anyoRoutineRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onStartAnyo(routine);
                  }}
                >
                  <View style={styles.anyoRoutineLeft}>
                    <Text style={styles.anyoRoutineName}>{routine.name}</Text>
                    <Text style={styles.anyoRoutineSub}>
                      {routine.subtitle} · {routine.strikes.length} strikes
                    </Text>
                  </View>
                  <View style={styles.anyoRoutineBadge}>
                    <Text style={styles.anyoRoutineBadgeText}>{routine.difficulty}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* --- 4. FOOTER OPTIONS (VIDEO GUIDE & GEAR) --- */}
      <View style={styles.footerWrap}>
        {/* Watch Demo Video Button */}
        <TouchableOpacity
          style={styles.videoGuideBtn}
          activeOpacity={0.8}
          onPress={() => onOpenVideoGuide(recommendedStrike.id)}
        >
          <MaterialCommunityIcons name="play-circle" size={24} color={MartialTheme.colors.bamboo} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.videoGuideTitle}>Watch Instructor Demonstrations</Text>
            <Text style={styles.videoGuideSub}>All 12 strikes with slow-motion angle breakdown</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={MartialTheme.colors.bambooDark} />
        </TouchableOpacity>

        {/* Secondary Gear & Voice Selector Strip */}
        <View style={styles.gearStrip}>
          <View style={styles.gearGroup}>
            <Text style={styles.gearLabel}>WEAPON</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {[
                { id: 'rattan', label: '🪵 Rattan' },
                { id: 'red', label: '🔴 Red' },
                { id: 'blue', label: '🔵 Blue' },
                { id: 'any', label: '⚪ Any' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.gearChip,
                    stickColor === item.id && styles.gearChipActive,
                  ]}
                  onPress={() => setStickColor(item.id)}
                >
                  <Text style={[styles.gearChipText, stickColor === item.id && styles.gearChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[styles.voiceToggle, voiceFeedbackEnabled && styles.voiceToggleActive]}
            onPress={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={voiceFeedbackEnabled ? 'volume-high' : 'volume-mute'}
              size={15}
              color={voiceFeedbackEnabled ? MartialTheme.colors.primary : MartialTheme.colors.textMuted}
            />
            <Text style={[styles.voiceToggleText, voiceFeedbackEnabled && styles.voiceToggleTextActive]}>
              {voiceFeedbackEnabled ? 'Voice ON' : 'Muted'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: MartialTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    backgroundColor: MartialTheme.colors.flameMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '900',
    color: MartialTheme.colors.flame,
  },
  helpButton: {
    padding: 4,
  },

  // HERO CARD: TODAY'S PRACTICE
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 20,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroBadgePill: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  heroBadgePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  heroScorePill: {
    backgroundColor: MartialTheme.colors.bambooMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heroScorePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.bambooDark,
  },
  heroStrikeTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 2,
  },
  heroStrikeTarget: {
    fontSize: 13,
    color: MartialTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 6,
  },
  heroStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  heroAccuracyText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.bambooDark,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // COACH SPEECH BUBBLE
  coachSpeechBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    marginBottom: 12,
    gap: 12,
  },
  coachAvatarWrapper: {
    width: 46,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachSpeechContent: {
    flex: 1,
  },
  coachSpeechLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 0.8,
  },
  coachAskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  coachAskBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: MartialTheme.colors.primaryDark,
  },
  coachSpeechText: {
    fontSize: 12.5,
    color: MartialTheme.colors.text,
    lineHeight: 18,
    fontWeight: '600',
  },

  // SECTIONS
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 1,
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: '600',
    color: MartialTheme.colors.textMuted,
    marginTop: 1,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.primary,
  },

  // STRIKES MASTERY LIST
  strikesListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    overflow: 'hidden',
  },
  strikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  strikeRowFocus: {
    backgroundColor: '#F0FDF4',
  },
  strikeStateBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  strikeStateBadgeMastered: {
    backgroundColor: MartialTheme.colors.primary,
    borderColor: MartialTheme.colors.primaryDark,
  },
  strikeStateBadgePracticed: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  strikeStateBadgeFocus: {
    borderColor: MartialTheme.colors.primary,
  },
  strikeNumTextNeutral: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
  },
  strikeNumTextPracticed: {
    fontSize: 13,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
  },
  strikeDetails: {
    flex: 1,
  },
  strikeTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  focusPill: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  focusPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
  },
  strikeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  strikeScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
  },
  notPracticedText: {
    fontSize: 11,
    fontWeight: '600',
    color: MartialTheme.colors.textMuted,
  },
  rowActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    gap: 2,
  },
  rowActionBtnMastered: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    borderColor: '#BBF7D0',
  },
  rowActionBtnFocus: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    borderColor: '#BBF7D0',
  },
  rowActionBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 0.3,
  },
  rowActionBtnTextMastered: {
    color: MartialTheme.colors.primaryDark,
  },
  rowActionBtnTextFocus: {
    color: MartialTheme.colors.primaryDark,
  },

  // TRAINING MODES
  modesContainer: {
    gap: 8,
    marginTop: 8,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  modeCardRecommended: {
    borderColor: '#86EFAC',
    borderBottomColor: MartialTheme.colors.primaryDark,
    backgroundColor: '#F7FDF9',
  },
  modeIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modeCardContent: {
    flex: 1,
    marginRight: 8,
  },
  modeCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  modeCardDesc: {
    fontSize: 11.5,
    color: MartialTheme.colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  recommendedPill: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedPillText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
    letterSpacing: 0.5,
  },

  // ANYO DRAWER
  anyoDrawer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    padding: 10,
    marginTop: 4,
    gap: 6,
  },
  anyoRoutineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: MartialTheme.colors.background,
  },
  anyoRoutineLeft: {
    flex: 1,
  },
  anyoRoutineName: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  anyoRoutineSub: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    marginTop: 2,
  },
  anyoRoutineBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  anyoRoutineBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#8B5CF6',
  },

  // FOOTER WRAP
  footerWrap: {
    gap: 12,
    marginTop: 4,
  },
  videoGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.bamboo,
  },
  videoGuideTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  videoGuideSub: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    marginTop: 2,
  },
  gearStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    gap: 10,
  },
  gearGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gearLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    marginRight: 8,
    letterSpacing: 0.5,
  },
  gearChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  gearChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: MartialTheme.colors.bamboo,
  },
  gearChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
  },
  gearChipTextActive: {
    color: MartialTheme.colors.bambooDark,
    fontWeight: '800',
  },
  voiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    gap: 4,
  },
  voiceToggleActive: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    borderColor: MartialTheme.colors.primary,
  },
  voiceToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
  },
  voiceToggleTextActive: {
    color: MartialTheme.colors.primaryDark,
  },
});

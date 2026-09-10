import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  STRIKES_CATALOG,
} from '@/constants/historyStore';
import { getGamificationStats } from '@/constants/gamificationStore';

const { width } = Dimensions.get('window');

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
  const [streakDays, setStreakDays] = useState(3);
  const [historyList, setHistoryList] = useState<SessionItem[]>([]);
  const [masteryStats, setMasteryStats] = useState<MasteryStats>(() => getStrikeMasteryStats([]));
  const [showAllStrikes, setShowAllStrikes] = useState(false);
  const [showAnyoPicker, setShowAnyoPicker] = useState(false);

  useEffect(() => {
    async function loadData() {
      const gStats = await getGamificationStats();
      setStreakDays(gStats.streakDays || 1);
      const hist = await getHistory();
      setHistoryList(hist);
      setMasteryStats(getStrikeMasteryStats(hist));
    }
    loadData();
  }, []);

  // Determine the recommended strike
  const recommendedStrike = React.useMemo(() => {
    if (historyList.length === 0) {
      return {
        id: 'strike_1',
        strikeNumber: 1,
        name: 'Strike 1 — Left Temple',
        filipinoName: 'Pang-una (Kaliwang Sintido)',
        target: 'Left Temple / Neck',
        isNew: true,
        lastScore: null,
        stars: 0,
        coachTip: "Welcome to practice! Let's start with Strike 1. We'll guide you through your chamber, check hand, and slice.",
      };
    }

    // Find the strike that needs the most attention (attempted but low score, or next unpracticed)
    const strikes = masteryStats.strikes;
    const attempted = strikes.filter((s) => s.attempts > 0);
    const unattempted = strikes.filter((s) => s.attempts === 0);

    let target = strikes[0];

    // If there's an attempted strike that hasn't reached 85%, focus on lowest
    const imperfect = attempted.filter((s) => s.bestScore < 85);
    if (imperfect.length > 0) {
      imperfect.sort((a, b) => a.bestScore - b.bestScore);
      target = imperfect[0];
    } else if (unattempted.length > 0) {
      target = unattempted[0];
    } else {
      // All mastered, pick lowest best score to polish
      const sorted = [...strikes].sort((a, b) => a.bestScore - b.bestScore);
      target = sorted[0];
    }

    // Calculate stars from bestScore
    let stars = 0;
    if (target.bestScore >= 95) stars = 5;
    else if (target.bestScore >= 85) stars = 4;
    else if (target.bestScore >= 75) stars = 3;
    else if (target.bestScore >= 60) stars = 2;
    else if (target.bestScore > 0) stars = 1;

    let coachTip = "Focus on your form. Pin your check hand (Kalasag) firmly to your chest.";
    if (target.bestScore > 0 && target.bestScore < 75) {
      coachTip = "Let's work on your recovery back to guard position. Don't let your stick drop after the slice!";
    } else if (target.bestScore >= 75 && target.bestScore < 85) {
      coachTip = "You're close to mastery! Keep your lead knee bent at an athletic 145° angle.";
    } else if (target.bestScore >= 85) {
      coachTip = "Master level technique! Practice with speed and explosive wrist snap (Pitik).";
    }

    return {
      id: target.id,
      strikeNumber: target.strikeNumber,
      name: `${target.name} — ${target.target.split('/')[0].trim()}`,
      filipinoName: target.name,
      target: target.target,
      isNew: target.attempts === 0,
      lastScore: target.bestScore > 0 ? target.bestScore : null,
      stars,
      coachTip,
    };
  }, [historyList, masteryStats]);

  const renderStars = (count: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Ionicons
            key={s}
            name={s <= count ? 'star' : 'star-outline'}
            size={16}
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
          <Text style={styles.headerSubtitle}>Keep building your martial skills</Text>
        </View>

        <View style={styles.headerRightGroup}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {streakDays}d</Text>
          </View>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={onOpenTutorial}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle-outline" size={22} color={MartialTheme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- 1. THE ONE DOMINANT RECOMMENDED PRACTICE CARD --- */}
      <View style={styles.recommendedCard}>
        <View style={styles.recommendedHeaderRow}>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>
              {recommendedStrike.isNew ? '⭐ START HERE' : '⭐ CONTINUE PRACTICING'}
            </Text>
          </View>

          {recommendedStrike.lastScore !== null && (
            <View style={styles.scorePill}>
              <Text style={styles.scorePillText}>Last: {recommendedStrike.lastScore}%</Text>
            </View>
          )}
        </View>

        <Text style={styles.recommendedTitle}>{recommendedStrike.name}</Text>
        <Text style={styles.recommendedSub}>{recommendedStrike.target}</Text>

        {renderStars(recommendedStrike.stars)}

        {/* Coach Advice Speech Bubble */}
        <View style={styles.coachBubble}>
          <View style={styles.coachBubbleAvatar}>
            <CoachCharacter pose="thinking" size={44} />
          </View>
          <View style={styles.coachBubbleTextWrap}>
            <Text style={styles.coachBubbleLabel}>COACH SAYS</Text>
            <Text style={styles.coachBubbleText}>"{recommendedStrike.coachTip}"</Text>
          </View>
        </View>

        {/* Single Dominant Action Button */}
        <TactileButton
          title={`PRACTICE STRIKE ${recommendedStrike.strikeNumber}`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onStartStrike(recommendedStrike.id, 'guided');
          }}
          variant="primary"
          size="lg"
          icon={<Ionicons name="play" size={18} color="#FFFFFF" />}
          style={{ width: '100%', marginTop: 8 }}
        />
      </View>

      {/* --- 2. QUICK PRACTICE — CHOOSE A SKILL --- */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>QUICK SKILL PRACTICE</Text>
          <TouchableOpacity
            onPress={() => setShowAllStrikes(!showAllStrikes)}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>
              {showAllStrikes ? 'Show Less ▴' : 'View all 12 →'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.skillsList}>
          {displayedStrikes.map((s) => {
            let starCount = 0;
            if (s.bestScore >= 95) starCount = 5;
            else if (s.bestScore >= 85) starCount = 4;
            else if (s.bestScore >= 75) starCount = 3;
            else if (s.bestScore >= 60) starCount = 2;
            else if (s.bestScore > 0) starCount = 1;

            return (
              <TouchableOpacity
                key={s.id}
                style={styles.skillRow}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onStartStrike(s.id, 'guided');
                }}
              >
                <View
                  style={[
                    styles.skillNumBadge,
                    s.isMastered && styles.skillNumBadgeMastered,
                  ]}
                >
                  <Text
                    style={[
                      styles.skillNumText,
                      s.isMastered && styles.skillNumTextMastered,
                    ]}
                  >
                    {s.strikeNumber}
                  </Text>
                </View>

                <View style={styles.skillDetails}>
                  <Text style={styles.skillTitle}>
                    Strike {s.strikeNumber} — {s.target.split('/')[0].trim()}
                  </Text>
                  <View style={styles.skillMetaRow}>
                    {renderStars(starCount)}
                    <Text style={styles.skillScoreText}>
                      {s.attempts > 0 ? `${s.bestScore}%` : 'Not practiced'}
                    </Text>
                  </View>
                </View>

                <View style={styles.skillActionBtn}>
                  <Text style={styles.skillActionBtnText}>
                    {s.attempts > 0 ? 'PRACTICE' : 'TRY'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={MartialTheme.colors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* --- 3. TRAINING MODES WITH COACH --- */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>TRAINING MODES</Text>

        <View style={styles.modesGrid}>
          {/* Mode 1: Follow the Coach */}
          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onStartStrike(recommendedStrike.id, 'follow');
            }}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="eye" size={20} color={MartialTheme.colors.primary} />
            </View>
            <View style={styles.modeCardContent}>
              <Text style={styles.modeCardTitle}>Follow the Coach</Text>
              <Text style={styles.modeCardDesc}>
                Watch video instructor and mirror their fluid strike in real time
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MartialTheme.colors.border3D} />
          </TouchableOpacity>

          {/* Mode 2: Guided Practice */}
          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onStartStrike(recommendedStrike.id, 'guided');
            }}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="mic" size={20} color={MartialTheme.colors.bambooDark} />
            </View>
            <View style={styles.modeCardContent}>
              <Text style={styles.modeCardTitle}>Guided Practice</Text>
              <Text style={styles.modeCardDesc}>
                Live feedback for Chamber (Kasa), Strike (Tudla), & Recovery (Bawi)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MartialTheme.colors.border3D} />
          </TouchableOpacity>

          {/* Mode 3: Test Yourself */}
          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={0.75}
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
                3-2-1 countdown exam testing 4-pillar biomechanical precision
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MartialTheme.colors.border3D} />
          </TouchableOpacity>

          {/* Mode 4: Anyo & Combos */}
          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={0.75}
            onPress={() => setShowAnyoPicker(!showAnyoPicker)}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <MaterialCommunityIcons name="sword-cross" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.modeCardContent}>
              <Text style={styles.modeCardTitle}>Anyo & Combos</Text>
              <Text style={styles.modeCardDesc}>
                Chain canonical strikes in seamless martial flow combinations
              </Text>
            </View>
            <Ionicons
              name={showAnyoPicker ? 'chevron-up' : 'chevron-down'}
              size={16}
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

      {/* --- 4. VIDEO DEMONSTRATIONS & GEAR PREFERENCES --- */}
      <View style={styles.footerOptions}>
        {/* Watch Demo Video Button */}
        <TouchableOpacity
          style={styles.videoDemoBtn}
          activeOpacity={0.8}
          onPress={() => onOpenVideoGuide(recommendedStrike.id)}
        >
          <MaterialCommunityIcons name="play-circle" size={22} color={MartialTheme.colors.bamboo} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.videoDemoBtnTitle}>Watch Instructor Demonstrations</Text>
            <Text style={styles.videoDemoBtnSub}>All 12 strikes with slow-motion angle breakdown</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={MartialTheme.colors.bambooDark} />
        </TouchableOpacity>

        {/* Secondary Gear & Voice Selector Strip */}
        <View style={styles.gearStrip}>
          <View style={styles.gearStickCol}>
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
    padding: 6,
  },

  // RECOMMENDED HERO CARD
  recommendedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 20,
  },
  recommendedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgePill: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgePillText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  scorePill: {
    backgroundColor: MartialTheme.colors.bambooMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scorePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.bambooDark,
  },
  recommendedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 2,
  },
  recommendedSub: {
    fontSize: 13,
    color: MartialTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  // COACH BUBBLE
  coachBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    marginBottom: 14,
    gap: 12,
  },
  coachBubbleAvatar: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachBubbleTextWrap: {
    flex: 1,
  },
  coachBubbleLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 1,
    marginBottom: 2,
  },
  coachBubbleText: {
    fontSize: 12.5,
    color: MartialTheme.colors.text,
    lineHeight: 18,
    fontWeight: '600',
  },

  // SECTION HEADERS
  sectionContainer: {
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
    fontSize: 11.5,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 1.2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.primary,
  },

  // SKILL ROWS LIST
  skillsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    overflow: 'hidden',
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  skillNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  skillNumBadgeMastered: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    borderColor: MartialTheme.colors.primary,
  },
  skillNumText: {
    fontSize: 13,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  skillNumTextMastered: {
    color: MartialTheme.colors.primary,
  },
  skillDetails: {
    flex: 1,
  },
  skillTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  skillMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  skillScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
  },
  skillActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  skillActionBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
    letterSpacing: 0.3,
  },

  // MODES GRID
  modesGrid: {
    gap: 8,
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
  modeIconCircle: {
    width: 40,
    height: 40,
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

  // FOOTER OPTIONS
  footerOptions: {
    gap: 12,
    marginTop: 4,
  },
  videoDemoBtn: {
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
  videoDemoBtnTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  videoDemoBtnSub: {
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
  gearStickCol: {
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

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MartialTheme } from '@/constants/theme';

interface CoachTipInfo {
  id: string;
  badge: string;
  title: string;
  cue: string;
  icon: string;
  color: string;
}

const COACH_TIPS: Record<string, CoachTipInfo> = {
  // 4 Biomechanical Pillars
  trajectory: {
    id: 'trajectory',
    badge: '40% WEIGHT • DOMINANT DRIVER',
    title: 'Striking Arm & Elbow Trajectory',
    cue: 'Lead the cut with your elbow before extending the weapon through the exact anatomical angle. Maintain a clean, unbroken strike plane without flaring or dropping early.',
    icon: 'sword',
    color: '#15803D',
  },
  kalasag: {
    id: 'kalasag',
    badge: '25% WEIGHT • DEFENSIVE SHIELD',
    title: 'Check Hand (Kalasag) Guard',
    cue: 'Keep your non-weapon live hand pressed firmly to your solar plexus/chest throughout the entire cut. In Arnis, Kalasag deflects counters and primes immediate disarms.',
    icon: 'shield-check',
    color: '#2563EB',
  },
  tindig: {
    id: 'tindig',
    badge: '20% WEIGHT • KINETIC BASE',
    title: 'Stance Tindig Knee Flexion',
    cue: 'Lower your center of gravity with knee flexion in your Tindig stance. True martial power generates from the ground up through active hip rotation, not just the arm.',
    icon: 'run-fast',
    color: '#D97706',
  },
  pitik: {
    id: 'pitik',
    badge: '15% WEIGHT • IMPACT VELOCITY',
    title: 'Wrist Snap (Pitik) Alignment',
    cue: 'Deliver a sharp, whip-like wrist snap right at the point of contact, aligning the stick tip with forearm geometry before smoothly returning to chamber.',
    icon: 'flash',
    color: '#DC2626',
  },

  // 4 Grade Tiers
  gradeA: {
    id: 'gradeA',
    badge: '95 - 100% • MASTER FORM',
    title: 'Master Form Locked',
    cue: 'Flawless kinetic chain execution: Kalasag shield stays glued to chest, Tindig stance is deep and stable, and the Pitik whip snaps cleanly on plane.',
    icon: 'trophy',
    color: '#15803D',
  },
  gradeB: {
    id: 'gradeB',
    badge: '85 - 94% • ADVANCED TECHNIQUE',
    title: 'Advanced Technique',
    cue: 'Strong strike line and crisp power delivery. Fine-tune your recovery to guard position and keep the Kalasag hand tight to your center of gravity.',
    icon: 'medal',
    color: '#2563EB',
  },
  gradeC: {
    id: 'gradeC',
    badge: '75 - 84% • INTERMEDIATE (PASSING)',
    title: 'Intermediate (Passing Threshold)',
    cue: 'Required passing threshold (75%+) to unlock subsequent strikes. Demonstrates solid kinetic chain and strike geometry with minor areas to polish.',
    icon: 'school',
    color: '#D97706',
  },
  gradeDF: {
    id: 'gradeDF',
    badge: '< 75% • NEEDS CORRECTION (FAIL)',
    title: 'Needs Form Calibration (Fail)',
    cue: 'Below the 75% passing threshold. The next strike remains locked. Slow down repetition speed, utilize the 5-minute warmup mirror drills, and lock in the 4 fundamental pillars step by step.',
    icon: 'alert-circle',
    color: '#DC2626',
  },
};

export function ScoringLegendCard() {
  const [activeTipId, setActiveTipId] = useState<string | null>(null);

  const handleToggleTip = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTipId((prev) => (prev === id ? null : id));
  };

  const activeTip = activeTipId ? COACH_TIPS[activeTipId] : null;

  return (
    <View style={styles.cardContainer}>
      {/* --- FEATURE HIGHLIGHT BADGE --- */}
      <View style={styles.badgeRow}>
        <View style={styles.featureBadge}>
          <Text style={styles.featureSparkle}>✨</Text>
          <Text style={styles.featureBadgeText}>FEATURE HIGHLIGHT</Text>
        </View>
      </View>

      {/* --- TITLE --- */}
      <Text style={styles.cardTitle}>4-Pillar Scoring Weights</Text>

      {/* --- GRADES INNER CONTAINER --- */}
      <View style={styles.gradesBox}>
        {/* Grade A */}
        <TouchableOpacity
          style={[
            styles.gradeRow,
            activeTipId === 'gradeA' && styles.gradeRowSelected,
          ]}
          activeOpacity={0.7}
          onPress={() => handleToggleTip('gradeA')}
        >
          <View style={[styles.gradePill, styles.gradePillA]}>
            <Text style={[styles.gradePillText, styles.gradePillTextA]}>95 - 100%</Text>
          </View>
          <Text style={styles.gradeLabel}>Grade A (Master Form)</Text>
          <Ionicons
            name={activeTipId === 'gradeA' ? 'chevron-up' : 'chevron-forward'}
            size={14}
            color="#9CA3AF"
            style={styles.gradeChevron}
          />
        </TouchableOpacity>

        {/* Grade B */}
        <TouchableOpacity
          style={[
            styles.gradeRow,
            activeTipId === 'gradeB' && styles.gradeRowSelected,
          ]}
          activeOpacity={0.7}
          onPress={() => handleToggleTip('gradeB')}
        >
          <View style={[styles.gradePill, styles.gradePillB]}>
            <Text style={[styles.gradePillText, styles.gradePillTextB]}>85 - 94%</Text>
          </View>
          <Text style={styles.gradeLabel}>Grade B (Advanced Technique)</Text>
          <Ionicons
            name={activeTipId === 'gradeB' ? 'chevron-up' : 'chevron-forward'}
            size={14}
            color="#9CA3AF"
            style={styles.gradeChevron}
          />
        </TouchableOpacity>

        {/* Grade C */}
        <TouchableOpacity
          style={[
            styles.gradeRow,
            activeTipId === 'gradeC' && styles.gradeRowSelected,
          ]}
          activeOpacity={0.7}
          onPress={() => handleToggleTip('gradeC')}
        >
          <View style={[styles.gradePill, styles.gradePillC]}>
            <Text style={[styles.gradePillText, styles.gradePillTextC]}>75 - 84%</Text>
          </View>
          <Text style={styles.gradeLabel}>Grade C (Passing / Intermediate)</Text>
          <Ionicons
            name={activeTipId === 'gradeC' ? 'chevron-up' : 'chevron-forward'}
            size={14}
            color="#9CA3AF"
            style={styles.gradeChevron}
          />
        </TouchableOpacity>

        {/* Grade D/F */}
        <TouchableOpacity
          style={[
            styles.gradeRow,
            styles.gradeRowLast,
            activeTipId === 'gradeDF' && styles.gradeRowSelected,
          ]}
          activeOpacity={0.7}
          onPress={() => handleToggleTip('gradeDF')}
        >
          <View style={[styles.gradePill, styles.gradePillDF]}>
            <Text style={[styles.gradePillText, styles.gradePillTextDF]}>&lt; 75%</Text>
          </View>
          <Text style={styles.gradeLabel}>Grade D/F (Needs Correction / Fail)</Text>
          <Ionicons
            name={activeTipId === 'gradeDF' ? 'chevron-up' : 'chevron-forward'}
            size={14}
            color="#9CA3AF"
            style={styles.gradeChevron}
          />
        </TouchableOpacity>
      </View>

      {/* --- FORMULA BREAKDOWN SECTION --- */}
      <View style={styles.formulaSection}>
        <View style={styles.formulaHeaderRow}>
          <Text style={styles.formulaHeading}>Formula Breakdown:</Text>
          <Text style={styles.formulaHintText}>Tap for Coach cues 💡</Text>
        </View>

        {/* Pillar 1: Striking Arm */}
        <TouchableOpacity
          style={[
            styles.formulaItemRow,
            activeTipId === 'trajectory' && styles.formulaItemSelected,
          ]}
          activeOpacity={0.7}
          onPress={() => handleToggleTip('trajectory')}
        >
          <Text style={styles.formulaBullet}>•</Text>
          <Text style={styles.formulaItemText}>
            Striking Arm & Elbow Trajectory:{' '}
            <Text style={styles.formulaWeightHighlight}>40%</Text>
          </Text>
        </TouchableOpacity>

        {/* Pillar 2: Check Hand */}
        <TouchableOpacity
          style={[
            styles.formulaItemRow,
            activeTipId === 'kalasag' && styles.formulaItemSelected,
          ]}
          activeOpacity={0.7}
          onPress={() => handleToggleTip('kalasag')}
        >
          <Text style={styles.formulaBullet}>•</Text>
          <Text style={styles.formulaItemText}>
            Check Hand Kalasag Guard:{' '}
            <Text style={styles.formulaWeightHighlight}>25%</Text>
          </Text>
        </TouchableOpacity>

        {/* Pillar 3: Stance */}
        <TouchableOpacity
          style={[
            styles.formulaItemRow,
            activeTipId === 'tindig' && styles.formulaItemSelected,
          ]}
          activeOpacity={0.7}
          onPress={() => handleToggleTip('tindig')}
        >
          <Text style={styles.formulaBullet}>•</Text>
          <Text style={styles.formulaItemText}>
            Stance Tindig Knee Flexion:{' '}
            <Text style={styles.formulaWeightHighlight}>20%</Text>
          </Text>
        </TouchableOpacity>

        {/* Pillar 4: Wrist Snap */}
        <TouchableOpacity
          style={[
            styles.formulaItemRow,
            activeTipId === 'pitik' && styles.formulaItemSelected,
          ]}
          activeOpacity={0.7}
          onPress={() => handleToggleTip('pitik')}
        >
          <Text style={styles.formulaBullet}>•</Text>
          <Text style={styles.formulaItemText}>
            Wrist Snap Pitik Alignment:{' '}
            <Text style={styles.formulaWeightHighlight}>15%</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- INLINE COACHING TIP CALLOUT --- */}
      {activeTip && (
        <View style={styles.coachTipCard}>
          <View style={styles.coachTipHeader}>
            <View style={styles.coachTipBadge}>
              <MaterialCommunityIcons
                name={activeTip.icon as any}
                size={13}
                color={activeTip.color}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.coachTipBadgeText, { color: activeTip.color }]}>
                {activeTip.badge}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTipId(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.coachTipTitle}>{activeTip.title}</Text>
          <Text style={styles.coachTipCue}>{activeTip.cue}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  featureSparkle: {
    fontSize: 12,
  },
  featureBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  gradesBox: {
    backgroundColor: '#F8F7F3',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EFEAE0',
    marginBottom: 14,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  gradeRowLast: {
    paddingBottom: 2,
  },
  gradeRowSelected: {
    backgroundColor: '#FFFFFF',
  },
  gradePill: {
    minWidth: 84,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginRight: 12,
  },
  gradePillA: {
    backgroundColor: '#D1FAE5',
    borderColor: '#34D399',
  },
  gradePillTextA: {
    color: '#059669',
  },
  gradePillB: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  gradePillTextB: {
    color: '#2563EB',
  },
  gradePillC: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  gradePillTextC: {
    color: '#D97706',
  },
  gradePillDF: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  gradePillTextDF: {
    color: '#DC2626',
  },
  gradePillText: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  gradeLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  gradeChevron: {
    marginLeft: 6,
    opacity: 0.5,
  },
  formulaSection: {
    marginTop: 2,
  },
  formulaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  formulaHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  formulaHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  formulaItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  formulaItemSelected: {
    backgroundColor: '#F3F4F6',
  },
  formulaBullet: {
    fontSize: 13.5,
    color: '#6B7280',
    marginRight: 6,
    lineHeight: 18,
  },
  formulaItemText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    flex: 1,
  },
  formulaWeightHighlight: {
    fontWeight: '700',
    color: '#1F2937',
  },
  coachTipCard: {
    marginTop: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
  },
  coachTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  coachTipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachTipBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  coachTipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginBottom: 4,
  },
  coachTipCue: {
    fontSize: 12.5,
    lineHeight: 18,
    color: MartialTheme.colors.textSecondary,
  },
});

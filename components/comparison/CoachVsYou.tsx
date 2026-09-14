import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MartialTheme } from '@/constants/theme';
import { CoachStrikeReferenceItem } from '@/constants/referenceStore';
import { StrikeRule } from '@/constants/strikeRules';

export interface CoachVsYouProps {
  strikeRule: StrikeRule;
  coachReference: CoachStrikeReferenceItem;
  userSnapshotUri?: string | null;
  userScore: number;
  userPillars: {
    strikingArm: number;
    guard: number;
    stance: number;
    wrist: number;
  };
  userActualAngles?: {
    elbow?: number;
    shoulder?: number;
    knee?: number;
  };
  userImpactTime?: number;
  coachImpactTime?: number;
  confidence?: number;
  onOpenVideoComparison?: () => void;
  hasUserVideo?: boolean;
}

export function CoachVsYou({
  strikeRule,
  coachReference,
  userSnapshotUri,
  userScore,
  userPillars,
  userActualAngles,
  userImpactTime = 1.45,
  coachImpactTime = 1.47,
  confidence = 0.85,
  onOpenVideoComparison,
  hasUserVideo = false,
}: CoachVsYouProps) {
  const getStatus = (score: number) => {
    if (score >= 80) {
      return { text: 'Optimal Alignment', color: '#15803D', icon: 'checkmark-circle' as const };
    }
    if (score >= 65) {
      return { text: 'Needs Minor Adjustment', color: '#B45309', icon: 'alert-circle' as const };
    }
    return { text: 'Focus Area', color: '#DC2626', icon: 'close-circle' as const };
  };

  const armStatus = getStatus(userPillars.strikingArm);
  const guardStatus = getStatus(userPillars.guard);
  const stanceStatus = getStatus(userPillars.stance);
  const wristStatus = getStatus(userPillars.wrist);

  const coachElbowAngle = coachReference.angles.elbow;
  const userElbowAngle = userActualAngles?.elbow || Math.round(strikeRule.chamber_elb + (userPillars.strikingArm / 100) * 40);

  return (
    <View style={styles.card}>
      {/* --- Card Header --- */}
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <View style={styles.versusBadge}>
            <MaterialCommunityIcons name="sword-cross" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.versusBadgeText}>COACH VS YOU</Text>
          </View>
          <View style={styles.apexBadge}>
            <Text style={styles.apexBadgeText}>STRIKE APEX MOMENT</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>Impact Posture Comparison</Text>
        <Text style={styles.cardSubtitle}>
          Comparing your pose against the AlphaPose expert reference at contact apex.
        </Text>
      </View>

      {/* --- Side-by-Side / Stacked Impact Snapshots --- */}
      <View style={styles.snapshotsContainer}>
        {/* Left: Coach Reference */}
        <View style={styles.snapshotColumn}>
          <View style={styles.columnHeader}>
            <View style={[styles.avatarDot, { backgroundColor: MartialTheme.colors.primaryDark }]} />
            <Text style={styles.columnHeaderCoach}>COACH (EXPERT)</Text>
            <Text style={styles.timestampPill}>@{coachImpactTime.toFixed(2)}s</Text>
          </View>

          <View style={styles.imageWrapper}>
            <Image
              source={
                typeof coachReference.impactSnapshot === 'string'
                  ? { uri: coachReference.impactSnapshot }
                  : coachReference.impactSnapshot
              }
              style={styles.snapshotImage}
              resizeMode="cover"
            />
            <View style={styles.angleTag}>
              <Text style={styles.angleTagText}>Ideal: ~{coachElbowAngle.toFixed(0)}°</Text>
            </View>
          </View>
          <Text style={styles.captionText}>Canonical AlphaPose Apex</Text>
        </View>

        {/* Divider icon */}
        <View style={styles.vsDivider}>
          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>
        </View>

        {/* Right: User Actual */}
        <View style={styles.snapshotColumn}>
          <View style={styles.columnHeader}>
            <View style={[styles.avatarDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.columnHeaderUser}>YOU (ACTUAL)</Text>
            <Text style={styles.timestampPill}>@{userImpactTime.toFixed(2)}s</Text>
          </View>

          <View style={styles.imageWrapper}>
            {userSnapshotUri ? (
              <Image
                source={{ uri: userSnapshotUri }}
                style={styles.snapshotImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noSnapshotFallback}>
                <Ionicons name="camera-outline" size={32} color={MartialTheme.colors.textMuted} />
                <Text style={styles.noSnapshotText}>Pose Recorded</Text>
              </View>
            )}
            <View style={[styles.angleTag, { backgroundColor: armStatus.color }]}>
              <Text style={styles.angleTagText}>You: ~{userElbowAngle}°</Text>
            </View>
          </View>
          <Text style={styles.captionText}>Confidence: {Math.round(confidence * 100)}%</Text>
        </View>
      </View>

      {/* --- Biomechanical Form Alignment Rows --- */}
      <View style={styles.breakdownSection}>
        <Text style={styles.breakdownHeading}>BIOMECHANICAL POSTURE AUDIT</Text>

        {/* 1. Striking Arm */}
        <View style={styles.metricRow}>
          <View style={styles.metricIconWrap}>
            <MaterialCommunityIcons name="sword" size={16} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.metricLabelRow}>
              <Text style={styles.metricLabel}>Striking Arm & Elbow Angle</Text>
              <Text style={[styles.metricScore, { color: armStatus.color }]}>
                {userPillars.strikingArm}%
              </Text>
            </View>
            <View style={styles.metricVerdictRow}>
              <Ionicons name={armStatus.icon} size={14} color={armStatus.color} style={{ marginRight: 4 }} />
              <Text style={[styles.metricVerdict, { color: armStatus.color }]}>
                {armStatus.text} (Ideal: {strikeRule.right_min}°-{strikeRule.right_max}°)
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Kalasag Guard */}
        <View style={styles.metricRow}>
          <View style={styles.metricIconWrap}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.metricLabelRow}>
              <Text style={styles.metricLabel}>Check Hand Guard (Kalasag)</Text>
              <Text style={[styles.metricScore, { color: guardStatus.color }]}>
                {userPillars.guard}%
              </Text>
            </View>
            <View style={styles.metricVerdictRow}>
              <Ionicons name={guardStatus.icon} size={14} color={guardStatus.color} style={{ marginRight: 4 }} />
              <Text style={[styles.metricVerdict, { color: guardStatus.color }]}>
                {guardStatus.text} (Pinned to Chest)
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Tindig Stance */}
        <View style={styles.metricRow}>
          <View style={styles.metricIconWrap}>
            <MaterialCommunityIcons name="human-male-height" size={16} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.metricLabelRow}>
              <Text style={styles.metricLabel}>Base Stability (Tindig Stance)</Text>
              <Text style={[styles.metricScore, { color: stanceStatus.color }]}>
                {userPillars.stance}%
              </Text>
            </View>
            <View style={styles.metricVerdictRow}>
              <Ionicons name={stanceStatus.icon} size={14} color={stanceStatus.color} style={{ marginRight: 4 }} />
              <Text style={[styles.metricVerdict, { color: stanceStatus.color }]}>
                {stanceStatus.text} (135°-165° Lead Knee)
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Pitik Wrist */}
        <View style={[styles.metricRow, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
          <View style={styles.metricIconWrap}>
            <MaterialCommunityIcons name="hand-back-right" size={16} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.metricLabelRow}>
              <Text style={styles.metricLabel}>Impact Wrist Snap (Pitik)</Text>
              <Text style={[styles.metricScore, { color: wristStatus.color }]}>
                {userPillars.wrist}%
              </Text>
            </View>
            <View style={styles.metricVerdictRow}>
              <Ionicons name={wristStatus.icon} size={14} color={wristStatus.color} style={{ marginRight: 4 }} />
              <Text style={[styles.metricVerdict, { color: wristStatus.color }]}>
                {wristStatus.text}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* --- Action: Watch Synchronized Video Comparison --- */}
      {onOpenVideoComparison && (
        <TouchableOpacity
          style={styles.watchVideoBtn}
          activeOpacity={0.8}
          onPress={onOpenVideoComparison}
        >
          <Ionicons name="play-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.watchVideoBtnText}>
            {hasUserVideo ? 'Watch Video Comparison (Coach vs You)' : 'Watch Coach Demonstration Video'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  versusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  versusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  apexBadge: {
    backgroundColor: MartialTheme.colors.bambooMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  apexBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: MartialTheme.colors.bambooDark,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: MartialTheme.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },

  // Snapshots Layout
  snapshotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  snapshotColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    width: '100%',
    justifyContent: 'center',
  },
  avatarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  columnHeaderCoach: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
    marginRight: 4,
  },
  columnHeaderUser: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563EB',
    marginRight: 4,
  },
  timestampPill: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  imageWrapper: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  snapshotImage: {
    width: '100%',
    height: '100%',
  },
  noSnapshotFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  noSnapshotText: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    fontWeight: '700',
    marginTop: 4,
  },
  angleTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  angleTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  captionText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 4,
  },
  vsDivider: {
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  vsText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
  },

  // Breakdown Section
  breakdownSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    marginBottom: 12,
  },
  breakdownHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  metricScore: {
    fontSize: 12,
    fontWeight: '900',
  },
  metricVerdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metricVerdict: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Watch video CTA
  watchVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  watchVideoBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

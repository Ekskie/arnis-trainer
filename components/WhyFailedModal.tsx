import React, { useState } from 'react';
import { MartialTheme } from '@/constants/theme';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface BreakdownScores {
  directionScore?: number;
  elbowScore?: number;
  bodyScore?: number; // stance/knee
  guardScore?: number;
  wristScore?: number;
}

export interface WhyFailedModalProps {
  visible: boolean;
  onClose: () => void;
  overallScore: number;
  grade: string;
  strikeName: string;
  strikeId: string;
  breakdown?: BreakdownScores;
  onPracticeLesson?: (lessonIdOrStrikeId: string) => void;
}

export function WhyFailedModal({
  visible,
  onClose,
  overallScore,
  grade,
  strikeName,
  strikeId,
  breakdown,
  onPracticeLesson,
}: WhyFailedModalProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const direction = breakdown?.directionScore ?? Math.min(100, Math.round(overallScore * 1.05));
  const elbow = breakdown?.elbowScore ?? Math.max(40, Math.round(overallScore * 0.9));
  const body = breakdown?.bodyScore ?? Math.max(50, Math.round(overallScore * 0.95));
  const guard = breakdown?.guardScore ?? Math.max(45, Math.round(overallScore * 0.88));

  // Determine ONE thing to fix first (the single lowest scoring component)
  const minScore = Math.min(direction, elbow, body, guard);

  let oneThingToFix = {
    title: 'Keep your check hand higher near your chest',
    explanation: 'Your left hand dropped below your solar plexus. In Arnis, keeping your shield up protects your heart and earns 25% of your score.',
    actionLessonId: 'les_1_3',
    actionTitle: 'Practice Check Hand Guard',
  };

  if (minScore === body) {
    oneThingToFix = {
      title: 'Bend your knees into a solid athletic stance',
      explanation: 'Standing too upright reduces your power and balance. Sink your hips slightly and bend both knees (135°-165°).',
      actionLessonId: 'les_1_1',
      actionTitle: 'Practice Proper Stance (Tindig)',
    };
  } else if (minScore === elbow) {
    oneThingToFix = {
      title: 'Control your striking arm extension',
      explanation: 'Avoid overextending into a wide baseball swing. Keep your elbow slightly flexed at the apex to absorb recoil.',
      actionLessonId: strikeId || 'strike_1',
      actionTitle: `Review ${strikeName} Motion`,
    };
  } else if (minScore === direction) {
    oneThingToFix = {
      title: 'Follow the canonical cutting line',
      explanation: 'Your weapon trajectory deviated from the intended line. Focus on tracing the path from chamber through target to recovery.',
      actionLessonId: strikeId || 'strike_1',
      actionTitle: `Practice ${strikeName} Direction`,
    };
  }

  // Compile "What you did well" (components with scores >= 70%)
  const whatYouDidWell: string[] = [];
  if (direction >= 70) whatYouDidWell.push('Correct strike trajectory and direction');
  if (body >= 70) whatYouDidWell.push('Good athletic stance with bent knees');
  if (guard >= 70) whatYouDidWell.push('Kalasag check hand stayed locked on chest');
  if (elbow >= 70) whatYouDidWell.push('Controlled striking arm extension');

  if (whatYouDidWell.length === 0) {
    whatYouDidWell.push('Good effort! Motor learning takes consistent repetition.');
  }

  const handlePracticePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    if (onPracticeLesson) {
      onPracticeLesson(oneThingToFix.actionLessonId);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Drag Handle */}
          <View style={styles.dragBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSub}>COACH DIAGNOSIS</Text>
              <Text style={styles.headerTitle}>HOW CAN I IMPROVE?</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Score Strip */}
            <View style={styles.scoreStrip}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreNumber}>{overallScore}</Text>
                <Text style={styles.scoreUnit}>%</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.scoreGradeText}>{grade}</Text>
                <Text style={styles.scoreEncouragement}>
                  {overallScore >= 85
                    ? 'Excellent martial control! Minor refinements will achieve perfection.'
                    : overallScore >= 70
                    ? 'Solid start! Let’s focus on one adjustment to boost your score.'
                    : 'Good attempt! Don’t worry about the score—focus on fixing one thing.'}
                </Text>
              </View>
            </View>

            {/* SECTION 1: WHAT YOU DID WELL */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.sectionHeadingSuccess}>WHAT YOU DID WELL</Text>
              </View>
              <View style={styles.checklist}>
                {whatYouDidWell.map((item, idx) => (
                  <View key={idx} style={styles.checklistItem}>
                    <Ionicons name="checkmark" size={15} color="#10B981" style={{ marginRight: 8, marginTop: 1 }} />
                    <Text style={styles.checklistItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* SECTION 2: ONE THING TO FIX FIRST */}
            <View style={[styles.sectionBox, styles.fixBox]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="alert-circle" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                <Text style={styles.sectionHeadingWarning}>ONE THING TO FIX FIRST</Text>
              </View>

              <Text style={styles.fixTitle}>{oneThingToFix.title}</Text>
              <Text style={styles.fixExplanation}>{oneThingToFix.explanation}</Text>

              <TouchableOpacity
                style={styles.practiceBtn}
                onPress={handlePracticePress}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="karate" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.practiceBtnText}>{oneThingToFix.actionTitle.toUpperCase()}</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>

            {/* Primary Action Row: Try Again & Dismiss */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.tryAgainBtn}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.tryAgainBtnText}>TRY AGAIN NOW</Text>
              </TouchableOpacity>
            </View>

            {/* Collapsible Technical Breakdown for Advanced Telemetry */}
            <TouchableOpacity
              style={styles.techToggleBtn}
              onPress={() => setShowTechnicalDetails(!showTechnicalDetails)}
              activeOpacity={0.8}
            >
              <Text style={styles.techToggleText}>
                {showTechnicalDetails ? 'Hide Technical Telemetry ▲' : 'Show 4-Pillar Telemetry Breakdown ▼'}
              </Text>
            </TouchableOpacity>

            {showTechnicalDetails && (
              <View style={styles.techDetailsCard}>
                <Text style={styles.techCardHeading}>4-PILLAR BIOMECHANICAL SCORES</Text>

                {/* Stance */}
                <View style={styles.techItem}>
                  <View style={styles.techTextRow}>
                    <Text style={styles.techLabel}>1. Stance Stability (Tindig)</Text>
                    <Text style={[styles.techScore, { color: body >= 70 ? '#10B981' : '#F59E0B' }]}>{body}%</Text>
                  </View>
                  <View style={styles.techTrack}>
                    <View style={[styles.techFill, { width: `${body}%`, backgroundColor: body >= 70 ? '#10B981' : '#F59E0B' }]} />
                  </View>
                </View>

                {/* Trajectory */}
                <View style={styles.techItem}>
                  <View style={styles.techTextRow}>
                    <Text style={styles.techLabel}>2. Strike Trajectory</Text>
                    <Text style={[styles.techScore, { color: direction >= 70 ? '#10B981' : '#F59E0B' }]}>{direction}%</Text>
                  </View>
                  <View style={styles.techTrack}>
                    <View style={[styles.techFill, { width: `${direction}%`, backgroundColor: direction >= 70 ? '#10B981' : '#F59E0B' }]} />
                  </View>
                </View>

                {/* Check Hand */}
                <View style={styles.techItem}>
                  <View style={styles.techTextRow}>
                    <Text style={styles.techLabel}>3. Kalasag Shield Guard</Text>
                    <Text style={[styles.techScore, { color: guard >= 70 ? '#10B981' : '#EF4444' }]}>{guard}%</Text>
                  </View>
                  <View style={styles.techTrack}>
                    <View style={[styles.techFill, { width: `${guard}%`, backgroundColor: guard >= 70 ? '#10B981' : '#EF4444' }]} />
                  </View>
                </View>

                {/* Elbow */}
                <View style={styles.techItem}>
                  <View style={styles.techTextRow}>
                    <Text style={styles.techLabel}>4. Arm Extension & Arc</Text>
                    <Text style={[styles.techScore, { color: elbow >= 70 ? '#10B981' : '#F59E0B' }]}>{elbow}%</Text>
                  </View>
                  <View style={styles.techTrack}>
                    <View style={[styles.techFill, { width: `${elbow}%`, backgroundColor: elbow >= 70 ? '#10B981' : '#F59E0B' }]} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 37, 33, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: MartialTheme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1F2E27',
    paddingBottom: 24,
  },
  dragBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A3C34',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2E27',
  },
  headerSub: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  scoreStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2E27',
  },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  scoreUnit: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scoreGradeText: {
    color: '#D4AF37',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  scoreEncouragement: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
  },

  // Section Box
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeadingSuccess: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  checklist: {
    gap: 6,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checklistItemText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },

  // Fix Box
  fixBox: {
    borderColor: '#F59E0B50',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  sectionHeadingWarning: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  fixTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  fixExplanation: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  practiceBtnText: {
    color: '#090F0D',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Action Row
  actionRow: {
    marginTop: 4,
    marginBottom: 14,
  },
  tryAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  tryAgainBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Technical Breakdown Toggle
  techToggleBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  techToggleText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  techDetailsCard: {
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  techCardHeading: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  techItem: {
    marginBottom: 10,
  },
  techTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  techLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  techScore: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  techTrack: {
    height: 5,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  techFill: {
    height: '100%',
    borderRadius: 3,
  },
});

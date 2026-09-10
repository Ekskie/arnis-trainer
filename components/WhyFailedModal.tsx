import React from 'react';
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
  const direction = breakdown?.directionScore ?? Math.min(100, Math.round(overallScore * 1.05));
  const elbow = breakdown?.elbowScore ?? Math.max(40, Math.round(overallScore * 0.9));
  const body = breakdown?.bodyScore ?? Math.max(50, Math.round(overallScore * 0.95));
  const guard = breakdown?.guardScore ?? Math.max(45, Math.round(overallScore * 0.88));

  // Determine weakest pillar to recommend relevant lesson
  let recommendedLesson = {
    id: 'les_1_3',
    title: 'Proper Guard Position (Kalasag)',
    desc: 'Learn to keep your non-striking hand locked to your solar plexus to protect your core.',
    reason: 'Your check hand dropped below hip level during swings.',
  };

  const minScore = Math.min(direction, elbow, body, guard);
  if (minScore === elbow) {
    recommendedLesson = {
      id: strikeId || 'strike_1',
      title: `${strikeName} Technique`,
      desc: 'Master the proper chamber angle and full arm extension arc without overextending.',
      reason: 'Striking arm elbow angle deviated from the ideal cutting window.',
    };
  } else if (minScore === body) {
    recommendedLesson = {
      id: 'les_1_1',
      title: 'Proper Stance (Tindig)',
      desc: 'Lower your center of gravity by bending knees (135°-165°) for power and stability.',
      reason: 'Standing too upright reduces strike leverage and kinetic balance.',
    };
  } else if (minScore === direction) {
    recommendedLesson = {
      id: strikeId || 'strike_1',
      title: `${strikeName} Trajectory`,
      desc: 'Practice tracing the exact cutting line from chamber through target to recovery.',
      reason: 'Weapon trajectory plane deviated from the canonical target line.',
    };
  }

  const getStatus = (score: number) => {
    if (score >= 85) return { color: '#10B981', label: 'Great', icon: 'checkmark-circle' };
    if (score >= 65) return { color: '#F59E0B', label: 'Needs Practice', icon: 'alert-circle' };
    return { color: '#EF4444', label: 'Needs Improvement', icon: 'close-circle' };
  };

  const handlePracticePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    if (onPracticeLesson) {
      onPracticeLesson(recommendedLesson.id);
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
          {/* Handle bar */}
          <View style={styles.dragBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSub}>PERFORMANCE DIAGNOSIS</Text>
              <Text style={styles.headerTitle}>WHY YOU GOT {overallScore}%</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Quick overview pill */}
            <View style={styles.gradeStrip}>
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>{grade}</Text>
              </View>
              <Text style={styles.gradeMessage}>
                {overallScore >= 85
                  ? 'Strong martial execution! Minor adjustments will achieve total mastery.'
                  : overallScore >= 70
                  ? 'Solid foundation! Focus on the highlighted area below to boost your score.'
                  : 'Good effort! Arnis takes repetition. Address the red flags below.'}
              </Text>
            </View>

            {/* Pillar Breakdown Cards */}
            <Text style={styles.sectionLabel}>4-PILLAR BIOMECHANICAL BREAKDOWN</Text>

            {/* 1. Strike Direction */}
            {(() => {
              const status = getStatus(direction);
              return (
                <View style={styles.metricCard}>
                  <View style={styles.metricRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={status.icon as any} size={18} color={status.color} style={{ marginRight: 8 }} />
                      <Text style={styles.metricName}>Strike Direction & Trajectory</Text>
                    </View>
                    <Text style={[styles.metricScore, { color: status.color }]}>{direction}%</Text>
                  </View>
                  <View style={styles.metricProgressTrack}>
                    <View style={[styles.metricProgressFill, { width: `${direction}%`, backgroundColor: status.color }]} />
                  </View>
                  <Text style={styles.metricSub}>{status.label} · Follows intended diagonal or linear path</Text>
                </View>
              );
            })()}

            {/* 2. Body Position & Stance */}
            {(() => {
              const status = getStatus(body);
              return (
                <View style={styles.metricCard}>
                  <View style={styles.metricRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={status.icon as any} size={18} color={status.color} style={{ marginRight: 8 }} />
                      <Text style={styles.metricName}>Body Position & Stance (Tindig)</Text>
                    </View>
                    <Text style={[styles.metricScore, { color: status.color }]}>{body}%</Text>
                  </View>
                  <View style={styles.metricProgressTrack}>
                    <View style={[styles.metricProgressFill, { width: `${body}%`, backgroundColor: status.color }]} />
                  </View>
                  <Text style={styles.metricSub}>{status.label} · Lead knee flexion & athletic balance</Text>
                </View>
              );
            })()}

            {/* 3. Elbow Position */}
            {(() => {
              const status = getStatus(elbow);
              return (
                <View style={styles.metricCard}>
                  <View style={styles.metricRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={status.icon as any} size={18} color={status.color} style={{ marginRight: 8 }} />
                      <Text style={styles.metricName}>Elbow Position & Extension</Text>
                    </View>
                    <Text style={[styles.metricScore, { color: status.color }]}>{elbow}%</Text>
                  </View>
                  <View style={styles.metricProgressTrack}>
                    <View style={[styles.metricProgressFill, { width: `${elbow}%`, backgroundColor: status.color }]} />
                  </View>
                  <Text style={styles.metricSub}>{status.label} · Extension angle at apex of strike</Text>
                </View>
              );
            })()}

            {/* 4. Return to Guard */}
            {(() => {
              const status = getStatus(guard);
              return (
                <View style={styles.metricCard}>
                  <View style={styles.metricRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={status.icon as any} size={18} color={status.color} style={{ marginRight: 8 }} />
                      <Text style={styles.metricName}>Check Hand & Return Guard (Kalasag)</Text>
                    </View>
                    <Text style={[styles.metricScore, { color: status.color }]}>{guard}%</Text>
                  </View>
                  <View style={styles.metricProgressTrack}>
                    <View style={[styles.metricProgressFill, { width: `${guard}%`, backgroundColor: status.color }]} />
                  </View>
                  <Text style={styles.metricSub}>{status.label} · Non-striking hand protecting chest</Text>
                </View>
              );
            })()}

            {/* RECOMMENDED LESSON BOX */}
            <View style={styles.recommendBox}>
              <View style={styles.recommendBadgeRow}>
                <View style={styles.recommendBadge}>
                  <MaterialCommunityIcons name="school" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                  <Text style={styles.recommendBadgeText}>RECOMMENDED LESSON</Text>
                </View>
              </View>

              <Text style={styles.recommendTitle}>{recommendedLesson.title}</Text>
              <Text style={styles.recommendReason}>{recommendedLesson.reason}</Text>
              <Text style={styles.recommendDesc}>{recommendedLesson.desc}</Text>

              <TouchableOpacity
                style={styles.practiceCtaBtn}
                onPress={handlePracticePress}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="sword-cross" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.practiceCtaText}>PRACTICE THIS LESSON</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#12162B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#232A4A',
  },
  dragBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D24B38',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A213D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  gradeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171C35',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#242C50',
  },
  gradeBadge: {
    backgroundColor: '#D24B38',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  gradeMessage: {
    flex: 1,
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  metricCard: {
    backgroundColor: '#181E38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#262F52',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricScore: {
    fontSize: 14,
    fontWeight: '900',
  },
  metricProgressTrack: {
    height: 6,
    backgroundColor: '#0F1326',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  metricProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  recommendBox: {
    marginTop: 14,
    backgroundColor: '#1A2342',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B60',
  },
  recommendBadgeRow: {
    marginBottom: 8,
  },
  recommendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B25',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  recommendBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  recommendTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  recommendReason: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F87171',
    marginBottom: 6,
  },
  recommendDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 14,
  },
  practiceCtaBtn: {
    flexDirection: 'row',
    backgroundColor: '#D24B38',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  practiceCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});

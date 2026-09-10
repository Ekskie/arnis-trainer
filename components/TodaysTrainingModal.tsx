import React, { useState, useEffect, useRef } from 'react';
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

export interface TodaysTrainingModalProps {
  visible: boolean;
  onClose: () => void;
  onStartCameraTest?: (strikeId: string) => void;
}

interface RoutineStep {
  id: string;
  title: string;
  subtitle: string;
  durationSeconds: number;
  icon: any;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  cues: string[];
  strikeId?: string;
}

const DAILY_STEPS: RoutineStep[] = [
  {
    id: 'step_stance',
    title: '1. Stance Drill (Tindig)',
    subtitle: 'Knee Flexion & Center of Gravity',
    durationSeconds: 120, // 2 min
    icon: 'human-male',
    iconFamily: 'MaterialCommunityIcons',
    cues: [
      'Bend both knees into an athletic 135°-165° crouch.',
      '60% weight on lead foot, 40% on rear foot.',
      'Hold position for 30s intervals, pulsing slightly.'
    ]
  },
  {
    id: 'step_grip',
    title: '2. Grip & Guard (Hawak & Kalasag)',
    subtitle: 'Punyo Gap & Chest Guard Retention',
    durationSeconds: 120, // 2 min
    icon: 'shield-check',
    iconFamily: 'MaterialCommunityIcons',
    cues: [
      'Confirm 2 inches of Punyo wood below your pinky.',
      'Pin non-striking live hand flat to your solar plexus.',
      'Practice drawing stick from chamber without dropping guard.'
    ]
  },
  {
    id: 'step_strike1',
    title: '3. Strike 1 Practice (Left Temple)',
    subtitle: 'Forehand Diagonal Downward Cut',
    durationSeconds: 180, // 3 min
    icon: 'sword',
    iconFamily: 'MaterialCommunityIcons',
    cues: [
      'Chamber at right ear at 45° angle.',
      'Slash diagonally toward opponent\'s left temple.',
      'Snap wrist at contact point and return to ready guard.'
    ],
    strikeId: 'strike_1'
  },
  {
    id: 'step_strike2',
    title: '4. Strike 2 Practice (Right Temple)',
    subtitle: 'Backhand Diagonal Downward Cut',
    durationSeconds: 180, // 3 min
    icon: 'sword-cross',
    iconFamily: 'MaterialCommunityIcons',
    cues: [
      'Chamber across body near left shoulder.',
      'Pivot hips forward and drive diagonal backhand.',
      'Rebound smoothly back into dominant side chamber.'
    ],
    strikeId: 'strike_2'
  },
  {
    id: 'step_test',
    title: '5. Quick AI Form Test',
    subtitle: '2-Minute Apex Biomechanics Check',
    durationSeconds: 120, // 2 min
    icon: 'target',
    iconFamily: 'MaterialCommunityIcons',
    cues: [
      'Stand before your camera.',
      'Perform 3 repetitions of Strike 1 and Strike 2.',
      'AI computes your daily consistency score.'
    ],
    strikeId: 'strike_1'
  }
];

export function TodaysTrainingModal({
  visible,
  onClose,
  onStartCameraTest,
}: TodaysTrainingModalProps) {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(DAILY_STEPS[0].durationSeconds);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const timerRef = useRef<any>(null);

  // Sync timer when step changes
  useEffect(() => {
    setRemainingSeconds(DAILY_STEPS[activeStepIndex].durationSeconds);
    setIsRunning(false);
  }, [activeStepIndex]);

  // Interval timer
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Advance to next step or complete
            if (activeStepIndex < DAILY_STEPS.length - 1) {
              setActiveStepIndex(a => a + 1);
            } else {
              setIsCompleted(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, activeStepIndex]);

  const toggleRun = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(!isRunning);
  };

  const handleNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeStepIndex < DAILY_STEPS.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeStepIndex > 0) {
      setActiveStepIndex(activeStepIndex - 1);
    }
  };

  const handleReset = () => {
    setActiveStepIndex(0);
    setIsCompleted(false);
    setIsRunning(false);
    setRemainingSeconds(DAILY_STEPS[0].durationSeconds);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentStep = DAILY_STEPS[activeStepIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.dragBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.headerTag}>
                <Ionicons name="flame" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.headerTagText}>10–15 MIN DAILY DRILL</Text>
              </View>
              <Text style={styles.headerTitle}>TODAY&apos;S TRAINING</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {!isCompleted ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {/* Progress Steps Indicator */}
              <View style={styles.stepProgressRow}>
                {DAILY_STEPS.map((step, idx) => {
                  const isDone = idx < activeStepIndex;
                  const isCurrent = idx === activeStepIndex;
                  return (
                    <TouchableOpacity
                      key={step.id}
                      style={[
                        styles.stepDot,
                        isDone && styles.stepDotDone,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActiveStepIndex(idx);
                      }}
                    >
                      <Text style={[styles.stepDotNum, (isDone || isCurrent) && styles.stepDotNumActive]}>
                        {idx + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Active Step Card */}
              <View style={styles.activeCard}>
                <View style={styles.activeHeader}>
                  <View style={styles.activeIconCircle}>
                    {currentStep.iconFamily === 'MaterialCommunityIcons' ? (
                      <MaterialCommunityIcons name={currentStep.icon} size={22} color="#D24B38" />
                    ) : (
                      <Ionicons name={currentStep.icon} size={22} color="#D24B38" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeTitle}>{currentStep.title}</Text>
                    <Text style={styles.activeSubtitle}>{currentStep.subtitle}</Text>
                  </View>
                </View>

                {/* Big Timer Display */}
                <View style={styles.timerDisplay}>
                  <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>
                  <Text style={styles.timerLabel}>REMAINING</Text>
                </View>

                {/* Cues List */}
                <View style={styles.cuesBox}>
                  <Text style={styles.cuesHeading}>COACH INSTRUCTIONS:</Text>
                  {currentStep.cues.map((cue, cIdx) => (
                    <View key={cIdx} style={styles.cueRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 6, marginTop: 2 }} />
                      <Text style={styles.cueText}>{cue}</Text>
                    </View>
                  ))}
                </View>

                {/* Timer Controls */}
                <View style={styles.controlsRow}>
                  <TouchableOpacity
                    style={styles.prevBtn}
                    onPress={handlePrevStep}
                    disabled={activeStepIndex === 0}
                  >
                    <Ionicons name="play-back" size={18} color={activeStepIndex === 0 ? '#475569' : '#CBD5E1'} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.playBtn, isRunning && styles.playBtnActive]}
                    onPress={toggleRun}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={isRunning ? "pause" : "play"} size={22} color="#FFFFFF" />
                    <Text style={styles.playBtnText}>{isRunning ? 'PAUSE' : 'START STEP'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={handleNextStep}
                  >
                    <Ionicons name="play-forward" size={18} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                {/* If step has a camera test, provide quick launcher */}
                {currentStep.strikeId && onStartCameraTest && (
                  <TouchableOpacity
                    style={styles.cameraLauncher}
                    onPress={() => {
                      onClose();
                      onStartCameraTest(currentStep.strikeId!);
                    }}
                  >
                    <MaterialCommunityIcons name="camera" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={styles.cameraLauncherText}>Open Camera AI Evaluator for this Drill</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          ) : (
            /* COMPLETION SCREEN */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.completionContent}>
              <View style={styles.trophyCircle}>
                <MaterialCommunityIcons name="trophy-award" size={44} color="#F59E0B" />
              </View>

              <Text style={styles.completeTitle}>TRAINING COMPLETE! 🎉</Text>
              <Text style={styles.completeSub}>
                You practiced for 12 focused minutes today.
              </Text>

              {/* Star breakdown */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Strike 1 (Left Temple)</Text>
                  <Text style={styles.starText}>⭐⭐⭐⭐☆</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Strike 2 (Right Temple)</Text>
                  <Text style={styles.starText}>⭐⭐⭐☆☆</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { fontWeight: '800' }]}>Overall Precision</Text>
                  <Text style={[styles.starText, { color: '#10B981', fontWeight: '800' }]}>78%</Text>
                </View>
              </View>

              <View style={styles.nextTimeCard}>
                <Ionicons name="bulb" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextTimeLabel}>COACH ADVICE FOR NEXT SESSION:</Text>
                  <Text style={styles.nextTimeText}>Focus on Strike 2 elbow position and keep your check hand high.</Text>
                </View>
              </View>

              <View style={styles.completionActions}>
                <TouchableOpacity
                  style={styles.continueTomorrowBtn}
                  onPress={onClose}
                  activeOpacity={0.85}
                >
                  <Text style={styles.continueTomorrowText}>CONTINUE TOMORROW</Text>
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.restartBtn}
                  onPress={handleReset}
                >
                  <Text style={styles.restartText}>Repeat Routine</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
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
    maxHeight: '90%',
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
  headerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  headerTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.8,
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
  content: {
    paddingBottom: 20,
  },
  stepProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  stepDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1C2340',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#28335C',
  },
  stepDotDone: {
    backgroundColor: '#10B98125',
    borderColor: '#10B981',
  },
  stepDotCurrent: {
    backgroundColor: '#D24B38',
    borderColor: '#FF6B57',
  },
  stepDotNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  stepDotNumActive: {
    color: '#FFFFFF',
  },
  activeCard: {
    backgroundColor: '#181E38',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#262F52',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D24B3820',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  activeSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  timerDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1326',
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#202848',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  cuesBox: {
    backgroundColor: '#141830',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  cuesHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cueText: {
    flex: 1,
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prevBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1E2544',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#D24B38',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  playBtnActive: {
    backgroundColor: '#F59E0B',
  },
  playBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  nextBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1E2544',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLauncher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: '#F59E0B15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  cameraLauncherText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  completionContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  trophyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
    marginBottom: 14,
  },
  completeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  completeSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#181E38',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262F52',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  starText: {
    fontSize: 13,
    color: '#F59E0B',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#262F52',
    marginVertical: 10,
  },
  nextTimeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#141A32',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  nextTimeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 3,
  },
  nextTimeText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 16,
  },
  completionActions: {
    width: '100%',
    gap: 10,
  },
  continueTomorrowBtn: {
    flexDirection: 'row',
    backgroundColor: '#D24B38',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueTomorrowText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  restartBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  restartText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
});

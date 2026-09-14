import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';

import { MartialTheme } from '@/constants/theme';
import { StrikeRule } from '@/constants/strikeRules';
import { EvaluationConfig, RawPersonPose } from '@/engine/pose/poseEngineTypes';
import { usePoseEngine } from '@/hooks/usePoseEngine';
import { evaluatePoseFrame } from '@/engine/evaluation/strikeEvaluator';
import { getPoseEngineHtml } from '@/constants/poseEngineHtml';
import { LOCAL_STRIKE_VIDEOS } from '@/constants/strikeVideos';
import { AnyoRoutine, AnyoStepResult } from '@/constants/historyStore';

export interface PracticeLiveProps {
  strikeRule: StrikeRule;
  mode: 'follow' | 'guided' | 'test';
  evaluationConfig: EvaluationConfig;
  activeRoutine?: AnyoRoutine | null;
  onComplete: (
    stats: {
      score: number;
      elbowScore: number;
      shoulderScore: number;
      wristScore: number;
      guardScore: number;
      stanceScore: number;
      kneeScore?: number;
      durationMs?: number;
    },
    snapshotBase64?: string,
    replayVideoBase64?: string
  ) => void;
  onCompleteAnyo?: (
    routine: AnyoRoutine,
    steps: AnyoStepResult[],
    totalDurationMs: number,
    snapshotBase64?: string
  ) => void;
  onExit: () => void;
  onChangeMode?: (mode: 'follow' | 'guided' | 'test') => void;
}

export function PracticeLive({
  strikeRule,
  mode,
  evaluationConfig,
  activeRoutine,
  onComplete,
  onCompleteAnyo,
  onExit,
  onChangeMode,
}: PracticeLiveProps) {
  const router = useRouter();
  // Collapsible Technical Analysis drawer (collapsed by default)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Sound toggle override locally
  const [voiceActive, setVoiceActive] = useState(evaluationConfig.voiceEnabled);

  // Real-time HUD states
  const [liveAccuracy, setLiveAccuracy] = useState(0);
  const [coachPrompt, setCoachPrompt] = useState<string>('Get into ready stance (Tindig)');
  const [livePillars, setLivePillars] = useState({
    strikingArm: 0,
    guard: 0,
    stance: 0,
    wrist: 0,
  });

  // Countdown & evaluation states
  const [countdownState, setCountdownState] = useState<'waiting_for_person' | 'counting' | 'evaluating'>('waiting_for_person');
  const [countdownValue, setCountdownValue] = useState<number | string>(3);
  const [countdownSubtext, setCountdownSubtext] = useState<string>('GET READY');
  const isCountingRef = useRef(false);
  const recordingIntervalRef = useRef<any>(null);

  // Best score tracker during evaluation window
  const bestScoreRef = useRef(0);
  const bestAnglesRef = useRef({
    elbowScore: 0,
    shoulderScore: 0,
    wristScore: 0,
    guardScore: 0,
    stanceScore: 0,
  });

  // Form Coach (3-step) states
  const [coachPhase, setCoachPhase] = useState<'chamber' | 'impact' | 'recovery' | 'completed'>('chamber');
  const [coachRepsCompleted, setCoachRepsCompleted] = useState(0);

  // Anyo state tracking
  const [currentAnyoStepIndex, setCurrentAnyoStepIndex] = useState(0);
  const [anyoStepScores, setAnyoStepScores] = useState<AnyoStepResult[]>([]);
  const anyoStartTimeRef = useRef(Date.now());
  const anyoStepStartTimeRef = useRef(Date.now());

  // Auto-detected strike toast
  const [detectedStrike, setDetectedStrike] = useState<{ name: string; confidence: number } | null>(null);
  const detectedOpacity = useRef(new Animated.Value(0)).current;

  // Voice speech throttling
  const lastSpokenTimestampRef = useRef(0);
  const speakCorrection = (text: string) => {
    if (!voiceActive) return;
    const now = Date.now();
    if (now - lastSpokenTimestampRef.current > 3800) {
      lastSpokenTimestampRef.current = now;
      Speech.speak(text, { language: 'en-US', rate: 1.05 });
    }
  };

  // Setup Pose Engine
  const {
    webViewRef,
    webReady,
    statusMsg,
    errorMsg,
    lastSnapshot,
    lastReplayVideo,
    snapshotBannerVisible,
    sendSessionConfig,
    setTargetStrike,
    startVideoRecording,
    stopVideoRecording,
    setFormCoachPhase,
    handleMessage,
  } = usePoseEngine({
    onReady: () => {
      sendSessionConfig({
        ...evaluationConfig,
        voiceEnabled: voiceActive,
      });
    },
    onPoseData: (persons: RawPersonPose[]) => {
      if (persons.length === 0) {
        if (countdownState === 'evaluating') {
          setCoachPrompt('Step back into camera view');
        }
        return;
      }

      const primaryPerson = persons[0];

      // Evaluate frame using Evaluation Engine
      const frameResult = evaluatePoseFrame(primaryPerson, strikeRule);
      setLiveAccuracy(frameResult.accuracy);
      setLivePillars(frameResult.pillars);

      // Present only ONE prioritized coach correction at a time
      if (frameResult.correctionPrompt) {
        setCoachPrompt(frameResult.correctionPrompt);
        speakCorrection(frameResult.correctionPrompt);
      } else if (frameResult.accuracy >= 85) {
        setCoachPrompt('Sharp form! Keep your speed and snap!');
      }

      // Track best scores during evaluating window
      if (countdownState === 'evaluating') {
        if (frameResult.accuracy > bestScoreRef.current) {
          bestScoreRef.current = frameResult.accuracy;
          bestAnglesRef.current = {
            elbowScore: frameResult.elbowScore,
            shoulderScore: frameResult.shoulderScore,
            wristScore: frameResult.wristScore,
            guardScore: frameResult.guardScore,
            stanceScore: frameResult.stanceScore,
          };
        }
      }

      // Auto-start countdown if waiting
      if (countdownState === 'waiting_for_person' && !isCountingRef.current) {
        startCountdown();
      }
    },
    onAutoDetectedStrike: (id, name, confidence) => {
      setDetectedStrike({ name, confidence });
      detectedOpacity.setValue(1);
      Animated.sequence([
        Animated.delay(2400),
        Animated.timing(detectedOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
      if (voiceActive) {
        Speech.speak(`${name} detected`, { language: 'en-US' });
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onFormCoachStepPassed: (phase, score) => {
      if (phase === 'chamber') {
        setCoachPhase('impact');
        setFormCoachPhase('impact');
        if (voiceActive) {
          Speech.speak('Chamber locked! Slice through!');
        }
      } else if (phase === 'impact') {
        setCoachPhase('recovery');
        setFormCoachPhase('recovery');
        if (voiceActive) {
          Speech.speak('Impact hit! Recover back to guard!');
        }
      } else if (phase === 'recovery') {
        setCoachPhase('completed');
        setCoachRepsCompleted((r) => r + 1);
        if (voiceActive) {
          Speech.speak('Rep complete! Great work!');
        }
        setTimeout(() => {
          setCoachPhase('chamber');
          setFormCoachPhase('chamber');
        }, 2000);
      }
    },
  });

  // Sync configuration to WebView when rule or options change
  useEffect(() => {
    if (webReady) {
      sendSessionConfig({
        ...evaluationConfig,
        voiceEnabled: voiceActive,
      });
    }
  }, [webReady, evaluationConfig, voiceActive, sendSessionConfig]);

  // Video player for Mode: Follow the Coach
  const followVideoSource = LOCAL_STRIKE_VIDEOS[strikeRule.id] || LOCAL_STRIKE_VIDEOS.strike_1;
  const followPlayer = useVideoPlayer(followVideoSource, (p) => {
    p.loop = true;
    p.playbackRate = 0.75;
    if (mode === 'follow') {
      p.play();
    }
  });

  // Countdown timer logic: 3 -> 2 -> 1 -> GO!
  const startCountdown = () => {
    isCountingRef.current = true;
    setCountdownState('counting');
    setCountdownSubtext('GET READY');
    setCountdownValue(3);

    setTimeout(() => {
      if (isCountingRef.current) {
        setCountdownValue(2);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 1000);

    setTimeout(() => {
      if (isCountingRef.current) {
        setCountdownValue(1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 2000);

    setTimeout(() => {
      if (isCountingRef.current) {
        setCountdownSubtext('STRIKE NOW!');
        setCountdownValue('GO! ⚔️');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        startEvaluationWindow();
      }
    }, 3000);
  };

  // Timed evaluation window
  const startEvaluationWindow = () => {
    setCountdownState('evaluating');
    bestScoreRef.current = 0;
    startVideoRecording();

    // Evaluation window: 10s for test mode, 6s for guided practice
    const evaluationDurationMs = mode === 'test' ? 10000 : 6000;
    let timeLeft = Math.round(evaluationDurationMs / 1000);

    recordingIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdownValue(`${timeLeft}s`);

      if (timeLeft <= 0) {
        clearInterval(recordingIntervalRef.current);
        finishEvaluation(evaluationDurationMs);
      }
    }, 1000);
  };

  // Complete evaluation
  const finishEvaluation = (durationMs: number) => {
    isCountingRef.current = false;
    stopVideoRecording();

    const finalScore = bestScoreRef.current > 0 ? bestScoreRef.current : liveAccuracy || 78;

    // Check if Anyo mode is active
    if (activeRoutine) {
      const stepScore: AnyoStepResult = {
        stepIndex: currentAnyoStepIndex,
        strikeId: strikeRule.id,
        strikeName: strikeRule.name,
        score: finalScore,
        grade: finalScore >= 85 ? 'Grade A' : 'Grade B',
        durationMs: Date.now() - anyoStepStartTimeRef.current,
        snapshotBase64: lastSnapshot || undefined,
      };

      const updatedScores = [...anyoStepScores, stepScore];
      setAnyoStepScores(updatedScores);

      if (currentAnyoStepIndex + 1 < activeRoutine.strikes.length) {
        // Next Anyo step
        const nextIdx = currentAnyoStepIndex + 1;
        setCurrentAnyoStepIndex(nextIdx);
        anyoStepStartTimeRef.current = Date.now();
        setTargetStrike(activeRoutine.strikes[nextIdx]);
        startCountdown();
      } else {
        // Anyo complete!
        const totalDuration = Date.now() - anyoStartTimeRef.current;
        onCompleteAnyo?.(activeRoutine, updatedScores, totalDuration, lastSnapshot || undefined);
      }
      return;
    }

    // Single Strike completion
    onComplete(
      {
        score: finalScore,
        elbowScore: bestAnglesRef.current.elbowScore || livePillars.strikingArm || finalScore,
        shoulderScore: bestAnglesRef.current.shoulderScore || 80,
        wristScore: bestAnglesRef.current.wristScore || livePillars.wrist || 85,
        guardScore: bestAnglesRef.current.guardScore || livePillars.guard || 80,
        stanceScore: bestAnglesRef.current.stanceScore || livePillars.stance || 80,
        durationMs,
      },
      lastSnapshot || undefined,
      lastReplayVideo || undefined
    );
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      isCountingRef.current = false;
    };
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 85) return MartialTheme.colors.primary;
    if (score >= 70) return MartialTheme.colors.bamboo;
    return '#EF4444';
  };

  const modelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  const webBaseUrl = Platform.OS === 'android' ? 'https://localhost' : 'http://localhost';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* --- 1. CLEAN TOP APP BAR --- */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onExit}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={MartialTheme.colors.text} />
        </TouchableOpacity>

        <View style={styles.techniqueHeaderBox}>
          <Text style={styles.techniqueTitleText}>
            Strike {strikeRule.strikeNumber} — {strikeRule.target.split('/')[0].trim()}
          </Text>
          <View style={styles.techniqueStarRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= 3 ? 'star' : 'star-outline'}
                size={11}
                color={s <= 3 ? MartialTheme.colors.bamboo : '#D1D5DB'}
              />
            ))}
            <Text style={styles.techniqueModeTag}>
              {mode === 'guided' ? 'Guided' : mode === 'follow' ? 'Mirror' : 'Test'}
            </Text>
          </View>
        </View>

        {/* Actions on right: Quick Coach Tips + Audio Toggle Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.coachLiveBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: '/chat' as any,
                params: {
                  strikeId: strikeRule.id,
                  strikeName: strikeRule.name,
                  source: 'practice',
                },
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.coachLiveBtnText}>💬 Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.audioToggleBtn, voiceActive && styles.audioToggleBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setVoiceActive(!voiceActive);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={voiceActive ? 'volume-high' : 'volume-mute'}
              size={20}
              color={voiceActive ? MartialTheme.colors.primary : MartialTheme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- 2. IMMERSIVE CAMERA VIEWPORT --- */}
      <View style={styles.cameraViewport}>
        {/* If in Follow the Coach mode: Split upper instructor video view */}
        {mode === 'follow' && (
          <View style={styles.followVideoHeader}>
            <View style={styles.followBadge}>
              <Ionicons name="eye" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.followBadgeText}>COACH DEMO</Text>
            </View>
            <VideoView
              style={styles.followVideo}
              player={followPlayer}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
              contentFit="cover"
            />
          </View>
        )}

        {/* Real-time Pose WebView */}
        <View style={{ flex: 1 }}>
          <WebView
            ref={webViewRef}
            source={{
              html: getPoseEngineHtml(modelUrl),
              baseUrl: webBaseUrl,
            }}
            originWhitelist={['*']}
            style={styles.webView}
            scrollEnabled={false}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            allowFileAccess={true}
            androidLayerType="hardware"
            mediaCapturePermissionGrantType="grant"
            // @ts-ignore
            onPermissionRequest={(event: any) => {
              event.grant(event.resources);
            }}
            onMessage={handleMessage}
          />

          {!webReady && (
            <View style={styles.loadingBackdrop}>
              <ActivityIndicator size="large" color={MartialTheme.colors.primary} />
              <Text style={styles.loadingText}>{errorMsg || statusMsg || 'Preparing camera...'}</Text>
            </View>
          )}

          {/* Snapshot Confirmation Pill */}
          {snapshotBannerVisible && (
            <View style={styles.snapshotBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.snapshotBadgeText}>Impact Snapshot Captured 📸</Text>
            </View>
          )}

          {/* AI Identified Strike Toast */}
          {detectedStrike && (
            <Animated.View style={[styles.aiDetectedBadge, { opacity: detectedOpacity }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
              <Text style={styles.aiDetectedText}>
                {detectedStrike.name} ({detectedStrike.confidence}%)
              </Text>
            </Animated.View>
          )}

          {/* Guided Mode 3-Phase Stepper */}
          {mode === 'guided' && (
            <View style={styles.phaseGuideRow}>
              {(['chamber', 'impact', 'recovery'] as const).map((step, idx) => {
                const isActive = coachPhase === step;
                return (
                  <View
                    key={step}
                    style={[
                      styles.phaseStepPill,
                      isActive && styles.phaseStepPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.phaseStepText,
                        isActive && styles.phaseStepTextActive,
                      ]}
                    >
                      {idx + 1}. {step.toUpperCase()}
                    </Text>
                  </View>
                );
              })}
              {coachRepsCompleted > 0 && (
                <View style={[styles.phaseStepPill, styles.repsCounterPill]}>
                  <Text style={styles.repsCounterText}>REPS: {coachRepsCompleted}</Text>
                </View>
              )}
            </View>
          )}

          {/* Countdown Overlay (3 -> 2 -> 1 -> GO!) */}
          {countdownState === 'counting' && (
            <View style={styles.countdownCenterOverlay}>
              <View style={styles.countdownBox}>
                <Text style={styles.countdownSubtext}>{countdownSubtext}</Text>
                <Text style={styles.countdownNumber}>{countdownValue}</Text>
              </View>
            </View>
          )}

          {/* Active Timer Pill when evaluating */}
          {countdownState === 'evaluating' && (
            <View style={styles.evaluatingTimerPill}>
              <Ionicons name="timer-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.evaluatingTimerText}>{countdownValue}</Text>
            </View>
          )}

          {/* Real-time Score Gauge & Single Coach Correction Bubble */}
          <View style={styles.inCameraHudBottom}>
            {/* Live Precision Score */}
            <View style={styles.scoreGaugeCircle}>
              <Text style={[styles.scoreGaugeValue, { color: getScoreColor(liveAccuracy) }]}>
                {liveAccuracy}%
              </Text>
              <Text style={styles.scoreGaugeLabel}>PRECISION</Text>
            </View>

            {/* ONLY ONE Single Coach Guidance Correction */}
            <View style={styles.coachGuidanceBubble}>
              <View style={styles.coachGuidanceHeader}>
                <Ionicons name="shield-checkmark" size={13} color={MartialTheme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.coachGuidanceTag}>COACH TIP</Text>
              </View>
              <Text style={styles.coachGuidanceText} numberOfLines={2}>
                {coachPrompt}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* --- 3. BOTTOM CONTROL DRAWER --- */}
      <View style={styles.bottomDrawer}>
        <View style={styles.drawerRow}>
          {/* Collapsible Technical Analysis Toggle */}
          <TouchableOpacity
            style={styles.technicalToggleBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowTechnicalDetails(!showTechnicalDetails);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showTechnicalDetails ? 'chevron-down' : 'stats-chart-outline'}
              size={16}
              color={MartialTheme.colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.technicalToggleText}>
              {showTechnicalDetails ? 'Hide Details' : 'Technical Analysis'}
            </Text>
          </TouchableOpacity>

          {/* Primary Action Button: Finish Rep */}
          <TouchableOpacity
            style={styles.finishRepBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              finishEvaluation(3500);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.finishRepBtnText}>Finish Rep</Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Collapsible 4-Pillar Alignment Bars */}
        {showTechnicalDetails && (
          <View style={styles.technicalDrawerContent}>
            <Text style={styles.technicalHeading}>BIOMECHANICAL ALIGNMENT</Text>
            {[
              { label: 'Trajectory (Elbow)', score: livePillars.strikingArm, color: '#3B82F6' },
              { label: 'Kalasag Guard Hand', score: livePillars.guard, color: '#10B981' },
              { label: 'Tindig Stance Base', score: livePillars.stance, color: '#F59E0B' },
              { label: 'Pitik Wrist Snap', score: livePillars.wrist, color: '#8B5CF6' },
            ].map((pillar) => (
              <View key={pillar.label} style={styles.pillarBarRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={styles.pillarBarLabel}>{pillar.label}</Text>
                  <Text style={[styles.pillarBarScore, { color: pillar.color }]}>{pillar.score}%</Text>
                </View>
                <View style={styles.pillarBarTrack}>
                  <View
                    style={[
                      styles.pillarBarFill,
                      { width: `${pillar.score}%`, backgroundColor: pillar.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // TOP BAR
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  techniqueHeaderBox: {
    flex: 1,
    marginHorizontal: 12,
  },
  techniqueTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  techniqueStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  techniqueModeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: MartialTheme.colors.primaryDark,
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  coachLiveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  coachLiveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  audioToggleBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  audioToggleBtnActive: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    borderColor: '#BBF7D0',
  },

  // CAMERA VIEWPORT
  cameraViewport: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  followVideoHeader: {
    height: 180,
    backgroundColor: '#1E293B',
    position: 'relative',
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
  },
  followBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  followBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  followVideo: {
    flex: 1,
    width: '100%',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 10,
    fontWeight: '600',
  },

  // BADGES & OVERLAYS
  snapshotBadge: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  snapshotBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  aiDetectedBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  aiDetectedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FDE68A',
  },
  phaseGuideRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    gap: 4,
  },
  phaseStepPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  phaseStepPillActive: {
    backgroundColor: MartialTheme.colors.primary,
    borderColor: '#86EFAC',
  },
  phaseStepText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
  },
  phaseStepTextActive: {
    color: '#FFFFFF',
  },
  repsCounterPill: {
    backgroundColor: MartialTheme.colors.primaryDark,
    borderColor: MartialTheme.colors.primary,
  },
  repsCounterText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // COUNTDOWN OVERLAY
  countdownCenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  countdownBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 36,
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: MartialTheme.colors.primary,
  },
  countdownSubtext: {
    fontSize: 13,
    fontWeight: '900',
    color: MartialTheme.colors.bamboo,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  countdownNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  evaluatingTimerPill: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 88, 12, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  evaluatingTimerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // IN-CAMERA HUD BOTTOM
  inCameraHudBottom: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreGaugeCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  scoreGaugeValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  scoreGaugeLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  coachGuidanceBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  coachGuidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  coachGuidanceTag: {
    fontSize: 9,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  coachGuidanceText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: MartialTheme.colors.text,
    lineHeight: 17,
  },

  // BOTTOM DRAWER
  bottomDrawer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  technicalToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  technicalToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
  },
  finishRepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  finishRepBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // COLLAPSIBLE TECHNICAL DRAWER
  technicalDrawerContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
    gap: 8,
  },
  technicalHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 1,
    marginBottom: 2,
  },
  pillarBarRow: {},
  pillarBarLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
  },
  pillarBarScore: {
    fontSize: 11,
    fontWeight: '900',
  },
  pillarBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  pillarBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});

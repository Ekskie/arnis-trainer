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
  // Telemetry drawer toggle
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState(false);

  // Real-time HUD states
  const [liveAccuracy, setLiveAccuracy] = useState(0);
  const [coachPrompt, setCoachPrompt] = useState<string | null>(null);
  const [livePillars, setLivePillars] = useState({
    strikingArm: 0,
    guard: 0,
    stance: 0,
    wrist: 0,
  });

  // Countdown and evaluation timing states
  const [countdownState, setCountdownState] = useState<'waiting_for_person' | 'counting' | 'evaluating'>('waiting_for_person');
  const [countdownValue, setCountdownValue] = useState<number | string>(3);
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
    if (!evaluationConfig.voiceEnabled) return;
    const now = Date.now();
    if (now - lastSpokenTimestampRef.current > 4000) {
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
      // Send initial configuration to WebView once ready
      sendSessionConfig(evaluationConfig);
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

      if (frameResult.correctionPrompt) {
        setCoachPrompt(frameResult.correctionPrompt);
        speakCorrection(frameResult.correctionPrompt);
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
        Animated.delay(2600),
        Animated.timing(detectedOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
      if (evaluationConfig.voiceEnabled) {
        Speech.speak(`${name} detected`, { language: 'en-US' });
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onFormCoachStepPassed: (phase, score) => {
      if (phase === 'chamber') {
        setCoachPhase('impact');
        setFormCoachPhase('impact');
        if (evaluationConfig.voiceEnabled) {
          Speech.speak('Chamber locked! Slice through the target line!');
        }
      } else if (phase === 'impact') {
        setCoachPhase('recovery');
        setFormCoachPhase('recovery');
        if (evaluationConfig.voiceEnabled) {
          Speech.speak('Impact peak hit! Recover back to guard!');
        }
      } else if (phase === 'recovery') {
        setCoachPhase('completed');
        setCoachRepsCompleted((r) => r + 1);
        if (evaluationConfig.voiceEnabled) {
          Speech.speak('Masterful execution! Rep complete!');
        }
        setTimeout(() => {
          setCoachPhase('chamber');
          setFormCoachPhase('chamber');
        }, 2200);
      }
    },
  });

  // Sync configuration to WebView when rule or options change
  useEffect(() => {
    if (webReady) {
      sendSessionConfig(evaluationConfig);
    }
  }, [webReady, evaluationConfig, sendSessionConfig]);

  // Video player for Mode: Follow Me
  const followVideoSource = LOCAL_STRIKE_VIDEOS[strikeRule.id] || LOCAL_STRIKE_VIDEOS.strike_1;
  const followPlayer = useVideoPlayer(followVideoSource, (p) => {
    p.loop = true;
    p.playbackRate = 0.75;
    if (mode === 'follow') {
      p.play();
    }
  });

  // Countdown timer logic
  const startCountdown = () => {
    isCountingRef.current = true;
    setCountdownState('counting');
    setCountdownValue(3);

    setTimeout(() => {
      if (isCountingRef.current) setCountdownValue(2);
    }, 1000);

    setTimeout(() => {
      if (isCountingRef.current) setCountdownValue(1);
    }, 2000);

    setTimeout(() => {
      if (isCountingRef.current) {
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

    // Evaluation window: 10s for test mode, 5s for guided practice
    const evaluationDurationMs = mode === 'test' ? 10000 : 5000;
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

    const finalScore = bestScoreRef.current > 0 ? bestScoreRef.current : liveAccuracy || 75;

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
    if (score >= 90) return '#10B981';
    if (score >= 75) return '#3B82F6';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  // Base URL for model loading
  const modelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  const webBaseUrl = Platform.OS === 'android' ? 'https://localhost' : 'http://localhost';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. TOP CONTROL BAR */}
      <View style={styles.topControlBar}>
        <TouchableOpacity style={styles.exitButton} onPress={onExit} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={MartialTheme.colors.text} />
        </TouchableOpacity>

        <View style={styles.strikeTitleBox}>
          <Text style={styles.strikeTitleText}>{strikeRule.name}</Text>
          <Text style={styles.strikeTargetText} numberOfLines={1}>
            {strikeRule.target}
          </Text>
        </View>

        {/* Live Mode Toggle Pill */}
        <View style={styles.modeToggleGroup}>
          {(['guided', 'follow', 'test'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeToggleBtn, mode === m && styles.modeToggleBtnActive]}
              onPress={() => onChangeMode?.(m)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeToggleBtnText, mode === m && styles.modeToggleBtnTextActive]}>
                {m === 'guided' ? 'Guided' : m === 'follow' ? 'Mirror' : 'Test'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 2. CAMERA & VIDEO VIEWPORT */}
      <View style={styles.viewportContainer}>
        {/* If in Follow Me Mirror mode: Side-by-Side Video Demonstration */}
        {mode === 'follow' && (
          <View style={styles.followVideoBox}>
            <Text style={styles.followVideoHeading}>TEACHER MIRROR</Text>
            <VideoView
              style={styles.followVideo}
              player={followPlayer}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
              contentFit="cover"
            />
          </View>
        )}

        {/* Camera WebView */}
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
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color={MartialTheme.colors.primary} />
              <Text style={styles.loaderText}>{errorMsg || statusMsg}</Text>
            </View>
          )}

          {/* Snapshot saved pill */}
          {snapshotBannerVisible && (
            <View style={styles.snapshotPill}>
              <Ionicons name="camera" size={13} color="#10B981" style={{ marginRight: 5 }} />
              <Text style={styles.snapshotPillText}>📸 Impact Snapshot Captured</Text>
            </View>
          )}

          {/* Real-time AI Identified Strike Banner */}
          {detectedStrike && (
            <Animated.View style={[styles.detectedPill, { opacity: detectedOpacity }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
              <Text style={styles.detectedPillText}>
                {detectedStrike.name} ({detectedStrike.confidence}%)
              </Text>
            </Animated.View>
          )}

          {/* Form Coach Phase Indicator (Chamber -> Impact -> Recovery) */}
          {mode === 'guided' && (
            <View style={styles.formCoachPillsRow}>
              {(['chamber', 'impact', 'recovery'] as const).map((step, idx) => (
                <View
                  key={step}
                  style={[
                    styles.formCoachStepPill,
                    coachPhase === step && styles.formCoachStepPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.formCoachStepText,
                      coachPhase === step && styles.formCoachStepTextActive,
                    ]}
                  >
                    {idx + 1}. {step.toUpperCase()}
                  </Text>
                </View>
              ))}
              {coachRepsCompleted > 0 && (
                <View style={[styles.formCoachStepPill, { backgroundColor: MartialTheme.colors.primary, borderColor: MartialTheme.colors.primary }]}>
                  <Text style={[styles.formCoachStepText, { color: '#FFFFFF' }]}>
                    REPS: {coachRepsCompleted}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Countdown / Timer Floating Badge */}
          {countdownState !== 'waiting_for_person' && (
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownBadgeText}>{countdownValue}</Text>
            </View>
          )}

          {/* Live Score Circle & Coach Prompt HUD */}
          <View style={styles.hudOverlayBottom}>
            <View style={styles.scoreCircleBox}>
              <Text style={[styles.scoreCircleText, { color: getScoreColor(liveAccuracy) }]}>
                {liveAccuracy}%
              </Text>
              <Text style={styles.scoreCircleLabel}>PRECISION</Text>
            </View>

            <View style={styles.coachPromptBubble}>
              <Text style={styles.coachPromptTag}>COACH</Text>
              <Text style={styles.coachPromptText} numberOfLines={2}>
                {coachPrompt || 'Assume ready fighting stance (Tindig) with check hand up.'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. BOTTOM CONTROL DRAWER */}
      <View style={styles.bottomDrawer}>
        <View style={styles.drawerActionsRow}>
          <TouchableOpacity
            style={styles.telemetryToggleBtn}
            onPress={() => setShowTelemetryDrawer(!showTelemetryDrawer)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showTelemetryDrawer ? 'chevron-down' : 'bar-chart-outline'}
              size={16}
              color={MartialTheme.colors.text}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.telemetryToggleText}>
              {showTelemetryDrawer ? 'Hide Telemetry' : '4-Pillar Telemetry'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stopPracticeBtn}
            onPress={() => finishEvaluation(3000)}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.stopPracticeBtnText}>Finish Rep</Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible 4-Pillar Bars */}
        {showTelemetryDrawer && (
          <View style={styles.telemetryGrid}>
            {[
              { label: 'Trajectory (Elbow)', score: livePillars.strikingArm, color: '#3B82F6' },
              { label: 'Kalasag Guard', score: livePillars.guard, color: '#10B981' },
              { label: 'Tindig Stance', score: livePillars.stance, color: '#F59E0B' },
              { label: 'Pitik Wrist', score: livePillars.wrist, color: '#8B5CF6' },
            ].map((pillar) => (
              <View key={pillar.label} style={styles.telemetryBarItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={styles.telemetryBarLabel}>{pillar.label}</Text>
                  <Text style={[styles.telemetryBarScore, { color: pillar.color }]}>{pillar.score}%</Text>
                </View>
                <View style={styles.telemetryBarTrack}>
                  <View
                    style={[
                      styles.telemetryBarFill,
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
    backgroundColor: '#000000',
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  exitButton: {
    padding: 6,
  },
  strikeTitleBox: {
    flex: 1,
    marginHorizontal: 10,
  },
  strikeTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  strikeTargetText: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
  },
  modeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 2,
  },
  modeToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modeToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeToggleBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  modeToggleBtnTextActive: {
    color: MartialTheme.colors.primary,
    fontWeight: '900',
  },
  viewportContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  followVideoBox: {
    height: 180,
    backgroundColor: '#111827',
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
  },
  followVideoHeading: {
    position: 'absolute',
    top: 6,
    left: 8,
    zIndex: 10,
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  followVideo: {
    flex: 1,
    width: '100%',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 10,
    fontWeight: '600',
  },
  snapshotPill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  snapshotPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detectedPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  detectedPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FDE68A',
  },
  formCoachPillsRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 4,
  },
  formCoachStepPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  formCoachStepPillActive: {
    backgroundColor: MartialTheme.colors.primary,
    borderColor: '#FFFFFF',
  },
  formCoachStepText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  formCoachStepTextActive: {
    color: '#FFFFFF',
  },
  countdownBadge: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: MartialTheme.colors.primary,
  },
  countdownBadgeText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  hudOverlayBottom: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreCircleBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scoreCircleText: {
    fontSize: 16,
    fontWeight: '900',
  },
  scoreCircleLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  coachPromptBubble: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  coachPromptTag: {
    fontSize: 8.5,
    fontWeight: '900',
    color: MartialTheme.colors.primary,
    letterSpacing: 0.8,
  },
  coachPromptText: {
    fontSize: 12,
    fontWeight: '700',
    color: MartialTheme.colors.text,
    marginTop: 1,
  },
  bottomDrawer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
  },
  drawerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  telemetryToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  telemetryToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  stopPracticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  stopPracticeBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  telemetryGrid: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
    gap: 8,
  },
  telemetryBarItem: {},
  telemetryBarLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  telemetryBarScore: {
    fontSize: 11,
    fontWeight: '900',
  },
  telemetryBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  telemetryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});

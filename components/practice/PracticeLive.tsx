import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCameraPermissions } from 'expo-camera';
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
import { ImpactDetector } from '@/services/impactDetector';
import { CoachCharacter } from '@/components/ui/CoachCharacter';
import { TactileButton } from '@/components/ui/TactileButton';

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
      kineticPhases?: {
        chamber: number;
        apex: number;
        recovery: number;
      };
    },
    snapshotBase64?: string,
    replayVideoBase64?: string,
    impactMeta?: {
      impactFrame?: number;
      impactTime?: number;
      confidence?: number;
      actualAngles?: {
        elbow?: number;
        shoulder?: number;
        knee?: number;
      };
    }
  ) => void;
  onCompleteAnyo?: (
    routine: AnyoRoutine,
    steps: AnyoStepResult[],
    totalDurationMs: number,
    snapshotBase64?: string
  ) => void;
  onExit: () => void;
  onChangeMode?: (mode: 'follow' | 'guided' | 'test') => void;
  onSelectStrike?: (strikeId: string) => void;
  autoStartEval?: boolean;
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
  onSelectStrike,
  autoStartEval = false,
}: PracticeLiveProps) {
  const router = useRouter();
  // Collapsible Technical Analysis drawer (collapsed by default)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Camera permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    if (!cameraPermission?.granted) {
      requestCameraPermission().catch(() => {});
    }
  }, [cameraPermission, requestCameraPermission]);

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

  // Countdown & evaluation states: 'practice' (un-timed free practice) -> 'counting' -> 'evaluating'
  const [countdownState, setCountdownState] = useState<'practice' | 'counting' | 'evaluating'>('practice');
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
  const impactDetectorRef = useRef(new ImpactDetector());

  // Ghost guide visibility override: visible in free practice, hidden in formal evaluation
  const [ghostGuideVisible, setGhostGuideVisible] = useState(countdownState === 'practice');

  // Multi-Phase kinetic scoring tracking (25% Chamber, 50% Apex, 25% Recovery)
  const chamberScoreRef = useRef(0);
  const apexScoreRef = useRef(0);
  const recoveryScoreRef = useRef(0);
  const apexHitDetectedRef = useRef(false);
  const recoveryPromptTimeoutRef = useRef<any>(null);
  const evalSafetyTimeoutRef = useRef<any>(null);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [isFeetOutOfView, setIsFeetOutOfView] = useState(false);

  // Form Coach (3-step) states
  const [coachPhase, setCoachPhase] = useState<'chamber' | 'impact' | 'recovery' | 'completed'>('chamber');
  const [coachRepsCompleted, setCoachRepsCompleted] = useState(0);

  // Quick cycle strike (Strike 1 -> 12) directly from camera in Free Practice
  const handleCycleStrike = (dir: -1 | 1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let nextNum = strikeRule.strikeNumber + dir;
    if (nextNum < 1) nextNum = 12;
    if (nextNum > 12) nextNum = 1;
    const nextStrikeId = `strike_${nextNum}`;
    setTargetStrike(nextStrikeId);
    onSelectStrike?.(nextStrikeId);
  };

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

  // Handler when strike apex impact is detected
  const handleApexTriggered = (acc?: number) => {
    if (countdownState !== 'evaluating' || apexHitDetectedRef.current) return;
    apexHitDetectedRef.current = true;
    const currentAcc = acc || liveAccuracy;
    apexScoreRef.current = Math.max(apexScoreRef.current, currentAcc);

    playAudio('impact');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowRecoveryPrompt(true);
    setCoachPrompt('RECOVER TO GUARD! 🛡️');
    if (voiceActive) {
      Speech.speak('Recover to guard!', { language: 'en-US', rate: 1.1 });
    }

    // 1.5s recovery grace window before auto-finishing evaluation
    if (recoveryPromptTimeoutRef.current) clearTimeout(recoveryPromptTimeoutRef.current);
    recoveryPromptTimeoutRef.current = setTimeout(() => {
      finishEvaluation(3500);
    }, 1500);
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
    playAudio,
    setGhostGuide,
    setTrajectoryGuide,
    handleMessage,
  } = usePoseEngine({
    onReady: () => {
      sendSessionConfig({
        ...evaluationConfig,
        ghostGuideEnabled: ghostGuideVisible,
        trajectoryGuideEnabled: ghostGuideVisible,
        voiceEnabled: voiceActive,
      });
    },
    onApexHit: (_velocity, accuracy) => {
      handleApexTriggered(accuracy);
    },
    onPoseData: (persons: RawPersonPose[]) => {
      if (persons.length === 0) {
        setIsFeetOutOfView(false);
        if (countdownState === 'evaluating') {
          setCoachPrompt('Step back into camera view');
        } else if (countdownState === 'practice') {
          setCoachPrompt('Step into camera view to practice');
        }
        return;
      }

      const primaryPerson = persons[0];
      setIsFeetOutOfView(!!primaryPerson.isFeetOutOfView);

      // Evaluate frame using Evaluation Engine
      const frameResult = evaluatePoseFrame(primaryPerson, strikeRule);
      setLiveAccuracy(frameResult.accuracy);
      setLivePillars(frameResult.pillars);

      // Present only ONE prioritized coach correction at a time in practice mode
      if (countdownState === 'practice') {
        if (frameResult.correctionPrompt) {
          setCoachPrompt(frameResult.correctionPrompt);
          speakCorrection(frameResult.correctionPrompt);
        } else if (frameResult.accuracy >= 85) {
          setCoachPrompt('Sharp form! Tap Evaluate Form when ready!');
        }
      }

      // Track multi-phase progress & apex moments during evaluating window
      if (countdownState === 'evaluating') {
        impactDetectorRef.current.addFrame(primaryPerson, strikeRule, lastSnapshot || undefined);

        if (!apexHitDetectedRef.current) {
          // Phase 1: Chamber preparation
          chamberScoreRef.current = Math.max(chamberScoreRef.current, frameResult.accuracy);
          if (primaryPerson.isApex || primaryPerson.motionPhase === 'apex_hit') {
            handleApexTriggered(frameResult.accuracy);
          }
        } else {
          // Phase 3: Recovery back to guard
          const returnScore = Math.round(frameResult.guardScore * 0.5 + frameResult.stanceScore * 0.5);
          recoveryScoreRef.current = Math.max(recoveryScoreRef.current, returnScore);

          // If user locks guard and stance cleanly back, complete early
          if (frameResult.guardScore >= 80 && frameResult.stanceScore >= 75) {
            if (recoveryPromptTimeoutRef.current) clearTimeout(recoveryPromptTimeoutRef.current);
            setTimeout(() => finishEvaluation(2500), 200);
          }
        }

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
          try {
            Speech.stop().catch(() => {}).then(() => {
              Speech.speak('Chamber locked! Slice through!', { language: 'en-US', rate: 1.1 });
            }).catch(() => {});
          } catch {}
        }
      } else if (phase === 'impact') {
        setCoachPhase('recovery');
        setFormCoachPhase('recovery');
        if (voiceActive) {
          try {
            Speech.stop().catch(() => {}).then(() => {
              Speech.speak('Impact hit! Recover back to guard!', { language: 'en-US', rate: 1.1 });
            }).catch(() => {});
          } catch {}
        }
      } else if (phase === 'recovery') {
        setCoachPhase('completed');
        setCoachRepsCompleted((r) => r + 1);
        if (voiceActive) {
          try {
            Speech.stop().catch(() => {}).then(() => {
              Speech.speak('Rep complete! Great work!', { language: 'en-US', rate: 1.1 });
            }).catch(() => {});
          } catch {}
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

  // Video player for Mode: Follow the Coach (only instantiate when mode is 'follow' to save resources and prevent decoder contention)
  const followVideoSource = useMemo(() => {
    if (mode !== 'follow') return null;
    const raw = LOCAL_STRIKE_VIDEOS[strikeRule.id] || LOCAL_STRIKE_VIDEOS.strike_1;
    try {
      const resolved = Image.resolveAssetSource(raw);
      return resolved?.uri ? { uri: resolved.uri } : raw;
    } catch {
      return raw;
    }
  }, [mode, strikeRule.id]);

  const followPlayer = useVideoPlayer(followVideoSource, (p) => {
    if (!p) return;
    try {
      p.loop = true;
      p.playbackRate = 0.75;
      if (mode === 'follow') {
        p.play();
      } else {
        p.pause();
      }
    } catch {
      // ignore
    }
  });

  // Sync playback state when mode changes
  useEffect(() => {
    if (!followPlayer) return;
    try {
      if (mode === 'follow') {
        followPlayer.play();
      } else {
        followPlayer.pause();
      }
    } catch {
      // ignore
    }
  }, [mode, followPlayer]);

  // Countdown timer logic: 3 -> 2 -> 1 -> GO!
  const startCountdown = () => {
    isCountingRef.current = true;
    setCountdownState('counting');
    setCountdownSubtext('GET READY');
    setCountdownValue(3);
    playAudio('countdown', false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => {
      if (isCountingRef.current) {
        setCountdownValue(2);
        playAudio('countdown', false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 1000);

    setTimeout(() => {
      if (isCountingRef.current) {
        setCountdownValue(1);
        playAudio('countdown', false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }, 2000);

    setTimeout(() => {
      if (isCountingRef.current) {
        setCountdownSubtext('STRIKE NOW!');
        setCountdownValue('GO! ⚔️');
        playAudio('countdown', true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (voiceActive) {
          Speech.speak('Strike now!', { language: 'en-US' });
        }
        startEvaluationWindow();
      }
    }, 3000);
  };

  // Timed evaluation window
  const startEvaluationWindow = () => {
    setCountdownState('evaluating');
    bestScoreRef.current = 0;
    chamberScoreRef.current = 0;
    apexScoreRef.current = 0;
    recoveryScoreRef.current = 0;
    apexHitDetectedRef.current = false;
    setShowRecoveryPrompt(false);

    // Hide ghost guide and trajectory in formal evaluation to test raw form
    setGhostGuideVisible(false);
    setGhostGuide(false);
    setTrajectoryGuide(false);

    impactDetectorRef.current.reset(Date.now());
    startVideoRecording();

    if (recoveryPromptTimeoutRef.current) clearTimeout(recoveryPromptTimeoutRef.current);
    if (evalSafetyTimeoutRef.current) clearTimeout(evalSafetyTimeoutRef.current);

    // 5.0-second maximum safety timeout (hybrid auto-finish)
    evalSafetyTimeoutRef.current = setTimeout(() => {
      finishEvaluation(5000);
    }, 5000);

    let timeLeft = 5;
    recordingIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdownValue(`${timeLeft}s`);

      if (timeLeft <= 0) {
        clearInterval(recordingIntervalRef.current);
      }
    }, 1000);
  };

  const startCountdownRef = useRef(startCountdown);
  startCountdownRef.current = startCountdown;

  // Auto-start evaluation if triggered from Results "Re-test Form" button
  useEffect(() => {
    if (autoStartEval && webReady && countdownState === 'practice' && !isCountingRef.current) {
      const timer = setTimeout(() => {
        startCountdownRef.current();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoStartEval, webReady, countdownState]);

  // Complete evaluation
  const finishEvaluation = (durationMs: number) => {
    isCountingRef.current = false;
    stopVideoRecording();

    if (recoveryPromptTimeoutRef.current) clearTimeout(recoveryPromptTimeoutRef.current);
    if (evalSafetyTimeoutRef.current) clearTimeout(evalSafetyTimeoutRef.current);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    setShowRecoveryPrompt(false);

    // Calculate Multi-Phase Kinetic Score: 25% Chamber + 50% Apex + 25% Recovery
    const sChamber = chamberScoreRef.current > 0 ? chamberScoreRef.current : Math.max(bestAnglesRef.current.elbowScore, 65);
    const sApex = apexScoreRef.current > 0 ? apexScoreRef.current : (bestScoreRef.current > 0 ? bestScoreRef.current : 70);
    // If recovery was never detected/completed within grace window, apply penalty (35)
    const sRecovery = recoveryScoreRef.current > 0 ? recoveryScoreRef.current : 35;

    const multiPhaseScore = Math.round(sChamber * 0.25 + sApex * 0.50 + sRecovery * 0.25);
    const finalScore = Math.max(10, Math.min(100, multiPhaseScore));

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
    const impactResult = impactDetectorRef.current.finalize(durationMs);
    const actualAngles = {
      elbow: Math.round(impactResult.detectedPose.rightAngle ?? 0),
      shoulder: Math.round(impactResult.detectedPose.rightShoulderAngle ?? 0),
      knee: Math.round(impactResult.detectedPose.leadKneeAngle ?? impactResult.detectedPose.rightKneeAngle ?? 0),
    };

    const finalSnapshot = impactResult.snapshotBase64 || lastSnapshot || undefined;

    onComplete(
      {
        score: finalScore,
        elbowScore: bestAnglesRef.current.elbowScore || livePillars.strikingArm || finalScore,
        shoulderScore: bestAnglesRef.current.shoulderScore || 80,
        wristScore: bestAnglesRef.current.wristScore || livePillars.wrist || 85,
        guardScore: bestAnglesRef.current.guardScore || livePillars.guard || 80,
        stanceScore: bestAnglesRef.current.stanceScore || livePillars.stance || 80,
        durationMs,
        kineticPhases: {
          chamber: sChamber,
          apex: sApex,
          recovery: sRecovery,
        },
      },
      finalSnapshot,
      lastReplayVideo || undefined,
      {
        impactFrame: impactResult.impactFrame,
        impactTime: impactResult.impactTime,
        confidence: impactResult.confidence,
        actualAngles,
      }
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

  // Camera permission gatekeeper: don't mount WebView until OS camera permission is confirmed
  if (!cameraPermission) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={MartialTheme.colors.primary} />
        <Text style={[styles.permissionDesc, { marginTop: 16 }]}>Checking camera permissions...</Text>
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['top', 'bottom']}>
        <View style={styles.permissionCard}>
          <CoachCharacter pose="thinking" size={100} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionDesc}>
            To analyze your strike form, track your body angles, and give you real-time coach feedback, Arnis Trainer needs access to your camera.
          </Text>
          <View style={styles.permissionActions}>
            <TactileButton
              title="ALLOW CAMERA ACCESS"
              variant="primary"
              size="lg"
              onPress={() => requestCameraPermission()}
            />
            <TouchableOpacity onPress={onExit} style={styles.permissionCancelBtn}>
              <Text style={styles.permissionCancelText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* --- 1. UNIFIED DARK DOJO HUD TOP BAR --- */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onExit}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.techniqueHeaderBox}>
          <View style={styles.strikeTitleRow}>
            {countdownState === 'practice' && !activeRoutine && (
              <TouchableOpacity
                onPress={() => handleCycleStrike(-1)}
                style={styles.cycleChevronBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
                accessibilityLabel="Previous Strike"
              >
                <Ionicons name="chevron-back" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}

            <Text style={styles.techniqueTitleText} numberOfLines={1}>
              Strike {strikeRule.strikeNumber} — {strikeRule.target.split('/')[0].trim()}
            </Text>

            {countdownState === 'practice' && !activeRoutine && (
              <TouchableOpacity
                onPress={() => handleCycleStrike(1)}
                style={styles.cycleChevronBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
                accessibilityLabel="Next Strike"
              >
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.techniqueStarRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= 3 ? 'star' : 'star-outline'}
                size={11}
                color={s <= 3 ? MartialTheme.colors.bamboo : '#475569'}
              />
            ))}
            <Text style={styles.techniqueModeTag}>
              {mode === 'guided' ? 'Guided' : mode === 'follow' ? 'Mirror' : 'Test'}
            </Text>
          </View>
        </View>

        {/* Actions on right: Ghost Toggle + Quick Coach Tips + Audio Toggle Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={[styles.ghostToggleBtn, ghostGuideVisible && styles.ghostToggleBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const next = !ghostGuideVisible;
              setGhostGuideVisible(next);
              setGhostGuide(next);
              setTrajectoryGuide(next);
            }}
            activeOpacity={0.7}
            accessibilityLabel={ghostGuideVisible ? 'Turn off Ghost Coach' : 'Turn on Ghost Coach'}
          >
            <MaterialCommunityIcons
              name={ghostGuideVisible ? 'ghost' : 'ghost-off'}
              size={18}
              color={ghostGuideVisible ? '#10B981' : MartialTheme.colors.textMuted}
            />
          </TouchableOpacity>

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
              surfaceType="textureView"
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

          {/* Practice Mode Indicator Pill */}
          {countdownState === 'practice' && (
            <View style={styles.practiceModePill}>
              <Ionicons name="fitness-outline" size={13} color="#10B981" style={{ marginRight: 5 }} />
              <Text style={styles.practiceModePillText}>FREE PRACTICE</Text>
            </View>
          )}

          {/* Smart Framing Warning Pill: When feet or legs are cut off */}
          {countdownState === 'practice' && isFeetOutOfView && (
            <View style={styles.framingWarningPill}>
              <Ionicons name="walk" size={13} color="#1E293B" style={{ marginRight: 5 }} />
              <Text style={styles.framingWarningPillText}>STEP BACK — FEET NOT VISIBLE</Text>
            </View>
          )}

          {/* Active Timer Pill when evaluating */}
          {countdownState === 'evaluating' && !showRecoveryPrompt && (
            <View style={styles.evaluatingTimerPill}>
              <Ionicons name="timer-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.evaluatingTimerText}>{countdownValue}</Text>
            </View>
          )}

          {/* Post-Apex Recovery Prompt Banner */}
          {showRecoveryPrompt && (
            <View style={styles.recoveryPromptBadge}>
              <Ionicons name="shield-checkmark" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.recoveryPromptBadgeText}>RECOVER TO GUARD! 🛡️</Text>
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

          {/* Action Button: Evaluate Form (in practice mode) vs Finish & Grade (in evaluating mode) */}
          {countdownState === 'practice' ? (
            <TouchableOpacity
              style={styles.startEvalBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                startCountdown();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.startEvalBtnText}>EVALUATE FORM ⚔️</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.finishRepBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                finishEvaluation(3500);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.finishRepBtnText}>Finish & Grade</Text>
            </TouchableOpacity>
          )}
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

  // TOP BAR (UNIFIED DARK DOJO HUD)
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
  },
  backBtn: {
    padding: 4,
  },
  techniqueHeaderBox: {
    flex: 1,
    marginHorizontal: 10,
  },
  strikeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cycleChevronBtn: {
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  techniqueTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    flexShrink: 1,
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
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  coachLiveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  coachLiveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
  },
  audioToggleBtn: {
    padding: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  audioToggleBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: '#10B981',
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
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  coachGuidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  coachGuidanceTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  coachGuidanceText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F8FAFC',
    lineHeight: 17,
  },

  // BOTTOM DRAWER (UNIFIED DARK DOJO HUD)
  bottomDrawer: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
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
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  technicalToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#CBD5E1',
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
  startEvalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#047857',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  startEvalBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  practiceModePill: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  practiceModePillText: {
    color: '#10B981',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  framingWarningPill: {
    position: 'absolute',
    top: 92,
    alignSelf: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  framingWarningPillText: {
    color: '#1E293B',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  ghostToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: MartialTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  ghostToggleBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  recoveryPromptBadge: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FEE2E2',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
  },
  recoveryPromptBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.8,
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

  // CAMERA PERMISSION FALLBACK
  permissionContainer: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: MartialTheme.colors.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 5,
    borderBottomColor: MartialTheme.colors.border3D,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionActions: {
    width: '100%',
    gap: 12,
  },
  permissionCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  permissionCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
  },
});

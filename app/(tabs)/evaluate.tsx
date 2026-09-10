import {
  ANYO_ROUTINES_CATALOG,
  AnyoRoutine,
  AnyoStepResult,
  computeGrade,
  saveAnyoSession,
  saveSession
} from '@/constants/historyStore';
import { getPoseEngineHtml } from '@/constants/poseEngineHtml';
import { AppTutorialModal } from '@/components/AppTutorialModal';
import { StrikeVideoModal } from '@/components/StrikeVideoModal';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

interface StrikeRule {
  id: string;
  name: string;
  desc: string;
  chamber_elb: number;
  right_min: number;
  right_max: number;
  left_min: number;
  left_max: number;
  ideal_shoulder: number;
  ideal_knee: number;
  knee_min: number;
  knee_max: number;
  guard_target: string;
  guard_label: string;
  ext_delta: number;
}

const STRIKE_RULES: Record<string, StrikeRule> = {
  "strike_1": { id: "strike_1", name: "Strike 1", desc: "Left Temple", chamber_elb: 143.0, right_min: 110.9, right_max: 156.8, left_min: 25.7, left_max: 94.2, ideal_shoulder: 38.5, ideal_knee: 155.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Chest Guard (Kalasag)", ext_delta: 28.0 },
  "strike_2": { id: "strike_2", name: "Strike 2", desc: "Right Temple", chamber_elb: 77.3, right_min: 132.3, right_max: 175.3, left_min: 21.8, left_max: 149.0, ideal_shoulder: 81.9, ideal_knee: 155.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Chest Guard (Kalasag)", ext_delta: 75.1 },
  "strike_3": { id: "strike_3", name: "Strike 3", desc: "Left Torso/Ribs", chamber_elb: 69.5, right_min: 87.2, right_max: 114.0, left_min: 3.7, left_max: 127.7, ideal_shoulder: 77.4, ideal_knee: 152.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Solar Plexus Guard", ext_delta: 83.4 },
  "strike_4": { id: "strike_4", name: "Strike 4", desc: "Right Torso/Ribs", chamber_elb: 81.6, right_min: 121.1, right_max: 165.8, left_min: 23.5, left_max: 84.2, ideal_shoulder: 75.3, ideal_knee: 152.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Solar Plexus Guard", ext_delta: 67.1 },
  "strike_5": { id: "strike_5", name: "Strike 5", desc: "Stomach Thrust", chamber_elb: 28.5, right_min: 151.1, right_max: 168.4, left_min: 22.0, left_max: 69.1, ideal_shoulder: 27.8, ideal_knee: 150.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "High Chest Guard", ext_delta: 145.8 },
  "strike_6": { id: "strike_6", name: "Strike 6", desc: "Left Chest Thrust", chamber_elb: 164.2, right_min: 158.0, right_max: 178.8, left_min: 55.6, left_max: 100.2, ideal_shoulder: 32.6, ideal_knee: 152.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Face/Chin Guard", ext_delta: 14.7 },
  "strike_7": { id: "strike_7", name: "Strike 7", desc: "Right Chest Thrust", chamber_elb: 168.5, right_min: 149.2, right_max: 172.1, left_min: 69.4, left_max: 172.3, ideal_shoulder: 21.3, ideal_knee: 152.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Face/Chin Guard", ext_delta: 97.9 },
  "strike_8": { id: "strike_8", name: "Strike 8", desc: "Left Knee", chamber_elb: 99.5, right_min: 165.5, right_max: 178.0, left_min: 25.1, left_max: 97.8, ideal_shoulder: 17.4, ideal_knee: 145.0, knee_min: 130.0, knee_max: 160.0, guard_target: "chest", guard_label: "Upper Torso Guard", ext_delta: 98.6 },
  "strike_9": { id: "strike_9", name: "Strike 9", desc: "Right Knee", chamber_elb: 105.2, right_min: 170.3, right_max: 176.3, left_min: 37.5, left_max: 66.8, ideal_shoulder: 11.2, ideal_knee: 145.0, knee_min: 130.0, knee_max: 160.0, guard_target: "chest", guard_label: "Upper Torso Guard", ext_delta: 94.5 },
  "strike_10": { id: "strike_10", name: "Strike 10", desc: "Left Eye Thrust", chamber_elb: 170.4, right_min: 161.9, right_max: 179.1, left_min: 39.2, left_max: 84.2, ideal_shoulder: 18.3, ideal_knee: 154.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Throat/Chest Guard", ext_delta: 15.1 },
  "strike_11": { id: "strike_11", name: "Strike 11", desc: "Right Eye Thrust", chamber_elb: 167.3, right_min: 151.9, right_max: 178.9, left_min: 88.2, left_max: 169.8, ideal_shoulder: 22.7, ideal_knee: 154.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Throat/Chest Guard", ext_delta: 113.0 },
  "strike_12": { id: "strike_12", name: "Strike 12", desc: "Crown Strike", chamber_elb: 114.4, right_min: 111.1, right_max: 135.0, left_min: 24.3, left_max: 118.3, ideal_shoulder: 87.1, ideal_knee: 155.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Center Chest Guard", ext_delta: 27.6 }
};

const getJointScore = (actual: number | null | undefined, minVal: number, maxVal: number) => {
  if (actual === null || actual === undefined || actual === 0) return 0;
  if (actual >= minVal && actual <= maxVal) return 100;
  const dev = actual < minVal ? minVal - actual : actual - maxVal;
  return Math.max(0, Math.round(100 - dev * 2));
};

interface PersonData {
  id: number;
  leftAngle: number | null;
  rightAngle: number | null;
  leftShoulderAngle: number | null;
  rightShoulderAngle: number | null;
  leftKneeAngle: number | null;
  rightKneeAngle: number | null;
  leftWristAngle: number | null;
  rightWristAngle: number | null;
  isLeftGood: boolean;
  isRightGood: boolean;
  isHoldingLeft: boolean;
  isHoldingRight: boolean;
  isPersonVisible: boolean;
  accuracy: number;
  elbowScore: number;
  shoulderScore: number;
  wristScore: number;
  kneeScore: number;
  guardScore: number;
  stanceScore: number;
  torsoScore?: number;
  leadKneeAngle: number;
  normGuardDist?: number;
  isGuardLow?: boolean;
  isStanceHigh?: boolean;
  diagnosticFlags?: string[];
  motionPhase?: 'chambering' | 'driving' | 'swinging' | 'apex_hit' | 'recovering' | 'idle';
  swingVelocity?: number;
  extDelta?: number;
  isApex?: boolean;
  isStaticHold?: boolean;
  kineticScore?: number;
  trajectory?: {
    arcAngle: number | null;
    arcLength: number;
    peakVelocity: number;
    smoothness: number;
  };
}

export default function EvaluateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ strikeId?: string }>();
  const webViewRef = useRef<WebView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Navigation states: 'selection' | 'live' | 'result'
  const [screenState, setScreenState] = useState<'selection' | 'live' | 'result'>('selection');
  const [practiceType, setPracticeType] = useState<'single' | 'anyo'>('single');
  const [selectedStrikeId, setSelectedStrikeId] = useState<string>('strike_1');
  const [evaluationMode, setEvaluationMode] = useState<'coach' | 'practice' | 'freeflow' | 'evaluate'>('coach');
  const [stickColor, setStickColor] = useState<string>('rattan');
  const [motionRibbonEnabled, setMotionRibbonEnabled] = useState<boolean>(true);
  const [ribbonTheme, setRibbonTheme] = useState<'fire' | 'neon' | 'cyan'>('fire');
  const [ghostGuideEnabled, setGhostGuideEnabled] = useState<boolean>(true);
  const [trajectoryGuideEnabled, setTrajectoryGuideEnabled] = useState<boolean>(true);

  // Video Demonstration Guide Modal States
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoModalStrikeId, setVideoModalStrikeId] = useState('strike_1');

  // Auto-Detected Strike HUD Banner States
  const [lastDetectedStrike, setLastDetectedStrike] = useState<{ id: string; name: string; confidence: number } | null>(null);
  const detectedBannerOpacity = useRef(new Animated.Value(0)).current;

  const openVideoGuide = (strikeId?: string) => {
    setVideoModalStrikeId(strikeId || selectedStrikeId);
    setVideoModalVisible(true);
  };

  // Form Coach (3-Step Guided Mode) States
  const [coachPhase, setCoachPhase] = useState<'chamber' | 'impact' | 'recovery' | 'completed'>('chamber');
  const [, setCoachScores] = useState<{ chamber: number; impact: number; recovery: number }>({ chamber: 0, impact: 0, recovery: 0 });
  const [coachRepsCompleted, setCoachRepsCompleted] = useState<number>(0);

  // Anyo Routine States
  const [activeRoutine, setActiveRoutine] = useState<AnyoRoutine | null>(null);
  const [routineStepIndex, setRoutineStepIndex] = useState<number>(0);
  const [routineStepScores, setRoutineStepScores] = useState<AnyoStepResult[]>([]);
  const [routineElapsedTime, setRoutineElapsedTime] = useState<number>(0);
  const [lastAnyoResult, setLastAnyoResult] = useState<{
    routine: AnyoRoutine;
    steps: AnyoStepResult[];
    totalDurationMs: number;
    totalScore: number;
    grade: string;
    cadenceSpeedSec: number;
  } | null>(null);

  const routineStartTimeRef = useRef<number>(0);
  const stepStartTimeRef = useRef<number>(0);
  const stepBestScoreRef = useRef<number>(0);
  const stepGoodFramesRef = useRef<number>(0);
  const isAdvancingStepRef = useRef<boolean>(false);
  const routineIntervalRef = useRef<any>(null);

  // Handle incoming strikeId parameter from Radar Chart / external navigation
  useEffect(() => {
    if (params.strikeId && STRIKE_RULES[params.strikeId]) {
      setSelectedStrikeId(params.strikeId);
    }
  }, [params.strikeId]);

  // MediaPipe Live Tracking States
  const [webReady, setWebReady] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Initializing MediaPipe...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Evaluation Stats
  const [poseScoreProgress, setPoseScoreProgress] = useState(0);

  // Grading Legend Modal, App Tutorial Walkthrough & Snapshot / Video Replay States
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  const [lastReplayVideo, setLastReplayVideo] = useState<string | null>(null);
  const [snapshotBannerVisible, setSnapshotBannerVisible] = useState(false);

  // Countdown gamification states
  const [countdownState, setCountdownState] = useState<'waiting_for_person' | 'counting' | 'evaluating'>('waiting_for_person');
  const [countdownValue, setCountdownValue] = useState<number | string>(3);

  // Keep track of the best score during the strike window
  const bestScoreRef = useRef<number>(0);
  const bestAnglesRef = useRef({
    leftAngle: 0,
    rightAngle: 0,
    leftShoulderAngle: 0,
    rightShoulderAngle: 0,
    leftKneeAngle: 0,
    rightKneeAngle: 0,
    leftWristAngle: 0,
    rightWristAngle: 0,
    currentAccuracy: 0,
    guardScore: 0,
    stanceScore: 0,
    elbowScore: 0,
    wristScore: 0
  });
  const isCountingRef = useRef<boolean>(false);
  const recordingIntervalRef = useRef<any>(null);

  // Real-time 4-pillar progress values
  const [rtElbowScore, setRtElbowScore] = useState(0);
  const [rtGuardScore, setRtGuardScore] = useState(0);
  const [rtStanceScore, setRtStanceScore] = useState(0);
  const [rtWristScore, setRtWristScore] = useState(0);
  const [, setRtShoulderScore] = useState(0);

  // Result Summary cache
  const [finalSessionStats, setFinalSessionStats] = useState<{
    score: number;
    grade: string;
    elbow: { score: number; actual: number; ideal: number };
    shoulder: { score: number; actual: number; ideal: number };
    wrist: { score: number; actual: number; ideal: number };
    knee: { score: number; actual: number; ideal: number };
    guard: { score: number; actual: number; ideal: number };
    stance: { score: number; actual: number; ideal: number };
    improvementTip?: string;
  } | null>(null);

  // Multi-person states
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [primaryPersonId, setPrimaryPersonId] = useState<number>(0);

  // Voice Feedback states and refs
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const lastSpokenTimeRef = useRef<Record<number, number>>({});

  const speakCorrection = (personId: number, message: string) => {
    if (!voiceFeedbackEnabled) return;
    const now = Date.now();
    const lastTime = lastSpokenTimeRef.current[personId] || 0;

    // 4.5 seconds throttle to keep coaching responsive yet clear
    if (now - lastTime > 4500) {
      lastSpokenTimeRef.current[personId] = now;

      let spokenText = `Person ${personId + 1}, ${message}`;

      // Clean up punctuation/details for speech
      spokenText = spokenText
        .replace("!", "")
        .replace(".", "")
        .replace("°", " degrees");

      Speech.speak(spokenText, {
        language: 'en',
        pitch: 1.0,
        rate: 0.95,
      });
    }
  };

  const modelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  const webBaseUrl = 'https://cdn.jsdelivr.net';

  const currentRule = STRIKE_RULES[selectedStrikeId] || STRIKE_RULES.strike_1;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Sync selected strike, stick color, motion ribbon, and ghost guide with WebView engine
  useEffect(() => {
    if (screenState === 'live' && webReady && webViewRef.current) {
      const injectJS = `
        if (window.setTargetStrike) {
          window.setTargetStrike('${selectedStrikeId}');
        }
        if (window.setStickColor) {
          window.setStickColor('${stickColor}');
        }
        if (window.setMotionRibbonEnabled) {
          window.setMotionRibbonEnabled(${motionRibbonEnabled});
        }
        if (window.setRibbonTheme) {
          window.setRibbonTheme('${ribbonTheme}');
        }
        if (window.setGhostGuideEnabled) {
          window.setGhostGuideEnabled(${ghostGuideEnabled});
        }
        if (window.setTrajectoryGuideEnabled) {
          window.setTrajectoryGuideEnabled(${trajectoryGuideEnabled});
        }
        if (window.setFormCoachMode) {
          window.setFormCoachMode(${evaluationMode === 'coach'});
        }
        if (window.setAutoDetectMode) {
          window.setAutoDetectMode(${evaluationMode === 'freeflow'});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(injectJS);
    }
  }, [selectedStrikeId, stickColor, motionRibbonEnabled, ribbonTheme, ghostGuideEnabled, trajectoryGuideEnabled, evaluationMode, webReady, screenState]);

  // Start countdown logic
  const startCountdown = () => {
    setCountdownValue(3);

    // 3 -> 2
    setTimeout(() => {
      if (isCountingRef.current) setCountdownValue(2);
    }, 1000);

    // 2 -> 1
    setTimeout(() => {
      if (isCountingRef.current) setCountdownValue(1);
    }, 2000);

    // 1 -> GO!
    setTimeout(() => {
      if (isCountingRef.current) setCountdownValue('GO!');
    }, 3000);

    // GO! -> Evaluating (starts the 2.5 second recording window)
    setTimeout(() => {
      if (isCountingRef.current) {
        setCountdownState('evaluating');
        setPoseScoreProgress(0);
        bestScoreRef.current = 0;
        startEvaluationRecording();
      }
    }, 4000);
  };

  // Recording timer logic
  const startEvaluationRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`if (window.startVideoRecording) window.startVideoRecording(); true;`);
    }

    let progress = 0;
    recordingIntervalRef.current = setInterval(() => {
      progress += 4;
      setPoseScoreProgress(Math.min(progress, 100));

      if (progress >= 100) {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }

        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`if (window.stopVideoRecording) window.stopVideoRecording(); true;`);
        }

        // Timer completed! Read best recorded score
        const finalScore = bestScoreRef.current || 0;
        const angles = bestAnglesRef.current;

        // Calculate true joint scores using the peak angles
        const finalElbowScore = getJointScore(angles.rightAngle, currentRule.right_min, currentRule.right_max);
        const finalShoulderScore = getJointScore(angles.rightShoulderAngle, Math.max(10, currentRule.ideal_shoulder - 25), Math.min(170, currentRule.ideal_shoulder + 25));
        const finalWristScore = getJointScore(angles.rightWristAngle, 0, 15);

        const leadKneeAngle = (angles.leftKneeAngle || angles.rightKneeAngle)
          ? Math.min(angles.leftKneeAngle || 180, angles.rightKneeAngle || 180)
          : 0;
        const finalStanceScore = angles.stanceScore > 0 ? angles.stanceScore : (leadKneeAngle > 0 ? getJointScore(leadKneeAngle, currentRule.knee_min || 135, currentRule.knee_max || 165) : 80);
        const finalGuardScore = angles.guardScore > 0 ? angles.guardScore : (angles.leftAngle > 0 ? getJointScore(angles.leftAngle, currentRule.left_min, currentRule.left_max) : 80);

        // Tailored Guro Martial Arts Improvement Tip based on lowest subscore
        let improvementTip = "Flawless kinetic alignment! Keep drilling to build reflex muscle memory.";
        const minComponentScore = Math.min(finalElbowScore, finalGuardScore, finalStanceScore, finalWristScore);
        if (minComponentScore === finalGuardScore && finalGuardScore < 85) {
          improvementTip = "🛡️ Check Hand (Kalasag): Keep your non-striking hand guarding your chest/solar plexus throughout the strike to prevent open counters.";
        } else if (minComponentScore === finalStanceScore && finalStanceScore < 85) {
          improvementTip = "🦵 Stance (Tindig): Lower your center of gravity by bending your lead knee (140° - 160°) for dynamic martial stability.";
        } else if (minComponentScore === finalElbowScore && finalElbowScore < 85) {
          improvementTip = `⚔️ Striking Arm: Target range is ${currentRule.right_min}° - ${currentRule.right_max}°. Ensure full extension and clean follow-through.`;
        } else if (minComponentScore === finalWristScore && finalWristScore < 85) {
          improvementTip = "⚡ Wrist Snap (Pitik): Keep your wrist firm and straight with your forearm at impact to transfer maximum kinetic force.";
        }

        const stats = {
          score: finalScore,
          grade: computeGrade(finalScore),
          elbow: {
            score: finalElbowScore,
            actual: angles.rightAngle || 0,
            ideal: Math.round((currentRule.right_min + currentRule.right_max) / 2)
          },
          shoulder: {
            score: finalShoulderScore,
            actual: angles.rightShoulderAngle || 0,
            ideal: Math.round(currentRule.ideal_shoulder) || 90
          },
          wrist: {
            score: finalWristScore,
            actual: angles.rightWristAngle || 0,
            ideal: 0
          },
          knee: {
            score: finalStanceScore,
            actual: leadKneeAngle || 0,
            ideal: Math.round(currentRule.ideal_knee) || 155
          },
          guard: {
            score: finalGuardScore,
            actual: angles.leftAngle || 0,
            ideal: Math.round((currentRule.left_min + currentRule.left_max) / 2)
          },
          stance: {
            score: finalStanceScore,
            actual: leadKneeAngle || 0,
            ideal: Math.round(currentRule.ideal_knee) || 155
          },
          improvementTip
        };

        setFinalSessionStats(stats);

        // Save to offline storage
        saveSession(
          selectedStrikeId,
          currentRule.name,
          currentRule.desc,
          finalScore,
          {
            elbow: { score: finalElbowScore, actual: stats.elbow.actual, ideal: stats.elbow.ideal },
            shoulder: { score: finalShoulderScore, actual: stats.shoulder.actual, ideal: stats.shoulder.ideal },
            wrist: { score: finalWristScore, actual: stats.wrist.actual, ideal: stats.wrist.ideal },
            knee: { score: finalStanceScore, actual: stats.knee.actual, ideal: stats.knee.ideal },
            guard: { score: finalGuardScore, actual: stats.guard.actual, ideal: stats.guard.ideal },
            stance: { score: finalStanceScore, actual: stats.stance.actual, ideal: stats.stance.ideal }
          },
          lastSnapshot || undefined,
          lastReplayVideo || undefined
        );

        // Transition to results
        Speech.stop(); // Stop speaking immediately when evaluation ends
        setScreenState('result');
        isCountingRef.current = false;
        setWarningMsg(null);
        setCountdownState('waiting_for_person');
      }
    }, 100); // 2.5 seconds total
  };

  // Handle messages from the HTML Pose engine
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'STATUS') {
        setStatusMsg(data.message);
        if (data.message.includes('running')) {
          setWebReady(true);
        }
      } else if (data.type === 'ERROR') {
        setErrorMsg(data.message);
      } else if (data.type === 'READY') {
        setWebReady(true);
        setStatusMsg('Camera Active');
      } else if (data.type === 'SNAPSHOT_CAPTURED' && data.base64) {
        setLastSnapshot(data.base64);
        setSnapshotBannerVisible(true);
        setTimeout(() => setSnapshotBannerVisible(false), 3000);
      } else if (data.type === 'VIDEO_REPLAY_CAPTURED' && data.base64) {
        setLastReplayVideo(data.base64);
      } else if (data.type === 'FORM_COACH_STEP_PASSED') {
        const stepPhase = data.phase;
        const stepScore = data.score || 85;

        if (stepPhase === 'chamber') {
          setCoachPhase('impact');
          setCoachScores(prev => ({ ...prev, chamber: stepScore }));
          if (voiceFeedbackEnabled) {
            Speech.speak("Chamber locked! Now slice through the target line!");
          }
        } else if (stepPhase === 'impact') {
          setCoachPhase('recovery');
          setCoachScores(prev => ({ ...prev, impact: stepScore }));
          if (voiceFeedbackEnabled) {
            Speech.speak("Impact apex hit! Recover back to defensive guard!");
          }
        } else if (stepPhase === 'recovery') {
          setCoachPhase('completed');
          setCoachScores(prev => ({ ...prev, recovery: stepScore }));
          setCoachRepsCompleted(r => r + 1);
          if (voiceFeedbackEnabled) {
            Speech.speak("Masterful form! Step complete!");
          }
          // Cycle back to chamber after 2.5s for next rep
          setTimeout(() => {
            setCoachPhase('chamber');
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`if (window.setFormCoachPhase) window.setFormCoachPhase('chamber'); true;`);
            }
          }, 2500);
        }
      } else if (data.type === 'AUTO_DETECTED_STRIKE') {
        const detectedId = data.strikeId;
        const detectedName = data.strikeName || detectedId;
        const confidence = data.confidence || 85;

        setLastDetectedStrike({ id: detectedId, name: detectedName, confidence });
        setSelectedStrikeId(detectedId);

        // Smooth fade-in & fade-out for the auto-detected HUD badge
        detectedBannerOpacity.setValue(1);
        Animated.sequence([
          Animated.delay(2800),
          Animated.timing(detectedBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        ]).start();

        if (voiceFeedbackEnabled) {
          Speech.speak(`${detectedName.split(':')[0]} detected`);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (data.type === 'POSE_DATA') {
        const rawPersons = data.persons || [];

        // Map raw persons to calculate joint scores and accuracy
        const updatedPersons: PersonData[] = rawPersons.map((p: any) => {
          const leftAngle = p.leftAngle ? Math.round(p.leftAngle) : 0;
          const rightAngle = p.rightAngle ? Math.round(p.rightAngle) : 0;

          const leftShoulderAngle = p.leftShoulderAngle ? Math.round(p.leftShoulderAngle) : 0;
          const rightShoulderAngle = p.rightShoulderAngle ? Math.round(p.rightShoulderAngle) : 0;

          const leftKneeAngle = p.leftKneeAngle ? Math.round(p.leftKneeAngle) : 0;
          const rightKneeAngle = p.rightKneeAngle ? Math.round(p.rightKneeAngle) : 0;

          const leftWristAngle = p.leftWristAngle !== null ? Math.round(p.leftWristAngle) : 0;
          const rightWristAngle = p.rightWristAngle !== null ? Math.round(p.rightWristAngle) : 0;

          // Extract 4-pillar scores calculated in pose engine or fallback
          const elbowScore = p.elbowScore !== undefined ? p.elbowScore : getJointScore(rightAngle, currentRule.right_min, currentRule.right_max);
          const shoulderScore = p.shoulderScore !== undefined ? p.shoulderScore : (rightShoulderAngle > 0 ? getJointScore(rightShoulderAngle, currentRule.ideal_shoulder - 25, currentRule.ideal_shoulder + 25) : 80);
          const wristScore = p.wristScore !== undefined ? p.wristScore : (rightWristAngle !== null ? getJointScore(rightWristAngle, 0, 15) : 85);
          const stanceScore = p.stanceScore !== undefined ? p.stanceScore : (p.kneeScore || 80);
          const guardScore = p.guardScore !== undefined ? p.guardScore : (p.isLeftGood ? 100 : 70);
          const accuracy = p.accuracy !== undefined ? p.accuracy : Math.round(elbowScore * 0.40 + guardScore * 0.25 + stanceScore * 0.20 + wristScore * 0.15);

          // Priority-based voice coaching
          let personWarning: string | null = null;
          const isHoldingStick = !!p.isHoldingLeft || !!p.isHoldingRight;
          if (p.isStaticHold) {
            personWarning = "don't freeze in place, execute the full strike motion";
          } else if (!isHoldingStick) {
            personWarning = "please hold your Arnis stick";
          } else if (p.isGuardLow || guardScore < 60) {
            personWarning = "raise your check hand to guard your chest";
          } else if (p.isStanceHigh || stanceScore < 60) {
            personWarning = "bend your knees into a fighting stance";
          } else if (p.motionPhase === 'chambering') {
            if (rightAngle > 0 && Math.abs(rightAngle - currentRule.chamber_elb) > 28) {
              personWarning = "chamber your stick for the strike";
            }
          } else if (p.motionPhase === 'driving' || p.motionPhase === 'swinging') {
            if (!p.isRightGood && rightAngle > 0) {
              personWarning = rightAngle < currentRule.right_min ? "extend your striking arm fully" : "control your strike angle";
            }
          } else if (p.motionPhase === 'apex_hit' || p.isApex) {
            personWarning = "great strike impact peak!";
          } else if (wristScore < 65) {
            personWarning = "straighten and snap your wrist";
          }

          if (personWarning) {
            speakCorrection(p.id, personWarning);
          }

          return {
            id: p.id,
            leftAngle,
            rightAngle,
            leftShoulderAngle,
            rightShoulderAngle,
            leftKneeAngle,
            rightKneeAngle,
            leftWristAngle,
            rightWristAngle,
            isLeftGood: !!p.isLeftGood,
            isRightGood: !!p.isRightGood,
            isHoldingLeft: !!p.isHoldingLeft,
            isHoldingRight: !!p.isHoldingRight,
            isPersonVisible: true,
            accuracy,
            elbowScore,
            shoulderScore,
            wristScore,
            kneeScore: stanceScore,
            guardScore,
            stanceScore,
            torsoScore: p.torsoScore || 100,
            leadKneeAngle: p.leadKneeAngle || 155,
            normGuardDist: p.normGuardDist,
            isGuardLow: p.isGuardLow,
            isStanceHigh: p.isStanceHigh,
            diagnosticFlags: p.diagnosticFlags || [],
            motionPhase: p.motionPhase || 'idle',
            swingVelocity: p.swingVelocity || 0,
            extDelta: p.extDelta || 0,
            isApex: !!p.isApex,
            isStaticHold: !!p.isStaticHold,
            kineticScore: p.kineticScore !== undefined ? p.kineticScore : 80,
            trajectory: p.trajectory
          };
        });

        setPersons(updatedPersons);

        // Find primary person
        const primaryPerson = updatedPersons.find((p) => p.id === primaryPersonId) || updatedPersons[0];

        if (primaryPerson) {
          // Update real-time 4-pillar progress values
          setRtElbowScore(primaryPerson.elbowScore);
          setRtGuardScore(primaryPerson.guardScore);
          setRtStanceScore(primaryPerson.stanceScore);
          setRtWristScore(primaryPerson.wristScore);
          setRtShoulderScore(primaryPerson.shoulderScore);

          // Update tracking peak score during evaluation
          if (countdownState === 'evaluating') {
            if (primaryPerson.accuracy > bestScoreRef.current) {
              bestScoreRef.current = primaryPerson.accuracy;
              bestAnglesRef.current = {
                leftAngle: primaryPerson.leftAngle || 0,
                rightAngle: primaryPerson.rightAngle || 0,
                leftShoulderAngle: primaryPerson.leftShoulderAngle || 0,
                rightShoulderAngle: primaryPerson.rightShoulderAngle || 0,
                leftKneeAngle: primaryPerson.leftKneeAngle || 0,
                rightKneeAngle: primaryPerson.rightKneeAngle || 0,
                leftWristAngle: primaryPerson.leftWristAngle || 0,
                rightWristAngle: primaryPerson.rightWristAngle || 0,
                currentAccuracy: primaryPerson.accuracy,
                guardScore: primaryPerson.guardScore,
                stanceScore: primaryPerson.stanceScore,
                elbowScore: primaryPerson.elbowScore,
                wristScore: primaryPerson.wristScore
              };
            }
          }

          // Generate priority HUD warning messages
          let activeWarning: string | null = null;
          const isHoldingStick = primaryPerson.isHoldingLeft || primaryPerson.isHoldingRight;

          if (!isHoldingStick) {
            activeWarning = "⚠️ Please hold your Arnis stick!";
          } else if (primaryPerson.isGuardLow || primaryPerson.guardScore < 65) {
            activeWarning = "🛡️ Check Hand too low! Guard your chest/solar plexus.";
          } else if (primaryPerson.isStanceHigh || primaryPerson.stanceScore < 65) {
            activeWarning = "🦵 Stance too high! Bend lead knee for stability.";
          } else if (!primaryPerson.isRightGood && (primaryPerson.rightAngle || 0) > 0) {
            if ((primaryPerson.rightAngle || 0) < currentRule.right_min) {
              activeWarning = "⚔️ Extend your striking arm further.";
            } else if ((primaryPerson.rightAngle || 0) > currentRule.right_max) {
              activeWarning = "⚔️ Strike over-extended! Keep arm controlled.";
            }
          } else if ((primaryPerson.rightWristAngle || 0) > 20) {
            activeWarning = "⚡ Straighten your wrist for power snap.";
          }
          setWarningMsg(activeWarning);

          // ANYO ROUTINE AUTOMATIC SEQUENCE ADVANCEMENT
          if (activeRoutine) {
            setPoseScoreProgress(primaryPerson.accuracy);
            stepBestScoreRef.current = Math.max(stepBestScoreRef.current, primaryPerson.accuracy);

            const isGoodPose = primaryPerson.accuracy >= 75 || primaryPerson.isRightGood || primaryPerson.isApex;
            if (isGoodPose) {
              stepGoodFramesRef.current += 1;
            } else {
              stepGoodFramesRef.current = Math.max(0, stepGoodFramesRef.current - 1);
            }

            const stepDuration = Date.now() - stepStartTimeRef.current;
            const shouldAdvance = (
              (primaryPerson.isApex || stepGoodFramesRef.current >= 4 || stepDuration >= 4500) &&
              !isAdvancingStepRef.current &&
              stepDuration >= 800 // Minimum 800ms per strike for fluid cadence
            );

            if (shouldAdvance) {
              isAdvancingStepRef.current = true;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              const currentStrikeId = activeRoutine.strikes[routineStepIndex];
              const curRule = STRIKE_RULES[currentStrikeId] || STRIKE_RULES.strike_1;
              const stepFinalScore = Math.max(70, stepBestScoreRef.current || primaryPerson.accuracy);

              const stepRes: AnyoStepResult = {
                stepIndex: routineStepIndex + 1,
                strikeId: currentStrikeId,
                strikeName: curRule.name,
                score: stepFinalScore,
                grade: computeGrade(stepFinalScore),
                durationMs: stepDuration,
                snapshotBase64: lastSnapshot || undefined,
                breakdown: {
                  elbow: { score: primaryPerson.elbowScore, actual: primaryPerson.rightAngle || 0, ideal: Math.round((curRule.right_min + curRule.right_max) / 2) },
                  shoulder: { score: primaryPerson.shoulderScore, actual: primaryPerson.rightShoulderAngle || 0, ideal: curRule.ideal_shoulder },
                  wrist: { score: primaryPerson.wristScore, actual: primaryPerson.rightWristAngle || 0, ideal: 0 },
                  knee: { score: primaryPerson.kneeScore, actual: primaryPerson.leadKneeAngle || 0, ideal: curRule.ideal_knee }
                }
              };

              const newStepScores = [...routineStepScores, stepRes];
              setRoutineStepScores(newStepScores);

              if (routineStepIndex + 1 < activeRoutine.strikes.length) {
                const nextIndex = routineStepIndex + 1;
                const nextStrikeId = activeRoutine.strikes[nextIndex];
                const nextRule = STRIKE_RULES[nextStrikeId];
                setRoutineStepIndex(nextIndex);
                setSelectedStrikeId(nextStrikeId);
                stepStartTimeRef.current = Date.now();
                stepBestScoreRef.current = 0;
                stepGoodFramesRef.current = 0;

                if (webViewRef.current) {
                  webViewRef.current.injectJavaScript(`if (window.setTargetStrike) window.setTargetStrike('${nextStrikeId}'); true;`);
                }

                if (voiceFeedbackEnabled) {
                  Speech.speak(`Good! Step ${nextIndex + 1}: ${nextRule?.name || 'Next Strike'}`);
                }

                setTimeout(() => {
                  isAdvancingStepRef.current = false;
                }, 600);
              } else {
                // ALL ANYO STEPS COMPLETED
                if (routineIntervalRef.current) {
                  clearInterval(routineIntervalRef.current);
                  routineIntervalRef.current = null;
                }

                const totalDuration = Date.now() - routineStartTimeRef.current;
                const avgScore = Math.round(newStepScores.reduce((acc, s) => acc + s.score, 0) / newStepScores.length);
                const cadence = parseFloat(((totalDuration / 1000) / newStepScores.length).toFixed(1));

                saveAnyoSession(activeRoutine, newStepScores, totalDuration);

                setLastAnyoResult({
                  routine: activeRoutine,
                  steps: newStepScores,
                  totalDurationMs: totalDuration,
                  totalScore: avgScore,
                  grade: computeGrade(avgScore),
                  cadenceSpeedSec: cadence
                });

                if (voiceFeedbackEnabled) {
                  Speech.speak("Anyo routine complete! Masterful form!");
                }

                setScreenState('result');
                isAdvancingStepRef.current = false;
              }
            }
          } else if (evaluationMode === 'evaluate') {
            // Visibility & Countdown gatekeeper for evaluation mode
            const isPersonPresent = updatedPersons.length > 0;
            if (isPersonPresent) {
              if (countdownState === 'waiting_for_person' && !isCountingRef.current) {
                isCountingRef.current = true;
                setCountdownState('counting');
                startCountdown();
              }
            } else {
              // If person leaves frame while counting, reset to waiting screen
              if (countdownState === 'counting') {
                isCountingRef.current = false;
                setCountdownState('waiting_for_person');
                setWarningMsg(null);
              }
            }

            // Only evaluate and track peak accuracy when in 'evaluating' state
            if (countdownState === 'evaluating') {
              if (primaryPerson.accuracy > bestScoreRef.current) {
                bestScoreRef.current = primaryPerson.accuracy;
                bestAnglesRef.current = {
                  leftAngle: primaryPerson.leftAngle || 0,
                  rightAngle: primaryPerson.rightAngle || 0,
                  leftShoulderAngle: primaryPerson.leftShoulderAngle || 0,
                  rightShoulderAngle: primaryPerson.rightShoulderAngle || 0,
                  leftKneeAngle: primaryPerson.leftKneeAngle || 0,
                  rightKneeAngle: primaryPerson.rightKneeAngle || 0,
                  leftWristAngle: primaryPerson.leftWristAngle || 0,
                  rightWristAngle: primaryPerson.rightWristAngle || 0,
                  currentAccuracy: primaryPerson.accuracy,
                  guardScore: primaryPerson.guardScore,
                  stanceScore: primaryPerson.stanceScore,
                  elbowScore: primaryPerson.elbowScore,
                  wristScore: primaryPerson.wristScore
                };
              }
            }
          } else {
            // Practice mode: continuously show current accuracy as the progress value
            setPoseScoreProgress(primaryPerson.accuracy);
          }
        } else {
          // No person visible: reset all real-time visual metrics to 0
          setRtElbowScore(0);
          setRtGuardScore(0);
          setRtStanceScore(0);
          setRtWristScore(0);
          setRtShoulderScore(0);
          setPoseScoreProgress(0);
          setWarningMsg(null);
          if (evaluationMode === 'evaluate' && !activeRoutine) {
            if (countdownState === 'counting') {
              isCountingRef.current = false;
              setCountdownState('waiting_for_person');
            }
          }
        }
      }
    } catch (e) {
      console.warn('WebView Message Parse Error', e);
    }
  };

  const handleStartEvaluation = async (strikeId: string) => {
    // Request native camera permission before entering live view
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setErrorMsg('Camera permission is required for pose evaluation. Please grant camera access in your device settings.');
        return;
      }
    }

    setActiveRoutine(null);
    setLastAnyoResult(null);
    setSelectedStrikeId(strikeId);
    setPoseScoreProgress(0);
    setWebReady(false);
    setErrorMsg(null);
    setStatusMsg('Initializing MediaPipe...');
    isCountingRef.current = false;
    setCountdownState('waiting_for_person');
    setPersons([]);
    setPrimaryPersonId(0);
    setScreenState('live');
  };

  const handleStartAnyoRoutine = async (routine: AnyoRoutine) => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setErrorMsg('Camera permission is required for pose evaluation. Please grant camera access in your device settings.');
        return;
      }
    }

    setActiveRoutine(routine);
    setRoutineStepIndex(0);
    setRoutineStepScores([]);
    setRoutineElapsedTime(0);
    setLastAnyoResult(null);
    setSelectedStrikeId(routine.strikes[0]);
    setPoseScoreProgress(0);
    setWebReady(false);
    setErrorMsg(null);
    setStatusMsg(`Initializing ${routine.name}...`);
    isCountingRef.current = false;
    setCountdownState('waiting_for_person');
    setPersons([]);
    setPrimaryPersonId(0);
    routineStartTimeRef.current = Date.now();
    stepStartTimeRef.current = Date.now();
    stepBestScoreRef.current = 0;
    stepGoodFramesRef.current = 0;
    isAdvancingStepRef.current = false;

    if (routineIntervalRef.current) {
      clearInterval(routineIntervalRef.current);
    }
    routineIntervalRef.current = setInterval(() => {
      setRoutineElapsedTime(Date.now() - routineStartTimeRef.current);
    }, 100);

    setScreenState('live');

    if (voiceFeedbackEnabled) {
      const firstStrike = STRIKE_RULES[routine.strikes[0]];
      Speech.speak(`Starting ${routine.name}. Step 1: ${firstStrike?.name || 'Strike 1'}`);
    }
  };

  const handleBackToSelection = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (routineIntervalRef.current) {
      clearInterval(routineIntervalRef.current);
      routineIntervalRef.current = null;
    }
    isCountingRef.current = false;
    isAdvancingStepRef.current = false;
    setActiveRoutine(null);
    setRoutineStepIndex(0);
    setRoutineStepScores([]);
    setCountdownState('waiting_for_person');
    setPersons([]);
    Speech.stop(); // Stop speaking immediately on exit
    setScreenState('selection');
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#10B981'; // Green
    if (score >= 85) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  // 1. STRIKE SELECTION SCREEN
  if (screenState === 'selection') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Evaluate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerTutorialBtn}
            onPress={() => setShowTutorialModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="help-circle" size={16} color="#F59E0B" style={{ marginRight: 5 }} />
            <Text style={styles.headerTutorialBtnText}>Tutorial & Legend</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Training Mode Switcher: Single Strike vs Anyo & Combos */}
          <View style={styles.practiceTypeContainer}>
            <TouchableOpacity
              style={[
                styles.practiceTypeBtn,
                practiceType === 'single' && styles.practiceTypeBtnActive
              ]}
              onPress={() => setPracticeType('single')}
            >
              <MaterialCommunityIcons
                name="target"
                size={18}
                color={practiceType === 'single' ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.practiceTypeText,
                  practiceType === 'single' && styles.practiceTypeTextActive
                ]}
              >
                Single Strike (1-12)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.practiceTypeBtn,
                practiceType === 'anyo' && styles.practiceTypeBtnActive
              ]}
              onPress={() => setPracticeType('anyo')}
            >
              <MaterialCommunityIcons
                name="sword-cross"
                size={18}
                color={practiceType === 'anyo' ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.practiceTypeText,
                  practiceType === 'anyo' && styles.practiceTypeTextActive
                ]}
              >
                Anyo & Combos
              </Text>
            </TouchableOpacity>
          </View>

          {practiceType === 'single' ? (
            <>
              {/* Mode Selector Segmented Control (4 Options) */}
              <View style={styles.modeSelectorContainer}>
                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    evaluationMode === 'coach' && styles.modeOptionActive
                  ]}
                  onPress={() => setEvaluationMode('coach')}
                >
                  <MaterialCommunityIcons
                    name="school"
                    size={14}
                    color={evaluationMode === 'coach' ? '#FFFFFF' : '#64748B'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modeOptionText,
                      evaluationMode === 'coach' && styles.modeOptionTextActive
                    ]}
                  >
                    Coach
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    evaluationMode === 'practice' && styles.modeOptionActive
                  ]}
                  onPress={() => setEvaluationMode('practice')}
                >
                  <MaterialCommunityIcons
                    name="flash"
                    size={14}
                    color={evaluationMode === 'practice' ? '#FFFFFF' : '#64748B'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modeOptionText,
                      evaluationMode === 'practice' && styles.modeOptionTextActive
                    ]}
                  >
                    Practice
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    evaluationMode === 'freeflow' && styles.modeOptionActive
                  ]}
                  onPress={() => setEvaluationMode('freeflow')}
                >
                  <MaterialCommunityIcons
                    name="auto-fix"
                    size={14}
                    color={evaluationMode === 'freeflow' ? '#FFFFFF' : '#64748B'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modeOptionText,
                      evaluationMode === 'freeflow' && styles.modeOptionTextActive
                    ]}
                  >
                    Auto-ID
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    evaluationMode === 'evaluate' && styles.modeOptionActive
                  ]}
                  onPress={() => setEvaluationMode('evaluate')}
                >
                  <MaterialCommunityIcons
                    name="timer-sand"
                    size={14}
                    color={evaluationMode === 'evaluate' ? '#FFFFFF' : '#64748B'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.modeOptionText,
                      evaluationMode === 'evaluate' && styles.modeOptionTextActive
                    ]}
                  >
                    Timed Test
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modeDesc}>
                {evaluationMode === 'coach'
                  ? "⭐ Guided 3-Step Calibration: 1. Chamber (Kasa) ➔ 2. Strike (Tudla) ➔ 3. Recovery (Bawi)."
                  : evaluationMode === 'practice'
                    ? "Continuous real-time posture feedback with 4-pillar kinetic chain meters."
                    : evaluationMode === 'freeflow'
                      ? "✨ AI Auto-Detection: Execute any strike form (1-12) freely. The AI identifies and grades it in real time!"
                      : "Step into camera frame to trigger a 3s countdown test. Auto-saves results."
                }
              </Text>

              {/* Video Demonstration Guide Button */}
              <TouchableOpacity
                style={styles.videoGuideHeaderBtn}
                activeOpacity={0.8}
                onPress={() => openVideoGuide(selectedStrikeId)}
              >
                <MaterialCommunityIcons name="play-circle" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={styles.videoGuideHeaderBtnText}>
                  Watch Video Guide (All 12 Strikes Demo & Slow-Mo)
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.anyoIntroBanner}>
              <Text style={styles.anyoIntroTitle}>🥋 Continuous Sequence Flow</Text>
              <Text style={styles.anyoIntroDesc}>
                Execute strikes in seamless continuous combination. The vision engine automatically detects apex strikes, advances steps in real time, and scores your tempo & fluidity.
              </Text>
            </View>
          )}

          {/* Streamlined Quick Settings Strip */}
          <View style={styles.quickSettingsStrip}>
            {/* Stick Color Horizontal Scroll */}
            <View style={styles.quickStickWrapper}>
              <Text style={styles.quickStickLabel}>STICK</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickStickScroll}
              >
                {[
                  { id: 'rattan', label: '🪵 Rattan' },
                  { id: 'red', label: '🔴 Red' },
                  { id: 'blue', label: '🔵 Blue' },
                  { id: 'green', label: '🟢 Green' },
                  { id: 'any', label: '⚪ Any' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.quickStickChip,
                      stickColor === item.id && styles.quickStickChipActive,
                    ]}
                    onPress={() => setStickColor(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickStickChipText,
                        stickColor === item.id && styles.quickStickChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Quick Action Pills: Voice & Formula */}
            <View style={styles.quickActionPills}>
              <TouchableOpacity
                style={[
                  styles.quickActionBtn,
                  voiceFeedbackEnabled && styles.quickActionBtnActive,
                ]}
                onPress={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={voiceFeedbackEnabled ? "volume-high" : "volume-mute"}
                  size={14}
                  color={voiceFeedbackEnabled ? "#10B981" : "#64748B"}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.quickActionBtnText,
                    voiceFeedbackEnabled && { color: '#10B981' },
                  ]}
                >
                  {voiceFeedbackEnabled ? "Voice ON" : "Muted"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => setShowLegendModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="ribbon-outline" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={[styles.quickActionBtnText, { color: '#F59E0B' }]}>Formula</Text>
              </TouchableOpacity>
            </View>
          </View>

          {practiceType === 'single' ? (
            <>
              <Text style={styles.sectionHeading}>SELECT A STRIKE (1-12)</Text>
              <View style={styles.grid}>
                {Object.values(STRIKE_RULES).map((strike, index) => (
                  <TouchableOpacity
                    key={strike.id}
                    style={styles.gridItem}
                    activeOpacity={0.7}
                    onPress={() => handleStartEvaluation(strike.id)}
                  >
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{index + 1}</Text>
                    </View>
                    <View style={styles.gridDetails}>
                      <Text style={styles.gridTitle}>{strike.name}</Text>
                      <Text style={styles.gridDesc}>{strike.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionHeading}>SELECT AN ANYO ROUTINE</Text>
              <View style={styles.anyoList}>
                {ANYO_ROUTINES_CATALOG.map((routine) => {
                  const isMaster = routine.difficulty === 'Master';
                  const isInter = routine.difficulty === 'Intermediate';
                  const diffColor = isMaster ? '#EF4444' : isInter ? '#3B82F6' : '#10B981';

                  return (
                    <TouchableOpacity
                      key={routine.id}
                      style={styles.anyoCard}
                      activeOpacity={0.75}
                      onPress={() => handleStartAnyoRoutine(routine)}
                    >
                      <View style={styles.anyoCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.anyoCardTitle}>{routine.name}</Text>
                          <Text style={styles.anyoCardSubtitle}>{routine.subtitle}</Text>
                        </View>
                        <View style={[styles.anyoDiffBadge, { backgroundColor: diffColor + '20', borderColor: diffColor }]}>
                          <Text style={[styles.anyoDiffText, { color: diffColor }]}>{routine.difficulty}</Text>
                        </View>
                      </View>

                      <Text style={styles.anyoCardDesc}>{routine.description}</Text>

                      {/* Strike Sequence Pills */}
                      <View style={styles.anyoSequencePills}>
                        {routine.strikes.map((sId, sIdx) => {
                          const sNum = sId.replace('strike_', '');
                          return (
                            <React.Fragment key={sId + '_' + sIdx}>
                              <View style={styles.anyoStepPillItem}>
                                <Text style={styles.anyoStepPillText}>S{sNum}</Text>
                              </View>
                              {sIdx < routine.strikes.length - 1 && (
                                <Ionicons name="arrow-forward" size={12} color="#64748B" style={{ marginHorizontal: 3 }} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </View>

                      <View style={styles.anyoStartRow}>
                        <Text style={styles.anyoStrikesCount}>
                          ⚔️ {routine.strikes.length} Strikes Sequence
                        </Text>
                        <View style={styles.anyoStartBtn}>
                          <Text style={styles.anyoStartBtnText}>Start Routine</Text>
                          <Ionicons name="play" size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>

        {/* Grading Legend Modal */}
        <Modal
          visible={showLegendModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowLegendModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="trophy-outline" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle}>Grading System & Criteria</Text>
                </View>
                <TouchableOpacity onPress={() => setShowLegendModal(false)}>
                  <Ionicons name="close-circle" size={26} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalSectionTitle}>4-PILLAR KINETIC FORMULA BREAKDOWN</Text>
                <View style={styles.formulaBox}>
                  <View style={styles.formulaItem}>
                    <Text style={styles.formulaPct}>40%</Text>
                    <Text style={styles.formulaDesc}>Striking Arm & Elbow Angle Trajectory</Text>
                  </View>
                  <View style={styles.formulaItem}>
                    <Text style={styles.formulaPct}>25%</Text>
                    <Text style={styles.formulaDesc}>Check Hand Defense (Kalasag Chest Guard)</Text>
                  </View>
                  <View style={styles.formulaItem}>
                    <Text style={styles.formulaPct}>20%</Text>
                    <Text style={styles.formulaDesc}>Stance & Base Stability (Tindig 145°-165°)</Text>
                  </View>
                  <View style={styles.formulaItem}>
                    <Text style={styles.formulaPct}>15%</Text>
                    <Text style={styles.formulaDesc}>Wrist Snap (Pitik) & Torso Core Rotation</Text>
                  </View>
                </View>

                <Text style={styles.modalSectionTitle}>RATING SCALE LEGEND</Text>
                <View style={styles.legendList}>
                  <View style={[styles.legendItem, { borderColor: '#10B981' }]}>
                    <View style={[styles.legendBadge, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.legendBadgeText}>Grade A</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.legendName}>Mastered (90% - 100%)</Text>
                      <Text style={styles.legendDetail}>Flawless strike angle and balanced stance.</Text>
                    </View>
                  </View>

                  <View style={[styles.legendItem, { borderColor: '#3B82F6' }]}>
                    <View style={[styles.legendBadge, { backgroundColor: '#3B82F6' }]}>
                      <Text style={styles.legendBadgeText}>Grade B</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.legendName}>Proficient (85% - 89%)</Text>
                      <Text style={styles.legendDetail}>Correct technique with minor elbow variance.</Text>
                    </View>
                  </View>

                  <View style={[styles.legendItem, { borderColor: '#F59E0B' }]}>
                    <View style={[styles.legendBadge, { backgroundColor: '#F59E0B' }]}>
                      <Text style={styles.legendBadgeText}>Grade C</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.legendName}>Developing (75% - 84%)</Text>
                      <Text style={styles.legendDetail}>Acceptable form; work on full extension.</Text>
                    </View>
                  </View>

                  <View style={[styles.legendItem, { borderColor: '#F97316' }]}>
                    <View style={[styles.legendBadge, { backgroundColor: '#F97316' }]}>
                      <Text style={styles.legendBadgeText}>Grade D</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.legendName}>Needs Work (60% - 74%)</Text>
                      <Text style={styles.legendDetail}>Arm flexed incorrectly or wrist bent.</Text>
                    </View>
                  </View>

                  <View style={[styles.legendItem, { borderColor: '#EF4444' }]}>
                    <View style={[styles.legendBadge, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.legendBadgeText}>Grade F</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.legendName}>Incorrect (&lt; 60%)</Text>
                      <Text style={styles.legendDetail}>Off-target trajectory or invalid posture.</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowLegendModal(false)}
              >
                <Text style={styles.modalCloseBtnText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Interactive App Demo Tutorial Walkthrough Modal */}
        <AppTutorialModal
          visible={showTutorialModal}
          onClose={() => setShowTutorialModal(false)}
          onNavigateToPractice={(strikeId) => {
            setShowTutorialModal(false);
            setPracticeType('single');
            setEvaluationMode('practice');
            handleStartEvaluation(strikeId || 'strike_1');
          }}
        />

        {/* 12-Strike Video Demonstration Guide Modal */}
        <StrikeVideoModal
          visible={videoModalVisible}
          initialStrikeId={videoModalStrikeId}
          onClose={() => setVideoModalVisible(false)}
          onPracticeStrike={(strikeId: string) => {
            setVideoModalVisible(false);
            handleStartEvaluation(strikeId);
          }}
        />
      </SafeAreaView>
    );
  }

  // 2. LIVE CAMERA SCREEN
  if (screenState === 'live') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Evaluate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerTutorialBtn}
            onPress={() => setShowTutorialModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="help-circle" size={16} color="#F59E0B" style={{ marginRight: 5 }} />
            <Text style={styles.headerTutorialBtnText}>Guide</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.liveSubHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, marginRight: 8 }}>
            <View
              style={[
                styles.liveIndicatorContainer,
                activeRoutine ? { backgroundColor: '#8B5CF620' } : evaluationMode === 'coach' ? { backgroundColor: '#38BDF820' } : evaluationMode === 'freeflow' ? { backgroundColor: '#10B98120' } : evaluationMode === 'practice' ? { backgroundColor: '#3B82F620' } : undefined
              ]}
            >
              <View
                style={[
                  styles.liveDot,
                  activeRoutine ? { backgroundColor: '#8B5CF6' } : evaluationMode === 'coach' ? { backgroundColor: '#38BDF8' } : evaluationMode === 'freeflow' ? { backgroundColor: '#10B981' } : evaluationMode === 'practice' ? { backgroundColor: '#3B82F6' } : undefined
                ]}
              />
              <Text
                style={[
                  styles.liveText,
                  activeRoutine ? { color: '#8B5CF6' } : evaluationMode === 'coach' ? { color: '#38BDF8' } : evaluationMode === 'freeflow' ? { color: '#10B981' } : evaluationMode === 'practice' ? { color: '#3B82F6' } : undefined
                ]}
              >
                {activeRoutine ? 'ANYO FLOW' : evaluationMode === 'coach' ? 'FORM COACH' : evaluationMode === 'freeflow' ? '⚡ AUTO-ID' : evaluationMode === 'practice' ? 'PRACTICE' : 'LIVE'}
              </Text>
            </View>
            <Text style={styles.liveStrikeTitle} numberOfLines={1} ellipsizeMode="tail">
              {evaluationMode === 'freeflow'
                ? (lastDetectedStrike ? lastDetectedStrike.name : "Freeflow (Strike Any Form)")
                : (activeRoutine ? activeRoutine.name : currentRule.name)
              } - <Text style={styles.liveStrikeDesc}>{evaluationMode === 'freeflow' ? "MediaPipe Auto-ID" : activeRoutine ? `Step ${routineStepIndex + 1}/${activeRoutine.strikes.length} (${currentRule.name})` : currentRule.desc}</Text>
            </Text>
          </View>

          {/* Compact HUD Controls Row */}
          <View style={styles.liveControlsRow}>
            {/* Video Demonstration Modal Button */}
            <TouchableOpacity
              style={[
                styles.hudIconBtn,
                { borderColor: '#F59E0B', backgroundColor: '#F59E0B20' }
              ]}
              onPress={() => openVideoGuide(selectedStrikeId)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="play-circle"
                size={16}
                color="#F59E0B"
              />
            </TouchableOpacity>

            {/* Trajectory Guide Path Toggle */}
            <TouchableOpacity
              style={[
                styles.hudIconBtn,
                trajectoryGuideEnabled && { borderColor: '#FF9500', backgroundColor: '#FF950025' }
              ]}
              onPress={() => setTrajectoryGuideEnabled(!trajectoryGuideEnabled)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="vector-line"
                size={16}
                color={trajectoryGuideEnabled ? '#FF9500' : '#64748B'}
              />
            </TouchableOpacity>

            {/* Ghost Guide Toggle */}
            <TouchableOpacity
              style={[
                styles.hudIconBtn,
                ghostGuideEnabled && { borderColor: '#00F2FE', backgroundColor: '#00F2FE25' }
              ]}
              onPress={() => setGhostGuideEnabled(!ghostGuideEnabled)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="ghost-outline"
                size={16}
                color={ghostGuideEnabled ? '#00F2FE' : '#64748B'}
              />
            </TouchableOpacity>

            {/* Motion Ribbon Cycle */}
            <TouchableOpacity
              style={[
                styles.hudIconBtn,
                motionRibbonEnabled && {
                  borderColor: ribbonTheme === 'fire' ? '#FF3B30' : ribbonTheme === 'neon' ? '#EC4899' : '#00F2FE',
                  backgroundColor: ribbonTheme === 'fire' ? '#FF3B3025' : ribbonTheme === 'neon' ? '#EC489925' : '#00F2FE25',
                }
              ]}
              onPress={() => {
                if (!motionRibbonEnabled) {
                  setMotionRibbonEnabled(true);
                  setRibbonTheme('fire');
                } else if (ribbonTheme === 'fire') {
                  setRibbonTheme('neon');
                } else if (ribbonTheme === 'neon') {
                  setRibbonTheme('cyan');
                } else {
                  setMotionRibbonEnabled(false);
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="flare"
                size={16}
                color={motionRibbonEnabled ? (ribbonTheme === 'fire' ? '#FF3B30' : ribbonTheme === 'neon' ? '#EC4899' : '#00F2FE') : '#64748B'}
              />
            </TouchableOpacity>

            {/* Voice Coaching Toggle */}
            <TouchableOpacity
              style={[
                styles.hudIconBtn,
                voiceFeedbackEnabled && { borderColor: '#10B981', backgroundColor: '#10B98125' }
              ]}
              onPress={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={voiceFeedbackEnabled ? "volume-high" : "volume-mute"}
                size={16}
                color={voiceFeedbackEnabled ? "#10B981" : "#64748B"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* WebView Camera Viewport */}
        <View style={styles.viewportContainer}>
          <WebView
            ref={webViewRef}
            source={{
              html: getPoseEngineHtml(modelUrl),
              baseUrl: webBaseUrl
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
              <ActivityIndicator size="large" color="#D24B38" />
              <Text style={styles.loaderText}>{statusMsg}</Text>
            </View>
          )}

          {/* Toast Notification for Posture Snapshot */}
          {snapshotBannerVisible && (
            <View style={styles.snapshotOverlayPill}>
              <Ionicons name="camera" size={13} color="#10B981" style={{ marginRight: 5 }} />
              <Text style={styles.snapshotOverlayText}>📸 Snapshot Saved</Text>
            </View>
          )}

          {/* Real-time AI Auto-Detected Strike HUD Banner */}
          {lastDetectedStrike && (
            <Animated.View style={[styles.autoDetectedPill, { opacity: detectedBannerOpacity }]}>
              <View style={styles.autoDetectedIconWrap}>
                <MaterialCommunityIcons name="lightning-bolt" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.autoDetectedLabel}>AI IDENTIFIED STRIKE</Text>
                <Text style={styles.autoDetectedName} numberOfLines={1}>
                  {lastDetectedStrike.name} ({lastDetectedStrike.confidence}%)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.autoDetectedVideoBtn}
                onPress={() => openVideoGuide(lastDetectedStrike.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="play-circle" size={18} color="#F59E0B" />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Minimalist Motion State Badge (Top-Left, non-intrusive) */}
          {webReady && !errorMsg && persons.length > 0 && (
            <View style={styles.motionBadgeOverlay}>
              {(() => {
                const activeP = persons.find(p => p.id === primaryPersonId) || persons[0];
                const phase = activeP?.motionPhase || 'idle';
                const speed = activeP?.swingVelocity || 0;

                let badgeColor = '#64748B';
                let badgeText = 'READY';
                let iconName: any = 'shield-outline';

                if (phase === 'chambering') {
                  badgeColor = '#F59E0B';
                  badgeText = 'CHAMBER';
                  iconName = 'hand-left-outline';
                } else if (phase === 'swinging') {
                  badgeColor = '#3B82F6';
                  badgeText = `SWING ${speed.toFixed(1)} m/s`;
                  iconName = 'flash-outline';
                } else if (phase === 'apex_hit' || activeP?.isApex) {
                  badgeColor = '#10B981';
                  badgeText = 'IMPACT APEX!';
                  iconName = 'checkmark-circle-outline';
                }

                return (
                  <View style={[styles.motionBadgePill, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
                    <Ionicons name={iconName} size={13} color={badgeColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.motionBadgeText, { color: badgeColor }]}>{badgeText}</Text>
                    {activeP?.trajectory && activeP.trajectory.arcAngle !== null && (
                      <Text style={[styles.motionBadgeSubText, { color: badgeColor }]}>
                        {' · '}{activeP.trajectory.arcAngle}°
                      </Text>
                    )}
                  </View>
                );
              })()}
            </View>
          )}

          {/* Anyo Sequence HUD Overlay (Bottom-aligned) */}
          {webReady && !errorMsg && activeRoutine && (
            <View style={styles.anyoLiveOverlay}>
              <View style={styles.anyoTimerRow}>
                <View style={styles.anyoTimerPill}>
                  <Ionicons name="timer-outline" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                  <Text style={styles.anyoTimerText}>{(routineElapsedTime / 1000).toFixed(1)}s</Text>
                </View>
                <View style={styles.anyoStepCountPill}>
                  <Text style={styles.anyoStepCountText}>
                    Step {routineStepIndex + 1} of {activeRoutine.strikes.length}
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.anyoSeqScroll}
              >
                {activeRoutine.strikes.map((sId, idx) => {
                  const isDone = idx < routineStepIndex;
                  const isCur = idx === routineStepIndex;
                  const sRule = STRIKE_RULES[sId];
                  const sNum = sId.replace('strike_', '');

                  return (
                    <View
                      key={sId + '_' + idx}
                      style={[
                        styles.anyoSeqPill,
                        isDone && styles.anyoSeqPillDone,
                        isCur && styles.anyoSeqPillCur,
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" style={{ marginRight: 3 }} />
                      ) : isCur ? (
                        <MaterialCommunityIcons name="lightning-bolt" size={13} color="#F59E0B" style={{ marginRight: 2 }} />
                      ) : null}
                      <Text
                        style={[
                          styles.anyoSeqPillText,
                          isDone && styles.anyoSeqPillTextDone,
                          isCur && styles.anyoSeqPillTextCur,
                        ]}
                      >
                        {isCur ? `S${sNum}: ${sRule?.name || ''}` : `S${sNum}`}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Form Coach Interactive Step HUD Overlay (Bottom-aligned, leaves upper body clear) */}
          {webReady && !errorMsg && !activeRoutine && evaluationMode === 'coach' && (
            <View style={styles.coachLiveOverlay}>
              <View style={styles.coachHeaderRow}>
                <View style={styles.coachRepsPill}>
                  <MaterialCommunityIcons name="repeat" size={12} color="#38BDF8" style={{ marginRight: 3 }} />
                  <Text style={styles.coachRepsText}>Reps: {coachRepsCompleted}</Text>
                </View>
                <View style={styles.coachTitlePill}>
                  <Text style={styles.coachTitleText}>Form Coach Guide</Text>
                </View>
              </View>

              <View style={styles.coachStepRow}>
                {[
                  { key: 'chamber', label: '1. KASA', name: 'Chamber' },
                  { key: 'impact', label: '2. TUDLA', name: 'Strike' },
                  { key: 'recovery', label: '3. BAWI', name: 'Recovery' }
                ].map((step, idx) => {
                  const isCurrent = coachPhase === step.key;
                  const isDone = (coachPhase === 'impact' && idx === 0) || (coachPhase === 'recovery' && idx <= 1) || (coachPhase === 'completed');
                  return (
                    <View
                      key={step.key}
                      style={[
                        styles.coachStepPill,
                        isCurrent && styles.coachStepPillCur,
                        isDone && styles.coachStepPillDone
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" style={{ marginRight: 3 }} />
                      ) : isCurrent ? (
                        <MaterialCommunityIcons name="lightning-bolt" size={12} color="#F59E0B" style={{ marginRight: 2 }} />
                      ) : null}
                      <Text
                        style={[
                          styles.coachStepText,
                          isCurrent && styles.coachStepTextCur,
                          isDone && styles.coachStepTextDone
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {webReady && !errorMsg && !activeRoutine && evaluationMode === 'evaluate' && (
            <>
              {countdownState === 'waiting_for_person' && (
                <View style={styles.countdownOverlay}>
                  <Ionicons name="person-outline" size={48} color="#D24B38" />
                  <Text style={styles.countdownStatusText}>Please step into the camera frame</Text>
                </View>
              )}

              {countdownState === 'counting' && (
                <View style={styles.countdownOverlay}>
                  <Text style={styles.countdownNumber}>{countdownValue}</Text>
                  <Text style={styles.countdownSubtitle}>Get ready to strike!</Text>
                </View>
              )}

              {countdownState === 'evaluating' && (
                <View style={styles.countdownOverlay}>
                  <Text style={[styles.countdownStatusText, { color: '#10B981', fontWeight: 'bold' }]}>
                    SWING NOW! RECORDING...
                  </Text>
                </View>
              )}
            </>
          )}

          {webReady && !errorMsg && warningMsg && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.warningBannerText}>{warningMsg}</Text>
            </View>
          )}

          {errorMsg && (
            <View style={styles.errorOverlay}>
              <Text style={styles.errorText}>Error: {errorMsg}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => activeRoutine ? handleStartAnyoRoutine(activeRoutine) : handleStartEvaluation(selectedStrikeId)}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Scrollable controls and analysis below camera */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* Consolidated 4-Pillar Kinetic Alignment Card */}
          <View style={styles.unifiedAnalysisCard}>
            <View style={styles.analysisHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.unifiedAnalysisHeading}>4-PILLAR KINETIC POSTURE</Text>
                <Text style={styles.unifiedAnalysisSub} numberOfLines={1}>
                  {activeRoutine
                    ? `Step ${routineStepIndex + 1} (${currentRule.name})`
                    : evaluationMode === 'coach'
                      ? `Coach · ${coachPhase === 'chamber' ? '1. Kasa (Chamber)' : coachPhase === 'impact' ? '2. Tudla (Strike)' : coachPhase === 'recovery' ? '3. Bawi (Recovery)' : 'Complete'}`
                      : evaluationMode === 'practice'
                        ? 'Real-Time Biomechanical Alignment'
                        : 'Timed Posture Recording'}
                </Text>
              </View>

              <View style={[styles.overallScoreBadge, { borderColor: getScoreColor(poseScoreProgress) }]}>
                <Text style={[styles.overallScoreValue, { color: getScoreColor(poseScoreProgress) }]}>
                  {poseScoreProgress}%
                </Text>
                <Text style={styles.overallScoreLabel}>ACCURACY</Text>
              </View>
            </View>

            {/* 4 Pillars 2x2 Grid */}
            <View style={styles.pillarsGrid}>
              {/* Pillar 1: Striking Arm */}
              <View style={styles.pillarCard}>
                <View style={styles.pillarTopRow}>
                  <View style={styles.pillarLabelGroup}>
                    <MaterialCommunityIcons name="sword" size={14} color="#3B82F6" style={{ marginRight: 4 }} />
                    <Text style={styles.pillarLabel}>Striking Arm</Text>
                  </View>
                  <Text style={[styles.pillarValue, { color: getScoreColor(rtElbowScore) }]}>{rtElbowScore}%</Text>
                </View>
                <View style={styles.pillarBarBg}>
                  <View style={[styles.pillarBarFill, { width: `${rtElbowScore}%`, backgroundColor: getScoreColor(rtElbowScore) }]} />
                </View>
              </View>

              {/* Pillar 2: Check Hand */}
              <View style={styles.pillarCard}>
                <View style={styles.pillarTopRow}>
                  <View style={styles.pillarLabelGroup}>
                    <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={styles.pillarLabel}>Check Hand</Text>
                  </View>
                  <Text style={[styles.pillarValue, { color: getScoreColor(rtGuardScore) }]}>{rtGuardScore}%</Text>
                </View>
                <View style={styles.pillarBarBg}>
                  <View style={[styles.pillarBarFill, { width: `${rtGuardScore}%`, backgroundColor: getScoreColor(rtGuardScore) }]} />
                </View>
              </View>

              {/* Pillar 3: Stance Base */}
              <View style={styles.pillarCard}>
                <View style={styles.pillarTopRow}>
                  <View style={styles.pillarLabelGroup}>
                    <MaterialCommunityIcons name="human-male-height" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.pillarLabel}>Stance (Tindig)</Text>
                  </View>
                  <Text style={[styles.pillarValue, { color: getScoreColor(rtStanceScore) }]}>{rtStanceScore}%</Text>
                </View>
                <View style={styles.pillarBarBg}>
                  <View style={[styles.pillarBarFill, { width: `${rtStanceScore}%`, backgroundColor: getScoreColor(rtStanceScore) }]} />
                </View>
              </View>

              {/* Pillar 4: Wrist Snap */}
              <View style={styles.pillarCard}>
                <View style={styles.pillarTopRow}>
                  <View style={styles.pillarLabelGroup}>
                    <MaterialCommunityIcons name="flash" size={14} color="#8B5CF6" style={{ marginRight: 4 }} />
                    <Text style={styles.pillarLabel}>Wrist Snap</Text>
                  </View>
                  <Text style={[styles.pillarValue, { color: getScoreColor(rtWristScore) }]}>{rtWristScore}%</Text>
                </View>
                <View style={styles.pillarBarBg}>
                  <View style={[styles.pillarBarFill, { width: `${rtWristScore}%`, backgroundColor: getScoreColor(rtWristScore) }]} />
                </View>
              </View>
            </View>
          </View>

          {/* Multi-Person Panel (only displayed when more than 1 person is detected) */}
          {persons.length > 1 && (
            <View style={styles.multiPersonPanel}>
              <Text style={styles.analysisHeading}>Detected Practitioners ({persons.length})</Text>
              {persons.map((person) => {
                const isPrimary = person.id === primaryPersonId;
                const hasStick = person.isHoldingLeft || person.isHoldingRight;
                return (
                  <TouchableOpacity
                    key={person.id}
                    style={[
                      styles.personRow,
                      isPrimary && styles.personRowActive
                    ]}
                    onPress={() => setPrimaryPersonId(person.id)}
                  >
                    <View style={styles.personHeader}>
                      <View style={styles.personBadgeContainer}>
                        <View style={[styles.personColorDot, { backgroundColor: ['#10b981', '#8b5cf6', '#f59e0b', '#ec4899'][person.id % 4] }]} />
                        <Text style={styles.personName}>Person {person.id + 1} {isPrimary ? '(Active)' : ''}</Text>
                      </View>
                      <Text style={styles.personAccuracy}>{person.accuracy || 0}% Acc</Text>
                    </View>
                    <View style={styles.personStickInfo}>
                      <Ionicons
                        name={hasStick ? "checkmark-circle" : "alert-circle"}
                        size={14}
                        color={hasStick ? "#10B981" : "#EF4444"}
                      />
                      <Text style={[styles.personStickText, { color: hasStick ? "#10B981" : "#EF4444" }]}>
                        {hasStick
                          ? `Holding Stick (${person.isHoldingRight ? 'Right' : 'Left'} hand)`
                          : 'No Stick Detected'
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* 12-Strike Video Demonstration Guide Modal (Live Screen) */}
        <StrikeVideoModal
          visible={videoModalVisible}
          initialStrikeId={videoModalStrikeId}
          onClose={() => setVideoModalVisible(false)}
          onPracticeStrike={(strikeId: string) => {
            setSelectedStrikeId(strikeId);
            setVideoModalVisible(false);
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`if (window.setTargetStrike) window.setTargetStrike('${strikeId}'); true;`);
            }
          }}
        />
      </SafeAreaView>
    );
  }

  // 3. RESULT VIEW
  // 3A. ANYO ROUTINE RESULT VIEW
  if (lastAnyoResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Anyo Results</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Anyo Score Card */}
          <View style={styles.resultCard}>
            <Text style={styles.resultMeta}>🥋 ANYO ROUTINE COMPLETED · SAVED TO HISTORY</Text>
            <Text style={styles.resultTitle}>{lastAnyoResult.routine.name}</Text>
            <Text style={styles.resultSubtitle}>{lastAnyoResult.routine.subtitle}</Text>

            <View style={[styles.resultCircle, { borderColor: getScoreColor(lastAnyoResult.totalScore) }]}>
              <Text style={styles.resultScoreText}>{lastAnyoResult.totalScore}</Text>
            </View>

            <View style={[styles.resultGradePill, { backgroundColor: getScoreColor(lastAnyoResult.totalScore) + '20' }]}>
              <Text style={[styles.resultGradeText, { color: getScoreColor(lastAnyoResult.totalScore) }]}>
                {lastAnyoResult.grade}
              </Text>
            </View>
          </View>

          {/* Anyo Flow & Cadence Highlights */}
          <View style={styles.anyoHighlightRow}>
            <View style={styles.anyoHighlightCard}>
              <Ionicons name="timer-outline" size={20} color="#F59E0B" />
              <Text style={styles.anyoHighlightVal}>{(lastAnyoResult.totalDurationMs / 1000).toFixed(1)}s</Text>
              <Text style={styles.anyoHighlightLabel}>Total Time</Text>
            </View>

            <View style={styles.anyoHighlightCard}>
              <MaterialCommunityIcons name="speedometer" size={20} color="#3B82F6" />
              <Text style={styles.anyoHighlightVal}>{lastAnyoResult.cadenceSpeedSec}s</Text>
              <Text style={styles.anyoHighlightLabel}>Cadence / Strike</Text>
            </View>

            <View style={styles.anyoHighlightCard}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color="#10B981" />
              <Text style={styles.anyoHighlightVal}>{lastAnyoResult.steps.length}</Text>
              <Text style={styles.anyoHighlightLabel}>Strikes Cleared</Text>
            </View>
          </View>

          {/* Step by Step Breakdown List */}
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownHeading}>Sequence Execution Breakdown</Text>
            {lastAnyoResult.steps.map((step, sIdx) => {
              return (
                <View key={step.strikeId + '_' + sIdx} style={styles.anyoStepResultRow}>
                  <View style={styles.anyoStepIndexBadge}>
                    <Text style={styles.anyoStepIndexText}>{sIdx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.anyoStepStrikeName}>{step.strikeName}</Text>
                    <Text style={styles.anyoStepDuration}>Pace: {(step.durationMs / 1000).toFixed(1)}s</Text>
                  </View>
                  <View style={[styles.anyoStepScoreBadge, { backgroundColor: getScoreColor(step.score) + '20', borderColor: getScoreColor(step.score) }]}>
                    <Text style={[styles.anyoStepScoreText, { color: getScoreColor(step.score) }]}>
                      {step.score}% · {step.grade}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={{ gap: 12, marginTop: 8 }}>
            <TouchableOpacity
              style={styles.anyoRepeatBtn}
              activeOpacity={0.8}
              onPress={() => handleStartAnyoRoutine(lastAnyoResult.routine)}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.anyoRepeatBtnText}>Practice Routine Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneButton}
              activeOpacity={0.8}
              onPress={handleBackToSelection}
            >
              <Text style={styles.doneButtonText}>Done (Back to Menu)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 3B. SINGLE STRIKE RESULT VIEW
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Evaluate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Score Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultMeta}>SESSION COMPLETE · SAVED TO HISTORY</Text>
          <Text style={styles.resultTitle}>{currentRule.name} — {currentRule.desc}</Text>

          <View style={[styles.resultCircle, { borderColor: getScoreColor(finalSessionStats?.score || 0) }]}>
            <Text style={styles.resultScoreText}>{finalSessionStats?.score ?? 0}</Text>
          </View>

          <View style={[styles.resultGradePill, { backgroundColor: getScoreColor(finalSessionStats?.score || 0) + '20' }]}>
            <Text style={[styles.resultGradeText, { color: getScoreColor(finalSessionStats?.score || 0) }]}>
              {finalSessionStats?.grade || 'Grade F'}
            </Text>
          </View>
        </View>

        {/* 4-Pillar Kinetic Breakdown Card */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownHeading}>4-Pillar Kinetic Alignment</Text>

          {/* Pillar 1: Striking Arm */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownTextRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="sword" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
                <Text style={styles.breakdownLabel}>Striking Arm Trajectory</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: getScoreColor(finalSessionStats?.elbow.score ?? 0) }]}>
                {finalSessionStats?.elbow.score ?? 0}%
              </Text>
            </View>
            <View style={styles.breakdownBarBg}>
              <View style={[styles.breakdownBarFill, { width: `${finalSessionStats?.elbow.score ?? 0}%`, backgroundColor: getScoreColor(finalSessionStats?.elbow.score ?? 0) }]} />
            </View>
            <Text style={styles.breakdownActual}>
              Actual Elbow: {finalSessionStats?.elbow.actual ?? 0}° · Target Range: {currentRule.right_min}° - {currentRule.right_max}°
            </Text>
          </View>

          {/* Pillar 2: Check Hand (Kalasag) */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownTextRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="shield-check" size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.breakdownLabel}>Check Hand Defense (Kalasag)</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: getScoreColor(finalSessionStats?.guard?.score ?? 80) }]}>
                {finalSessionStats?.guard?.score ?? 80}%
              </Text>
            </View>
            <View style={styles.breakdownBarBg}>
              <View style={[styles.breakdownBarFill, { width: `${finalSessionStats?.guard?.score ?? 80}%`, backgroundColor: getScoreColor(finalSessionStats?.guard?.score ?? 80) }]} />
            </View>
            <Text style={styles.breakdownActual}>
              Target: {currentRule.guard_label || 'Chest / Solar Plexus Guard'}
            </Text>
          </View>

          {/* Pillar 3: Stance & Base (Tindig) */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownTextRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="human-male-height" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                <Text style={styles.breakdownLabel}>Stance & Base Stability (Tindig)</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: getScoreColor(finalSessionStats?.stance?.score ?? 80) }]}>
                {finalSessionStats?.stance?.score ?? 80}%
              </Text>
            </View>
            <View style={styles.breakdownBarBg}>
              <View style={[styles.breakdownBarFill, { width: `${finalSessionStats?.stance?.score ?? 80}%`, backgroundColor: getScoreColor(finalSessionStats?.stance?.score ?? 80) }]} />
            </View>
            <Text style={styles.breakdownActual}>
              Lead Knee: {finalSessionStats?.stance?.actual ?? finalSessionStats?.knee?.actual ?? 0}° · Ideal Flexion: {currentRule.knee_min || 135}° - {currentRule.knee_max || 165}°
            </Text>
          </View>

          {/* Pillar 4: Wrist Snap (Pitik) */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownTextRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="flash" size={16} color="#8B5CF6" style={{ marginRight: 6 }} />
                <Text style={styles.breakdownLabel}>Wrist Snap & Alignment (Pitik)</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: getScoreColor(finalSessionStats?.wrist.score ?? 0) }]}>
                {finalSessionStats?.wrist.score ?? 0}%
              </Text>
            </View>
            <View style={styles.breakdownBarBg}>
              <View style={[styles.breakdownBarFill, { width: `${finalSessionStats?.wrist.score ?? 0}%`, backgroundColor: getScoreColor(finalSessionStats?.wrist.score ?? 0) }]} />
            </View>
            <Text style={styles.breakdownActual}>
              Actual Deviation: {finalSessionStats?.wrist.actual ?? 0}° · Target: ≤ 15° Straight Locked
            </Text>
          </View>
        </View>

        {/* Guro's Master Coaching Tip Card */}
        {finalSessionStats?.improvementTip && (
          <View style={styles.tipCard}>
            <View style={styles.tipCardHeader}>
              <MaterialCommunityIcons name="karate" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.tipCardTitle}>Guro&apos;s Kinetic Feedback</Text>
            </View>
            <Text style={styles.tipCardBody}>{finalSessionStats.improvementTip}</Text>
          </View>
        )}

        {/* Captured Posture Snapshot */}
        {lastSnapshot && (
          <View style={styles.resultSnapshotCard}>
            <Text style={styles.resultSnapshotTitle}>📸 CAPTURED GREEN POSTURE SNAPSHOT</Text>
            <Image
              source={{ uri: lastSnapshot }}
              style={styles.resultSnapshotImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneButton}
          activeOpacity={0.8}
          onPress={handleBackToSelection}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1020',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTutorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTutorialBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (width - 52) / 2,
    backgroundColor: '#161930',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#D24B3820',
    borderWidth: 1,
    borderColor: '#D24B38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  badgeText: {
    color: '#D24B38',
    fontWeight: 'bold',
    fontSize: 12,
  },
  gridDetails: {
    flex: 1,
  },
  gridTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  gridDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  liveSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0A0C16',
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  liveText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  liveStrikeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F59E0B',
    flex: 1,
    flexShrink: 1,
  },
  liveStrikeDesc: {
    color: '#FFFFFF',
    fontWeight: 'normal',
  },
  viewportContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#000000',
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0C16E0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loaderText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F1020',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#D24B38',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  progressContainer: {
    padding: 20,
    backgroundColor: '#0A0C16',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  progressValue: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  analysisPanel: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0F1020',
  },
  analysisHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 16,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisLabel: {
    width: 60,
    color: '#94A3B8',
    fontSize: 13,
  },
  analysisBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  analysisBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  analysisValue: {
    width: 36,
    textAlign: 'right',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#161930',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  resultMeta: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultScoreText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultGradePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resultGradeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  breakdownCard: {
    backgroundColor: '#161930',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    marginBottom: 25,
  },
  breakdownHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  breakdownItem: {
    marginBottom: 20,
  },
  breakdownTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#10B981',
  },
  breakdownBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#0A0C16',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  breakdownActual: {
    fontSize: 11,
    color: '#64748B',
  },
  doneButton: {
    backgroundColor: '#D24B38',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 22, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  countdownStatusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  countdownNumber: {
    color: '#F59E0B',
    fontSize: 72,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  countdownSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  modeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 4,
    marginBottom: 10,
  },
  modeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeOptionActive: {
    backgroundColor: '#D24B38',
  },
  modeOptionText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  modeOptionTextActive: {
    color: '#FFFFFF',
  },
  modeDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  warningBanner: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 16, 32, 0.95)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  warningBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  quickSettingsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161930',
    borderRadius: 14,
    padding: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  quickStickWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  quickStickLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginRight: 8,
  },
  quickStickScroll: {
    alignItems: 'center',
    gap: 6,
  },
  quickStickChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1E243D',
    borderWidth: 1,
    borderColor: '#2A3352',
  },
  quickStickChipActive: {
    backgroundColor: '#D24B3825',
    borderColor: '#D24B38',
  },
  quickStickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  quickStickChipTextActive: {
    color: '#FFFFFF',
  },
  quickActionPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1E243D',
    borderWidth: 1,
    borderColor: '#2A3352',
  },
  quickActionBtnActive: {
    backgroundColor: '#10B98120',
    borderColor: '#10B981',
  },
  quickActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  liveControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#2A3352',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedAnalysisCard: {
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  analysisHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  unifiedAnalysisHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  unifiedAnalysisSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  overallScoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    backgroundColor: '#101222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overallScoreValue: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  overallScoreLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pillarCard: {
    width: (width - 32 - 32 - 10) / 2,
    backgroundColor: '#101222',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E243D',
  },
  pillarTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pillarLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  pillarValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  pillarBarBg: {
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  pillarBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  multiPersonPanel: {
    padding: 20,
    backgroundColor: '#0A0C16',
    borderTopWidth: 1,
    borderTopColor: '#161930',
  },
  personRow: {
    backgroundColor: '#161930',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  personRowActive: {
    borderColor: '#D24B38',
    backgroundColor: '#1E1E38',
  },
  personHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  personBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  personName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  personAccuracy: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  personStickInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personStickText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
  voiceToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceToggleButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  voiceToggleButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  liveVoiceToggle: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveVoiceToggleActive: {
    borderColor: '#10B981',
    backgroundColor: '#10B98120',
  },
  liveRibbonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  liveRibbonText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  liveGhostToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  liveGhostToggleActive: {
    borderColor: '#00F2FE',
    backgroundColor: '#00F2FE20',
  },
  liveGhostText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  motionBadgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 20,
  },
  motionBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(10, 12, 22, 0.85)',
  },
  motionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  motionBadgeSubText: {
    fontSize: 10,
    fontWeight: '700',
  },
  trajectoryBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  trajectoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  snapshotOverlayPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 25,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172AE8',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  snapshotOverlayText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  legendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderColor: '#F59E0B60',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  legendBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendBannerTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  legendBannerSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#161930',
    borderRadius: 20,
    borderColor: '#1E293B',
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.2,
    marginTop: 12,
    marginBottom: 8,
  },
  formulaBox: {
    backgroundColor: '#0F1020',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  formulaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  formulaPct: {
    width: 44,
    color: '#F59E0B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  formulaDesc: {
    color: '#E2E8F0',
    fontSize: 13,
    flex: 1,
  },
  legendList: {
    gap: 10,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1020',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  legendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  legendBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  legendName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  legendDetail: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    backgroundColor: '#D24B38',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  resultSnapshotCard: {
    backgroundColor: '#161930',
    borderRadius: 16,
    borderColor: '#1E293B',
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  resultSnapshotTitle: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  resultSnapshotImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  practiceTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  practiceTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  practiceTypeBtnActive: {
    backgroundColor: '#D24B38',
  },
  practiceTypeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  practiceTypeTextActive: {
    color: '#FFFFFF',
  },
  anyoIntroBanner: {
    backgroundColor: '#161930',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#8B5CF640',
    padding: 16,
    marginBottom: 16,
  },
  anyoIntroTitle: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  anyoIntroDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  anyoList: {
    gap: 14,
  },
  anyoCard: {
    backgroundColor: '#161930',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
  },
  anyoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  anyoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  anyoCardSubtitle: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 2,
  },
  anyoDiffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  anyoDiffText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  anyoCardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 14,
  },
  anyoSequencePills: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
    gap: 4,
  },
  anyoStepPillItem: {
    backgroundColor: '#0F1020',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  anyoStepPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E2E8F0',
  },
  anyoStartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 12,
  },
  anyoStrikesCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  anyoStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D24B38',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  anyoStartBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  anyoLiveOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    zIndex: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#8B5CF660',
  },
  anyoTimerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  anyoTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  anyoTimerText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  anyoStepCountPill: {
    backgroundColor: '#8B5CF620',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  anyoStepCountText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: 'bold',
  },
  anyoSeqScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anyoSeqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  anyoSeqPillDone: {
    backgroundColor: '#10B98120',
    borderColor: '#10B981',
  },
  anyoSeqPillCur: {
    backgroundColor: '#F59E0B20',
    borderColor: '#F59E0B',
  },
  anyoSeqPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  anyoSeqPillTextDone: {
    color: '#10B981',
  },
  anyoSeqPillTextCur: {
    color: '#F59E0B',
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 12,
  },
  anyoHighlightRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  anyoHighlightCard: {
    flex: 1,
    backgroundColor: '#161930',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    alignItems: 'center',
  },
  anyoHighlightVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 6,
  },
  anyoHighlightLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  anyoStepResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  anyoStepIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  anyoStepIndexText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  anyoStepStrikeName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  anyoStepDuration: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  anyoStepScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  anyoStepScoreText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  anyoRepeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  anyoRepeatBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  tipCard: {
    backgroundColor: '#1E2238',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B50',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  tipCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipCardTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
  tipCardBody: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  coachLiveOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    zIndex: 30,
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#38BDF860',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  coachRepsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF820',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  coachRepsText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  coachTitlePill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coachTitleText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  coachStepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  coachStepPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  coachStepPillCur: {
    backgroundColor: '#F59E0B25',
    borderColor: '#F59E0B',
  },
  coachStepPillDone: {
    backgroundColor: '#10B98125',
    borderColor: '#10B981',
  },
  coachStepText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  coachStepTextCur: {
    color: '#F59E0B',
  },
  coachStepTextDone: {
    color: '#10B981',
  },
  videoGuideHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161930',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B60',
    marginBottom: 16,
  },
  videoGuideHeaderBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.2,
  },
  autoDetectedPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 45,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  autoDetectedIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  autoDetectedLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  autoDetectedName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  autoDetectedVideoBtn: {
    padding: 6,
    marginLeft: 4,
  },
});

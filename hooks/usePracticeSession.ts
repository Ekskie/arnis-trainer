import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getStrikeRule, STRIKE_RULES, StrikeRule } from '@/constants/strikeRules';
import { EvaluationConfig } from '@/engine/pose/poseEngineTypes';
import { StrikeEvaluationResult } from '@/engine/evaluation/evaluationTypes';
import { compileSessionResult } from '@/engine/evaluation/strikeEvaluator';
import {
  AnyoRoutine,
  AnyoStepResult,
  getHistory,
  saveAnyoSession,
  saveSession,
  SessionItem,
} from '@/constants/historyStore';
import { addXpAndStreak } from '@/constants/gamificationStore';

export type PracticeScreenState = 'setup' | 'briefing' | 'live' | 'result';

export interface SessionImprovement {
  previousBest: number;
  delta: number;
  isNewPersonalBest: boolean;
  isMastered: boolean;
}

export function usePracticeSession() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    strikeId?: string;
    mode?: 'follow' | 'guided' | 'test';
    source?: string;
  }>();

  // Navigation screen state
  const [screen, setScreen] = useState<PracticeScreenState>('setup');

  // Selected technique
  const [selectedStrikeId, setSelectedStrikeId] = useState<string>('strike_1');
  const [mode, setMode] = useState<'follow' | 'guided' | 'test'>('guided');
  const [source, setSource] = useState<string | undefined>(undefined);

  // Configuration options
  const [stickColor, setStickColor] = useState('#EAB308');
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const [motionRibbonEnabled, setMotionRibbonEnabled] = useState(true);
  const [ribbonTheme, setRibbonTheme] = useState('fire');
  const [ghostGuideEnabled, setGhostGuideEnabled] = useState(true);
  const [trajectoryGuideEnabled, setTrajectoryGuideEnabled] = useState(true);

  // Anyo state
  const [activeRoutine, setActiveRoutine] = useState<AnyoRoutine | null>(null);
  const [routineStepIndex, setRoutineStepIndex] = useState(0);
  const [routineStepScores, setRoutineStepScores] = useState<AnyoStepResult[]>([]);

  // Results & Improvements
  const [evaluationResult, setEvaluationResult] = useState<StrikeEvaluationResult | null>(null);
  const [sessionImprovement, setSessionImprovement] = useState<SessionImprovement>({
    previousBest: 0,
    delta: 0,
    isNewPersonalBest: false,
    isMastered: false,
  });
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  const [lastReplayVideo, setLastReplayVideo] = useState<string | null>(null);

  // Derive current rule from canonical strikeRules
  const currentRule: StrikeRule = useMemo(() => {
    return getStrikeRule(selectedStrikeId);
  }, [selectedStrikeId]);

  // Derived EvaluationConfig for pose engine
  const evaluationConfig: EvaluationConfig = useMemo(() => {
    return {
      strikeId: selectedStrikeId,
      mode,
      stickColor,
      motionRibbonEnabled,
      ribbonTheme,
      ghostGuideEnabled,
      trajectoryGuideEnabled,
      formCoachMode: mode === 'guided',
      autoDetectMode: false,
      voiceEnabled: voiceFeedbackEnabled,
    };
  }, [
    selectedStrikeId,
    mode,
    stickColor,
    motionRibbonEnabled,
    ribbonTheme,
    ghostGuideEnabled,
    trajectoryGuideEnabled,
    voiceFeedbackEnabled,
  ]);

  // Handle incoming route params (e.g. from Lesson: /evaluate?strikeId=strike_3&mode=guided&source=lesson)
  useEffect(() => {
    if (params.strikeId && STRIKE_RULES[params.strikeId]) {
      setSelectedStrikeId(params.strikeId);
      if (params.mode) {
        setMode(params.mode);
      }
      if (params.source) {
        setSource(params.source);
      }
      // If coming directly from a lesson or explicit mode launch, jump directly into live camera
      if (params.source === 'lesson' || params.mode) {
        setScreen('live');
      }
    }
  }, [params.strikeId, params.mode, params.source]);

  // Action: Launch a strike
  const startStrike = useCallback(
    (strikeId: string, practiceMode: 'follow' | 'guided' | 'test' = 'guided') => {
      setSelectedStrikeId(strikeId);
      setMode(practiceMode);
      setActiveRoutine(null);
      setScreen('live');
    },
    []
  );

  // Action: Launch an Anyo Kata routine
  const startAnyo = useCallback((routine: AnyoRoutine) => {
    setActiveRoutine(routine);
    setRoutineStepIndex(0);
    setRoutineStepScores([]);
    if (routine.strikes.length > 0) {
      setSelectedStrikeId(routine.strikes[0]);
    }
    setMode('guided');
    setScreen('live');
  }, []);

  // Action: Complete a single-strike session
  const completeSingleStrikeSession = useCallback(
    async (
      rawStats: {
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
    ) => {
      // 1. Fetch previous history to compute delta
      const historyList: SessionItem[] = await getHistory();
      const prevScores = (historyList || [])
        .filter((s) => s.strikeId === selectedStrikeId)
        .map((s) => s.score);
      const prevBest = prevScores.length > 0 ? Math.max(...prevScores) : 0;
      const finalScore = rawStats.score;
      const delta = prevBest > 0 ? finalScore - prevBest : 0;

      const improvement: SessionImprovement = {
        previousBest: prevBest,
        delta,
        isNewPersonalBest: prevBest > 0 && finalScore > prevBest,
        isMastered: finalScore >= 85,
      };
      setSessionImprovement(improvement);

      // 2. Compile structured evaluation result via Evaluation Engine
      const result = compileSessionResult(
        rawStats,
        currentRule,
        {
          isNewPersonalBest: improvement.isNewPersonalBest,
          isMastered: improvement.isMastered,
        }
      );
      setEvaluationResult(result);
      if (snapshotBase64) setLastSnapshot(snapshotBase64);
      if (replayVideoBase64) setLastReplayVideo(replayVideoBase64);

      // 3. Save to historyStore
      await saveSession(
        selectedStrikeId,
        currentRule.name,
        currentRule.desc,
        result.score,
        {
          elbow: { score: rawStats.elbowScore, actual: 0, ideal: currentRule.chamber_elb },
          shoulder: { score: rawStats.shoulderScore, actual: 0, ideal: currentRule.ideal_shoulder },
          wrist: { score: rawStats.wristScore, actual: 0, ideal: 0 },
          guard: { score: rawStats.guardScore, actual: 0, ideal: 0 },
          stance: { score: rawStats.stanceScore, actual: 0, ideal: currentRule.ideal_knee },
        },
        snapshotBase64,
        replayVideoBase64
      );

      // 4. Award XP and streak
      await addXpAndStreak(10);

      // 5. Navigate to result view
      setScreen('result');
    },
    [selectedStrikeId, currentRule]
  );

  // Action: Complete an Anyo routine
  const completeAnyoSession = useCallback(
    async (
      routine: AnyoRoutine,
      steps: AnyoStepResult[],
      totalDurationMs: number,
      snapshotBase64?: string
    ) => {
      const sum = steps.reduce((acc, curr) => acc + curr.score, 0);
      const avgScore = steps.length > 0 ? Math.round(sum / steps.length) : 80;

      await saveAnyoSession(routine, steps, totalDurationMs);
      await addXpAndStreak(25);

      const result = compileSessionResult(
        {
          score: avgScore,
          elbowScore: avgScore,
          shoulderScore: avgScore,
          wristScore: avgScore,
          guardScore: avgScore,
          stanceScore: avgScore,
          durationMs: totalDurationMs,
        },
        currentRule,
        { isMastered: avgScore >= 85 }
      );
      setEvaluationResult(result);
      setScreen('result');
    },
    [currentRule]
  );

  // Action: Retry current strike
  const retry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScreen('live');
  }, []);

  // Action: Proceed to next strike (e.g. Strike 1 -> Strike 2)
  const nextStrike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextNum = currentRule.strikeNumber >= 12 ? 1 : currentRule.strikeNumber + 1;
    const nextId = `strike_${nextNum}`;
    setSelectedStrikeId(nextId);
    setScreen('live');
  }, [currentRule]);

  // Action: Exit back to practice home menu
  const exitToSetup = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveRoutine(null);
    setScreen('setup');
  }, []);

  // Action: Return to lesson if entered from lesson
  const returnToLesson = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (source === 'lesson') {
      router.back();
    } else {
      exitToSetup();
    }
  }, [source, router, exitToSetup]);

  return {
    screen,
    setScreen,
    selectedStrikeId,
    setSelectedStrikeId,
    currentRule,
    mode,
    setMode,
    source,
    evaluationConfig,
    stickColor,
    setStickColor,
    voiceFeedbackEnabled,
    setVoiceFeedbackEnabled,
    motionRibbonEnabled,
    setMotionRibbonEnabled,
    ribbonTheme,
    setRibbonTheme,
    ghostGuideEnabled,
    setGhostGuideEnabled,
    trajectoryGuideEnabled,
    setTrajectoryGuideEnabled,
    activeRoutine,
    routineStepIndex,
    setRoutineStepIndex,
    routineStepScores,
    setRoutineStepScores,
    evaluationResult,
    sessionImprovement,
    lastSnapshot,
    lastReplayVideo,
    startStrike,
    startAnyo,
    completeSingleStrikeSession,
    completeAnyoSession,
    retry,
    nextStrike,
    exitToSetup,
    returnToLesson,
  };
}

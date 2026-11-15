import { KineticPhaseScores, PillarScores, StrikeEvaluationResult } from './evaluationTypes';
import {
  calculateJointScore,
  calculateMultiTierJointScore,
  calculateOverallScore,
  calculateStarCount,
  computeGrade,
} from './scoreCalculator';
import { generateCoachFeedback } from './feedbackGenerator';
import { StrikeRule } from '@/constants/strikeRules';
import { RawPersonPose } from '@/engine/pose/poseEngineTypes';
import { ShadowEvaluationReport } from '@/engine/reference/referenceTypes';

export interface EvaluatedFrameData {
  accuracy: number;
  elbowScore: number;
  shoulderScore: number;
  wristScore: number;
  kneeScore: number;
  guardScore: number;
  stanceScore: number;
  chamberScore: number;
  leadKneeAngle: number;
  pillars: PillarScores;
  correctionPrompt: string | null;
}

/**
 * Maps a loaded & evaluated shadow DTW report into a 0..100 trajectory score.
 * Returns null when no expert reference is evaluated or frame coverage is too short.
 */
export function computeDtwTrajectoryScore(
  shadowReport?: ShadowEvaluationReport | null
): number | null {
  if (
    !shadowReport ||
    shadowReport.referenceStatus !== 'evaluated' ||
    !shadowReport.trajectoryMetrics ||
    shadowReport.measurementCoverage.validNormalizedFrames < 6
  ) {
    return null;
  }

  const dist = shadowReport.trajectoryMetrics.dtwMeanDistance;
  if (!Number.isFinite(dist)) return null;

  const distScore =
    dist <= 0.35
      ? 100
      : Math.max(40, Math.min(100, Math.round(100 - ((dist - 0.35) / 0.90) * 60)));

  const dirAgree = shadowReport.trajectoryMetrics.directionAgreementFraction;
  const dirScore =
    dirAgree !== null && Number.isFinite(dirAgree)
      ? Math.round(Math.max(0, Math.min(1, dirAgree)) * 100)
      : distScore;

  return Math.round(distScore * 0.65 + dirScore * 0.35);
}

/**
 * Evaluates a single raw frame from MediaPipe against the canonical StrikeRule.
 */
export function evaluatePoseFrame(
  person: RawPersonPose,
  rule: StrikeRule
): EvaluatedFrameData {
  const rightAngle = person.rightAngle ? Math.round(person.rightAngle) : 0;
  const rightShoulderAngle = person.rightShoulderAngle ? Math.round(person.rightShoulderAngle) : 0;
  const rightWristAngle =
    typeof person.rightWristAngle === 'number' && !Number.isNaN(person.rightWristAngle)
      ? Math.round(person.rightWristAngle)
      : null;

  // 1. Striking arm score (elbow) with multi-tier dataset calibration
  const elbowScore =
    person.elbowScore !== undefined
      ? person.elbowScore
      : rule.optimal_min && rule.optimal_max
      ? calculateMultiTierJointScore(
          rightAngle,
          rule.optimal_min,
          rule.optimal_max,
          rule.right_min,
          rule.right_max
        )
      : calculateJointScore(rightAngle, rule.right_min, rule.right_max);

  // 2. Shoulder score
  const shoulderScore =
    person.shoulderScore !== undefined
      ? person.shoulderScore
      : rightShoulderAngle > 0
      ? calculateJointScore(
          rightShoulderAngle,
          rule.ideal_shoulder - 25,
          rule.ideal_shoulder + 25
        )
      : 80;

  // 3. Wrist snap score
  const wristScore =
    person.wristScore !== undefined
      ? person.wristScore
      : rightWristAngle !== null
      ? calculateJointScore(rightWristAngle, 0, 15)
      : 85;

  // 4. Stance score (knee flexion)
  const stanceScore =
    person.stanceScore !== undefined
      ? person.stanceScore
      : person.kneeScore || 80;

  // 5. Guard hand score
  const guardScore =
    person.guardScore !== undefined
      ? person.guardScore
      : person.isLeftGood
      ? 100
      : 70;

  // 6. Striking arm composite & uncapped chamber readiness score
  const hasTrajectoryScore =
    typeof person.trajectoryAccuracy === 'number' && Number.isFinite(person.trajectoryAccuracy);
  const strikingArmScore = hasTrajectoryScore
    ? Math.round(elbowScore * 0.38 + shoulderScore * 0.22 + (person.trajectoryAccuracy as number) * 0.40)
    : Math.round(elbowScore * 0.65 + shoulderScore * 0.35);

  const pillars: PillarScores = {
    strikingArm: strikingArmScore,
    guard: guardScore,
    stance: stanceScore,
    wrist: wristScore,
  };

  let chamberScore = 0;
  if (person.isPersonVisible && (person.isHoldingRight || person.isHoldingLeft)) {
    if (
      typeof person.chamberReadinessScore === 'number' &&
      Number.isFinite(person.chamberReadinessScore)
    ) {
      chamberScore = Math.round(person.chamberReadinessScore);
    } else {
      const chamberElbIdeal = rule.chamber_elb ?? 135;
      const chamberElbowScore =
        rightAngle > 0
          ? calculateJointScore(rightAngle, chamberElbIdeal - 25, chamberElbIdeal + 25)
          : 80;
      chamberScore = Math.round(
        guardScore * 0.40 + stanceScore * 0.40 + chamberElbowScore * 0.20
      );
    }
  }

  let accuracy = person.accuracy !== undefined ? person.accuracy : calculateOverallScore(pillars);
  if (person.isStaticHold) {
    accuracy = Math.min(55, accuracy);
  }

  // Voice / visual correction prompt
  let correctionPrompt: string | null = null;
  const isHoldingStick = !!person.isHoldingLeft || !!person.isHoldingRight;

  if (person.isStaticHold) {
    correctionPrompt = "Don't freeze in place — move smoothly through the full strike";
  } else if (!isHoldingStick) {
    correctionPrompt = "Hold your Arnis stick in your hand";
  } else if (person.isGuardLow || guardScore < 60) {
    correctionPrompt = "Bring your free hand up to your chest";
  } else if (person.isStanceHigh || stanceScore < 60) {
    correctionPrompt = "Bend your knees slightly into a ready stance";
  } else if (person.motionPhase === 'chambering') {
    if (rightAngle > 0 && Math.abs(rightAngle - rule.chamber_elb) > 28) {
      correctionPrompt = "Bring the stick back by your shoulder to get ready";
    }
  } else if (person.motionPhase === 'driving' || person.motionPhase === 'swinging') {
    if (!person.isRightGood && rightAngle > 0) {
      correctionPrompt =
        rightAngle < rule.right_min
          ? "Reach your striking arm out smoothly"
          : "Guide your swing cleanly toward the target";
    }
  } else if (person.motionPhase === 'apex_hit' || person.isApex) {
    correctionPrompt = "Nice strike! Now bring your stick back to guard";
  } else if (wristScore < 65) {
    correctionPrompt = "Keep your wrist firm as you strike";
  }

  return {
    accuracy,
    elbowScore,
    shoulderScore,
    wristScore,
    kneeScore: stanceScore,
    guardScore,
    stanceScore,
    chamberScore,
    leadKneeAngle: person.leadKneeAngle || 0,
    pillars,
    correctionPrompt,
  };
}

export interface BestSessionInput {
  score: number;
  elbowScore: number;
  shoulderScore: number;
  wristScore: number;
  guardScore: number;
  stanceScore: number;
  kneeScore?: number;
  trajectoryAccuracy?: number;
  kineticScore?: number;
  kineticPhases?: KineticPhaseScores;
  durationMs?: number;
  diagnosticFlags?: string[];
  shadowEvaluation?: ShadowEvaluationReport;
}

/**
 * Compiles the final structured evaluation result from the recorded session window.
 */
export function compileSessionResult(
  data: BestSessionInput,
  rule: StrikeRule,
  options?: { isNewPersonalBest?: boolean; isMastered?: boolean }
): StrikeEvaluationResult {
  const hasTrajectory =
    typeof data.trajectoryAccuracy === 'number' && Number.isFinite(data.trajectoryAccuracy);
  const strikingArmPillar = hasTrajectory
    ? Math.round(
        data.elbowScore * 0.38 +
          data.shoulderScore * 0.22 +
          (data.trajectoryAccuracy as number) * 0.40
      )
    : Math.round(data.elbowScore * 0.65 + data.shoulderScore * 0.35);

  const pillars: PillarScores = {
    strikingArm: strikingArmPillar,
    guard: Math.round(data.guardScore),
    stance: Math.round(data.stanceScore),
    wrist: Math.round(data.wristScore),
  };

  const finalScore = data.score > 0 ? data.score : calculateOverallScore(pillars);
  const grade = computeGrade(finalScore);
  const stars = calculateStarCount(finalScore);

  const feedback = generateCoachFeedback(finalScore, pillars, rule, {
    isNewPersonalBest: options?.isNewPersonalBest,
    isMastered: options?.isMastered || finalScore >= 85,
  });

  return {
    score: finalScore,
    accuracy: finalScore,
    grade,
    stars,
    elbowScore: data.elbowScore,
    shoulderScore: data.shoulderScore,
    wristScore: data.wristScore,
    kneeScore: data.kneeScore || data.stanceScore,
    guardScore: data.guardScore,
    stanceScore: data.stanceScore,
    kineticScore: data.kineticScore,
    kineticPhases: data.kineticPhases,
    pillarScores: pillars,
    feedback,
    diagnosticFlags: data.diagnosticFlags || [],
    durationMs: data.durationMs,
    shadowEvaluation: data.shadowEvaluation,
  };
}

import { PillarScores, StrikeEvaluationResult } from './evaluationTypes';
import {
  calculateJointScore,
  calculateOverallScore,
  calculateStarCount,
  computeGrade,
} from './scoreCalculator';
import { generateCoachFeedback } from './feedbackGenerator';
import { StrikeRule } from '@/constants/strikeRules';
import { RawPersonPose } from '@/engine/pose/poseEngineTypes';

export interface EvaluatedFrameData {
  accuracy: number;
  elbowScore: number;
  shoulderScore: number;
  wristScore: number;
  kneeScore: number;
  guardScore: number;
  stanceScore: number;
  leadKneeAngle: number;
  pillars: PillarScores;
  correctionPrompt: string | null;
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
  const rightWristAngle = person.rightWristAngle !== null ? Math.round(person.rightWristAngle) : 0;

  // 1. Striking arm score (elbow)
  const elbowScore =
    person.elbowScore !== undefined
      ? person.elbowScore
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

  const pillars: PillarScores = {
    strikingArm: elbowScore,
    guard: guardScore,
    stance: stanceScore,
    wrist: wristScore,
  };

  const accuracy = calculateOverallScore(pillars);

  // Voice / visual correction prompt
  let correctionPrompt: string | null = null;
  const isHoldingStick = !!person.isHoldingLeft || !!person.isHoldingRight;

  if (person.isStaticHold) {
    correctionPrompt = "Don't freeze in place, execute the full strike motion";
  } else if (!isHoldingStick) {
    correctionPrompt = "Please hold your Arnis stick";
  } else if (person.isGuardLow || guardScore < 60) {
    correctionPrompt = "Raise your check hand to guard your chest";
  } else if (person.isStanceHigh || stanceScore < 60) {
    correctionPrompt = "Bend your knees into a fighting stance";
  } else if (person.motionPhase === 'chambering') {
    if (rightAngle > 0 && Math.abs(rightAngle - rule.chamber_elb) > 28) {
      correctionPrompt = "Chamber your stick for the strike";
    }
  } else if (person.motionPhase === 'driving' || person.motionPhase === 'swinging') {
    if (!person.isRightGood && rightAngle > 0) {
      correctionPrompt =
        rightAngle < rule.right_min
          ? "Extend your striking arm fully"
          : "Control your strike angle";
    }
  } else if (person.motionPhase === 'apex_hit' || person.isApex) {
    correctionPrompt = "Great strike impact peak!";
  } else if (wristScore < 65) {
    correctionPrompt = "Straighten and snap your wrist";
  }

  return {
    accuracy,
    elbowScore,
    shoulderScore,
    wristScore,
    kneeScore: stanceScore,
    guardScore,
    stanceScore,
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
  kineticScore?: number;
  durationMs?: number;
  diagnosticFlags?: string[];
}

/**
 * Compiles the final structured evaluation result from the recorded session window.
 */
export function compileSessionResult(
  data: BestSessionInput,
  rule: StrikeRule,
  options?: { isNewPersonalBest?: boolean; isMastered?: boolean }
): StrikeEvaluationResult {
  const pillars: PillarScores = {
    strikingArm: Math.round(data.elbowScore),
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
    pillarScores: pillars,
    feedback,
    diagnosticFlags: data.diagnosticFlags || [],
    durationMs: data.durationMs,
  };
}

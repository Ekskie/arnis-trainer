import { PillarScores } from './evaluationTypes';

/**
 * Calculates a 0-100 score for a joint angle against acceptable [minVal, maxVal].
 * Applies a 2-point penalty per degree of deviation outside the range.
 */
export function calculateJointScore(
  actual: number | null | undefined,
  minVal: number,
  maxVal: number
): number {
  if (actual === null || actual === undefined || actual === 0) return 0;
  if (actual >= minVal && actual <= maxVal) return 100;
  const dev = actual < minVal ? minVal - actual : actual - maxVal;
  return Math.max(0, Math.round(100 - dev * 2));
}

/**
 * Calculates the canonical weighted score from 4 martial pillars:
 * - Striking Arm Trajectory: 40%
 * - Kalasag Guard Hand: 25%
 * - Tindig Stance Stability: 20%
 * - Pitik Wrist Snap & Alignment: 15%
 */
export function calculateOverallScore(pillars: PillarScores): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        pillars.strikingArm * 0.4 +
          pillars.guard * 0.25 +
          pillars.stance * 0.2 +
          pillars.wrist * 0.15
      )
    )
  );
}

/**
 * Computes standard Arnis ranking grade.
 */
export function computeGrade(score: number): string {
  if (score >= 95) return 'Grade A';
  if (score >= 85) return 'Grade B';
  if (score >= 75) return 'Grade C';
  if (score >= 60) return 'Grade D';
  if (score > 0) return 'Grade F';
  return 'Unranked';
}

/**
 * Maps a 0-100 score to a 0-5 star rating.
 */
export function calculateStarCount(score: number): number {
  if (score >= 95) return 5;
  if (score >= 85) return 4;
  if (score >= 70) return 3;
  if (score >= 50) return 2;
  if (score > 0) return 1;
  return 0;
}

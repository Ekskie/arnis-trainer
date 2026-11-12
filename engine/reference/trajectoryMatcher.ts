import { computeMedian } from './poseNormalizer';
import {
  ExpertStrikeReference,
  KinematicLandmarkComparison,
  NormalizedPoseFrame2D,
  NormalizedTrajectorySample,
  RawTrajectoryMetrics,
} from './referenceTypes';

export interface WristTrajectoryPoint {
  frameIndex: number;
  relativeTimeMs: number;
  dx: number;
  dy: number;
  speedNormPerSec: number;
}

export interface DtwAlignmentPair {
  userIndex: number;
  refIndex: number;
  distance: number;
}

export interface TrajectoryMatchOutput {
  metrics: RawTrajectoryMetrics;
  kinematicLandmarks: KinematicLandmarkComparison;
  alignedPairs: DtwAlignmentPair[];
  activeUserPoints: WristTrajectoryPoint[];
}

function roundTo(val: number, decimals = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Extracts normalized wrist trajectory points and instantaneous speed (V2 units/sec).
 */
export function extractWristTrajectoryPoints(
  frames: NormalizedPoseFrame2D[],
  joint: 'right_wrist' | 'left_wrist'
): WristTrajectoryPoint[] {
  const key = joint === 'left_wrist' ? 'leftWrist' : 'rightWrist';
  const rawPts: Array<{ frameIndex: number; relativeTimeMs: number; dx: number; dy: number }> = [];

  frames.forEach((frame, idx) => {
    const pt = frame.points[key];
    if (pt && Number.isFinite(pt.dx) && Number.isFinite(pt.dy)) {
      rawPts.push({
        frameIndex: idx,
        relativeTimeMs: frame.relativeTimeMs,
        dx: pt.dx,
        dy: pt.dy,
      });
    }
  });

  return rawPts.map((pt, i) => {
    if (i === 0) {
      return { ...pt, speedNormPerSec: 0 };
    }
    const prev = rawPts[i - 1];
    const dtSec = Math.max(0.005, (pt.relativeTimeMs - prev.relativeTimeMs) / 1000);
    const dist = Math.hypot(pt.dx - prev.dx, pt.dy - prev.dy);
    return {
      ...pt,
      speedNormPerSec: dist / dtSec,
    };
  });
}

/**
 * Extracts the active movement segment around the peak wrist-speed event,
 * trimming stationary lead-in/lead-out frames while preserving the full sequence if short.
 */
export function extractActiveWindow(points: WristTrajectoryPoint[]): WristTrajectoryPoint[] {
  if (points.length <= 6) return points;

  let peakSpeed = 0;
  for (const p of points) {
    if (p.speedNormPerSec > peakSpeed) peakSpeed = p.speedNormPerSec;
  }

  if (peakSpeed <= 0.05) {
    return points;
  }

  const speedThreshold = peakSpeed * 0.15;
  let firstActive = -1;
  let lastActive = -1;

  for (let i = 0; i < points.length; i += 1) {
    if (points[i].speedNormPerSec >= speedThreshold) {
      if (firstActive === -1) firstActive = i;
      lastActive = i;
    }
  }

  if (firstActive === -1 || lastActive - firstActive + 1 < 4) {
    return points;
  }

  const startIdx = Math.max(0, firstActive - 2);
  const endIdx = Math.min(points.length - 1, lastActive + 2);
  return points.slice(startIdx, endIdx + 1);
}

/**
 * Standard 2D Euclidean Dynamic Time Warping (DTW) between user points and reference median path.
 */
export function computeDtwAlignment(
  userPts: Array<{ dx: number; dy: number }>,
  refSamples: NormalizedTrajectorySample[]
): DtwAlignmentPair[] {
  const n = userPts.length;
  const m = refSamples.length;
  if (n === 0 || m === 0) return [];

  const dp: number[][] = Array.from({ length: n }, () => new Array(m).fill(Infinity));
  const distMat: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const d = Math.hypot(
        userPts[i].dx - refSamples[j].dxMedian,
        userPts[i].dy - refSamples[j].dyMedian
      );
      distMat[i][j] = d;
      if (i === 0 && j === 0) {
        dp[i][j] = d;
      } else {
        const top = i > 0 ? dp[i - 1][j] : Infinity;
        const left = j > 0 ? dp[i][j - 1] : Infinity;
        const diag = i > 0 && j > 0 ? dp[i - 1][j - 1] : Infinity;
        dp[i][j] = d + Math.min(top, left, diag);
      }
    }
  }

  // Backtrack optimal path
  const path: DtwAlignmentPair[] = [];
  let i = n - 1;
  let j = m - 1;
  path.push({ userIndex: i, refIndex: j, distance: distMat[i][j] });

  while (i > 0 || j > 0) {
    if (i === 0) {
      j -= 1;
    } else if (j === 0) {
      i -= 1;
    } else {
      const diag = dp[i - 1][j - 1];
      const up = dp[i - 1][j];
      const left = dp[i][j - 1];
      if (diag <= up && diag <= left) {
        i -= 1;
        j -= 1;
      } else if (up <= left) {
        i -= 1;
      } else {
        j -= 1;
      }
    }
    path.push({ userIndex: i, refIndex: j, distance: distMat[i][j] });
  }

  return path.reverse();
}

function computePathLength(pts: Array<{ dx: number; dy: number }>): number {
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) {
    len += Math.hypot(pts[i].dx - pts[i - 1].dx, pts[i].dy - pts[i - 1].dy);
  }
  return len;
}

/**
 * Computes raw trajectory distance, direction agreement, IQR containment, and kinematic speed landmarks.
 * Does NOT compute any 0-100 accuracy score or pass/fail verdict.
 */
export function matchWristTrajectory(
  frames: NormalizedPoseFrame2D[],
  reference: ExpertStrikeReference
): TrajectoryMatchOutput | null {
  const allPoints = extractWristTrajectoryPoints(frames, reference.wristTrajectory.joint);
  if (allPoints.length < 4) {
    return null;
  }

  const activeUserPoints = extractActiveWindow(allPoints);
  const refSamples = reference.wristTrajectory.samples;
  const alignedPairs = computeDtwAlignment(activeUserPoints, refSamples);
  if (alignedPairs.length === 0) {
    return null;
  }

  const distances = alignedPairs.map((p) => p.distance);
  const sumDist = distances.reduce((acc, d) => acc + d, 0);
  const sumSq = distances.reduce((acc, d) => acc + d * d, 0);
  const dtwMeanDistance = sumDist / distances.length;
  const dtwMedianDistance = computeMedian(distances) ?? dtwMeanDistance;
  const dtwRmsDistance = Math.sqrt(sumSq / distances.length);
  const dtwMaxDistance = Math.max(...distances);

  // Path lengths in V2 median shoulder-width units
  const pathLengthUser = computePathLength(activeUserPoints);
  const pathLengthReference = computePathLength(
    refSamples.map((s) => ({ dx: s.dxMedian, dy: s.dyMedian }))
  );
  const pathLengthRatio =
    pathLengthReference > 1e-4 ? pathLengthUser / pathLengthReference : null;

  // Direction agreement along DTW-aligned steps where both user & ref move meaningfully
  const cosines: number[] = [];
  for (let k = 1; k < alignedPairs.length; k += 1) {
    const prevPair = alignedPairs[k - 1];
    const currPair = alignedPairs[k];

    const uPrev = activeUserPoints[prevPair.userIndex];
    const uCurr = activeUserPoints[currPair.userIndex];
    const rPrev = refSamples[prevPair.refIndex];
    const rCurr = refSamples[currPair.refIndex];

    const udx = uCurr.dx - uPrev.dx;
    const udy = uCurr.dy - uPrev.dy;
    const rdx = rCurr.dxMedian - rPrev.dxMedian;
    const rdy = rCurr.dyMedian - rPrev.dyMedian;

    const uMag = Math.hypot(udx, udy);
    const rMag = Math.hypot(rdx, rdy);
    if (uMag > 1e-3 && rMag > 1e-3) {
      const cos = Math.max(-1, Math.min(1, (udx * rdx + udy * rdy) / (uMag * rMag)));
      cosines.push(cos);
    }
  }

  const directionCosineMean =
    cosines.length > 0
      ? roundTo(cosines.reduce((acc, c) => acc + c, 0) / cosines.length, 4)
      : null;
  const directionAgreementFraction =
    cosines.length > 0
      ? roundTo(cosines.filter((c) => c >= 0.5).length / cosines.length, 4)
      : null;

  // Descriptive IQR containment (non-grading)
  let insideIqrCount = 0;
  for (const pair of alignedPairs) {
    const u = activeUserPoints[pair.userIndex];
    const r = refSamples[pair.refIndex];
    const inX = u.dx >= r.dxIqr[0] && u.dx <= r.dxIqr[1];
    const inY = u.dy >= r.dyIqr[0] && u.dy <= r.dyIqr[1];
    if (inX && inY) insideIqrCount += 1;
  }
  const iqrContainmentFraction = roundTo(insideIqrCount / alignedPairs.length, 4);

  // Kinematic speed peak (strictly kinematic, NOT confirmed physical impact)
  let peakPt = activeUserPoints[0];
  for (const pt of activeUserPoints) {
    if (pt.speedNormPerSec > peakPt.speedNormPerSec) {
      peakPt = pt;
    }
  }
  const activeStartMs = activeUserPoints[0].relativeTimeMs;
  const activeEndMs = activeUserPoints[activeUserPoints.length - 1].relativeTimeMs;
  const activeDurMs = activeEndMs - activeStartMs;
  const userPeakSpeedTimeNorm =
    activeDurMs > 0
      ? roundTo((peakPt.relativeTimeMs - activeStartMs) / activeDurMs, 4)
      : null;

  const refSpeedLandmark = reference.activityLandmarks.landmarks.find(
    (l) => l.id === 'kinematic_peak_speed'
  );
  const referencePeakSpeedTimeNorm = refSpeedLandmark
    ? refSpeedLandmark.normalizedTimeMedian
    : null;
  const timeOffsetNorm =
    userPeakSpeedTimeNorm !== null && referencePeakSpeedTimeNorm !== null
      ? roundTo(userPeakSpeedTimeNorm - referencePeakSpeedTimeNorm, 4)
      : null;

  return {
    metrics: {
      dtwMeanDistance: roundTo(dtwMeanDistance, 4),
      dtwMedianDistance: roundTo(dtwMedianDistance, 4),
      dtwRmsDistance: roundTo(dtwRmsDistance, 4),
      dtwMaxDistance: roundTo(dtwMaxDistance, 4),
      directionCosineMean,
      directionAgreementFraction,
      pathLengthUser: roundTo(pathLengthUser, 4),
      pathLengthReference: roundTo(pathLengthReference, 4),
      pathLengthRatio: pathLengthRatio !== null ? roundTo(pathLengthRatio, 4) : null,
      iqrContainmentFraction,
      userSampleCount: activeUserPoints.length,
      referenceSampleCount: refSamples.length,
      alignedPairCount: alignedPairs.length,
    },
    kinematicLandmarks: {
      userPeakWristSpeedNormPerSec: roundTo(peakPt.speedNormPerSec, 4),
      userPeakSpeedTimeNorm,
      userPeakSpeedFrameIndex: peakPt.frameIndex,
      referencePeakSpeedTimeNorm,
      timeOffsetNorm,
      isKinematicPeakOnly: true,
      note: 'Kinematic wrist-speed peak only; not a confirmed physical impact.',
    },
    alignedPairs,
    activeUserPoints,
  };
}

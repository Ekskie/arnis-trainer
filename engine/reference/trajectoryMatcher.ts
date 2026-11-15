import { computeMedian } from './poseNormalizer';
import {
  DtwConstraintSpec,
  ExpertStrikeReference,
  KinematicLandmarkComparison,
  MovementSegmentationConfig,
  MovementWindowSelection,
  NormalizedPoseFrame2D,
  NormalizedTrajectorySample,
  RawTrajectoryMetrics,
  SpeedPeakCandidate,
} from './referenceTypes';

/**
 * Experimental constrained-DTW maximum offset calibrated for a 50-point trajectory reference.
 * Not an empirically validated threshold.
 */
export const EXPERIMENTAL_DTW_MAX_OFFSET_AT_50 = 4;

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

export interface LinearAlignmentSummary {
  pairs: DtwAlignmentPair[];
  meanDistance: number;
  medianDistance: number;
  rmsDistance: number;
  maxDistance: number;
}

export interface TrajectoryMatchOptions {
  segmentation?: MovementSegmentationConfig;
  dtwMaxOffset?: number;
}

export interface TrajectoryMatchOutput {
  metrics: RawTrajectoryMetrics;
  kinematicLandmarks: KinematicLandmarkComparison;
  alignedPairs: DtwAlignmentPair[];
  activeUserPoints: WristTrajectoryPoint[];
  segmentation: MovementWindowSelection;
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
 * Finds all notable local wrist-speed maxima in chronological order.
 * Strictly kinematic candidates (never treated as confirmed strike impacts or assumed to be the target strike).
 */
export function detectKinematicSpeedPeaks(
  points: WristTrajectoryPoint[],
  minFractionOfGlobalPeak = 0.25
): SpeedPeakCandidate[] {
  if (points.length === 0) return [];
  const startMs = points[0].relativeTimeMs;
  const durMs = Math.max(1, points[points.length - 1].relativeTimeMs - startMs);

  let maxSpeed = 0;
  for (const p of points) {
    if (p.speedNormPerSec > maxSpeed) maxSpeed = p.speedNormPerSec;
  }
  if (maxSpeed <= 0.05) return [];

  const minThreshold = maxSpeed * minFractionOfGlobalPeak;
  const candidates: SpeedPeakCandidate[] = [];

  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1].speedNormPerSec;
    const curr = points[i].speedNormPerSec;
    const next = points[i + 1].speedNormPerSec;
    if (curr >= minThreshold && curr >= prev && curr > next) {
      candidates.push({
        frameIndex: points[i].frameIndex,
        relativeTimeMs: points[i].relativeTimeMs,
        normalizedTime: roundTo((points[i].relativeTimeMs - startMs) / durMs, 4),
        speedNormPerSec: roundTo(curr, 4),
        isKinematicCandidateOnly: true,
      });
    }
  }

  // Fallback for monotone ramp sequences ending at peak
  if (candidates.length === 0) {
    let bestIdx = 0;
    for (let i = 1; i < points.length; i += 1) {
      if (points[i].speedNormPerSec > points[bestIdx].speedNormPerSec) {
        bestIdx = i;
      }
    }
    candidates.push({
      frameIndex: points[bestIdx].frameIndex,
      relativeTimeMs: points[bestIdx].relativeTimeMs,
      normalizedTime: roundTo((points[bestIdx].relativeTimeMs - startMs) / durMs, 4),
      speedNormPerSec: roundTo(points[bestIdx].speedNormPerSec, 4),
      isKinematicCandidateOnly: true,
    });
  }

  return candidates;
}

/**
 * Explicit, inspectable, configurable movement window selector.
 * Defaults to 'full_captured' so early testing preserves preparatory, strike, and recovery phases.
 */
export function selectMovementWindow(
  points: WristTrajectoryPoint[],
  totalCapturedFrames: number,
  config: MovementSegmentationConfig = { mode: 'full_captured' }
): { selectedPoints: WristTrajectoryPoint[]; selection: MovementWindowSelection } {
  const candidateSpeedPeaks = detectKinematicSpeedPeaks(points);

  const buildMeta = (
    selected: WristTrajectoryPoint[],
    modeUsed: MovementSegmentationConfig['mode'],
    note: string
  ): MovementWindowSelection => ({
    mode: modeUsed,
    totalCapturedFrames,
    validWristPointCount: points.length,
    selectedPointCount: selected.length,
    selectedStartFrameIndex: selected.length > 0 ? selected[0].frameIndex : null,
    selectedEndFrameIndex: selected.length > 0 ? selected[selected.length - 1].frameIndex : null,
    selectedStartTimeMs: selected.length > 0 ? selected[0].relativeTimeMs : null,
    selectedEndTimeMs:
      selected.length > 0 ? selected[selected.length - 1].relativeTimeMs : null,
    candidateSpeedPeaks,
    note,
  });

  if (points.length === 0 || config.mode === 'full_captured') {
    return {
      selectedPoints: points,
      selection: buildMeta(
        points,
        'full_captured',
        'Preserved complete captured movement sequence without automatic peak trimming.'
      ),
    };
  }

  if (config.mode === 'explicit_frame_range') {
    const startFrame = config.startFrameIndex ?? points[0].frameIndex;
    const endFrame = config.endFrameIndex ?? points[points.length - 1].frameIndex;
    const filtered = points.filter(
      (p) => p.frameIndex >= startFrame && p.frameIndex <= endFrame
    );
    if (filtered.length >= 2) {
      return {
        selectedPoints: filtered,
        selection: buildMeta(
          filtered,
          'explicit_frame_range',
          `Explicit frame window [${startFrame}..${endFrame}] selected.`
        ),
      };
    }
    return {
      selectedPoints: points,
      selection: buildMeta(
        points,
        'explicit_frame_range',
        `Explicit frame range [${startFrame}..${endFrame}] yielded < 2 valid wrist frames; fell back to full captured sequence.`
      ),
    };
  }

  if (config.mode === 'explicit_time_range') {
    const startMs = config.startTimeMs ?? points[0].relativeTimeMs;
    const endMs = config.endTimeMs ?? points[points.length - 1].relativeTimeMs;
    const filtered = points.filter(
      (p) => p.relativeTimeMs >= startMs && p.relativeTimeMs <= endMs
    );
    if (filtered.length >= 2) {
      return {
        selectedPoints: filtered,
        selection: buildMeta(
          filtered,
          'explicit_time_range',
          `Explicit time window [${startMs}ms..${endMs}ms] selected.`
        ),
      };
    }
    return {
      selectedPoints: points,
      selection: buildMeta(
        points,
        'explicit_time_range',
        `Explicit time range [${startMs}ms..${endMs}ms] yielded < 2 valid wrist frames; fell back to full captured sequence.`
      ),
    };
  }

  // Opt-in 'speed_threshold_experimental' mode (never default; see Colab Findings #3 & #4)
  if (points.length <= 6) {
    return {
      selectedPoints: points,
      selection: buildMeta(
        points,
        'speed_threshold_experimental',
        'Sequence too short (<= 6 frames) for threshold trimming; preserved full captured sequence.'
      ),
    };
  }

  let peakSpeed = 0;
  for (const p of points) {
    if (p.speedNormPerSec > peakSpeed) peakSpeed = p.speedNormPerSec;
  }
  const fraction = config.speedFractionOfPeak ?? 0.15;
  const speedThreshold = peakSpeed * fraction;

  let firstActive = -1;
  let lastActive = -1;
  for (let i = 0; i < points.length; i += 1) {
    if (points[i].speedNormPerSec >= speedThreshold) {
      if (firstActive === -1) firstActive = i;
      lastActive = i;
    }
  }

  if (peakSpeed <= 0.05 || firstActive === -1 || lastActive - firstActive + 1 < 4) {
    return {
      selectedPoints: points,
      selection: buildMeta(
        points,
        'speed_threshold_experimental',
        'Speed-threshold window fell back to full captured sequence due to insufficient active span.'
      ),
    };
  }

  const startIdx = Math.max(0, firstActive - 2);
  const endIdx = Math.min(points.length - 1, lastActive + 2);
  const sliced = points.slice(startIdx, endIdx + 1);
  return {
    selectedPoints: sliced,
    selection: buildMeta(
      sliced,
      'speed_threshold_experimental',
      `Experimental speed-threshold span (>= ${(fraction * 100).toFixed(0)}% of max speed); inspect candidateSpeedPeaks for preparatory motions.`
    ),
  };
}

/**
 * Legacy helper alias retained for compatibility; defaults to opt-in speed threshold when called directly.
 */
export function extractActiveWindow(points: WristTrajectoryPoint[]): WristTrajectoryPoint[] {
  return selectMovementWindow(points, points.length, { mode: 'speed_threshold_experimental' })
    .selectedPoints;
}

/**
 * Computes linear time-normalized alignment baseline (without temporal warping).
 */
export function computeLinearAlignment(
  userPts: Array<{ dx: number; dy: number }>,
  refSamples: NormalizedTrajectorySample[]
): LinearAlignmentSummary {
  const n = userPts.length;
  const m = refSamples.length;
  if (n === 0 || m === 0) {
    return {
      pairs: [],
      meanDistance: 0,
      medianDistance: 0,
      rmsDistance: 0,
      maxDistance: 0,
    };
  }

  const pairs: DtwAlignmentPair[] = [];
  const distances: number[] = [];

  for (let i = 0; i < n; i += 1) {
    const u = n > 1 ? i / (n - 1) : 0;
    const exactRefPos = u * (m - 1);
    const lo = Math.floor(exactRefPos);
    const hi = Math.min(m - 1, Math.ceil(exactRefPos));
    const frac = exactRefPos - lo;

    const refDx = refSamples[lo].dxMedian * (1 - frac) + refSamples[hi].dxMedian * frac;
    const refDy = refSamples[lo].dyMedian * (1 - frac) + refSamples[hi].dyMedian * frac;
    const dist = Math.hypot(userPts[i].dx - refDx, userPts[i].dy - refDy);

    distances.push(dist);
    pairs.push({
      userIndex: i,
      refIndex: Math.round(exactRefPos),
      distance: dist,
    });
  }

  const sum = distances.reduce((acc, d) => acc + d, 0);
  const sumSq = distances.reduce((acc, d) => acc + d * d, 0);
  const meanDistance = sum / distances.length;
  const medianDistance = computeMedian(distances) ?? meanDistance;
  const rmsDistance = Math.sqrt(sumSq / distances.length);
  const maxDistance = Math.max(...distances);

  return {
    pairs,
    meanDistance,
    medianDistance,
    rmsDistance,
    maxDistance,
  };
}

/**
 * Constrained 2D Euclidean Dynamic Time Warping using a Sakoe-Chiba warping band
 * centered along the proportional diagonal jExpected = i * (m - 1) / (n - 1).
 */
export function computeConstrainedDtwAlignment(
  userPts: Array<{ dx: number; dy: number }>,
  refSamples: NormalizedTrajectorySample[],
  options: { maxOffset?: number } = {}
): { pairs: DtwAlignmentPair[]; constraint: DtwConstraintSpec } {
  const n = userPts.length;
  const m = refSamples.length;

  const requestedOffset =
    options.maxOffset !== undefined && Number.isFinite(options.maxOffset)
      ? Math.max(0, Math.round(options.maxOffset))
      : Math.max(1, Math.round((EXPERIMENTAL_DTW_MAX_OFFSET_AT_50 * m) / 50));

  if (n === 0 || m === 0) {
    return {
      pairs: [],
      constraint: {
        mode: 'sakoe_chiba_band',
        requestedOffsetPoints: requestedOffset,
        allowedOffsetPoints: requestedOffset,
        referencePoints: m,
        isExperimentalConfig: true,
      },
    };
  }

  // Ensure endpoints (0,0) -> (n-1, m-1) remain reachable if user sample count n << m
  let allowedOffset = requestedOffset;
  if (n > 1 && m > 1) {
    const stepJump = (m - 1) / (n - 1);
    const minReachableOffset = Math.ceil(stepJump / 2);
    if (allowedOffset < minReachableOffset) {
      allowedOffset = minReachableOffset;
    }
  } else if (n === 1 && m > 1) {
    allowedOffset = m - 1;
  }

  const dp: number[][] = Array.from({ length: n }, () => new Array(m).fill(Infinity));
  const distMat: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));

  const isInBand = (i: number, j: number): boolean => {
    if (n === 1) return true;
    const jExpected = ((m - 1) * i) / (n - 1);
    return Math.abs(j - jExpected) <= allowedOffset + 1e-9;
  };

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      if (!isInBand(i, j)) continue;
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
        const bestPrev = Math.min(top, left, diag);
        if (Number.isFinite(bestPrev)) {
          dp[i][j] = d + bestPrev;
        }
      }
    }
  }

  // Backtrack optimal constrained path from (n-1, m-1)
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

  return {
    pairs: path.reverse(),
    constraint: {
      mode: 'sakoe_chiba_band',
      requestedOffsetPoints: requestedOffset,
      allowedOffsetPoints: allowedOffset,
      referencePoints: m,
      isExperimentalConfig: true,
    },
  };
}

/**
 * Constrained 2D Euclidean DTW convenience helper returning alignment pairs.
 */
export function computeDtwAlignment(
  userPts: Array<{ dx: number; dy: number }>,
  refSamples: NormalizedTrajectorySample[],
  options: { maxOffset?: number } = {}
): DtwAlignmentPair[] {
  return computeConstrainedDtwAlignment(userPts, refSamples, options).pairs;
}

function computePathLength(pts: Array<{ dx: number; dy: number }>): number {
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) {
    len += Math.hypot(pts[i].dx - pts[i - 1].dx, pts[i].dy - pts[i - 1].dy);
  }
  return len;
}

/**
 * Computes raw constrained-DTW & linear-alignment distances, timing distortion,
 * direction agreement, IQR containment, and inspectable kinematic speed landmarks.
 * Does NOT compute any 0-100 accuracy score or pass/fail verdict.
 */
export function matchWristTrajectory(
  frames: NormalizedPoseFrame2D[],
  reference: ExpertStrikeReference,
  options: TrajectoryMatchOptions = {}
): TrajectoryMatchOutput | null {
  const allPoints = extractWristTrajectoryPoints(frames, reference.wristTrajectory.joint);
  const { selectedPoints: activeUserPoints, selection: segmentation } =
    selectMovementWindow(allPoints, frames.length, options.segmentation);

  if (activeUserPoints.length < 4) {
    return null;
  }

  const refSamples = reference.wristTrajectory.samples;
  const { pairs: alignedPairs, constraint: dtwConstraint } = computeConstrainedDtwAlignment(
    activeUserPoints,
    refSamples,
    { maxOffset: options.dtwMaxOffset }
  );
  if (alignedPairs.length === 0) {
    return null;
  }

  const linearSummary = computeLinearAlignment(activeUserPoints, refSamples);

  const distances = alignedPairs.map((p) => p.distance);
  const sumDist = distances.reduce((acc, d) => acc + d, 0);
  const sumSq = distances.reduce((acc, d) => acc + d * d, 0);
  const dtwMeanDistance = sumDist / distances.length;
  const dtwMedianDistance = computeMedian(distances) ?? dtwMeanDistance;
  const dtwRmsDistance = Math.sqrt(sumSq / distances.length);
  const dtwMaxDistance = Math.max(...distances);

  // Timing distortion along constrained DTW path relative to linear proportional phase
  const activeCount = activeUserPoints.length;
  const refCount = refSamples.length;
  let distortionNormSum = 0;
  let distortionNormMax = 0;
  let distortionRefPtsSum = 0;
  let distortionRefPtsMax = 0;

  for (const pair of alignedPairs) {
    const uUser = activeCount > 1 ? pair.userIndex / (activeCount - 1) : 0;
    const uRef = refCount > 1 ? pair.refIndex / (refCount - 1) : 0;
    const shiftNorm = Math.abs(uUser - uRef);
    const shiftRefPts = Math.abs(pair.refIndex - uUser * Math.max(0, refCount - 1));
    distortionNormSum += shiftNorm;
    distortionRefPtsSum += shiftRefPts;
    if (shiftNorm > distortionNormMax) distortionNormMax = shiftNorm;
    if (shiftRefPts > distortionRefPtsMax) distortionRefPtsMax = shiftRefPts;
  }

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

  // Kinematic speed peak inside selected window (strictly kinematic, NOT confirmed physical impact)
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
      linearMeanDistance: roundTo(linearSummary.meanDistance, 4),
      linearMedianDistance: roundTo(linearSummary.medianDistance, 4),
      linearRmsDistance: roundTo(linearSummary.rmsDistance, 4),
      linearMaxDistance: roundTo(linearSummary.maxDistance, 4),
      dtwConstraint,
      warpingPathLength: alignedPairs.length,
      timingDistortionMeanNorm: roundTo(distortionNormSum / alignedPairs.length, 4),
      timingDistortionMaxNorm: roundTo(distortionNormMax, 4),
      timingDistortionMeanRefPoints: roundTo(distortionRefPtsSum / alignedPairs.length, 4),
      timingDistortionMaxRefPoints: roundTo(distortionRefPtsMax, 4),
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
    segmentation,
  };
}

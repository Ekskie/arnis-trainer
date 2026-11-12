import { normalizePoseSequenceV2 } from './poseNormalizer';
import { getExpertReference, normalizeStrikeId } from './referenceLoader';
import {
  AlphaPoseCompatibleAngles2D,
  ExpertStrikeReference,
  JointComparison2D,
  MeasurementCoverageReport,
  NormalizedPoseFrame2D,
  Raw2DPoseFrame,
  ShadowEvaluationReport,
} from './referenceTypes';
import { DtwAlignmentPair, matchWristTrajectory, WristTrajectoryPoint } from './trajectoryMatcher';

export interface ShadowEvaluateOptions {
  /** Optional explicit reference (e.g., for unit tests or offline dataset cross-validation). */
  referenceOverride?: ExpertStrikeReference;
  /** Optional neutral pre-strike frames for fallback fixed shoulder-width estimation. */
  calibrationFrames?: Raw2DPoseFrame[];
}

function roundTo(val: number, decimals = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export function computeMeasurementCoverage(
  frames: NormalizedPoseFrame2D[]
): MeasurementCoverageReport {
  const totalFrames = frames.length;
  if (totalFrames === 0) {
    return {
      totalFrames: 0,
      validNormalizedFrames: 0,
      validFrameRatio: 0,
      facingOrientationConsistentRatio: null,
      jointCoverage: {
        rightWrist: 0,
        rightElbow: 0,
        rightShoulder: 0,
        leftWrist: 0,
        leftElbow: 0,
        leftShoulder: 0,
        rightKnee: 0,
        leftKnee: 0,
      },
    };
  }

  let validNormalizedFrames = 0;
  let orientationTotal = 0;
  let orientationConsistent = 0;
  const counts = {
    rightWrist: 0,
    rightElbow: 0,
    rightShoulder: 0,
    leftWrist: 0,
    leftElbow: 0,
    leftShoulder: 0,
    rightKnee: 0,
    leftKnee: 0,
  };

  for (const frame of frames) {
    if (frame.originPx && frame.shoulderWidthPx) {
      validNormalizedFrames += 1;
    }
    if (frame.facingOrientationConsistent !== null) {
      orientationTotal += 1;
      if (frame.facingOrientationConsistent) orientationConsistent += 1;
    }
    if (frame.points.rightWrist) counts.rightWrist += 1;
    if (frame.points.rightElbow) counts.rightElbow += 1;
    if (frame.points.rightShoulder) counts.rightShoulder += 1;
    if (frame.points.leftWrist) counts.leftWrist += 1;
    if (frame.points.leftElbow) counts.leftElbow += 1;
    if (frame.points.leftShoulder) counts.leftShoulder += 1;
    if (frame.points.rightKnee) counts.rightKnee += 1;
    if (frame.points.leftKnee) counts.leftKnee += 1;
  }

  return {
    totalFrames,
    validNormalizedFrames,
    validFrameRatio: roundTo(validNormalizedFrames / totalFrames),
    facingOrientationConsistentRatio:
      orientationTotal > 0 ? roundTo(orientationConsistent / orientationTotal) : null,
    jointCoverage: {
      rightWrist: roundTo(counts.rightWrist / totalFrames),
      rightElbow: roundTo(counts.rightElbow / totalFrames),
      rightShoulder: roundTo(counts.rightShoulder / totalFrames),
      leftWrist: roundTo(counts.leftWrist / totalFrames),
      leftElbow: roundTo(counts.leftElbow / totalFrames),
      leftShoulder: roundTo(counts.leftShoulder / totalFrames),
      rightKnee: roundTo(counts.rightKnee / totalFrames),
      leftKnee: roundTo(counts.leftKnee / totalFrames),
    },
  };
}

function getAngle2DByName(
  angles: AlphaPoseCompatibleAngles2D,
  jointName: string
): number | null {
  switch (jointName) {
    case 'rightElbow':
      return angles.rightElbow;
    case 'leftElbow':
      return angles.leftElbow;
    case 'rightShoulder':
      return angles.rightShoulder;
    case 'leftShoulder':
      return angles.leftShoulder;
    case 'rightKnee':
      return angles.rightKnee;
    case 'leftKnee':
      return angles.leftKnee;
    default:
      return null;
  }
}

function resolveUserFrameForPhase(
  phaseName: string,
  reference: ExpertStrikeReference,
  alignedPairs: DtwAlignmentPair[],
  activePoints: WristTrajectoryPoint[],
  peakSpeedFrameIndex: number | null
): number | null {
  if (phaseName === 'kinematic_peak_speed' && peakSpeedFrameIndex !== null) {
    return peakSpeedFrameIndex;
  }

  const landmark = reference.activityLandmarks.landmarks.find((l) => l.id === phaseName);
  const targetU = landmark ? landmark.normalizedTimeMedian : phaseName === 'onset' ? 0 : 0.5;
  const refSamples = reference.wristTrajectory.samples;
  if (refSamples.length === 0 || alignedPairs.length === 0) return null;

  let closestRefIdx = 0;
  let bestUDiff = Infinity;
  refSamples.forEach((s, idx) => {
    const diff = Math.abs(s.u - targetU);
    if (diff < bestUDiff) {
      bestUDiff = diff;
      closestRefIdx = idx;
    }
  });

  const matchingPairs = alignedPairs.filter((p) => p.refIndex === closestRefIdx);
  if (matchingPairs.length === 0) return null;
  const chosen = matchingPairs[Math.floor(matchingPairs.length / 2)];
  return activePoints[chosen.userIndex]?.frameIndex ?? null;
}

/**
 * Runs non-grading shadow evaluation against an offline AlphaPose expert reference.
 * - Never alters baseline scores, XP, curriculum unlock, or feedback rules.
 * - Never outputs a 0-100 accuracy score.
 * - Never treats wrist-speed events as confirmed physical impacts.
 * - Never treats provisional joint measurements (e.g., Strike 1 elbow angles) as validated standards.
 */
export function evaluateShadowReference(
  strikeId: string,
  rawFrames: Raw2DPoseFrame[],
  options: ShadowEvaluateOptions = {}
): ShadowEvaluationReport {
  const normId = normalizeStrikeId(strikeId) ?? strikeId;
  const reference = options.referenceOverride ?? getExpertReference(normId);

  if (!reference) {
    const fallbackNormalized = normalizePoseSequenceV2(rawFrames, {
      coordinateConvention: 'anatomical_mirrored_2d',
      calibrationFrames: options.calibrationFrames,
    });
    return {
      strikeId: normId,
      referenceStatus: 'no_reference_loaded',
      isNonGradingShadow: true,
      normalizationMeta: fallbackNormalized.metadata,
      measurementCoverage: computeMeasurementCoverage(fallbackNormalized.frames),
      trajectoryMetrics: null,
      kinematicLandmarks: null,
      jointComparisons2D: [],
      notes: [
        `No exported expert JSON reference is loaded for ${normId}. Baseline rules evaluation remains active.`,
      ],
    };
  }

  const normalized = normalizePoseSequenceV2(rawFrames, {
    coordinateConvention: reference.normalization.coordinateConvention,
    minKeypointConfidence: reference.normalization.minKeypointConfidence,
    calibrationFrames: options.calibrationFrames,
  });

  const coverage = computeMeasurementCoverage(normalized.frames);
  const match = matchWristTrajectory(normalized.frames, reference);

  if (!match || normalized.metadata.fixedMedianShoulderWidthPx === null) {
    return {
      strikeId: reference.strikeId,
      referenceStatus: 'insufficient_coverage',
      isNonGradingShadow: true,
      referenceProvenance: reference.provenance,
      normalizationMeta: normalized.metadata,
      measurementCoverage: coverage,
      trajectoryMetrics: null,
      kinematicLandmarks: null,
      jointComparisons2D: [],
      notes: [
        'Insufficient valid 2D wrist or shoulder-width samples to run shadow trajectory alignment.',
      ],
    };
  }

  const jointComparisons2D: JointComparison2D[] = [];
  for (const [jointName, spec] of Object.entries(reference.bodyJointMeasurements)) {
    const warnings = spec.warnings ? [...spec.warnings] : [];
    const isValidatedReference = spec.reliabilityStatus === 'verified';

    if (spec.reliabilityStatus === 'excluded') {
      jointComparisons2D.push({
        jointName,
        phase: 'all',
        reliabilityStatus: 'excluded',
        isValidatedReference: false,
        warnings,
        exclusionReason: spec.exclusionReason ?? 'Excluded by dataset quality filter',
        actualAngle2D: null,
        referenceMedian2D: null,
        deltaFromMedianDeg: null,
        withinReferenceIqr: null,
        withinReferenceP10P90: null,
      });
      continue;
    }

    for (const [phaseName, quantiles] of Object.entries(spec.phases)) {
      const frameIdx = resolveUserFrameForPhase(
        phaseName,
        reference,
        match.alignedPairs,
        match.activeUserPoints,
        match.kinematicLandmarks.userPeakSpeedFrameIndex
      );
      const actualAngle2D =
        frameIdx !== null && normalized.frames[frameIdx]
          ? getAngle2DByName(normalized.frames[frameIdx].angles2D, jointName)
          : null;

      const deltaFromMedianDeg =
        actualAngle2D !== null ? roundTo(actualAngle2D - quantiles.median, 2) : null;
      const withinReferenceIqr =
        actualAngle2D !== null
          ? actualAngle2D >= quantiles.p25 && actualAngle2D <= quantiles.p75
          : null;
      const withinReferenceP10P90 =
        actualAngle2D !== null
          ? actualAngle2D >= quantiles.p10 && actualAngle2D <= quantiles.p90
          : null;

      jointComparisons2D.push({
        jointName,
        phase: phaseName,
        reliabilityStatus: spec.reliabilityStatus,
        isValidatedReference,
        warnings,
        actualAngle2D,
        referenceMedian2D: quantiles.median,
        deltaFromMedianDeg,
        withinReferenceIqr,
        withinReferenceP10P90,
      });
    }
  }

  const notes: string[] = [
    'Shadow evaluation only: official score, XP, pass/fail, and coach feedback use the baseline rules evaluator.',
    '2D AlphaPose-compatible angles are computed strictly in aspect-corrected image space and separated from MediaPipe 3D angles.',
  ];
  if (
    coverage.facingOrientationConsistentRatio !== null &&
    coverage.facingOrientationConsistentRatio < 0.8
  ) {
    notes.push(
      `Warning: facing-camera anatomical shoulder orientation consistency was ${(
        coverage.facingOrientationConsistentRatio * 100
      ).toFixed(0)}%.`
    );
  }

  return {
    strikeId: reference.strikeId,
    referenceStatus: 'evaluated',
    isNonGradingShadow: true,
    referenceProvenance: reference.provenance,
    normalizationMeta: normalized.metadata,
    measurementCoverage: coverage,
    trajectoryMetrics: match.metrics,
    kinematicLandmarks: match.kinematicLandmarks,
    jointComparisons2D,
    notes,
  };
}

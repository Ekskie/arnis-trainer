import { computeMedian, normalizePoseSequenceV2 } from './poseNormalizer';
import { evaluateShadowReference } from './shadowEvaluator';
import {
  CoordinateConvention,
  ExpertStrikeReference,
  MovementSegmentationConfig,
  PoseSamplingStats,
  Raw2DPoseFrame,
  ResearchCaptureSession,
  ResearchCoordinateConventions,
  ShadowEvaluationReport,
} from './referenceTypes';

export const RESEARCH_CAPTURE_COORDINATE_EXPLANATION =
  'WebView live preview flips video and overlay horizontally for selfie convenience (mirrored_selfie_display). Captured raw landmarks (raw_unmirrored_normalized) come directly from unmirrored MediaPipe image coordinates; normalized V2 output uses the configured pose convention (default unmirrored_image_2d matching original AlphaPose exports).';

export interface BuildResearchCaptureParams {
  consentGranted: boolean;
  consentedAt: string | null;
  strikeId: string;
  strikeNumber: number;
  strikeName: string;
  practiceMode: 'follow' | 'guided' | 'test' | 'research_manual';
  rawFrames: Raw2DPoseFrame[];
  calibrationFrames?: Raw2DPoseFrame[];
  poseCoordinateConvention?: CoordinateConvention;
  segmentation?: MovementSegmentationConfig;
  dtwMaxOffset?: number;
  referenceOverride?: ExpertStrikeReference;
  existingShadowReport?: ShadowEvaluationReport | null;
  captureId?: string;
}

function roundTo(val: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Computes frame-rate and timestamp interval telemetry across captured WebView bridge frames.
 */
export function computePoseSamplingStats(
  rawFrames: Raw2DPoseFrame[],
  calibrationFrames: Raw2DPoseFrame[] = [],
  bridgeThrottleTargetMs = 55
): PoseSamplingStats {
  if (rawFrames.length === 0) {
    return {
      capturedFrameCount: 0,
      calibrationFrameCount: calibrationFrames.length,
      firstTimestampMs: null,
      lastTimestampMs: null,
      durationMs: 0,
      effectiveFps: null,
      medianFrameIntervalMs: null,
      minFrameIntervalMs: null,
      maxFrameIntervalMs: null,
      droppedGapCount: 0,
      bridgeThrottleTargetMs,
    };
  }

  const firstTs = rawFrames[0].timestampMs;
  const lastTs = rawFrames[rawFrames.length - 1].timestampMs;
  const durationMs = Math.max(0, lastTs - firstTs);

  const intervals: number[] = [];
  let droppedGapCount = 0;
  for (let i = 1; i < rawFrames.length; i += 1) {
    const dt = Math.max(0, rawFrames[i].timestampMs - rawFrames[i - 1].timestampMs);
    intervals.push(dt);
    if (dt > 120) {
      droppedGapCount += 1;
    }
  }

  const medianInterval = computeMedian(intervals);
  const minInterval = intervals.length > 0 ? Math.min(...intervals) : null;
  const maxInterval = intervals.length > 0 ? Math.max(...intervals) : null;
  const effectiveFps =
    rawFrames.length >= 2 && durationMs > 0
      ? roundTo(((rawFrames.length - 1) * 1000) / durationMs, 2)
      : null;

  return {
    capturedFrameCount: rawFrames.length,
    calibrationFrameCount: calibrationFrames.length,
    firstTimestampMs: firstTs,
    lastTimestampMs: lastTs,
    durationMs,
    effectiveFps,
    medianFrameIntervalMs: medianInterval !== null ? roundTo(medianInterval, 2) : null,
    minFrameIntervalMs: minInterval !== null ? roundTo(minInterval, 2) : null,
    maxFrameIntervalMs: maxInterval !== null ? roundTo(maxInterval, 2) : null,
    droppedGapCount,
    bridgeThrottleTargetMs,
  };
}

/**
 * Builds a self-contained local research capture bundle containing raw 2D landmarks,
 * V2 normalized frames, sampling diagnostics, movement window boundaries, and non-grading shadow report.
 * Enforces explicit user consent.
 */
export function buildResearchCaptureSession(
  params: BuildResearchCaptureParams
): ResearchCaptureSession {
  if (!params.consentGranted) {
    throw new Error(
      'Explicit user consent is required before assembling or exporting a research pose capture.'
    );
  }

  const calFrames = params.calibrationFrames ?? [];
  const requestedConvention: CoordinateConvention =
    params.poseCoordinateConvention ??
    params.referenceOverride?.normalization.coordinateConvention ??
    'unmirrored_image_2d';

  const shadowEvaluation =
    params.existingShadowReport ??
    evaluateShadowReference(params.strikeId, params.rawFrames, {
      referenceOverride: params.referenceOverride,
      calibrationFrames: calFrames,
      coordinateConvention: requestedConvention,
      segmentation: params.segmentation ?? { mode: 'full_captured' },
      dtwMaxOffset: params.dtwMaxOffset,
    });

  const activeConvention = shadowEvaluation.normalizationMeta.coordinateConvention;
  const minConf = params.referenceOverride?.normalization.minKeypointConfidence ?? 0.4;
  const normalizedPoseV2 = normalizePoseSequenceV2(params.rawFrames, {
    coordinateConvention: activeConvention,
    minKeypointConfidence: minConf,
    calibrationFrames: calFrames,
  });

  const rawSpace =
    params.rawFrames[0]?.coordinateSpace ?? 'raw_unmirrored_normalized';
  const coordinateConventions: ResearchCoordinateConventions = {
    cameraPreviewDisplay: 'mirrored_selfie_display',
    rawPoseCoordinateSpace: rawSpace,
    normalizedPoseCoordinateConvention: activeConvention,
    snapshotExportConvention: 'unmirrored_image_2d',
    explanation: RESEARCH_CAPTURE_COORDINATE_EXPLANATION,
  };

  const movementWindow = shadowEvaluation.movementWindow ?? {
    mode: params.segmentation?.mode ?? 'full_captured',
    totalCapturedFrames: params.rawFrames.length,
    validWristPointCount: 0,
    selectedPointCount: 0,
    selectedStartFrameIndex: null,
    selectedEndFrameIndex: null,
    selectedStartTimeMs: null,
    selectedEndTimeMs: null,
    candidateSpeedPeaks: [],
    note: 'No movement window computed.',
  };

  const createdAt = new Date().toISOString();
  const captureId =
    params.captureId ??
    `cap_${params.strikeId}_${Date.now()}`;

  return {
    schemaVersion: '1.0.0-research-capture',
    captureId,
    createdAt,
    consentGranted: true,
    consentedAt: params.consentedAt ?? createdAt,
    localOnly: true,
    isNonGradingResearch: true,
    selectedStrikeId: params.strikeId,
    selectedStrikeNumber: params.strikeNumber,
    selectedStrikeName: params.strikeName,
    practiceMode: params.practiceMode,
    coordinateConventions,
    samplingStats: computePoseSamplingStats(params.rawFrames, calFrames),
    movementWindow,
    calibrationFramesRaw2D: calFrames,
    rawPoseFrames2D: params.rawFrames,
    normalizedPoseV2,
    shadowEvaluation,
  };
}

/**
 * Contract types for offline AlphaPose expert movement references and
 * non-grading shadow evaluation against live 2D MediaPipe pose frames.
 */

export type StrikeId =
  | 'strike_1'
  | 'strike_2'
  | 'strike_3'
  | 'strike_4'
  | 'strike_5'
  | 'strike_6'
  | 'strike_7'
  | 'strike_8'
  | 'strike_9'
  | 'strike_10'
  | 'strike_11'
  | 'strike_12';

/**
 * Explicit horizontal sign convention in aspect-corrected 2D space:
 * - 'anatomical_mirrored_2d': +x = practitioner's anatomical right when facing front camera, +y = downward.
 * - 'unmirrored_image_2d': +x = viewer's right (practitioner's anatomical left when facing front camera), +y = downward.
 */
export type CoordinateConvention = 'anatomical_mirrored_2d' | 'unmirrored_image_2d';

export type JointReliabilityStatus = 'verified' | 'provisional' | 'excluded';

export type ActivityLandmarkId =
  | 'onset'
  | 'chamber_peak'
  | 'kinematic_peak_speed'
  | 'turning_point'
  | 'follow_through_end'
  | 'recovery';

export interface ExpertReferenceProvenance {
  poseBackend: 'AlphaPose';
  keypointFormat: 'COCO-17';
  cleanedDatasetVersion: string;
  demoCount: number;
  frameCount: number;
  exportedAt?: string;
  sourceVideos?: string[];
  notes?: string;
}

export interface ExpertReferenceCaptureContext {
  cameraView: 'front';
  footwork: 'without_footwork' | 'with_footwork';
  handedness: 'right' | 'left';
  nominalFps: number;
}

export interface ExpertReferenceNormalization {
  normalizationVersion: 'v2_median_shoulder_width';
  coordinateConvention: CoordinateConvention;
  origin: 'shoulder_midpoint';
  scaleBasis: 'fixed_median_shoulder_width_per_demo';
  angleDimension: '2d';
  minKeypointConfidence: number;
}

export interface ActivityLandmarkSpec {
  id: ActivityLandmarkId;
  label: string;
  normalizedTimeMedian: number;
  normalizedTimeRange: [number, number];
  wristPosMedian: {
    dx: number;
    dy: number;
  };
  /** Must remain true: speed/extrema peaks are kinematic landmarks, not physical impact confirmations. */
  isKinematicLandmarkOnly: true;
}

export interface ExpertActivityLandmarks {
  medianDurationMs: number;
  iqrDurationMs: [number, number];
  landmarks: ActivityLandmarkSpec[];
}

export interface NormalizedTrajectorySample {
  u: number;
  dxMedian: number;
  dyMedian: number;
  dxIqr: [number, number];
  dyIqr: [number, number];
  speedMedian?: number;
  directionUnit?: {
    ux: number;
    uy: number;
  };
}

export interface ExpertWristTrajectory {
  joint: 'right_wrist' | 'left_wrist';
  resampleCount: number;
  samples: NormalizedTrajectorySample[];
}

export interface JointAngleQuantiles2D {
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
}

export interface QualityFilteredJointSpec {
  reliabilityStatus: JointReliabilityStatus;
  warnings?: string[];
  exclusionReason?: string;
  cocoKeypoints?: [number, number, number];
  sampleCount: number;
  phases: Record<string, JointAngleQuantiles2D>;
}

export interface ExpertStrikeReference {
  schemaVersion: '1.0.0';
  strikeId: StrikeId;
  strikeNumber: number;
  name?: string;
  provenance: ExpertReferenceProvenance;
  captureContext: ExpertReferenceCaptureContext;
  normalization: ExpertReferenceNormalization;
  activityLandmarks: ExpertActivityLandmarks;
  wristTrajectory: ExpertWristTrajectory;
  bodyJointMeasurements: Record<string, QualityFilteredJointSpec>;
}

/**
 * Raw 2D pose sample bridged from WebView MediaPipe (or offline AlphaPose test fixtures).
 * Kept strictly separate from MediaPipe 3D angles.
 */
export interface Raw2DLandmarkPoint {
  x: number;
  y: number;
  visibility: number;
}

export interface Raw2DPoseLandmarks {
  nose?: Raw2DLandmarkPoint;
  leftShoulder?: Raw2DLandmarkPoint;
  rightShoulder?: Raw2DLandmarkPoint;
  leftElbow?: Raw2DLandmarkPoint;
  rightElbow?: Raw2DLandmarkPoint;
  leftWrist?: Raw2DLandmarkPoint;
  rightWrist?: Raw2DLandmarkPoint;
  leftHip?: Raw2DLandmarkPoint;
  rightHip?: Raw2DLandmarkPoint;
  leftKnee?: Raw2DLandmarkPoint;
  rightKnee?: Raw2DLandmarkPoint;
  leftAnkle?: Raw2DLandmarkPoint;
  rightAnkle?: Raw2DLandmarkPoint;
}

export interface Raw2DPoseFrame {
  timestampMs: number;
  frameWidth: number;
  frameHeight: number;
  source: 'mediapipe_2d' | 'alphapose_2d';
  coordinateSpace: 'raw_unmirrored_normalized' | 'pixel_unmirrored';
  landmarks: Raw2DPoseLandmarks;
}

/**
 * Pure 2D aspect-corrected AlphaPose-compatible joint angles (degrees).
 * Never mixed with MediaPipe 3D angles.
 */
export interface AlphaPoseCompatibleAngles2D {
  rightElbow: number | null;
  leftElbow: number | null;
  rightShoulder: number | null;
  leftShoulder: number | null;
  rightKnee: number | null;
  leftKnee: number | null;
}

export interface NormalizedPoint2D {
  dx: number;
  dy: number;
  visibility: number;
}

export interface NormalizedPoseFrame2D {
  timestampMs: number;
  relativeTimeMs: number;
  shoulderWidthPx: number | null;
  originPx: { x: number; y: number } | null;
  facingOrientationConsistent: boolean | null;
  points: {
    leftShoulder?: NormalizedPoint2D;
    rightShoulder?: NormalizedPoint2D;
    leftElbow?: NormalizedPoint2D;
    rightElbow?: NormalizedPoint2D;
    leftWrist?: NormalizedPoint2D;
    rightWrist?: NormalizedPoint2D;
    leftHip?: NormalizedPoint2D;
    rightHip?: NormalizedPoint2D;
    leftKnee?: NormalizedPoint2D;
    rightKnee?: NormalizedPoint2D;
    leftAnkle?: NormalizedPoint2D;
    rightAnkle?: NormalizedPoint2D;
  };
  angles2D: AlphaPoseCompatibleAngles2D;
}

export interface NormalizationMetadataV2 {
  normalizationVersion: 'v2_median_shoulder_width';
  coordinateConvention: CoordinateConvention;
  fixedMedianShoulderWidthPx: number | null;
  shoulderWidthSampleCount: number;
  shoulderWidthIqrPx: [number, number] | null;
  scaleSource: 'recording_window_median' | 'calibration_median_fallback' | 'unavailable';
  aspectRatio: number | null;
}

export interface MeasurementCoverageReport {
  totalFrames: number;
  validNormalizedFrames: number;
  validFrameRatio: number;
  facingOrientationConsistentRatio: number | null;
  jointCoverage: {
    rightWrist: number;
    rightElbow: number;
    rightShoulder: number;
    leftWrist: number;
    leftElbow: number;
    leftShoulder: number;
    rightKnee: number;
    leftKnee: number;
  };
}

export type MovementSegmentationMode =
  | 'full_captured'
  | 'explicit_frame_range'
  | 'explicit_time_range'
  | 'speed_threshold_experimental';

export interface MovementSegmentationConfig {
  mode: MovementSegmentationMode;
  startFrameIndex?: number;
  endFrameIndex?: number;
  startTimeMs?: number;
  endTimeMs?: number;
  speedFractionOfPeak?: number;
}

export interface SpeedPeakCandidate {
  frameIndex: number;
  relativeTimeMs: number;
  normalizedTime: number;
  speedNormPerSec: number;
  /** Always true: speed peaks are kinematic candidates only, not confirmed physical impacts. */
  isKinematicCandidateOnly: true;
}

export interface MovementWindowSelection {
  mode: MovementSegmentationMode;
  totalCapturedFrames: number;
  validWristPointCount: number;
  selectedPointCount: number;
  selectedStartFrameIndex: number | null;
  selectedEndFrameIndex: number | null;
  selectedStartTimeMs: number | null;
  selectedEndTimeMs: number | null;
  candidateSpeedPeaks: SpeedPeakCandidate[];
  note: string;
}

export interface DtwConstraintSpec {
  mode: 'sakoe_chiba_band';
  requestedOffsetPoints: number;
  allowedOffsetPoints: number;
  referencePoints: number;
  /** Always true while DTW offset constraints remain under experimental calibration. */
  isExperimentalConfig: true;
}

export interface RawTrajectoryMetrics {
  dtwMeanDistance: number;
  dtwMedianDistance: number;
  dtwRmsDistance: number;
  dtwMaxDistance: number;
  linearMeanDistance: number;
  linearMedianDistance: number;
  linearRmsDistance: number;
  linearMaxDistance: number;
  dtwConstraint: DtwConstraintSpec;
  warpingPathLength: number;
  timingDistortionMeanNorm: number;
  timingDistortionMaxNorm: number;
  timingDistortionMeanRefPoints: number;
  timingDistortionMaxRefPoints: number;
  directionCosineMean: number | null;
  directionAgreementFraction: number | null;
  pathLengthUser: number;
  pathLengthReference: number;
  pathLengthRatio: number | null;
  iqrContainmentFraction: number;
  userSampleCount: number;
  referenceSampleCount: number;
  alignedPairCount: number;
}

export interface KinematicLandmarkComparison {
  userPeakWristSpeedNormPerSec: number | null;
  userPeakSpeedTimeNorm: number | null;
  userPeakSpeedFrameIndex: number | null;
  referencePeakSpeedTimeNorm: number | null;
  timeOffsetNorm: number | null;
  isKinematicPeakOnly: true;
  note: string;
}

export interface JointComparison2D {
  jointName: string;
  phase: string;
  reliabilityStatus: JointReliabilityStatus;
  isValidatedReference: boolean;
  warnings: string[];
  exclusionReason?: string;
  actualAngle2D: number | null;
  referenceMedian2D: number | null;
  deltaFromMedianDeg: number | null;
  withinReferenceIqr: boolean | null;
  withinReferenceP10P90: boolean | null;
}

export type ShadowReferenceStatus =
  | 'evaluated'
  | 'no_reference_loaded'
  | 'insufficient_coverage';

/**
 * Non-grading shadow evaluation output. Contains raw distances, direction agreement,
 * measurement coverage, kinematic speed landmarks, movement window diagnostics, and 2D joint comparisons only.
 */
export interface ShadowEvaluationReport {
  strikeId: string;
  referenceStatus: ShadowReferenceStatus;
  isNonGradingShadow: true;
  referenceProvenance?: ExpertReferenceProvenance;
  normalizationMeta: NormalizationMetadataV2;
  measurementCoverage: MeasurementCoverageReport;
  movementWindow?: MovementWindowSelection;
  trajectoryMetrics: RawTrajectoryMetrics | null;
  kinematicLandmarks: KinematicLandmarkComparison | null;
  jointComparisons2D: JointComparison2D[];
  notes: string[];
}

export interface PoseSamplingStats {
  capturedFrameCount: number;
  calibrationFrameCount: number;
  firstTimestampMs: number | null;
  lastTimestampMs: number | null;
  durationMs: number;
  effectiveFps: number | null;
  medianFrameIntervalMs: number | null;
  minFrameIntervalMs: number | null;
  maxFrameIntervalMs: number | null;
  droppedGapCount: number;
  bridgeThrottleTargetMs: number;
}

export interface ResearchCoordinateConventions {
  cameraPreviewDisplay: 'mirrored_selfie_display';
  rawPoseCoordinateSpace: 'raw_unmirrored_normalized' | 'pixel_unmirrored';
  normalizedPoseCoordinateConvention: CoordinateConvention;
  snapshotExportConvention: 'unmirrored_image_2d';
  explanation: string;
}

export interface ResearchCaptureSession {
  schemaVersion: '1.0.0-research-capture';
  captureId: string;
  createdAt: string;
  consentGranted: true;
  consentedAt: string;
  localOnly: true;
  isNonGradingResearch: true;
  selectedStrikeId: string;
  selectedStrikeNumber: number;
  selectedStrikeName: string;
  practiceMode: 'follow' | 'guided' | 'test' | 'research_manual';
  coordinateConventions: ResearchCoordinateConventions;
  samplingStats: PoseSamplingStats;
  movementWindow: MovementWindowSelection;
  calibrationFramesRaw2D: Raw2DPoseFrame[];
  rawPoseFrames2D: Raw2DPoseFrame[];
  normalizedPoseV2: {
    metadata: NormalizationMetadataV2;
    frames: NormalizedPoseFrame2D[];
  };
  shadowEvaluation: ShadowEvaluationReport | null;
}

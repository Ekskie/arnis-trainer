import {
  AlphaPoseCompatibleAngles2D,
  CoordinateConvention,
  NormalizationMetadataV2,
  NormalizedPoint2D,
  NormalizedPoseFrame2D,
  Raw2DLandmarkPoint,
  Raw2DPoseFrame,
  Raw2DPoseLandmarks,
} from './referenceTypes';

export interface NormalizeSequenceOptions {
  coordinateConvention: CoordinateConvention;
  minKeypointConfidence?: number;
  /**
   * Optional neutral pre-strike frames (e.g., ready stance during countdown) used as fallback
   * for fixed median shoulder-width estimation if the active recording has too few valid frames.
   */
  calibrationFrames?: Raw2DPoseFrame[];
}

export interface NormalizedSequenceResult {
  frames: NormalizedPoseFrame2D[];
  metadata: NormalizationMetadataV2;
}

export function computeQuantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const pos = (sortedValues.length - 1) * q;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (upper - pos) + sortedValues[upper] * (pos - lower);
}

export function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return computeQuantile(sorted, 0.5);
}

/**
 * Converts a raw landmark into aspect-corrected 2D pixel space under the target coordinateConvention.
 *
 * Important:
 * - Anatomical landmark names (leftShoulder, rightShoulder, etc.) always identify the practitioner's
 *   anatomical side regardless of mirroring.
 * - Mirroring only transforms the horizontal X axis:
 *   - 'unmirrored_image_2d': +x = viewer right (for front-facing practitioner, practitioner's anatomical left).
 *   - 'anatomical_mirrored_2d': +x = practitioner's anatomical right (horizontal mirror of front-camera image).
 */
export function toAspectCorrectedPoint2D(
  pt: Raw2DLandmarkPoint | undefined,
  frameWidth: number,
  frameHeight: number,
  coordinateSpace: Raw2DPoseFrame['coordinateSpace'],
  coordinateConvention: CoordinateConvention,
  minConfidence: number
): { x: number; y: number; visibility: number } | null {
  if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return null;
  const vis = Number.isFinite(pt.visibility) ? pt.visibility : 0;
  if (vis < minConfidence) return null;
  if (frameWidth <= 0 || frameHeight <= 0) return null;

  const rawPxX = coordinateSpace === 'pixel_unmirrored' ? pt.x : pt.x * frameWidth;
  const rawPxY = coordinateSpace === 'pixel_unmirrored' ? pt.y : pt.y * frameHeight;

  const x = coordinateConvention === 'anatomical_mirrored_2d' ? frameWidth - rawPxX : rawPxX;
  return { x, y: rawPxY, visibility: vis };
}

/**
 * Pure 2D image-plane joint angle in degrees (AlphaPose COCO-17 compatible; never uses MediaPipe z).
 */
export function computeAngle2D(
  a: { x: number; y: number } | null,
  b: { x: number; y: number } | null,
  c: { x: number; y: number } | null
): number | null {
  if (!a || !b || !c) return null;
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;

  const magBa = Math.hypot(bax, bay);
  const magBc = Math.hypot(bcx, bcy);
  if (magBa <= 1e-6 || magBc <= 1e-6) return null;

  const cosTheta = Math.max(-1, Math.min(1, (bax * bcx + bay * bcy) / (magBa * magBc)));
  return parseFloat(((Math.acos(cosTheta) * 180) / Math.PI).toFixed(2));
}

function collectShoulderWidthsPx(
  frames: Raw2DPoseFrame[],
  coordinateConvention: CoordinateConvention,
  minConfidence: number
): number[] {
  const widths: number[] = [];
  for (const frame of frames) {
    const ls = toAspectCorrectedPoint2D(
      frame.landmarks.leftShoulder,
      frame.frameWidth,
      frame.frameHeight,
      frame.coordinateSpace,
      coordinateConvention,
      minConfidence
    );
    const rs = toAspectCorrectedPoint2D(
      frame.landmarks.rightShoulder,
      frame.frameWidth,
      frame.frameHeight,
      frame.coordinateSpace,
      coordinateConvention,
      minConfidence
    );
    if (ls && rs) {
      const w = Math.hypot(rs.x - ls.x, rs.y - ls.y);
      if (Number.isFinite(w) && w > 1) {
        widths.push(w);
      }
    }
  }
  return widths;
}

const LANDMARK_KEYS: Array<keyof Raw2DPoseLandmarks> = [
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
];

/**
 * Normalizes a sequence of raw 2D frames using the V2 contract:
 * - Origin: per-frame shoulder midpoint
 * - Scale: fixed median shoulder-width (in aspect-corrected pixels) across the demonstration/recording
 * - Angles: 2D aspect-corrected image-plane angles
 */
export function normalizePoseSequenceV2(
  rawFrames: Raw2DPoseFrame[],
  options: NormalizeSequenceOptions
): NormalizedSequenceResult {
  const minConf = options.minKeypointConfidence ?? 0.4;
  const convention = options.coordinateConvention;

  if (rawFrames.length === 0) {
    return {
      frames: [],
      metadata: {
        normalizationVersion: 'v2_median_shoulder_width',
        coordinateConvention: convention,
        fixedMedianShoulderWidthPx: null,
        shoulderWidthSampleCount: 0,
        shoulderWidthIqrPx: null,
        scaleSource: 'unavailable',
        aspectRatio: null,
      },
    };
  }

  // 1. Estimate fixed median shoulder-width scale per recording (V2 compatible)
  const trialWidths = collectShoulderWidthsPx(rawFrames, convention, minConf);
  let activeWidths = trialWidths;
  let scaleSource: NormalizationMetadataV2['scaleSource'] = 'recording_window_median';

  if (trialWidths.length < 3 && options.calibrationFrames && options.calibrationFrames.length > 0) {
    const calWidths = collectShoulderWidthsPx(options.calibrationFrames, convention, minConf);
    if (calWidths.length > trialWidths.length) {
      activeWidths = calWidths;
      scaleSource = 'calibration_median_fallback';
    }
  }

  const fixedMedianShoulderWidthPx = computeMedian(activeWidths);
  let shoulderWidthIqrPx: [number, number] | null = null;
  if (activeWidths.length > 0) {
    const sorted = [...activeWidths].sort((a, b) => a - b);
    shoulderWidthIqrPx = [
      parseFloat(computeQuantile(sorted, 0.25).toFixed(2)),
      parseFloat(computeQuantile(sorted, 0.75).toFixed(2)),
    ];
  } else {
    scaleSource = 'unavailable';
  }

  const startMs = rawFrames[0].timestampMs;
  const firstValidFrame = rawFrames.find((f) => f.frameWidth > 0 && f.frameHeight > 0);
  const aspectRatio = firstValidFrame
    ? parseFloat((firstValidFrame.frameWidth / firstValidFrame.frameHeight).toFixed(3))
    : null;

  // 2. Normalize each frame relative to shoulder midpoint / fixedMedianShoulderWidthPx
  const normalizedFrames: NormalizedPoseFrame2D[] = rawFrames.map((frame) => {
    const pxMap: Partial<Record<keyof Raw2DPoseLandmarks, { x: number; y: number; visibility: number }>> = {};
    for (const key of LANDMARK_KEYS) {
      const pt = toAspectCorrectedPoint2D(
        frame.landmarks[key],
        frame.frameWidth,
        frame.frameHeight,
        frame.coordinateSpace,
        convention,
        minConf
      );
      if (pt) {
        pxMap[key] = pt;
      }
    }

    const ls = pxMap.leftShoulder ?? null;
    const rs = pxMap.rightShoulder ?? null;

    let originPx: { x: number; y: number } | null = null;
    let shoulderWidthPx: number | null = null;
    let facingOrientationConsistent: boolean | null = null;

    if (ls && rs) {
      originPx = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
      shoulderWidthPx = Math.hypot(rs.x - ls.x, rs.y - ls.y);
      // Facing front camera check:
      // In anatomical_mirrored_2d, practitioner's right shoulder has larger x than left shoulder.
      // In unmirrored_image_2d, practitioner's right shoulder has smaller x than left shoulder.
      facingOrientationConsistent =
        convention === 'anatomical_mirrored_2d' ? rs.x > ls.x : rs.x < ls.x;
    }

    const points: NormalizedPoseFrame2D['points'] = {};
    if (originPx && fixedMedianShoulderWidthPx && fixedMedianShoulderWidthPx > 1) {
      for (const key of LANDMARK_KEYS) {
        const pt = pxMap[key];
        if (!pt) continue;
        (points as Record<string, NormalizedPoint2D>)[key] = {
          dx: (pt.x - originPx.x) / fixedMedianShoulderWidthPx,
          dy: (pt.y - originPx.y) / fixedMedianShoulderWidthPx,
          visibility: pt.visibility,
        };
      }
    }

    const angles2D: AlphaPoseCompatibleAngles2D = {
      rightElbow: computeAngle2D(
        pxMap.rightShoulder ?? null,
        pxMap.rightElbow ?? null,
        pxMap.rightWrist ?? null
      ),
      leftElbow: computeAngle2D(
        pxMap.leftShoulder ?? null,
        pxMap.leftElbow ?? null,
        pxMap.leftWrist ?? null
      ),
      rightShoulder: computeAngle2D(
        pxMap.rightHip ?? null,
        pxMap.rightShoulder ?? null,
        pxMap.rightElbow ?? null
      ),
      leftShoulder: computeAngle2D(
        pxMap.leftHip ?? null,
        pxMap.leftShoulder ?? null,
        pxMap.leftElbow ?? null
      ),
      rightKnee: computeAngle2D(
        pxMap.rightHip ?? null,
        pxMap.rightKnee ?? null,
        pxMap.rightAnkle ?? null
      ),
      leftKnee: computeAngle2D(
        pxMap.leftHip ?? null,
        pxMap.leftKnee ?? null,
        pxMap.leftAnkle ?? null
      ),
    };

    return {
      timestampMs: frame.timestampMs,
      relativeTimeMs: Math.max(0, frame.timestampMs - startMs),
      shoulderWidthPx,
      originPx,
      facingOrientationConsistent,
      points,
      angles2D,
    };
  });

  return {
    frames: normalizedFrames,
    metadata: {
      normalizationVersion: 'v2_median_shoulder_width',
      coordinateConvention: convention,
      fixedMedianShoulderWidthPx:
        fixedMedianShoulderWidthPx !== null
          ? parseFloat(fixedMedianShoulderWidthPx.toFixed(2))
          : null,
      shoulderWidthSampleCount: activeWidths.length,
      shoulderWidthIqrPx,
      scaleSource,
      aspectRatio,
    },
  };
}

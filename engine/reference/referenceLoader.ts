import {
  ExpertStrikeReference,
  JointReliabilityStatus,
  StrikeId,
} from './referenceTypes';

export interface ReferenceValidationResult {
  valid: boolean;
  errors: string[];
  value?: ExpertStrikeReference;
}

const VALID_STRIKE_ID_RE = /^strike_([1-9]|1[0-2])$/;
const VALID_CONVENTIONS = new Set(['anatomical_mirrored_2d', 'unmirrored_image_2d']);
const VALID_RELIABILITY: Set<JointReliabilityStatus> = new Set([
  'verified',
  'provisional',
  'excluded',
]);
const VALID_LANDMARK_IDS = new Set([
  'onset',
  'chamber_peak',
  'kinematic_peak_speed',
  'turning_point',
  'follow_through_end',
  'recovery',
]);

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validates an imported AlphaPose expert reference JSON object against the v1.0.0 contract.
 */
export function validateExpertStrikeReference(input: unknown): ReferenceValidationResult {
  const errors: string[] = [];
  if (!isObject(input)) {
    return { valid: false, errors: ['Reference payload must be a JSON object'] };
  }

  if (input.schemaVersion !== '1.0.0') {
    errors.push(`Unsupported schemaVersion: ${String(input.schemaVersion)} (expected "1.0.0")`);
  }

  if (typeof input.strikeId !== 'string' || !VALID_STRIKE_ID_RE.test(input.strikeId)) {
    errors.push(`Invalid strikeId: ${String(input.strikeId)}`);
  }

  if (!isFiniteNumber(input.strikeNumber) || input.strikeNumber < 1 || input.strikeNumber > 12) {
    errors.push(`Invalid strikeNumber: ${String(input.strikeNumber)}`);
  }

  // Provenance
  if (!isObject(input.provenance)) {
    errors.push('Missing provenance object');
  } else {
    const p = input.provenance;
    if (p.poseBackend !== 'AlphaPose') errors.push('provenance.poseBackend must be "AlphaPose"');
    if (p.keypointFormat !== 'COCO-17') errors.push('provenance.keypointFormat must be "COCO-17"');
    if (typeof p.cleanedDatasetVersion !== 'string' || !p.cleanedDatasetVersion.trim()) {
      errors.push('provenance.cleanedDatasetVersion must be a non-empty string');
    }
    if (!isFiniteNumber(p.demoCount) || p.demoCount < 1) {
      errors.push('provenance.demoCount must be >= 1');
    }
    if (!isFiniteNumber(p.frameCount) || p.frameCount < 1) {
      errors.push('provenance.frameCount must be >= 1');
    }
  }

  // Capture context
  if (!isObject(input.captureContext)) {
    errors.push('Missing captureContext object');
  } else {
    const c = input.captureContext;
    if (c.cameraView !== 'front') errors.push('captureContext.cameraView must be "front"');
    if (c.footwork !== 'without_footwork' && c.footwork !== 'with_footwork') {
      errors.push('captureContext.footwork must be "without_footwork" or "with_footwork"');
    }
    if (c.handedness !== 'right' && c.handedness !== 'left') {
      errors.push('captureContext.handedness must be "right" or "left"');
    }
    if (!isFiniteNumber(c.nominalFps) || c.nominalFps <= 0) {
      errors.push('captureContext.nominalFps must be > 0');
    }
  }

  // Normalization (V2 fixed median shoulder-width contract)
  if (!isObject(input.normalization)) {
    errors.push('Missing normalization object');
  } else {
    const n = input.normalization;
    if (n.normalizationVersion !== 'v2_median_shoulder_width') {
      errors.push('normalization.normalizationVersion must be "v2_median_shoulder_width"');
    }
    if (typeof n.coordinateConvention !== 'string' || !VALID_CONVENTIONS.has(n.coordinateConvention)) {
      errors.push(`Invalid normalization.coordinateConvention: ${String(n.coordinateConvention)}`);
    }
    if (n.origin !== 'shoulder_midpoint') {
      errors.push('normalization.origin must be "shoulder_midpoint"');
    }
    if (n.scaleBasis !== 'fixed_median_shoulder_width_per_demo') {
      errors.push('normalization.scaleBasis must be "fixed_median_shoulder_width_per_demo"');
    }
    if (n.angleDimension !== '2d') {
      errors.push('normalization.angleDimension must be "2d"');
    }
    if (
      !isFiniteNumber(n.minKeypointConfidence) ||
      n.minKeypointConfidence < 0 ||
      n.minKeypointConfidence > 1
    ) {
      errors.push('normalization.minKeypointConfidence must be in [0, 1]');
    }
  }

  // Activity landmarks
  if (!isObject(input.activityLandmarks)) {
    errors.push('Missing activityLandmarks object');
  } else {
    const al = input.activityLandmarks;
    if (!isFiniteNumber(al.medianDurationMs) || al.medianDurationMs <= 0) {
      errors.push('activityLandmarks.medianDurationMs must be > 0');
    }
    if (!Array.isArray(al.iqrDurationMs) || al.iqrDurationMs.length !== 2 || !al.iqrDurationMs.every(isFiniteNumber)) {
      errors.push('activityLandmarks.iqrDurationMs must be a 2-number array');
    }
    if (!Array.isArray(al.landmarks) || al.landmarks.length < 2) {
      errors.push('activityLandmarks.landmarks must contain at least 2 landmarks');
    } else {
      al.landmarks.forEach((lm, idx) => {
        if (!isObject(lm)) {
          errors.push(`activityLandmarks.landmarks[${idx}] must be an object`);
          return;
        }
        if (typeof lm.id !== 'string' || !VALID_LANDMARK_IDS.has(lm.id)) {
          errors.push(`activityLandmarks.landmarks[${idx}].id is invalid`);
        }
        if (!isFiniteNumber(lm.normalizedTimeMedian) || lm.normalizedTimeMedian < 0 || lm.normalizedTimeMedian > 1) {
          errors.push(`activityLandmarks.landmarks[${idx}].normalizedTimeMedian must be in [0, 1]`);
        }
        if (
          !Array.isArray(lm.normalizedTimeRange) ||
          lm.normalizedTimeRange.length !== 2 ||
          !lm.normalizedTimeRange.every(isFiniteNumber)
        ) {
          errors.push(`activityLandmarks.landmarks[${idx}].normalizedTimeRange must be [min, max]`);
        }
        if (!isObject(lm.wristPosMedian) || !isFiniteNumber(lm.wristPosMedian.dx) || !isFiniteNumber(lm.wristPosMedian.dy)) {
          errors.push(`activityLandmarks.landmarks[${idx}].wristPosMedian must have numeric dx, dy`);
        }
        if (lm.isKinematicLandmarkOnly !== true) {
          errors.push(`activityLandmarks.landmarks[${idx}].isKinematicLandmarkOnly must be true`);
        }
      });
    }
  }

  // Wrist trajectory
  if (!isObject(input.wristTrajectory)) {
    errors.push('Missing wristTrajectory object');
  } else {
    const wt = input.wristTrajectory;
    if (wt.joint !== 'right_wrist' && wt.joint !== 'left_wrist') {
      errors.push('wristTrajectory.joint must be "right_wrist" or "left_wrist"');
    }
    if (!isFiniteNumber(wt.resampleCount) || wt.resampleCount < 8) {
      errors.push('wristTrajectory.resampleCount must be >= 8');
    }
    if (!Array.isArray(wt.samples) || wt.samples.length < 8) {
      errors.push('wristTrajectory.samples must contain at least 8 samples');
    } else {
      let prevU = -1;
      wt.samples.forEach((s, idx) => {
        if (!isObject(s)) {
          errors.push(`wristTrajectory.samples[${idx}] must be an object`);
          return;
        }
        if (!isFiniteNumber(s.u) || s.u < 0 || s.u > 1 || s.u < prevU) {
          errors.push(`wristTrajectory.samples[${idx}].u must be monotonically increasing in [0, 1]`);
        } else {
          prevU = s.u;
        }
        if (!isFiniteNumber(s.dxMedian) || !isFiniteNumber(s.dyMedian)) {
          errors.push(`wristTrajectory.samples[${idx}] requires numeric dxMedian and dyMedian`);
        }
        if (!Array.isArray(s.dxIqr) || s.dxIqr.length !== 2 || !s.dxIqr.every(isFiniteNumber)) {
          errors.push(`wristTrajectory.samples[${idx}].dxIqr must be [p25, p75]`);
        }
        if (!Array.isArray(s.dyIqr) || s.dyIqr.length !== 2 || !s.dyIqr.every(isFiniteNumber)) {
          errors.push(`wristTrajectory.samples[${idx}].dyIqr must be [p25, p75]`);
        }
      });
    }
  }

  // Body joint measurements
  if (!isObject(input.bodyJointMeasurements)) {
    errors.push('Missing bodyJointMeasurements object');
  } else {
    Object.entries(input.bodyJointMeasurements).forEach(([jointKey, spec]) => {
      if (!isObject(spec)) {
        errors.push(`bodyJointMeasurements.${jointKey} must be an object`);
        return;
      }
      if (
        typeof spec.reliabilityStatus !== 'string' ||
        !VALID_RELIABILITY.has(spec.reliabilityStatus as JointReliabilityStatus)
      ) {
        errors.push(`bodyJointMeasurements.${jointKey}.reliabilityStatus must be verified, provisional, or excluded`);
      }
      if (!isFiniteNumber(spec.sampleCount) || spec.sampleCount < 0) {
        errors.push(`bodyJointMeasurements.${jointKey}.sampleCount must be >= 0`);
      }
      if (!isObject(spec.phases)) {
        errors.push(`bodyJointMeasurements.${jointKey}.phases must be an object`);
      } else {
        Object.entries(spec.phases).forEach(([phaseKey, q]) => {
          if (
            !isObject(q) ||
            !isFiniteNumber(q.p10) ||
            !isFiniteNumber(q.p25) ||
            !isFiniteNumber(q.median) ||
            !isFiniteNumber(q.p75) ||
            !isFiniteNumber(q.p90)
          ) {
            errors.push(`bodyJointMeasurements.${jointKey}.phases.${phaseKey} must have p10, p25, median, p75, p90`);
          }
        });
      }
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], value: input as unknown as ExpertStrikeReference };
}

/**
 * In-memory registry of loaded expert references for strikes 1..12.
 * Starts empty until real exported AlphaPose JSON files are registered/imported.
 */
const expertReferenceRegistry: Partial<Record<StrikeId, ExpertStrikeReference>> = {};

/**
 * Static bundled assets slot for future exported JSON files (`strike_1.json` .. `strike_12.json`).
 * Intentionally empty until real cleaned dataset exports are added so Metro builds without missing-module errors
 * and without inventing reference measurements.
 */
const BUNDLED_EXPERT_REFERENCES: Partial<Record<StrikeId, unknown>> = {};

// Hydrate any statically bundled references at module load
for (const [key, payload] of Object.entries(BUNDLED_EXPERT_REFERENCES)) {
  if (!payload) continue;
  const parsed = validateExpertStrikeReference(payload);
  if (parsed.valid && parsed.value) {
    expertReferenceRegistry[key as StrikeId] = parsed.value;
  }
}

export function normalizeStrikeId(strikeId: string): StrikeId | null {
  const candidate = strikeId.startsWith('strike_') ? strikeId : `strike_${strikeId}`;
  return VALID_STRIKE_ID_RE.test(candidate) ? (candidate as StrikeId) : null;
}

/**
 * Parses and registers an exported JSON reference payload at runtime or in tests.
 */
export function registerExpertReference(rawPayload: unknown): ReferenceValidationResult {
  const result = validateExpertStrikeReference(rawPayload);
  if (result.valid && result.value) {
    expertReferenceRegistry[result.value.strikeId] = result.value;
  }
  return result;
}

export function unregisterExpertReference(strikeId: string): void {
  const norm = normalizeStrikeId(strikeId);
  if (norm) {
    delete expertReferenceRegistry[norm];
  }
}

export function clearExpertReferences(): void {
  for (const key of Object.keys(expertReferenceRegistry) as StrikeId[]) {
    delete expertReferenceRegistry[key];
  }
}

export function getExpertReference(strikeId: string): ExpertStrikeReference | null {
  const norm = normalizeStrikeId(strikeId);
  if (!norm) return null;
  return expertReferenceRegistry[norm] ?? null;
}

export function hasExpertReference(strikeId: string): boolean {
  return getExpertReference(strikeId) !== null;
}

export function listRegisteredExpertStrikeIds(): StrikeId[] {
  return Object.keys(expertReferenceRegistry) as StrikeId[];
}

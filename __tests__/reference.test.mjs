import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTsModule(relativePath, cache = new Map()) {
  const absPath = path.resolve(projectRoot, relativePath);
  if (cache.has(absPath)) {
    return cache.get(absPath).exports;
  }

  const source = fs.readFileSync(absPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: absPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: false,
    },
  });

  const mod = { exports: {} };
  cache.set(absPath, mod);

  const localRequire = (specifier) => {
    let targetPath = specifier;
    if (specifier.startsWith('@/')) {
      targetPath = path.resolve(projectRoot, specifier.slice(2));
    } else if (specifier.startsWith('.')) {
      targetPath = path.resolve(path.dirname(absPath), specifier);
    } else {
      return require(specifier);
    }

    const candidates = [
      targetPath,
      `${targetPath}.ts`,
      `${targetPath}.tsx`,
      `${targetPath}.js`,
      path.join(targetPath, 'index.ts'),
      path.join(targetPath, 'index.js'),
    ];
    const resolved = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!resolved) {
      throw new Error(`Cannot resolve "${specifier}" from "${absPath}"`);
    }
    if (resolved.endsWith('.ts') || resolved.endsWith('.tsx')) {
      return loadTsModule(path.relative(projectRoot, resolved), cache);
    }
    return require(resolved);
  };

  const fn = new Function('require', 'module', 'exports', '__filename', '__dirname', transpiled.outputText);
  fn(localRequire, mod, mod.exports, absPath, path.dirname(absPath));
  return mod.exports;
}

const refLoader = loadTsModule('engine/reference/referenceLoader.ts');
const poseNormalizer = loadTsModule('engine/reference/poseNormalizer.ts');
const trajMatcher = loadTsModule('engine/reference/trajectoryMatcher.ts');
const shadowEval = loadTsModule('engine/reference/shadowEvaluator.ts');
const strikeEval = loadTsModule('engine/evaluation/strikeEvaluator.ts');
const { STRIKE_RULES } = loadTsModule('constants/strikeRules.ts');

/**
 * Synthetic test fixture strictly for unit testing schema validation & pipeline math.
 * Not real dataset data.
 */
function buildSyntheticStrike1ContractFixture(convention = 'anatomical_mirrored_2d') {
  const sign = convention === 'anatomical_mirrored_2d' ? 1 : -1;
  const samples = [];
  for (let i = 0; i < 10; i += 1) {
    const u = i / 9;
    // Right-handed Strike 1 trajectory: high anatomical right -> low anatomical left
    const dx = sign * (0.6 - 1.2 * u);
    const dy = -0.3 + 0.9 * u;
    samples.push({
      u: Number(u.toFixed(4)),
      dxMedian: Number(dx.toFixed(4)),
      dyMedian: Number(dy.toFixed(4)),
      dxIqr: [Number((dx - 0.15).toFixed(4)), Number((dx + 0.15).toFixed(4))],
      dyIqr: [Number((dy - 0.15).toFixed(4)), Number((dy + 0.15).toFixed(4))],
      speedMedian: i === 5 ? 2.5 : 1.0,
    });
  }

  return {
    schemaVersion: '1.0.0',
    strikeId: 'strike_1',
    strikeNumber: 1,
    name: 'Strike 1 Test Contract Fixture',
    provenance: {
      poseBackend: 'AlphaPose',
      keypointFormat: 'COCO-17',
      cleanedDatasetVersion: 'test-fixture-only',
      demoCount: 1,
      frameCount: 10,
    },
    captureContext: {
      cameraView: 'front',
      footwork: 'without_footwork',
      handedness: 'right',
      nominalFps: 30,
    },
    normalization: {
      normalizationVersion: 'v2_median_shoulder_width',
      coordinateConvention: convention,
      origin: 'shoulder_midpoint',
      scaleBasis: 'fixed_median_shoulder_width_per_demo',
      angleDimension: '2d',
      minKeypointConfidence: 0.4,
    },
    activityLandmarks: {
      medianDurationMs: 900,
      iqrDurationMs: [800, 1000],
      landmarks: [
        {
          id: 'onset',
          label: 'Test Onset',
          normalizedTimeMedian: 0.0,
          normalizedTimeRange: [0.0, 0.1],
          wristPosMedian: { dx: samples[0].dxMedian, dy: samples[0].dyMedian },
          isKinematicLandmarkOnly: true,
        },
        {
          id: 'kinematic_peak_speed',
          label: 'Test Kinematic Peak Speed',
          normalizedTimeMedian: 0.55,
          normalizedTimeRange: [0.45, 0.65],
          wristPosMedian: { dx: samples[5].dxMedian, dy: samples[5].dyMedian },
          isKinematicLandmarkOnly: true,
        },
      ],
    },
    wristTrajectory: {
      joint: 'right_wrist',
      resampleCount: 10,
      samples,
    },
    bodyJointMeasurements: {
      rightElbow: {
        reliabilityStatus: 'provisional',
        warnings: ['Low-angle / projection warning in candidate frames'],
        cocoKeypoints: [6, 8, 10],
        sampleCount: 10,
        phases: {
          kinematic_peak_speed: { p10: 100, p25: 110, median: 125, p75: 140, p90: 155 },
        },
      },
      rightWristSnap: {
        reliabilityStatus: 'excluded',
        exclusionReason: 'No hand/finger landmarks in COCO-17',
        sampleCount: 0,
        phases: {},
      },
    },
  };
}

/**
 * Generates raw unmirrored front-camera MediaPipe frames for a right-handed practitioner.
 * Facing front camera: practitioner's anatomical right shoulder is at viewer left (smaller x).
 */
function buildMockMediaPipeFrames({
  frameWidth = 640,
  frameHeight = 480,
  reverseDirection = false,
  foreshortenFrameIndex = -1,
  swapShoulderLabels = false,
} = {}) {
  const shoulderCenterX = 0.5;
  const shoulderCenterY = 0.35;
  // Physical shoulder width = 160 px -> normalized width = 160 / frameWidth
  const halfShoulderNormX = 80 / frameWidth;
  const shoulderWidthPx = 160;

  const frames = [];
  for (let i = 0; i < 10; i += 1) {
    const u = i / 9;
    const progress = reverseDirection ? 1 - u : u;
    const scaleFactor = i === foreshortenFrameIndex ? 0.5 : 1.0;

    // Anatomical mirrored offsets for Strike 1: (+0.6 -> -0.6) in dx, (-0.3 -> +0.6) in dy
    const anatDx = 0.6 - 1.2 * progress;
    const anatDy = -0.3 + 0.9 * progress;

    // Convert anatomical (+x = practitioner right) back to raw unmirrored image space (mirrored = 1 - rawX)
    const rawWristX = shoulderCenterX - (anatDx * shoulderWidthPx) / frameWidth;
    const rawWristY = shoulderCenterY + (anatDy * shoulderWidthPx) / frameHeight;

    const rawRsX = shoulderCenterX - halfShoulderNormX * scaleFactor;
    const rawLsX = shoulderCenterX + halfShoulderNormX * scaleFactor;

    const rightShoulderPt = { x: rawRsX, y: shoulderCenterY, visibility: 0.98 };
    const leftShoulderPt = { x: rawLsX, y: shoulderCenterY, visibility: 0.98 };

    frames.push({
      timestampMs: 1000 + i * 100,
      frameWidth,
      frameHeight,
      source: 'mediapipe_2d',
      coordinateSpace: 'raw_unmirrored_normalized',
      landmarks: {
        leftShoulder: swapShoulderLabels ? rightShoulderPt : leftShoulderPt,
        rightShoulder: swapShoulderLabels ? leftShoulderPt : rightShoulderPt,
        rightElbow: {
          x: shoulderCenterX - (0.2 * shoulderWidthPx) / frameWidth,
          y: shoulderCenterY + (0.2 * shoulderWidthPx) / frameHeight,
          visibility: 0.95,
        },
        rightWrist: { x: rawWristX, y: rawWristY, visibility: 0.96 },
        leftElbow: { x: rawLsX + 20 / frameWidth, y: shoulderCenterY + 80 / frameHeight, visibility: 0.92 },
        leftWrist: { x: shoulderCenterX, y: shoulderCenterY + 60 / frameHeight, visibility: 0.92 },
        rightHip: { x: rawRsX, y: shoulderCenterY + 200 / frameHeight, visibility: 0.9 },
        leftHip: { x: rawLsX, y: shoulderCenterY + 200 / frameHeight, visibility: 0.9 },
      },
    });
  }
  return frames;
}

test('referenceLoader: starts empty without invented data and validates schema strictly', () => {
  refLoader.clearExpertReferences();
  assert.equal(refLoader.getExpertReference('strike_1'), null);
  assert.equal(refLoader.hasExpertReference('strike_1'), false);
  assert.deepEqual(refLoader.listRegisteredExpertStrikeIds(), []);

  const validFixture = buildSyntheticStrike1ContractFixture();
  const res = refLoader.validateExpertStrikeReference(validFixture);
  assert.equal(res.valid, true, `Expected valid fixture, got errors: ${res.errors.join(', ')}`);

  // Reject non-kinematic impact claims or wrong normalization basis
  const badImpact = structuredClone(validFixture);
  badImpact.activityLandmarks.landmarks[1].isKinematicLandmarkOnly = false;
  assert.equal(refLoader.validateExpertStrikeReference(badImpact).valid, false);

  const badScale = structuredClone(validFixture);
  badScale.normalization.scaleBasis = 'torso_length';
  assert.equal(refLoader.validateExpertStrikeReference(badScale).valid, false);

  // Register & retrieve cleanly, then clear
  assert.equal(refLoader.registerExpertReference(validFixture).valid, true);
  assert.equal(refLoader.hasExpertReference('strike_1'), true);
  refLoader.clearExpertReferences();
});

test('poseNormalizer: preserves V2 fixed median shoulder-width scale and aspect-ratio invariance', () => {
  const landscape = buildMockMediaPipeFrames({
    frameWidth: 640,
    frameHeight: 480,
    foreshortenFrameIndex: 4,
  });
  const portrait = buildMockMediaPipeFrames({
    frameWidth: 480,
    frameHeight: 640,
    foreshortenFrameIndex: 4,
  });

  const normLandscape = poseNormalizer.normalizePoseSequenceV2(landscape, {
    coordinateConvention: 'anatomical_mirrored_2d',
  });
  const normPortrait = poseNormalizer.normalizePoseSequenceV2(portrait, {
    coordinateConvention: 'anatomical_mirrored_2d',
  });

  // Median across 9 frames of 160px and 1 foreshortened frame of 80px must remain fixed at 160px
  assert.equal(normLandscape.metadata.fixedMedianShoulderWidthPx, 160);
  assert.equal(normPortrait.metadata.fixedMedianShoulderWidthPx, 160);
  assert.equal(normLandscape.metadata.scaleSource, 'recording_window_median');

  // Normalized wrist (dx, dy) must match between landscape and portrait viewports
  const wL = normLandscape.frames[0].points.rightWrist;
  const wP = normPortrait.frames[0].points.rightWrist;
  assert.ok(Math.abs(wL.dx - wP.dx) < 1e-4);
  assert.ok(Math.abs(wL.dy - wP.dy) < 1e-4);

  // Even on the foreshortened frame (index 4), fixed scale 160px is used (shoulder endpoints sit at +/-0.25 instead of +/-0.5)
  assert.ok(Math.abs(normLandscape.frames[4].points.rightShoulder.dx - 0.25) < 1e-4);
});

test('poseNormalizer: distinguishes camera mirroring from anatomical landmark handedness', () => {
  const rawFacingFrames = buildMockMediaPipeFrames();

  const mirroredNorm = poseNormalizer.normalizePoseSequenceV2(rawFacingFrames, {
    coordinateConvention: 'anatomical_mirrored_2d',
  });
  assert.equal(mirroredNorm.frames[0].facingOrientationConsistent, true);
  // Anatomical mirrored: rightShoulder > 0 (+x), Strike 1 moves +dx -> -dx
  assert.ok(mirroredNorm.frames[0].points.rightShoulder.dx > 0);
  assert.ok(mirroredNorm.frames[0].points.rightWrist.dx > mirroredNorm.frames[9].points.rightWrist.dx);

  const unmirroredNorm = poseNormalizer.normalizePoseSequenceV2(rawFacingFrames, {
    coordinateConvention: 'unmirrored_image_2d',
  });
  assert.equal(unmirroredNorm.frames[0].facingOrientationConsistent, true);
  // Unmirrored image: practitioner's anatomical right shoulder is on viewer's left (-x), Strike 1 moves -dx -> +dx
  assert.ok(unmirroredNorm.frames[0].points.rightShoulder.dx < 0);
  assert.ok(unmirroredNorm.frames[0].points.rightWrist.dx < unmirroredNorm.frames[9].points.rightWrist.dx);

  // Swapped left/right shoulder labels must fail facing-orientation consistency check
  const swappedFrames = buildMockMediaPipeFrames({ swapShoulderLabels: true });
  const swappedNorm = poseNormalizer.normalizePoseSequenceV2(swappedFrames, {
    coordinateConvention: 'anatomical_mirrored_2d',
  });
  assert.equal(swappedNorm.frames[0].facingOrientationConsistent, false);

  // Pure 2D angle check (planar 90 deg)
  const angle90 = poseNormalizer.computeAngle2D({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.equal(angle90, 90);
});

test('shadowEvaluator: runs non-grading Strike 1 comparison without altering baseline scores', () => {
  refLoader.clearExpertReferences();
  const frames = buildMockMediaPipeFrames();

  // 1. Without an exported reference loaded, returns clean no_reference_loaded status
  const noRefReport = shadowEval.evaluateShadowReference('strike_1', frames);
  assert.equal(noRefReport.referenceStatus, 'no_reference_loaded');
  assert.equal(noRefReport.isNonGradingShadow, true);
  assert.equal(noRefReport.trajectoryMetrics, null);

  // 2. With a contract fixture override: correct direction vs opposite direction
  const fixture = buildSyntheticStrike1ContractFixture('anatomical_mirrored_2d');
  const matchReport = shadowEval.evaluateShadowReference('strike_1', frames, {
    referenceOverride: fixture,
  });
  assert.equal(matchReport.referenceStatus, 'evaluated');
  assert.equal(matchReport.isNonGradingShadow, true);
  assert.ok(matchReport.trajectoryMetrics.dtwMeanDistance < 0.05);
  assert.ok(matchReport.trajectoryMetrics.directionCosineMean > 0.95);
  assert.equal(matchReport.trajectoryMetrics.directionAgreementFraction, 1);
  assert.equal(matchReport.kinematicLandmarks.isKinematicPeakOnly, true);

  // Provisional Strike 1 elbow must be flagged non-validated; excluded wrist snap omitted
  const elbowCmp = matchReport.jointComparisons2D.find((j) => j.jointName === 'rightElbow');
  assert.equal(elbowCmp.reliabilityStatus, 'provisional');
  assert.equal(elbowCmp.isValidatedReference, false);
  assert.ok(elbowCmp.warnings.length > 0);

  const wristCmp = matchReport.jointComparisons2D.find((j) => j.jointName === 'rightWristSnap');
  assert.equal(wristCmp.reliabilityStatus, 'excluded');
  assert.equal(wristCmp.actualAngle2D, null);

  // Wrong direction (reversed trajectory) shows large DTW distance and negative cosine agreement
  const reversedFrames = buildMockMediaPipeFrames({ reverseDirection: true });
  const wrongDirReport = shadowEval.evaluateShadowReference('strike_1', reversedFrames, {
    referenceOverride: fixture,
  });
  assert.ok(wrongDirReport.trajectoryMetrics.dtwMeanDistance > 0.5);
  assert.ok(wrongDirReport.trajectoryMetrics.directionCosineMean < -0.5);
  assert.equal(wrongDirReport.trajectoryMetrics.directionAgreementFraction, 0);

  // 3. Baseline compileSessionResult scores/grades remain untouched when shadowEvaluation is attached
  const baselineInput = {
    score: 82,
    elbowScore: 84,
    shoulderScore: 80,
    wristScore: 85,
    guardScore: 80,
    stanceScore: 82,
  };
  const baselineOnly = strikeEval.compileSessionResult(baselineInput, STRIKE_RULES.strike_1);
  const withShadow = strikeEval.compileSessionResult(
    { ...baselineInput, shadowEvaluation: wrongDirReport },
    STRIKE_RULES.strike_1
  );
  assert.equal(withShadow.score, baselineOnly.score);
  assert.equal(withShadow.grade, baselineOnly.grade);
  assert.equal(withShadow.stars, baselineOnly.stars);
  assert.deepEqual(withShadow.feedback, baselineOnly.feedback);
  assert.equal(withShadow.shadowEvaluation.isNonGradingShadow, true);
});

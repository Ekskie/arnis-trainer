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

const tsModuleCache = new Map();
const refLoader = loadTsModule('engine/reference/referenceLoader.ts', tsModuleCache);
const poseNormalizer = loadTsModule('engine/reference/poseNormalizer.ts', tsModuleCache);
const trajMatcher = loadTsModule('engine/reference/trajectoryMatcher.ts', tsModuleCache);
const shadowEval = loadTsModule('engine/reference/shadowEvaluator.ts', tsModuleCache);
const researchCapture = loadTsModule('engine/reference/researchCapture.ts', tsModuleCache);
const strikeEval = loadTsModule('engine/evaluation/strikeEvaluator.ts', tsModuleCache);
const { STRIKE_RULES } = loadTsModule('constants/strikeRules.ts', tsModuleCache);

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

test('trajectoryMatcher: enforces Sakoe-Chiba DTW constraint (maxOffset=4 at 50 pts) and reports linear baseline', () => {
  const sampleCount = 50;
  const ref50Samples = [];
  const userNormFrames = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const u = i / (sampleCount - 1);
    const dx = -0.6 + 1.2 * u; // unmirrored_image_2d: -x (viewer left) -> +x (viewer right)
    const dy = -0.3 + 0.9 * u;
    ref50Samples.push({
      u: Number(u.toFixed(4)),
      dxMedian: Number(dx.toFixed(4)),
      dyMedian: Number(dy.toFixed(4)),
      dxIqr: [Number((dx - 0.1).toFixed(4)), Number((dx + 0.1).toFixed(4))],
      dyIqr: [Number((dy - 0.1).toFixed(4)), Number((dy + 0.1).toFixed(4))],
    });

    // Simulate slight mid-swing temporal lag (~6 points shifted past mid) within a 50-frame user capture
    const laggedIdx = i < 10 ? i : Math.min(sampleCount - 1, Math.max(0, i - 3));
    const uUser = laggedIdx / (sampleCount - 1);
    userNormFrames.push({
      timestampMs: 1000 + i * 33,
      relativeTimeMs: i * 33,
      shoulderWidthPx: 160,
      originPx: { x: 320, y: 170 },
      facingOrientationConsistent: true,
      points: {
        rightWrist: {
          dx: -0.6 + 1.2 * uUser,
          dy: -0.3 + 0.9 * uUser,
          visibility: 0.95,
        },
      },
      angles2D: {
        rightElbow: null,
        leftElbow: null,
        rightShoulder: null,
        leftShoulder: null,
        rightKnee: null,
        leftKnee: null,
      },
    });
  }

  const ref50 = {
    ...buildSyntheticStrike1ContractFixture('unmirrored_image_2d'),
    wristTrajectory: {
      joint: 'right_wrist',
      resampleCount: 50,
      samples: ref50Samples,
    },
  };

  const matchOut = trajMatcher.matchWristTrajectory(userNormFrames, ref50);
  assert.ok(matchOut);
  assert.equal(matchOut.metrics.dtwConstraint.mode, 'sakoe_chiba_band');
  assert.equal(matchOut.metrics.dtwConstraint.requestedOffsetPoints, 4);
  assert.equal(matchOut.metrics.dtwConstraint.allowedOffsetPoints, 4);
  assert.equal(matchOut.metrics.dtwConstraint.referencePoints, 50);
  assert.equal(matchOut.metrics.dtwConstraint.isExperimentalConfig, true);

  // Every aligned pair must stay within +/-4 points of proportional index
  for (const pair of matchOut.alignedPairs) {
    assert.ok(Math.abs(pair.refIndex - pair.userIndex) <= 4);
  }

  // Linear alignment baseline & timing distortion fields must be populated
  assert.ok(matchOut.metrics.linearMeanDistance >= matchOut.metrics.dtwMeanDistance);
  assert.ok(matchOut.metrics.warpingPathLength >= 50);
  assert.ok(matchOut.metrics.timingDistortionMaxRefPoints <= 4);
  assert.ok(matchOut.metrics.timingDistortionMeanNorm >= 0);
});

test('trajectoryMatcher: preserves full sequence by default and surfaces multi-peak candidates', () => {
  // Construct 20 frames with a large early preparatory speed spike (frames 2->3)
  // AND a second lower/target strike speed spike later (frames 13->14)
  const dxPattern = [
    -0.5, -0.5, -0.1, 0.35, -0.4, // large early prep transient
    -0.55, -0.55, -0.55, -0.55, -0.55,
    -0.5, -0.35, -0.1, 0.25, 0.55, 0.65, // actual Strike 1 sweep
    0.6, 0.55, 0.55, 0.55,
  ];
  const points = dxPattern.map((dx, idx) => ({
    frameIndex: idx,
    relativeTimeMs: idx * 50,
    dx,
    dy: idx >= 10 ? -0.2 + (idx - 10) * 0.1 : 0,
    speedNormPerSec: 0,
  }));

  // Compute finite-difference speeds cleanly
  for (let i = 1; i < points.length; i += 1) {
    const dist = Math.hypot(points[i].dx - points[i - 1].dx, points[i].dy - points[i - 1].dy);
    points[i].speedNormPerSec = dist / 0.05;
  }

  const fullWindow = trajMatcher.selectMovementWindow(points, points.length);
  assert.equal(fullWindow.selection.mode, 'full_captured');
  assert.equal(fullWindow.selectedPoints.length, points.length);
  assert.equal(fullWindow.selection.selectedStartFrameIndex, 0);
  assert.equal(fullWindow.selection.selectedEndFrameIndex, points.length - 1);
  assert.ok(fullWindow.selection.candidateSpeedPeaks.length >= 2);
  assert.ok(fullWindow.selection.candidateSpeedPeaks.every((c) => c.isKinematicCandidateOnly === true));

  // Explicit frame range isolates the second (target) technique cleanly
  const explicitWindow = trajMatcher.selectMovementWindow(points, points.length, {
    mode: 'explicit_frame_range',
    startFrameIndex: 10,
    endFrameIndex: 16,
  });
  assert.equal(explicitWindow.selection.mode, 'explicit_frame_range');
  assert.equal(explicitWindow.selection.selectedStartFrameIndex, 10);
  assert.equal(explicitWindow.selection.selectedEndFrameIndex, 16);
  assert.equal(explicitWindow.selectedPoints.length, 7);
});

test('researchCapture & referenceLoader: enforces consent, separates mirroring conventions, and validates JSON text', () => {
  const frames = buildMockMediaPipeFrames();
  const refUnmirrored = buildSyntheticStrike1ContractFixture('unmirrored_image_2d');

  // Parse & register raw JSON text cleanly
  refLoader.clearExpertReferences();
  const regResult = refLoader.parseAndRegisterExpertReferenceJson(JSON.stringify(refUnmirrored));
  assert.equal(regResult.valid, true);
  assert.equal(refLoader.getExpertReference('strike_1')?.normalization.coordinateConvention, 'unmirrored_image_2d');

  // Must refuse assembling capture without explicit consent
  assert.throws(() => {
    researchCapture.buildResearchCaptureSession({
      consentGranted: false,
      consentedAt: null,
      strikeId: 'strike_1',
      strikeNumber: 1,
      strikeName: 'Left Temple Strike',
      practiceMode: 'research_manual',
      rawFrames: frames,
    });
  }, /consent/i);

  // With consent granted: captures sampling stats, raw + V2 normalized frames, and distinguishes mirroring
  const capture = researchCapture.buildResearchCaptureSession({
    consentGranted: true,
    consentedAt: '2026-11-12T10:00:00.000Z',
    strikeId: 'strike_1',
    strikeNumber: 1,
    strikeName: 'Left Temple Strike',
    practiceMode: 'research_manual',
    rawFrames: frames,
    poseCoordinateConvention: 'unmirrored_image_2d',
  });

  assert.equal(capture.schemaVersion, '1.0.0-research-capture');
  assert.equal(capture.consentGranted, true);
  assert.equal(capture.localOnly, true);
  assert.equal(capture.isNonGradingResearch, true);
  assert.equal(capture.coordinateConventions.cameraPreviewDisplay, 'mirrored_selfie_display');
  assert.equal(capture.coordinateConventions.rawPoseCoordinateSpace, 'raw_unmirrored_normalized');
  assert.equal(capture.coordinateConventions.normalizedPoseCoordinateConvention, 'unmirrored_image_2d');
  assert.equal(capture.samplingStats.capturedFrameCount, 10);
  assert.equal(capture.samplingStats.durationMs, 900);
  assert.equal(capture.samplingStats.medianFrameIntervalMs, 100);
  assert.equal(capture.rawPoseFrames2D.length, 10);
  assert.equal(capture.normalizedPoseV2.frames.length, 10);
  assert.equal(capture.movementWindow.mode, 'full_captured');
  assert.ok(capture.shadowEvaluation?.trajectoryMetrics?.dtwConstraint);
  refLoader.clearExpertReferences();
});

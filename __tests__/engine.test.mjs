import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');

/**
 * Lightweight TypeScript + `@/*` CommonJS loader so pure TS engine modules
 * can be unit-tested directly under Node without external test runners.
 */
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

const scoreCalc = loadTsModule('engine/evaluation/scoreCalculator.ts');
const strikeEval = loadTsModule('engine/evaluation/strikeEvaluator.ts');
const { STRIKE_RULES } = loadTsModule('constants/strikeRules.ts');
const { ImpactDetector } = loadTsModule('services/impactDetector.ts');
const { getPoseEngineHtml } = loadTsModule('constants/poseEngineHtml.ts');

test('scoreCalculator: joint, multi-tier, overall, grade, and stars', () => {
  assert.equal(scoreCalc.calculateJointScore(null, 80, 120), 0);
  assert.equal(scoreCalc.calculateJointScore(undefined, 80, 120), 0);
  assert.equal(scoreCalc.calculateJointScore(100, 80, 120), 100);
  assert.ok(scoreCalc.calculateJointScore(70, 80, 120) < 100);
  assert.ok(scoreCalc.calculateJointScore(70, 80, 120) > 0);

  assert.equal(scoreCalc.calculateMultiTierJointScore(null, 90, 110, 70, 130), 0);
  assert.equal(scoreCalc.calculateMultiTierJointScore(100, 90, 110, 70, 130), 100);
  const acceptable = scoreCalc.calculateMultiTierJointScore(80, 90, 110, 70, 130);
  assert.ok(acceptable >= 70 && acceptable < 100);

  const weighted = scoreCalc.calculateOverallScore({
    strikingArm: 100,
    guard: 80,
    stance: 60,
    wrist: 40,
  });
  // 100*0.4 + 80*0.25 + 60*0.2 + 40*0.15 = 40 + 20 + 12 + 6 = 78
  assert.equal(weighted, 78);

  assert.equal(scoreCalc.computeGrade(95), 'Grade A');
  assert.equal(scoreCalc.computeGrade(85), 'Grade B');
  assert.equal(scoreCalc.computeGrade(75), 'Grade C');
  assert.equal(scoreCalc.computeGrade(60), 'Grade D');
  assert.equal(scoreCalc.computeGrade(10), 'Grade F');
  assert.equal(scoreCalc.computeGrade(0), 'Unranked');

  assert.equal(scoreCalc.calculateStarCount(96), 5);
  assert.equal(scoreCalc.calculateStarCount(88), 4);
  assert.equal(scoreCalc.calculateStarCount(72), 3);
  assert.equal(scoreCalc.calculateStarCount(55), 2);
  assert.equal(scoreCalc.calculateStarCount(10), 1);
  assert.equal(scoreCalc.calculateStarCount(0), 0);
});

test('strikeEvaluator: all 12 STRIKE_RULES evaluate frames and compile session results', () => {
  for (let i = 1; i <= 12; i += 1) {
    const key = `strike_${i}`;
    const rule = STRIKE_RULES[key];
    assert.ok(rule, `Missing ${key} in STRIKE_RULES`);

    const midElbow = (rule.right_min + rule.right_max) / 2;
    const midShoulder = ((rule.right_shoulder_min ?? 45) + (rule.right_shoulder_max ?? 95)) / 2;
    const midWrist = ((rule.wrist_min ?? 150) + (rule.wrist_max ?? 180)) / 2;
    const midGuard = (rule.left_min + rule.left_max) / 2;
    const midKnee = ((rule.knee_min ?? 140) + (rule.knee_max ?? 175)) / 2;

    const evaluated = strikeEval.evaluatePoseFrame(
      {
        id: 0,
        leftAngle: midGuard,
        rightAngle: midElbow,
        leftShoulderAngle: 45,
        rightShoulderAngle: midShoulder,
        leftKneeAngle: midKnee,
        rightKneeAngle: midKnee,
        leftWristAngle: 170,
        rightWristAngle: midWrist,
        isLeftGood: true,
        isRightGood: true,
        isHoldingLeft: false,
        isHoldingRight: true,
        isPersonVisible: true,
        leadKneeAngle: midKnee,
      },
      rule
    );

    assert.ok(evaluated.accuracy >= 0 && evaluated.accuracy <= 100);
    assert.ok(evaluated.pillars && typeof evaluated.pillars.strikingArm === 'number');

    const compiled = strikeEval.compileSessionResult(
      {
        score: evaluated.accuracy,
        elbowScore: evaluated.elbowScore,
        shoulderScore: evaluated.shoulderScore,
        wristScore: evaluated.wristScore,
        guardScore: evaluated.guardScore,
        stanceScore: evaluated.stanceScore,
      },
      rule
    );

    assert.ok(['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade F', 'Unranked'].includes(compiled.grade));
    assert.ok(compiled.stars >= 0 && compiled.stars <= 5);
    assert.ok(typeof compiled.feedback === 'object' && compiled.feedback !== null);
  }

  const staticHold = strikeEval.evaluatePoseFrame(
    {
      id: 0,
      leftAngle: 75,
      rightAngle: 130,
      leftShoulderAngle: 50,
      rightShoulderAngle: 65,
      leftKneeAngle: 155,
      rightKneeAngle: 155,
      leftWristAngle: 170,
      rightWristAngle: 170,
      isLeftGood: true,
      isRightGood: true,
      isHoldingLeft: false,
      isHoldingRight: true,
      isPersonVisible: true,
      accuracy: 92,
      elbowScore: 95,
      shoulderScore: 90,
      wristScore: 90,
      kneeScore: 90,
      guardScore: 90,
      stanceScore: 90,
      leadKneeAngle: 155,
      isStaticHold: true,
    },
    STRIKE_RULES.strike_1
  );
  assert.ok(staticHold.accuracy <= 55);
  assert.match(staticHold.correctionPrompt || '', /freeze/i);

  const noStick = strikeEval.evaluatePoseFrame(
    {
      id: 0,
      leftAngle: null,
      rightAngle: null,
      leftShoulderAngle: null,
      rightShoulderAngle: null,
      leftKneeAngle: null,
      rightKneeAngle: null,
      leftWristAngle: null,
      rightWristAngle: null,
      isLeftGood: false,
      isRightGood: false,
      isHoldingLeft: false,
      isHoldingRight: false,
      isPersonVisible: false,
      accuracy: 0,
      elbowScore: 0,
      shoulderScore: 0,
      wristScore: 0,
      kneeScore: 0,
      guardScore: 0,
      stanceScore: 0,
      leadKneeAngle: 0,
    },
    STRIKE_RULES.strike_1
  );
  assert.equal(noStick.accuracy, 0);
  assert.match(noStick.correctionPrompt || '', /stick/i);
});

test('ImpactDetector: fallback on empty history and selection of apex frames', () => {
  const detector = new ImpactDetector();
  const emptyResult = detector.finalize(2000);
  assert.equal(emptyResult.impactFrame, 30);
  assert.ok(emptyResult.confidence >= 0.5 && emptyResult.confidence <= 0.95);
  assert.ok(emptyResult.detectedPose);

  detector.reset(Date.now() - 500);
  const rule = STRIKE_RULES.strike_1;
  const basePose = {
    id: 0,
    leftAngle: 75,
    rightAngle: 100,
    leftShoulderAngle: 60,
    rightShoulderAngle: 65,
    leftKneeAngle: 165,
    rightKneeAngle: 165,
    leftWristAngle: 165,
    rightWristAngle: 165,
    isLeftGood: true,
    isRightGood: true,
    isHoldingLeft: false,
    isHoldingRight: true,
    isPersonVisible: true,
    accuracy: 70,
    elbowScore: 70,
    shoulderScore: 70,
    wristScore: 70,
    kneeScore: 80,
    guardScore: 80,
    stanceScore: 80,
    leadKneeAngle: 165,
    swingVelocity: 0.12,
  };

  detector.addFrame(basePose, rule);
  detector.addFrame(
    {
      ...basePose,
      rightAngle: (rule.right_min + rule.right_max) / 2,
      accuracy: 92,
      swingVelocity: 0.28,
      isApex: true,
      motionPhase: 'apex_hit',
    },
    rule,
    'data:image/jpeg;base64,TESTSNAP'
  );
  detector.addFrame({ ...basePose, accuracy: 80, isApex: false }, rule);

  const result = detector.finalize(1500);
  assert.equal(result.impactFrame, 1);
  assert.equal(result.detectedPose.accuracy, 92);
  assert.equal(result.snapshotBase64, 'data:image/jpeg;base64,TESTSNAP');
  assert.ok(result.confidence >= 0.85 && result.confidence <= 0.95);
});

test('poseEngineHtml: inline WebView script compiles as valid JS without syntax errors', () => {
  const html = getPoseEngineHtml('https://example.com/pose_landmarker_lite.task');
  const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scriptMatches.length > 0, 'Expected at least one <script> block in poseEngineHtml');

  for (const match of scriptMatches) {
    const scriptBody = match[1].trim();
    if (!scriptBody) continue;
    // Compiling inside vm.Script checks ES/JS syntax without executing browser DOM globals.
    assert.doesNotThrow(() => {
      new vm.Script(scriptBody);
    });
  }
});

test('poseEngineHtml: drawOutput constructs and emits POSE_DATA with rawPose2d without ReferenceError', () => {
  const html = getPoseEngineHtml('https://example.com/pose_landmarker_lite.task');
  const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scriptMatches.length > 0);

  const postedMessages = [];
  const consoleWarnings = [];

  const noop = () => {};
  const mockCtx = new Proxy(
    {
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      font: '12px sans-serif',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      shadowColor: 'transparent',
      shadowBlur: 0,
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      measureText: (t) => ({ width: String(t || '').length * 8 }),
      getImageData: () => ({ data: new Uint8ClampedArray(64) }),
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return noop;
      },
    }
  );

  const mockCanvas = {
    width: 640,
    height: 480,
    getContext: () => mockCtx,
    toDataURL: () => 'data:image/jpeg;base64,TEST',
  };
  const mockVideo = {
    readyState: 2,
    videoWidth: 640,
    videoHeight: 480,
  };
  const mockLoadingEl = {
    classList: { add: noop, remove: noop },
    textContent: '',
  };

  const sandbox = {
    console: {
      log: noop,
      warn: (...args) => consoleWarnings.push(args.join(' ')),
      error: (...args) => consoleWarnings.push(args.join(' ')),
    },
    Math,
    Date,
    JSON,
    Number,
    String,
    Array,
    Object,
    Float32Array,
    Uint8ClampedArray,
    setTimeout,
    clearTimeout,
    performance: { now: () => 12345 },
    requestAnimationFrame: noop,
    document: {
      readyState: 'loading',
      getElementById: (id) => {
        if (id === 'output_canvas') return mockCanvas;
        if (id === 'webcam') return mockVideo;
        if (id === 'loading' || id === 'loading-text') return mockLoadingEl;
        return mockLoadingEl;
      },
      createElement: () => ({
        width: 640,
        height: 480,
        getContext: () => mockCtx,
        toDataURL: () => 'data:image/jpeg;base64,TEST',
      }),
    },
    navigator: { mediaDevices: {} },
    addEventListener: noop,
  };
  sandbox.window = sandbox;
  sandbox.ReactNativeWebView = {
    postMessage: (raw) => postedMessages.push(JSON.parse(raw)),
  };

  const ctx = vm.createContext(sandbox);
  for (const match of scriptMatches) {
    const body = match[1].trim();
    if (!body) continue;
    vm.runInContext(body, ctx);
  }

  // Construct 33 upright MediaPipe landmarks (facing camera, right-handed guard)
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));
  lm[0] = { x: 0.5, y: 0.2, z: -0.05, visibility: 0.99 }; // nose
  lm[2] = { x: 0.52, y: 0.19, z: -0.05, visibility: 0.95 }; // left eye
  lm[5] = { x: 0.48, y: 0.19, z: -0.05, visibility: 0.95 }; // right eye
  lm[11] = { x: 0.62, y: 0.35, z: 0, visibility: 0.98 }; // leftShoulder
  lm[12] = { x: 0.38, y: 0.35, z: 0, visibility: 0.98 }; // rightShoulder
  lm[13] = { x: 0.65, y: 0.45, z: 0, visibility: 0.95 }; // leftElbow
  lm[14] = { x: 0.34, y: 0.42, z: -0.04, visibility: 0.95 }; // rightElbow
  lm[15] = { x: 0.55, y: 0.42, z: -0.05, visibility: 0.95 }; // leftWrist
  lm[16] = { x: 0.30, y: 0.30, z: -0.08, visibility: 0.96 }; // rightWrist
  lm[19] = { x: 0.54, y: 0.41, z: -0.05, visibility: 0.9 }; // leftIndex
  lm[20] = { x: 0.29, y: 0.28, z: -0.08, visibility: 0.9 }; // rightIndex
  lm[23] = { x: 0.58, y: 0.62, z: 0, visibility: 0.95 }; // leftHip
  lm[24] = { x: 0.42, y: 0.62, z: 0, visibility: 0.95 }; // rightHip
  lm[25] = { x: 0.60, y: 0.78, z: 0.02, visibility: 0.9 }; // leftKnee
  lm[26] = { x: 0.40, y: 0.78, z: 0.02, visibility: 0.9 }; // rightKnee
  lm[27] = { x: 0.61, y: 0.92, z: 0.04, visibility: 0.85 }; // leftAnkle
  lm[28] = { x: 0.39, y: 0.92, z: 0.04, visibility: 0.85 }; // rightAnkle

  vm.runInContext('drawOutput', ctx)({ landmarks: [lm] });

  assert.equal(
    consoleWarnings.some((w) => w.includes('drawOutput error')),
    false,
    `drawOutput threw runtime error: ${consoleWarnings.join(' | ')}`
  );

  const poseMessages = postedMessages.filter((m) => m.type === 'POSE_DATA');
  assert.equal(poseMessages.length, 1, 'Expected one POSE_DATA emission');
  assert.equal(poseMessages[0].persons.length, 1);

  const emittedPerson = poseMessages[0].persons[0];
  assert.equal(emittedPerson.detectedStrike, null);
  assert.equal(emittedPerson.isPersonVisible, true);
  assert.ok(Number.isFinite(emittedPerson.accuracy));
  assert.equal(emittedPerson.rawPose2d.coordinateSpace, 'raw_unmirrored_normalized');
  assert.equal(emittedPerson.rawPose2d.frameWidth, 640);
  assert.equal(emittedPerson.rawPose2d.frameHeight, 480);
  assert.ok(emittedPerson.rawPose2d.landmarks.rightWrist);
});

test('poseEngineHtml: 1-Euro landmark smoothing damps jitter while preserving rawPose2d', () => {
  const html = getPoseEngineHtml('https://example.com/pose_landmarker_lite.task');
  const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];

  let simNowMs = 1000;
  const postedMessages = [];
  const noop = () => {};
  const mockCtx = new Proxy(
    {
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      font: '12px sans-serif',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      shadowColor: 'transparent',
      shadowBlur: 0,
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      measureText: (t) => ({ width: String(t || '').length * 8 }),
    },
    { get: (t, p) => (p in t ? t[p] : noop) }
  );

  const mockCanvas = { width: 640, height: 480, getContext: () => mockCtx, toDataURL: () => '' };
  const mockVideo = { readyState: 2, videoWidth: 640, videoHeight: 480 };
  const mockLoadingEl = { classList: { add: noop, remove: noop }, textContent: '' };

  const sandbox = {
    console: { log: noop, warn: noop, error: noop },
    Math,
    Date,
    JSON,
    Number,
    String,
    Array,
    Object,
    setTimeout,
    clearTimeout,
    performance: { now: () => simNowMs },
    requestAnimationFrame: noop,
    document: {
      readyState: 'loading',
      getElementById: (id) => (id === 'output_canvas' ? mockCanvas : id === 'webcam' ? mockVideo : mockLoadingEl),
      createElement: () => mockCanvas,
    },
    navigator: { mediaDevices: {} },
    addEventListener: noop,
  };
  sandbox.window = sandbox;
  sandbox.ReactNativeWebView = { postMessage: (raw) => postedMessages.push(JSON.parse(raw)) };

  const ctx = vm.createContext(sandbox);
  for (const match of scriptMatches) {
    const body = match[1].trim();
    if (body) vm.runInContext(body, ctx);
  }

  const smoothFn = vm.runInContext('smoothPoseLandmarks', ctx);
  const drawFn = vm.runInContext('drawOutput', ctx);

  // Build valid human landmarks and inject high-frequency noise on rightWrist.x across 33ms steps
  const makeFrame = (wristX) => {
    const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));
    lm[0] = { x: 0.5, y: 0.2, z: -0.05, visibility: 0.99 };
    lm[2] = { x: 0.52, y: 0.19, z: -0.05, visibility: 0.95 };
    lm[5] = { x: 0.48, y: 0.19, z: -0.05, visibility: 0.95 };
    lm[11] = { x: 0.62, y: 0.35, z: 0, visibility: 0.98 };
    lm[12] = { x: 0.38, y: 0.35, z: 0, visibility: 0.98 };
    lm[13] = { x: 0.65, y: 0.45, z: 0, visibility: 0.95 };
    lm[14] = { x: 0.34, y: 0.42, z: -0.04, visibility: 0.95 };
    lm[15] = { x: 0.55, y: 0.42, z: -0.05, visibility: 0.95 };
    lm[16] = { x: wristX, y: 0.32, z: -0.08, visibility: 0.96 };
    lm[19] = { x: 0.54, y: 0.41, z: -0.05, visibility: 0.9 };
    lm[20] = { x: wristX - 0.01, y: 0.30, z: -0.08, visibility: 0.9 };
    lm[23] = { x: 0.58, y: 0.62, z: 0, visibility: 0.95 };
    lm[24] = { x: 0.42, y: 0.62, z: 0, visibility: 0.95 };
    lm[25] = { x: 0.60, y: 0.78, z: 0.02, visibility: 0.9 };
    lm[26] = { x: 0.40, y: 0.78, z: 0.02, visibility: 0.9 };
    lm[27] = { x: 0.61, y: 0.92, z: 0.04, visibility: 0.85 };
    lm[28] = { x: 0.39, y: 0.92, z: 0.04, visibility: 0.85 };
    return lm;
  };

  // Direct smoothPoseLandmarks test with oscillating +/-0.04 jitter
  const s0 = smoothFn(0, makeFrame(0.30), 1000);
  const s1 = smoothFn(0, makeFrame(0.34), 1033);
  const s2 = smoothFn(0, makeFrame(0.26), 1066);
  const rawSwingDelta = Math.abs(0.34 - 0.26); // 0.08
  const smoothedDelta = Math.abs(s1[16].x - s2[16].x);
  assert.equal(s0[16].x, 0.30);
  assert.ok(smoothedDelta < rawSwingDelta, `Expected smoothed delta (${smoothedDelta}) < raw delta (${rawSwingDelta})`);

  // Verify drawOutput retains raw unsmoothed landmarks in rawPose2d and emits chamberReadinessScore + trajectoryAccuracy
  simNowMs = 2000;
  drawFn({ landmarks: [makeFrame(0.34)] });
  simNowMs = 2060;
  drawFn({ landmarks: [makeFrame(0.26)] });

  const poseMsgs = postedMessages.filter((m) => m.type === 'POSE_DATA');
  assert.equal(poseMsgs.length, 2);
  const secondPerson = poseMsgs[1].persons[0];
  assert.equal(secondPerson.rawPose2d.landmarks.rightWrist.x, 0.26);
  assert.ok(Number.isFinite(secondPerson.chamberReadinessScore));
  assert.ok(Number.isFinite(secondPerson.trajectoryAccuracy));
});

test('strikeEvaluator: uncapped chamberScore, unified strikingArm pillar, and computeDtwTrajectoryScore', () => {
  const rule = STRIKE_RULES.strike_1;

  // 1. Static hold caps accuracy <= 55, while chamberScore remains uncapped
  const chamberEval = strikeEval.evaluatePoseFrame(
    {
      id: 0,
      leftAngle: 75,
      rightAngle: rule.chamber_elb,
      leftShoulderAngle: 50,
      rightShoulderAngle: rule.ideal_shoulder,
      leftKneeAngle: 155,
      rightKneeAngle: 155,
      leftWristAngle: 10,
      rightWristAngle: 10,
      isLeftGood: true,
      isRightGood: true,
      isHoldingLeft: false,
      isHoldingRight: true,
      isPersonVisible: true,
      accuracy: 90,
      elbowScore: 100,
      shoulderScore: 100,
      wristScore: 100,
      kneeScore: 95,
      guardScore: 95,
      stanceScore: 95,
      trajectoryAccuracy: 50,
      leadKneeAngle: 155,
      isStaticHold: true,
    },
    rule
  );

  assert.ok(chamberEval.accuracy <= 55);
  assert.ok(chamberEval.chamberScore >= 90, `Expected uncapped chamberScore >= 90, got ${chamberEval.chamberScore}`);
  // Balanced calibration: 100*0.38 + 100*0.22 + 50*0.40 = 38 + 22 + 20 = 80
  assert.equal(chamberEval.pillars.strikingArm, 80);

  // 2. Angle-only fallback (no trajectoryAccuracy): 100*0.65 + 50*0.35 = 83
  const compiledAngleOnly = strikeEval.compileSessionResult(
    {
      score: 85,
      elbowScore: 100,
      shoulderScore: 50,
      wristScore: 90,
      guardScore: 90,
      stanceScore: 90,
    },
    rule
  );
  assert.equal(compiledAngleOnly.pillarScores.strikingArm, 83);

  // 3. computeDtwTrajectoryScore handles missing/short vs evaluated reports
  assert.equal(strikeEval.computeDtwTrajectoryScore(null), null);
  assert.equal(
    strikeEval.computeDtwTrajectoryScore({
      strikeId: 'strike_1',
      referenceStatus: 'no_reference_loaded',
      isNonGradingShadow: true,
      normalizationMeta: {
        normalizationVersion: 'v2_median_shoulder_width',
        coordinateConvention: 'anatomical_mirrored_2d',
        fixedMedianShoulderWidthPx: 120,
        shoulderWidthSampleCount: 10,
        shoulderWidthIqrPx: [118, 122],
        scaleSource: 'recording_window_median',
        aspectRatio: 1.33,
      },
      measurementCoverage: {
        totalFrames: 10,
        validNormalizedFrames: 10,
        validFrameRatio: 1,
        facingOrientationConsistentRatio: 1,
        jointCoverage: {
          rightWrist: 1,
          rightElbow: 1,
          rightShoulder: 1,
          leftWrist: 1,
          leftElbow: 1,
          leftShoulder: 1,
          rightKnee: 1,
          leftKnee: 1,
        },
      },
      trajectoryMetrics: null,
      kinematicLandmarks: null,
      jointComparisons2D: [],
      notes: [],
    }),
    null
  );

  const dtwPerfect = strikeEval.computeDtwTrajectoryScore({
    strikeId: 'strike_1',
    referenceStatus: 'evaluated',
    isNonGradingShadow: true,
    normalizationMeta: {
      normalizationVersion: 'v2_median_shoulder_width',
      coordinateConvention: 'anatomical_mirrored_2d',
      fixedMedianShoulderWidthPx: 120,
      shoulderWidthSampleCount: 10,
      shoulderWidthIqrPx: [118, 122],
      scaleSource: 'recording_window_median',
      aspectRatio: 1.33,
    },
    measurementCoverage: {
      totalFrames: 10,
      validNormalizedFrames: 10,
      validFrameRatio: 1,
      facingOrientationConsistentRatio: 1,
      jointCoverage: {
        rightWrist: 1,
        rightElbow: 1,
        rightShoulder: 1,
        leftWrist: 1,
        leftElbow: 1,
        leftShoulder: 1,
        rightKnee: 1,
        leftKnee: 1,
      },
    },
    trajectoryMetrics: {
      dtwMeanDistance: 0.2,
      dtwMedianDistance: 0.2,
      dtwRmsDistance: 0.22,
      dtwMaxDistance: 0.3,
      linearMeanDistance: 0.25,
      linearMedianDistance: 0.25,
      linearRmsDistance: 0.28,
      linearMaxDistance: 0.35,
      dtwConstraint: {
        mode: 'sakoe_chiba_band',
        requestedOffsetPoints: 4,
        allowedOffsetPoints: 4,
        referencePoints: 50,
        isExperimentalConfig: true,
      },
      warpingPathLength: 50,
      timingDistortionMeanNorm: 0.02,
      timingDistortionMaxNorm: 0.05,
      timingDistortionMeanRefPoints: 1,
      timingDistortionMaxRefPoints: 2,
      directionCosineMean: 0.98,
      directionAgreementFraction: 1,
      pathLengthUser: 1.5,
      pathLengthReference: 1.5,
      pathLengthRatio: 1,
      iqrContainmentFraction: 0.9,
      userSampleCount: 10,
      referenceSampleCount: 50,
      alignedPairCount: 50,
    },
    kinematicLandmarks: null,
    jointComparisons2D: [],
    notes: [],
  });
  assert.equal(dtwPerfect, 100);
});

test('ImpactDetector: selects bent-arm canonical apex over straight-arm windup on Strike 3 and backfills snapshot', () => {
  const detector = new ImpactDetector();
  const rule3 = STRIKE_RULES.strike_3; // optimal_min: 88.4, optimal_max: 115.0
  detector.reset(Date.now() - 800);

  const templatePose = {
    id: 0,
    leftAngle: 75,
    rightAngle: 168,
    leftShoulderAngle: 50,
    rightShoulderAngle: 20,
    leftKneeAngle: 155,
    rightKneeAngle: 155,
    leftWristAngle: 10,
    rightWristAngle: 10,
    isLeftGood: true,
    isRightGood: false,
    isHoldingLeft: false,
    isHoldingRight: true,
    isPersonVisible: true,
    accuracy: 58,
    elbowScore: 55,
    shoulderScore: 60,
    wristScore: 85,
    kneeScore: 85,
    guardScore: 85,
    stanceScore: 85,
    leadKneeAngle: 155,
    swingVelocity: 0.20,
    isApex: false,
  };

  // Frame 0: Extended straight-arm windup (168 deg) — previously fooled naive elbow-max detector
  detector.addFrame(templatePose, rule3);

  // Frame 1: Canonical flexed Strike 3 impact angle (102 deg), even without explicit isApex flag
  detector.addFrame(
    {
      ...templatePose,
      rightAngle: 102,
      rightShoulderAngle: rule3.ideal_shoulder,
      isRightGood: true,
      accuracy: 92,
      swingVelocity: 0.24,
      isApex: false,
    },
    rule3
  );

  // Frame 2: Async snapshot arrives 1 frame later
  detector.addFrame(
    {
      ...templatePose,
      rightAngle: 130,
      accuracy: 70,
      swingVelocity: 0.10,
      isApex: false,
    },
    rule3,
    'data:image/jpeg;base64,ASYNC_BENT_ARM_SNAP'
  );

  const res = detector.finalize(1200);
  assert.equal(res.impactFrame, 1);
  assert.equal(res.detectedPose.rightAngle, 102);
  assert.equal(res.snapshotBase64, 'data:image/jpeg;base64,ASYNC_BENT_ARM_SNAP');
});

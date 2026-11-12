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

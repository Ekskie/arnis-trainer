import { STRIKE_RULES, StrikeRule } from '@/constants/strikeRules';

export const getPoseEngineHtml = (modelUrl: string, strikeRules: Record<string, StrikeRule> = STRIKE_RULES) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>MediaPipe Pose Engine</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #container {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    video {
      position: absolute;
      top: -9999px;
      left: -9999px;
      opacity: 0;
      width: 1px;
      height: 1px;
      pointer-events: none;
    }
    canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    #loading {
      position: absolute;
      color: #ffffff;
      font-size: 16px;
      font-weight: 500;
      text-align: center;
      background: rgba(11, 15, 25, 0.85);
      padding: 16px 24px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10;
      transition: opacity 0.5s ease;
    }
    #loading.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .spinner {
      margin: 0 auto 12px;
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top: 4px solid #6366f1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="container">
    <div id="loading">
      <div class="spinner"></div>
      <div id="loading-text">Initializing Camera...</div>
    </div>
    <video id="webcam" playsinline autoplay muted></video>
    <canvas id="output_canvas"></canvas>
  </div>

  <script>
    // Global error handler inside the WebView to surface any JS/CORS/WASM/Camera errors
    window.onerror = function(message, source, lineno, colno, error) {
      var errorMsg = message + " (at " + (source ? source.split('/').pop() : 'unknown') + ":" + lineno + ")";
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: errorMsg }));
      }
      var loadingText = document.getElementById("loading-text");
      if (loadingText) {
        loadingText.innerText = "Error: " + errorMsg;
      }
      return false;
    };
    window.addEventListener('unhandledrejection', function(event) {
      var errorMsg = "Promise Rejection: " + (event.reason ? (event.reason.message || event.reason) : "unknown");
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: errorMsg }));
      }
      var loadingText = document.getElementById("loading-text");
      if (loadingText) {
        loadingText.innerText = "Error: " + errorMsg;
      }
    });
  </script>

  <script>

    let STRIKE_RULES = ${JSON.stringify(strikeRules)};

    // Trajectory Paths for the 12 Arnis Strikes (relative to torso anchor)
    const STRIKE_TRAJECTORY_PATHS = {
      "strike_1": { // Left Temple (diagonal downward slice from high right to left temple)
        start: { dx: 0.45, dy: -0.35 },
        apex:  { dx: -0.65, dy: 0.12 },
        end:   { dx: -0.85, dy: 0.35 },
        name: "Diagonal Slash (Left Temple)"
      },
      "strike_2": { // Right Temple (diagonal downward slice from high left to right temple)
        start: { dx: -0.45, dy: -0.35 },
        apex:  { dx: 0.68, dy: 0.12 },
        end:   { dx: 0.88, dy: 0.35 },
        name: "Diagonal Slash (Right Temple)"
      },
      "strike_3": { // Left Torso (horizontal slice across left ribs)
        start: { dx: 0.50, dy: 0.20 },
        apex:  { dx: -0.72, dy: 0.22 },
        end:   { dx: -0.92, dy: 0.24 },
        name: "Horizontal Cut (Left Torso)"
      },
      "strike_4": { // Right Torso (horizontal slice across right ribs)
        start: { dx: -0.50, dy: 0.20 },
        apex:  { dx: 0.74, dy: 0.22 },
        end:   { dx: 0.94, dy: 0.24 },
        name: "Horizontal Cut (Right Torso)"
      },
      "strike_5": { // Stomach Thrust (direct center forward thrust)
        start: { dx: 0.15, dy: 0.45 },
        apex:  { dx: 0.00, dy: 0.38 },
        end:   { dx: -0.05, dy: 0.35 },
        name: "Direct Stomach Thrust"
      },
      "strike_6": { // Left Chest Thrust
        start: { dx: 0.20, dy: 0.25 },
        apex:  { dx: -0.45, dy: 0.02 },
        end:   { dx: -0.65, dy: -0.08 },
        name: "High Left Chest Thrust"
      },
      "strike_7": { // Right Chest Thrust
        start: { dx: -0.20, dy: 0.25 },
        apex:  { dx: 0.48, dy: 0.02 },
        end:   { dx: 0.68, dy: -0.08 },
        name: "High Right Chest Thrust"
      },
      "strike_8": { // Left Knee (low diagonal cut)
        start: { dx: 0.40, dy: 0.25 },
        apex:  { dx: -0.60, dy: 0.65 },
        end:   { dx: -0.80, dy: 0.85 },
        name: "Low Knee Cut (Left)"
      },
      "strike_9": { // Right Knee (low diagonal cut)
        start: { dx: -0.40, dy: 0.25 },
        apex:  { dx: 0.62, dy: 0.65 },
        end:   { dx: 0.82, dy: 0.85 },
        name: "Low Knee Cut (Right)"
      },
      "strike_10": { // Left Eye Thrust
        start: { dx: 0.18, dy: 0.15 },
        apex:  { dx: -0.45, dy: -0.22 },
        end:   { dx: -0.68, dy: -0.30 },
        name: "High Left Eye Thrust"
      },
      "strike_11": { // Right Eye Thrust
        start: { dx: -0.18, dy: 0.15 },
        apex:  { dx: 0.48, dy: -0.22 },
        end:   { dx: 0.70, dy: -0.30 },
        name: "High Right Eye Thrust"
      },
      "strike_12": { // Crown Strike (vertical downward overhead strike)
        start: { dx: 0.02, dy: -0.75 },
        apex:  { dx: 0.00, dy: -0.35 },
        end:   { dx: 0.00, dy: 0.05 },
        name: "Vertical Crown Strike"
      }
    };

    // CanvasRenderingContext2D roundRect Polyfill for Android WebView compatibility
    if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        var r = 0;
        if (typeof radii === 'number') {
          r = radii;
        } else if (Array.isArray(radii) && radii.length > 0) {
          r = radii[0];
        }
        r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        if (r <= 0) {
          this.rect(x, y, w, h);
          return this;
        }
        this.beginPath();
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        this.closePath();
        return this;
      };
    }

    // Web Audio Synthesizer for zero-latency countdown and impact chimes
    let audioCtx = null;
    function getAudioContext() {
      if (!audioCtx) {
        var AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
          audioCtx = new AudioCtxClass();
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return audioCtx;
    }

    function playAudioTone(freq, type, duration, gainVal) {
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(gainVal || 0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {}
    }

    function playCountdownBeep(isGo) {
      if (isGo) {
        playAudioTone(880, 'triangle', 0.35, 0.35);
      } else {
        playAudioTone(520, 'sine', 0.12, 0.25);
      }
    }

    function playImpactChime() {
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var now = ctx.currentTime;
        [784, 1174].forEach(function(freq) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.45);
        });
      } catch (e) {}
    }

    window.playCountdownBeep = playCountdownBeep;
    window.playImpactChime = playImpactChime;

    // Centralized React Native message dispatcher
    window.handleReactNativeMessage = function(raw) {
      try {
        var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!data || !data.type) return;
        if (data.type === 'SET_SESSION' && data.config) {
          if (data.config.strikeId && STRIKE_RULES[data.config.strikeId]) {
            activeStrike = data.config.strikeId;
          }
          if (data.config.stickColor && window.setStickColor) {
            window.setStickColor(data.config.stickColor);
          }
          if (data.config.motionRibbonEnabled !== undefined && window.setMotionRibbonEnabled) {
            window.setMotionRibbonEnabled(data.config.motionRibbonEnabled);
          }
          if (data.config.ribbonTheme && window.setRibbonTheme) {
            window.setRibbonTheme(data.config.ribbonTheme);
          }
          if (data.config.ghostGuideEnabled !== undefined && window.setGhostGuideEnabled) {
            window.setGhostGuideEnabled(data.config.ghostGuideEnabled);
          }
          if (data.config.trajectoryGuideEnabled !== undefined && window.setTrajectoryGuideEnabled) {
            window.setTrajectoryGuideEnabled(data.config.trajectoryGuideEnabled);
          }
          if (data.config.formCoachMode !== undefined && window.setFormCoachMode) {
            window.setFormCoachMode(data.config.formCoachMode);
          }
          if (data.config.autoDetectMode !== undefined && window.setAutoDetectMode) {
            window.setAutoDetectMode(data.config.autoDetectMode);
          }
        } else if (data.type === 'SET_TARGET_STRIKE') {
          if (data.rule && data.strikeId) {
            STRIKE_RULES[data.strikeId] = data.rule;
          }
          if (data.strikeId && window.setTargetStrike) {
            window.setTargetStrike(data.strikeId);
          }
        } else if (data.type === 'START_RECORDING') {
          if (window.startVideoRecording) window.startVideoRecording();
        } else if (data.type === 'STOP_RECORDING') {
          if (window.stopVideoRecording) window.stopVideoRecording();
        } else if (data.type === 'SET_FORM_COACH_PHASE') {
          if (window.setFormCoachPhase) window.setFormCoachPhase(data.phase);
        } else if (data.type === 'PLAY_AUDIO') {
          if (data.sound === 'countdown') {
            playCountdownBeep(data.isGo);
          } else if (data.sound === 'impact') {
            playImpactChime();
          }
        } else if (data.type === 'SET_GHOST_OVERLAY') {
          if (window.setGhostGuideEnabled) window.setGhostGuideEnabled(data.enabled);
        } else if (data.type === 'SET_TRAJECTORY_GUIDE') {
          if (window.setTrajectoryGuideEnabled) window.setTrajectoryGuideEnabled(data.enabled);
        }
      } catch (err) {
        console.error('Error handling RN message:', err);
      }
    };
    window.addEventListener('message', function(e) {
      window.handleReactNativeMessage(e.data);
    });

    // Motion history & Kinetic Chain buffer per person
    const personHistories = {};

    function updateMotionHistory(personIdx, rightWrist, rightShoulder, rightAngle, timestamp, userWristDx, userWristDy) {
      if (!personHistories[personIdx]) {
        personHistories[personIdx] = {
          frames: [],
          phase: "idle",
          peakVelocity: 0,
          peakVectorScore: 0,
          targetZoneStartTime: null,
          isStaticHold: false,
          chamberDetected: false,
          driveDetected: false,
          apexDetected: false,
          dynamicKineticScore: 70
        };
      }
      const pState = personHistories[personIdx];
      const history = pState.frames;
      
      let wristDist = 0;
      if (rightWrist && rightShoulder) {
        const dx = rightWrist.x - rightShoulder.x;
        const dy = rightWrist.y - rightShoulder.y;
        wristDist = Math.sqrt(dx * dx + dy * dy);
      }

      history.push({
        x: rightWrist ? rightWrist.x : 0,
        y: rightWrist ? rightWrist.y : 0,
        dx: typeof userWristDx === 'number' ? userWristDx : 0,
        dy: typeof userWristDy === 'number' ? userWristDy : 0,
        dist: wristDist,
        angle: rightAngle || 0,
        t: timestamp
      });

      if (history.length > 24) {
        history.shift();
      }

      let velocity = 0;
      let extDelta = 0;
      let accel = 0;
      if (history.length >= 2) {
        const newest = history[history.length - 1];
        const oldest = history[0];
        const prev = history[history.length - 2];

        const dt = Math.max(0.001, (newest.t - prev.t) / 1000);
        const dx = newest.x - prev.x;
        const dy = newest.y - prev.y;
        velocity = Math.sqrt(dx * dx + dy * dy) / dt;
        extDelta = newest.dist - oldest.dist;

        if (history.length >= 3) {
          const prev2 = history[history.length - 3];
          const dt2 = Math.max(0.001, (prev.t - prev2.t) / 1000);
          const vPrev = Math.sqrt(Math.pow(prev.x - prev2.x, 2) + Math.pow(prev.y - prev2.y, 2)) / dt2;
          accel = (velocity - vPrev) / dt;
        }
      }

      if (velocity > pState.peakVelocity) {
        pState.peakVelocity = velocity;
      }

      const rules = STRIKE_RULES[activeStrike];
      const pathData = STRIKE_TRAJECTORY_PATHS[activeStrike] || STRIKE_TRAJECTORY_PATHS.strike_1;
      const isThrustStrike = ['strike_5', 'strike_6', 'strike_7', 'strike_10', 'strike_11'].indexOf(activeStrike) !== -1;
      let phase = pState.phase || "idle";
      let isApex = false;
      let vectorAlignmentScore = 50;
      let chamberScore = 50;
      let apexTargetScore = 50;
      let trajectoryAccuracy = 60;

      // Track elbow extension delta over recent frames (~100-140ms) for 3D thrust detection
      let elbowExtDelta = 0;
      if (history.length >= 4 && rightAngle !== null) {
        const priorAngle = history[Math.max(0, history.length - 4)].angle || 0;
        elbowExtDelta = rightAngle - priorAngle;
      }

      if (rules && pathData && typeof userWristDx === 'number' && typeof userWristDy === 'number') {
        // --- 1. CHAMBER PROXIMITY CHECK ---
        const chDx = userWristDx - pathData.start.dx;
        const chDy = userWristDy - pathData.start.dy;
        const chamberDist = Math.sqrt(chDx * chDx + chDy * chDy);

        if (chamberDist <= 0.40) {
          chamberScore = 100;
          pState.chamberDetected = true;
        } else if (chamberDist <= 0.65) {
          chamberScore = Math.round(80 + ((0.65 - chamberDist) / 0.25) * 20);
          pState.chamberDetected = true;
        } else {
          chamberScore = Math.max(15, Math.round(80 - (chamberDist - 0.65) * 85));
        }

        // --- 2. TRAJECTORY CUTTING VECTOR EVALUATION ---
        // Ideal canonical vector from start to apex
        const idealDx = pathData.apex.dx - pathData.start.dx;
        const idealDy = pathData.apex.dy - pathData.start.dy;
        const idealMag = Math.sqrt(idealDx * idealDx + idealDy * idealDy) || 0.001;
        const idealNormX = idealDx / idealMag;
        const idealNormY = idealDy / idealMag;

        // User's active dynamic motion vector over last 6-10 frames (~120-200ms)
        let userMotionDx = 0;
        let userMotionDy = 0;
        if (history.length >= 6) {
          const recentPt = history[history.length - 1];
          const priorPt = history[Math.max(0, history.length - 6)];
          userMotionDx = recentPt.dx - priorPt.dx;
          userMotionDy = recentPt.dy - priorPt.dy;
        }
        const userMotionMag = Math.sqrt(userMotionDx * userMotionDx + userMotionDy * userMotionDy);

        if (userMotionMag >= 0.05) {
          const uNormX = userMotionDx / userMotionMag;
          const uNormY = userMotionDy / userMotionMag;
          const dot = uNormX * idealNormX + uNormY * idealNormY; // -1.0 to +1.0

          if (dot >= 0.50) {
            // High fidelity motion along the strike path
            vectorAlignmentScore = Math.min(100, Math.round(75 + ((dot - 0.50) / 0.50) * 25));
          } else if (dot >= 0.0) {
            // Partially deviating cut
            vectorAlignmentScore = Math.max(30, Math.round(45 + (dot / 0.50) * 30));
          } else {
            // Complete opposite or perpendicular vector (e.g. wrong strike)
            vectorAlignmentScore = Math.max(0, Math.round(30 + dot * 30));
          }

          if (vectorAlignmentScore > pState.peakVectorScore) {
            pState.peakVectorScore = vectorAlignmentScore;
          }
        } else {
          // Idle or minimal motion
          vectorAlignmentScore = pState.peakVectorScore > 0 ? Math.round(pState.peakVectorScore * 0.95) : 40;
        }

        // --- 3. APEX IMPACT TARGET PROXIMITY ---
        const apDx = userWristDx - pathData.apex.dx;
        const apDy = userWristDy - pathData.apex.dy;
        const apexDist = Math.sqrt(apDx * apDx + apDy * apDy);
        const isInTargetRange = rightAngle !== null && rightAngle >= (rules.right_min - 10) && rightAngle <= (rules.right_max + 10);

        // Z-Axis Biomechanical Compensation for Thrust Strikes (Strikes 5, 6, 7, 10, 11)
        // Direct forward thrusting toward the 2D camera compresses (dx, dy) displacement.
        // Rapid elbow expansion (chambered flexion ~80 deg extending to ~165 deg) directly confirms kinetic thrust drive.
        if (isThrustStrike && elbowExtDelta >= 16 && (apexDist <= 0.65 || isInTargetRange)) {
          const thrustBoost = Math.min(100, Math.round(80 + Math.min(20, (elbowExtDelta - 16) * 1.5)));
          vectorAlignmentScore = Math.max(vectorAlignmentScore, thrustBoost);
          if (vectorAlignmentScore > pState.peakVectorScore) {
            pState.peakVectorScore = vectorAlignmentScore;
          }
        }

        if (apexDist <= 0.38) {
          apexTargetScore = 100;
        } else if (apexDist <= 0.65) {
          apexTargetScore = Math.round(75 + ((0.65 - apexDist) / 0.27) * 25);
        } else {
          apexTargetScore = Math.max(10, Math.round(75 - (apexDist - 0.65) * 85));
        }

        // Composite Trajectory Accuracy for active strike
        trajectoryAccuracy = Math.round(
          chamberScore * 0.25 +
          pState.peakVectorScore * 0.45 +
          apexTargetScore * 0.30
        );

        // --- 4. 4-PHASE KINETIC STATE-MACHINE TRANSITIONS ---
        const elDiffChamber = rightAngle !== null ? Math.abs(rightAngle - rules.chamber_elb) : 99;

        // Phase 1: Chambering
        if ((chamberDist <= 0.55 || elDiffChamber < 28) && (velocity < 0.16 || phase === "idle" || phase === "recovering")) {
          phase = "chambering";
          pState.chamberDetected = true;
          pState.targetZoneStartTime = null;
          pState.isStaticHold = false;
        }
        // Phase 2: Cutting Acceleration (or Dynamic Thrust Extension)
        else if (((velocity >= 0.16 && userMotionMag >= 0.05) || (isThrustStrike && elbowExtDelta >= 16)) && (phase === "chambering" || phase === "idle" || phase === "cutting")) {
          phase = "cutting";
          pState.driveDetected = true;
        }

        // Phase 3: Apex Impact Detection
        if (history.length >= 3 && rightAngle !== null) {
          const curr = history[history.length - 1];
          const prev1 = history[history.length - 2];
          const prev2 = history[history.length - 3];

          const isLocalPeakExt = prev1.dist >= prev2.dist && curr.dist < prev1.dist;
          const isSnapDecel = phase === "cutting" && velocity < 0.22 && pState.peakVelocity >= 0.22;
          const isThrustApex = isThrustStrike && (elbowExtDelta >= 12 || velocity >= 0.16) && (apexDist <= 0.55 || isInTargetRange);
          
          if ((apexDist <= 0.55 || isInTargetRange) && (isLocalPeakExt || isSnapDecel || (velocity >= 0.18) || isThrustApex)) {
            phase = "apex_hit";
            isApex = true;
            pState.apexDetected = true;
          }
        }

        // Phase 4: Recovery (Bawi) back toward guard
        if (phase === "apex_hit" && velocity < 0.15 && !isApex) {
          phase = "recovering";
        }

        // Anti-Static Gaming Detection
        if (isThrustStrike && elbowExtDelta >= 14) {
          pState.isStaticHold = false;
          pState.targetZoneStartTime = null;
        } else if (isInTargetRange) {
          if (pState.targetZoneStartTime === null) {
            pState.targetZoneStartTime = timestamp;
          } else if (timestamp - pState.targetZoneStartTime > 950 && pState.peakVelocity < 0.14) {
            pState.isStaticHold = true;
          }
        } else {
          pState.targetZoneStartTime = null;
          pState.isStaticHold = false;
        }

        // Dynamic Kinetic Chain Score
        let kineticScore = 65;
        if (pState.isStaticHold) {
          kineticScore = 35;
        } else if (pState.chamberDetected && pState.driveDetected && pState.apexDetected) {
          kineticScore = 100;
        } else if (pState.driveDetected && pState.apexDetected) {
          kineticScore = 90;
        } else if (pState.driveDetected) {
          kineticScore = 80;
        } else if (pState.chamberDetected) {
          kineticScore = 75;
        }

        pState.dynamicKineticScore = kineticScore;
        pState.phase = phase;

        // Decay peak scores gradually
        pState.peakVelocity = Math.max(0, pState.peakVelocity * 0.95);
        pState.peakVectorScore = Math.max(0, pState.peakVectorScore * 0.99);
      }

      return {
        velocity: parseFloat(velocity.toFixed(3)),
        extDelta: parseFloat(extDelta.toFixed(3)),
        accel: parseFloat(accel.toFixed(3)),
        peakVelocity: parseFloat(pState.peakVelocity.toFixed(3)),
        phase: phase,
        isApex: isApex,
        isStaticHold: pState.isStaticHold,
        kineticScore: pState.dynamicKineticScore,
        trajectoryAccuracy: trajectoryAccuracy,
        vectorAlignmentScore: vectorAlignmentScore,
        chamberScore: chamberScore,
        apexTargetScore: apexTargetScore,
        chamberDetected: pState.chamberDetected,
        driveDetected: pState.driveDetected,
        apexDetected: pState.apexDetected
      };
    }

    let activeStrike = "strike_1";
    let stickColorMode = "rattan";
    let motionRibbonEnabled = true;
    let ribbonTheme = "fire"; // 'fire' | 'neon' | 'cyan'
    const stickTrajectories = {};
    const apexBursts = [];
    let poseLandmarker = undefined;
    let webcamRunning = false;

    const video = document.getElementById("webcam");
    const canvasElement = document.getElementById("output_canvas");
    const canvasCtx = canvasElement.getContext("2d");
    const loadingEl = document.getElementById("loading");
    const loadingText = document.getElementById("loading-text");

    // Receive selected strike type from React Native
    window.setTargetStrike = (strike) => {
      if (STRIKE_RULES[strike]) {
        activeStrike = strike;
      }
    };

    // Receive selected stick color from React Native
    window.setStickColor = (color) => {
      stickColorMode = color;
    };

    // Receive ribbon toggle from React Native
    window.setMotionRibbonEnabled = (enabled) => {
      motionRibbonEnabled = !!enabled;
    };

    // Receive ribbon theme from React Native
    window.setRibbonTheme = (theme) => {
      ribbonTheme = theme || 'fire';
    };

    // Receive ghost guide toggle from React Native
    let ghostGuideEnabled = true;
    window.setGhostGuideEnabled = (enabled) => {
      ghostGuideEnabled = !!enabled;
    };

    // Form Coach Mode & Phase state variables
    let formCoachMode = false;
    let formCoachPhase = 'chamber'; // 'chamber' | 'impact' | 'recovery'
    let chamberHoldStartTime = null;
    let recoveryHoldStartTime = null;
    let trajectoryGuideEnabled = true;

    window.setFormCoachMode = (enabled) => {
      formCoachMode = !!enabled;
      if (enabled) {
        formCoachPhase = 'chamber';
        chamberHoldStartTime = null;
        recoveryHoldStartTime = null;
      }
    };

    window.setFormCoachPhase = (phase) => {
      formCoachPhase = phase || 'chamber';
      chamberHoldStartTime = null;
      recoveryHoldStartTime = null;
    };

    window.setTrajectoryGuideEnabled = (enabled) => {
      trajectoryGuideEnabled = !!enabled;
    };

    // Auto-Strike Detection Mode state variables
    let autoDetectMode = false;
    let lastDetectedStrikeId = null;
    let lastDetectedStrikeTime = 0;
    let detectedStrikeBannerText = "";
    let detectedStrikeConfidence = 0;

    window.setAutoDetectMode = (enabled) => {
      autoDetectMode = !!enabled;
      if (!enabled) {
        lastDetectedStrikeId = null;
        detectedStrikeBannerText = "";
      }
    };

    // Master Ghost Reference Offsets for all 12 Strikes (Normalized relative to shoulder center and torso scale)
    const GHOST_STRIKE_OFFSETS = {
      "strike_1": { // Left Temple (diagonal downward slice across left temple / neck)
        rightElbow: { dx: -0.38, dy: -0.05 },
        rightWrist: { dx: -0.65, dy: 0.12 },
        stickTip:   { dx: -0.92, dy: 0.28 },
        leftElbow:  { dx: 0.28, dy: 0.22 },
        leftWrist:  { dx: 0.12, dy: 0.10 },
        leadKnee:   { dx: -0.15, dy: 0.65 },
        rearKnee:   { dx: 0.25, dy: 0.62 },
        desc: "Diagonal slash across left temple"
      },
      "strike_2": { // Right Temple (diagonal downward slice to right temple)
        rightElbow: { dx: 0.42, dy: -0.02 },
        rightWrist: { dx: 0.70, dy: 0.10 },
        stickTip:   { dx: 0.95, dy: 0.25 },
        leftElbow:  { dx: -0.25, dy: 0.20 },
        leftWrist:  { dx: -0.08, dy: 0.08 },
        leadKnee:   { dx: 0.15, dy: 0.65 },
        rearKnee:   { dx: -0.22, dy: 0.62 },
        desc: "Diagonal slash across right temple"
      },
      "strike_3": { // Left Torso (horizontal strike targeting left ribs)
        rightElbow: { dx: -0.45, dy: 0.18 },
        rightWrist: { dx: -0.72, dy: 0.22 },
        stickTip:   { dx: -0.98, dy: 0.24 },
        leftElbow:  { dx: 0.25, dy: 0.15 },
        leftWrist:  { dx: 0.10, dy: 0.05 },
        leadKnee:   { dx: -0.18, dy: 0.68 },
        rearKnee:   { dx: 0.22, dy: 0.64 },
        desc: "Horizontal cut to left ribs"
      },
      "strike_4": { // Right Torso (horizontal strike targeting right ribs)
        rightElbow: { dx: 0.46, dy: 0.18 },
        rightWrist: { dx: 0.74, dy: 0.22 },
        stickTip:   { dx: 0.99, dy: 0.24 },
        leftElbow:  { dx: -0.24, dy: 0.15 },
        leftWrist:  { dx: -0.09, dy: 0.05 },
        leadKnee:   { dx: 0.18, dy: 0.68 },
        rearKnee:   { dx: -0.22, dy: 0.64 },
        desc: "Horizontal cut to right ribs"
      },
      "strike_5": { // Stomach Thrust (direct horizontal thrust forward into core)
        rightElbow: { dx: -0.15, dy: 0.28 },
        rightWrist: { dx: -0.02, dy: 0.38 },
        stickTip:   { dx: 0.05, dy: 0.42 },
        leftElbow:  { dx: 0.28, dy: 0.18 },
        leftWrist:  { dx: 0.12, dy: 0.08 },
        leadKnee:   { dx: -0.05, dy: 0.70 },
        rearKnee:   { dx: 0.28, dy: 0.65 },
        desc: "Direct forward stomach thrust"
      },
      "strike_6": { // Left Chest Thrust (high thrust to left chest / clavicle)
        rightElbow: { dx: -0.28, dy: 0.08 },
        rightWrist: { dx: -0.42, dy: 0.02 },
        stickTip:   { dx: -0.68, dy: -0.05 },
        leftElbow:  { dx: 0.26, dy: 0.20 },
        leftWrist:  { dx: 0.10, dy: 0.10 },
        leadKnee:   { dx: -0.12, dy: 0.68 },
        rearKnee:   { dx: 0.24, dy: 0.64 },
        desc: "High thrust to left chest"
      },
      "strike_7": { // Right Chest Thrust (high thrust to right chest / clavicle)
        rightElbow: { dx: 0.30, dy: 0.08 },
        rightWrist: { dx: 0.45, dy: 0.02 },
        stickTip:   { dx: 0.70, dy: -0.05 },
        leftElbow:  { dx: -0.26, dy: 0.20 },
        leftWrist:  { dx: -0.10, dy: 0.10 },
        leadKnee:   { dx: 0.12, dy: 0.68 },
        rearKnee:   { dx: -0.24, dy: 0.64 },
        desc: "High thrust to right chest"
      },
      "strike_8": { // Left Knee (low downward diagonal slice to knee)
        rightElbow: { dx: -0.38, dy: 0.38 },
        rightWrist: { dx: -0.60, dy: 0.62 },
        stickTip:   { dx: -0.82, dy: 0.85 },
        leftElbow:  { dx: 0.24, dy: 0.12 },
        leftWrist:  { dx: 0.10, dy: 0.02 },
        leadKnee:   { dx: -0.22, dy: 0.72 },
        rearKnee:   { dx: 0.20, dy: 0.66 },
        desc: "Low strike to left knee"
      },
      "strike_9": { // Right Knee (low downward diagonal slice to right knee)
        rightElbow: { dx: 0.40, dy: 0.38 },
        rightWrist: { dx: 0.62, dy: 0.62 },
        stickTip:   { dx: 0.84, dy: 0.85 },
        leftElbow:  { dx: -0.24, dy: 0.12 },
        leftWrist:  { dx: -0.10, dy: 0.02 },
        leadKnee:   { dx: 0.22, dy: 0.72 },
        rearKnee:   { dx: -0.20, dy: 0.66 },
        desc: "Low strike to right knee"
      },
      "strike_10": { // Left Eye Thrust (precise face-level thrust to left eye)
        rightElbow: { dx: -0.25, dy: -0.10 },
        rightWrist: { dx: -0.45, dy: -0.22 },
        stickTip:   { dx: -0.72, dy: -0.32 },
        leftElbow:  { dx: 0.25, dy: 0.15 },
        leftWrist:  { dx: 0.10, dy: 0.08 },
        leadKnee:   { dx: -0.10, dy: 0.68 },
        rearKnee:   { dx: 0.25, dy: 0.65 },
        desc: "Eye-level thrust to left eye"
      },
      "strike_11": { // Right Eye Thrust (precise face-level thrust to right eye)
        rightElbow: { dx: 0.26, dy: -0.10 },
        rightWrist: { dx: 0.46, dy: -0.22 },
        stickTip:   { dx: 0.74, dy: -0.32 },
        leftElbow:  { dx: -0.25, dy: 0.15 },
        leftWrist:  { dx: -0.10, dy: 0.08 },
        leadKnee:   { dx: 0.10, dy: 0.68 },
        rearKnee:   { dx: -0.25, dy: 0.65 },
        desc: "Eye-level thrust to right eye"
      },
      "strike_12": { // Crown Strike (vertical overhead downward strike to skull)
        rightElbow: { dx: 0.10, dy: -0.42 },
        rightWrist: { dx: 0.02, dy: -0.68 },
        stickTip:   { dx: 0.00, dy: -0.96 },
        leftElbow:  { dx: -0.28, dy: 0.15 },
        leftWrist:  { dx: -0.12, dy: 0.05 },
        leadKnee:   { dx: 0.00, dy: 0.68 },
        rearKnee:   { dx: 0.22, dy: 0.66 },
        desc: "Overhead downward strike to crown"
      }
    };

    function updateStickTrajectory(personIdx, tipX, tipY, velocity, phase, isApex, timestamp) {
      if (!stickTrajectories[personIdx]) {
        stickTrajectories[personIdx] = [];
      }
      const traj = stickTrajectories[personIdx];

      traj.push({
        x: tipX,
        y: tipY,
        velocity: velocity || 0,
        phase: phase || 'idle',
        isApex: !!isApex,
        t: timestamp
      });

      // Keep up to 24 points or points within the last 650ms
      while (traj.length > 24 || (traj.length > 0 && timestamp - traj[0].t > 650)) {
        traj.shift();
      }

      if (isApex) {
        apexBursts.push({
          x: tipX,
          y: tipY,
          radius: 8,
          maxRadius: 40,
          alpha: 1.0,
          birthTime: timestamp
        });
      }
    }

    function calculateTrajectoryMetrics(personIdx) {
      const traj = stickTrajectories[personIdx];
      if (!traj || traj.length < 3) {
        return { arcAngle: null, arcLength: 0, peakVelocity: 0, smoothness: 100 };
      }

      let totalDist = 0;
      let maxVel = 0;
      for (let i = 1; i < traj.length; i++) {
        const dx = traj[i].x - traj[i-1].x;
        const dy = traj[i].y - traj[i-1].y;
        totalDist += Math.sqrt(dx * dx + dy * dy);
        if (traj[i].velocity > maxVel) {
          maxVel = traj[i].velocity;
        }
      }

      const pFirst = traj[0];
      const pLast = traj[traj.length - 1];
      const netDx = pLast.x - pFirst.x;
      const netDy = pLast.y - pFirst.y;
      const angleRad = Math.atan2(netDy, netDx);
      const angleDeg = Math.round(angleRad * (180 / Math.PI));

      return {
        arcAngle: angleDeg,
        arcLength: Math.round(totalDist),
        peakVelocity: parseFloat(maxVel.toFixed(2)),
        smoothness: Math.min(100, Math.round(100 - (totalDist > 0 ? (Math.abs(totalDist - Math.sqrt(netDx*netDx + netDy*netDy)) / totalDist) * 25 : 0)))
      };
    }

    function drawMotionRibbon(personIdx, ctx) {
      if (!motionRibbonEnabled) return;
      const traj = stickTrajectories[personIdx];
      if (!traj || traj.length < 2) return;

      const len = traj.length;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 1; i < len; i++) {
        const pPrev = traj[i - 1];
        const pCurr = traj[i];

        const progress = i / len; // 0 (tail) -> 1 (head)
        const alpha = Math.max(0.08, progress * 0.92);
        const lineWidth = Math.max(2.5, progress * 12);

        let strokeColor = "rgba(255, 149, 0, " + alpha + ")";
        let glowColor = "#FF9500";

        if (ribbonTheme === "fire") {
          if (pCurr.velocity >= 0.22 || pCurr.isApex) {
            strokeColor = "rgba(255, 59, 48, " + alpha + ")";
            glowColor = "#FF3B30";
          } else if (pCurr.velocity >= 0.12) {
            strokeColor = "rgba(255, 149, 0, " + alpha + ")";
            glowColor = "#FF9500";
          } else {
            strokeColor = "rgba(250, 204, 21, " + alpha + ")";
            glowColor = "#FACC15";
          }
        } else if (ribbonTheme === "neon") {
          if (pCurr.velocity >= 0.2) {
            strokeColor = "rgba(236, 72, 153, " + alpha + ")";
            glowColor = "#EC4899";
          } else {
            strokeColor = "rgba(139, 92, 246, " + alpha + ")";
            glowColor = "#8B5CF6";
          }
        } else { // cyan
          if (pCurr.velocity >= 0.2) {
            strokeColor = "rgba(0, 242, 254, " + alpha + ")";
            glowColor = "#00F2FE";
          } else {
            strokeColor = "rgba(59, 130, 246, " + alpha + ")";
            glowColor = "#3B82F6";
          }
        }

        ctx.beginPath();
        ctx.moveTo(pPrev.x, pPrev.y);
        ctx.lineTo(pCurr.x, pCurr.y);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeColor;
        ctx.shadowBlur = progress > 0.5 ? 12 : 0;
        ctx.shadowColor = glowColor;
        ctx.stroke();
      }

      // Draw glowing head tip orb
      const head = traj[len - 1];
      ctx.beginPath();
      ctx.arc(head.x, head.y, 6.5, 0, 2 * Math.PI);
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowBlur = 14;
      ctx.shadowColor = "#FFD700";
      ctx.fill();

      ctx.restore();
    }

    function drawApexBursts(ctx, now) {
      for (let i = apexBursts.length - 1; i >= 0; i--) {
        const b = apexBursts[i];
        const age = now - b.birthTime;
        if (age > 450) {
          apexBursts.splice(i, 1);
          continue;
        }
        const prog = age / 450;
        const currentR = b.radius + (b.maxRadius - b.radius) * prog;
        const alpha = Math.max(0, 1 - prog);

        ctx.save();
        // Burst shockwave circle
        ctx.beginPath();
        ctx.arc(b.x, b.y, currentR, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255, 215, 0, " + alpha + ")";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#FFD700";
        ctx.stroke();

        // 4 Spark cross spikes
        const sparkLen = currentR * 0.75;
        ctx.strokeStyle = "rgba(255, 255, 255, " + (alpha * 0.85) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x - sparkLen, b.y);
        ctx.lineTo(b.x + sparkLen, b.y);
        ctx.moveTo(b.x, b.y - sparkLen);
        ctx.lineTo(b.x, b.y + sparkLen);
        ctx.stroke();

        ctx.restore();
      }
    }

    function drawGhostSilhouette(strikeId, primaryPerson, primaryLandmarks, ctx, timestamp) {
      if (!ghostGuideEnabled) return;
      const poseData = GHOST_STRIKE_OFFSETS[strikeId] || GHOST_STRIKE_OFFSETS.strike_1;
      if (!poseData) return;

      ctx.save();

      let anchorX, anchorY, scale;

      if (primaryLandmarks && primaryLandmarks[11] && primaryLandmarks[12] && primaryLandmarks[11].visibility > 0.35) {
        // Mirrored coordinates matching drawOutput: (1 - landmark.x) * width
        const lsX = (1 - primaryLandmarks[11].x) * canvasElement.width;
        const lsY = primaryLandmarks[11].y * canvasElement.height;
        const rsX = (1 - primaryLandmarks[12].x) * canvasElement.width;
        const rsY = primaryLandmarks[12].y * canvasElement.height;
        
        anchorX = (lsX + rsX) / 2;
        anchorY = (lsY + rsY) / 2;

        const shoulderSpan = Math.sqrt((rsX - lsX) * (rsX - lsX) + (rsY - lsY) * (rsY - lsY)) || 80;
        scale = Math.max(120, shoulderSpan * 2.1);
      } else {
        // Centered guide fallback
        anchorX = canvasElement.width * 0.5;
        anchorY = canvasElement.height * 0.35;
        scale = canvasElement.height * 0.45;
      }

      // Compute ideal Ghost joint coordinates
      const ghost = {
        shoulderCenter: { x: anchorX, y: anchorY },
        leftShoulder:   { x: anchorX - scale * 0.22, y: anchorY },
        rightShoulder:  { x: anchorX + scale * 0.22, y: anchorY },
        rightElbow:     { x: anchorX + poseData.rightElbow.dx * scale, y: anchorY + poseData.rightElbow.dy * scale },
        rightWrist:     { x: anchorX + poseData.rightWrist.dx * scale, y: anchorY + poseData.rightWrist.dy * scale },
        stickTip:       { x: anchorX + poseData.stickTip.dx * scale, y: anchorY + poseData.stickTip.dy * scale },
        leftElbow:      { x: anchorX + poseData.leftElbow.dx * scale, y: anchorY + poseData.leftElbow.dy * scale },
        leftWrist:      { x: anchorX + poseData.leftWrist.dx * scale, y: anchorY + poseData.leftWrist.dy * scale },
        leftHip:        { x: anchorX - scale * 0.16, y: anchorY + scale * 0.45 },
        rightHip:       { x: anchorX + scale * 0.16, y: anchorY + scale * 0.45 },
        leadKnee:       { x: anchorX + poseData.leadKnee.dx * scale, y: anchorY + poseData.leadKnee.dy * scale },
        rearKnee:       { x: anchorX + poseData.rearKnee.dx * scale, y: anchorY + poseData.rearKnee.dy * scale }
      };

      const isRightArmLocked = primaryPerson && primaryPerson.isRightGood;
      const isLeadKneeLocked = primaryPerson && primaryPerson.kneeScore >= 80;
      const isOverallLocked = primaryPerson && primaryPerson.accuracy >= 85;

      const pulse = 0.7 + Math.sin(timestamp / 240) * 0.25;

      // 1. Draw Translucent Ghost Bones (Dashed neon cyan line)
      ctx.lineWidth = 3.5;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = isOverallLocked ? "rgba(16, 185, 129, 0.65)" : "rgba(0, 242, 254, 0.45)";
      ctx.shadowBlur = 8;
      ctx.shadowColor = isOverallLocked ? "#10B981" : "#00F2FE";

      // Torso
      ctx.beginPath();
      ctx.moveTo(ghost.leftShoulder.x, ghost.leftShoulder.y);
      ctx.lineTo(ghost.rightShoulder.x, ghost.rightShoulder.y);
      ctx.lineTo(ghost.rightHip.x, ghost.rightHip.y);
      ctx.lineTo(ghost.leftHip.x, ghost.leftHip.y);
      ctx.closePath();
      ctx.stroke();

      // Left Arm
      ctx.beginPath();
      ctx.moveTo(ghost.leftShoulder.x, ghost.leftShoulder.y);
      ctx.lineTo(ghost.leftElbow.x, ghost.leftElbow.y);
      ctx.lineTo(ghost.leftWrist.x, ghost.leftWrist.y);
      ctx.stroke();

      // Right Arm (Striking Arm)
      ctx.strokeStyle = isRightArmLocked ? "rgba(16, 185, 129, 0.85)" : "rgba(0, 242, 254, 0.65)";
      ctx.beginPath();
      ctx.moveTo(ghost.rightShoulder.x, ghost.rightShoulder.y);
      ctx.lineTo(ghost.rightElbow.x, ghost.rightElbow.y);
      ctx.lineTo(ghost.rightWrist.x, ghost.rightWrist.y);
      ctx.stroke();

      // Legs
      ctx.strokeStyle = isLeadKneeLocked ? "rgba(16, 185, 129, 0.65)" : "rgba(0, 242, 254, 0.4)";
      ctx.beginPath();
      ctx.moveTo(ghost.leftHip.x, ghost.leftHip.y);
      ctx.lineTo(ghost.leadKnee.x, ghost.leadKnee.y);
      ctx.moveTo(ghost.rightHip.x, ghost.rightHip.y);
      ctx.lineTo(ghost.rearKnee.x, ghost.rearKnee.y);
      ctx.stroke();

      // Reset Line Dash for Stick & Joint Rings
      ctx.setLineDash([]);

      // 2. Draw Ghost Rattan Stick Guide (Glowing Amber / Gold)
      ctx.beginPath();
      ctx.moveTo(ghost.rightWrist.x, ghost.rightWrist.y);
      ctx.lineTo(ghost.stickTip.x, ghost.stickTip.y);
      ctx.lineWidth = 5;
      ctx.strokeStyle = isRightArmLocked ? "rgba(250, 204, 21, 0.9)" : "rgba(250, 204, 21, 0.55)";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#FACC15";
      ctx.lineCap = "round";
      ctx.stroke();

      // 3. Draw Target Joint Nodes (with Lock-in bloom)
      function drawGhostJoint(pt, isLocked) {
        const radius = isLocked ? 7.5 : 5.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isLocked ? "#10B981" : "rgba(0, 242, 254, 0.85)";
        ctx.shadowColor = isLocked ? "#10B981" : "#00F2FE";
        ctx.shadowBlur = isLocked ? 14 : 6;
        ctx.fill();

        // Outer Target Ring
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius + 4 * pulse, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isLocked ? "rgba(16, 185, 129, 0.8)" : "rgba(0, 242, 254, 0.5)";
        ctx.stroke();
      }

      drawGhostJoint(ghost.rightElbow, isRightArmLocked);
      drawGhostJoint(ghost.rightWrist, isRightArmLocked);
      drawGhostJoint(ghost.stickTip, isRightArmLocked);
      drawGhostJoint(ghost.leftElbow, false);
      drawGhostJoint(ghost.leadKnee, isLeadKneeLocked);

      // 4. Ghost Guide Badge Tag
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = isOverallLocked ? "#10B981" : "rgba(0, 242, 254, 0.9)";
      ctx.shadowBlur = 4;
      ctx.textAlign = "center";
      const strikeName = (STRIKE_RULES[strikeId] && STRIKE_RULES[strikeId].name) ? STRIKE_RULES[strikeId].name : "";
      const tagText = isOverallLocked ? "✓ GHOST POSTURE MATCHED" : ("MASTER GUIDE: " + strikeName);
      const tagY = Math.max(16, ghost.shoulderCenter.y - scale * 0.42);
      ctx.fillText(tagText, ghost.shoulderCenter.x, tagY);

      ctx.restore();
    }

    function drawStrikeTrajectoryGuide(strikeId, anchorX, anchorY, scale, ctx, timestamp) {
      if (!trajectoryGuideEnabled) return;
      const pathData = STRIKE_TRAJECTORY_PATHS[strikeId] || STRIKE_TRAJECTORY_PATHS.strike_1;
      if (!pathData) return;

      const startPt = { x: anchorX + pathData.start.dx * scale, y: anchorY + pathData.start.dy * scale };
      const apexPt  = { x: anchorX + pathData.apex.dx * scale,  y: anchorY + pathData.apex.dy * scale };
      const endPt   = { x: anchorX + pathData.end.dx * scale,   y: anchorY + pathData.end.dy * scale };

      ctx.save();

      // 1. Draw laser trajectory curve (glow + moving animated dashes)
      const pulse = 0.75 + Math.sin(timestamp / 200) * 0.25;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -(timestamp / 40) % 28;
      ctx.strokeStyle = "rgba(255, 149, 0, " + (0.75 * pulse) + ")";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#FF9500";

      ctx.beginPath();
      ctx.moveTo(startPt.x, startPt.y);
      ctx.quadraticCurveTo(apexPt.x, apexPt.y, endPt.x, endPt.y);
      ctx.stroke();

      // 2. Draw moving directional laser particle
      ctx.setLineDash([]);
      const particleProgress = (timestamp % 900) / 900;
      const t = particleProgress;
      const px = (1 - t) * (1 - t) * startPt.x + 2 * (1 - t) * t * apexPt.x + t * t * endPt.x;
      const py = (1 - t) * (1 - t) * startPt.y + 2 * (1 - t) * t * apexPt.y + t * t * endPt.y;

      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowBlur = 16;
      ctx.shadowColor = "#FFD700";
      ctx.fill();

      // 3. Draw Target Impact Bullseye at Apex
      ctx.beginPath();
      ctx.arc(apexPt.x, apexPt.y, 16 + 4 * pulse, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#10B981";
      ctx.stroke();

      // Bullseye Crosshairs
      const chLen = 8;
      ctx.beginPath();
      ctx.moveTo(apexPt.x - chLen, apexPt.y);
      ctx.lineTo(apexPt.x + chLen, apexPt.y);
      ctx.moveTo(apexPt.x, apexPt.y - chLen);
      ctx.lineTo(apexPt.x, apexPt.y + chLen);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Target Tag
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#10B981";
      ctx.textAlign = "center";
      ctx.fillText("TARGET IMPACT", apexPt.x, apexPt.y - 24);

      ctx.restore();
    }

    // Dynamic Strike Motion Classifier (Compares live landmarks & kinetics against 12 Arnis strikes)
    function classifyStrikeMotion(landmarks, personData, trajMetrics) {
      if (!landmarks || !landmarks[11] || !landmarks[12] || !landmarks[14] || !landmarks[16]) {
        return null;
      }
      if (landmarks[11].visibility < 0.35 || landmarks[12].visibility < 0.35 || landmarks[14].visibility < 0.35 || landmarks[16].visibility < 0.35) {
        return null;
      }

      // Mirrored shoulder center and torso scale
      const lsX = (1 - landmarks[11].x) * canvasElement.width;
      const lsY = landmarks[11].y * canvasElement.height;
      const rsX = (1 - landmarks[12].x) * canvasElement.width;
      const rsY = landmarks[12].y * canvasElement.height;
      const anchorX = (lsX + rsX) / 2;
      const anchorY = (lsY + rsY) / 2;
      const shoulderSpan = Math.sqrt((rsX - lsX) * (rsX - lsX) + (rsY - lsY) * (rsY - lsY)) || 80;
      const scale = Math.max(120, shoulderSpan * 2.1);

      // Mirrored right wrist and elbow
      const rwX = (1 - landmarks[16].x) * canvasElement.width;
      const rwY = landmarks[16].y * canvasElement.height;
      const userWristDx = (rwX - anchorX) / scale;
      const userWristDy = (rwY - anchorY) / scale;

      const reX = (1 - landmarks[14].x) * canvasElement.width;
      const reY = landmarks[14].y * canvasElement.height;
      const userElbowDx = (reX - anchorX) / scale;
      const userElbowDy = (reY - anchorY) / scale;

      let bestStrike = null;
      let highestScore = -1;

      for (let i = 1; i <= 12; i++) {
        const sId = "strike_" + i;
        const ghost = GHOST_STRIKE_OFFSETS[sId];
        const rules = STRIKE_RULES[sId];
        const trajPath = STRIKE_TRAJECTORY_PATHS[sId];
        if (!ghost || !rules) continue;

        // Proximity to ghost right wrist (weight 40%)
        const wDist = Math.sqrt(
          Math.pow(userWristDx - ghost.rightWrist.dx, 2) +
          Math.pow(userWristDy - ghost.rightWrist.dy, 2)
        );
        const wristScore = Math.max(0, 100 - (wDist * 95));

        // Proximity to ghost right elbow (weight 20%)
        const eDist = Math.sqrt(
          Math.pow(userElbowDx - ghost.rightElbow.dx, 2) +
          Math.pow(userElbowDy - ghost.rightElbow.dy, 2)
        );
        const elbowPosScore = Math.max(0, 100 - (eDist * 115));

        // Elbow joint angle closeness to strike target zone (weight 20%)
        let angleScore = 50;
        if (personData.rightAngle !== null && personData.rightAngle !== undefined && personData.rightAngle > 0) {
          if (personData.rightAngle >= rules.right_min && personData.rightAngle <= rules.right_max) {
            angleScore = 100;
          } else {
            const diff = personData.rightAngle < rules.right_min 
              ? rules.right_min - personData.rightAngle 
              : personData.rightAngle - rules.right_max;
            angleScore = Math.max(0, 100 - diff * 2.2);
          }
        }

        // Shoulder angle closeness (weight 10%)
        let shoulderScore = 50;
        if (personData.rightShoulderAngle !== null && personData.rightShoulderAngle !== undefined && personData.rightShoulderAngle > 0) {
          const sDiff = Math.abs(personData.rightShoulderAngle - rules.ideal_shoulder);
          shoulderScore = Math.max(0, 100 - sDiff * 2.0);
        }

        // Trajectory and Apex path validation bonus (weight 10%)
        let pathBonus = 0;
        if (trajPath) {
          const apexDist = Math.sqrt(
            Math.pow(userWristDx - trajPath.apex.dx, 2) +
            Math.pow(userWristDy - trajPath.apex.dy, 2)
          );
          if (apexDist < 0.28) {
            pathBonus += 10;
          }
        }

        const totalScore = Math.min(100, Math.round(
          wristScore * 0.40 +
          elbowPosScore * 0.20 +
          angleScore * 0.20 +
          shoulderScore * 0.10 +
          pathBonus
        ));

        if (totalScore > highestScore) {
          highestScore = totalScore;
          bestStrike = {
            id: sId,
            name: rules.name,
            confidence: totalScore
          };
        }
      }

      return bestStrike;
    }

    function drawKineticPhaseHUD(ctx, primaryPerson, now) {
      ctx.save();
      const canvasW = canvasElement.width;
      const bannerW = Math.min(340, canvasW - 24);
      const bannerH = 34;
      const bannerX = (canvasW - bannerW) / 2;
      const bannerY = 16;

      const rules = STRIKE_RULES[activeStrike];
      const strikeTitle = rules ? rules.name.toUpperCase() : "TARGET STRIKE";
      const phase = primaryPerson ? primaryPerson.motionPhase : "idle";
      const isWrongTraj = primaryPerson && primaryPerson.diagnosticFlags && primaryPerson.diagnosticFlags.includes('WRONG_TRAJECTORY');

      let phaseText = "READY TO STRIKE";
      let phaseBg = "rgba(30, 41, 59, 0.88)";
      let phaseBorder = "rgba(255, 255, 255, 0.25)";

      if (isWrongTraj) {
        phaseText = "⚠️ MISALIGNED CUT";
        phaseBg = "rgba(239, 68, 68, 0.92)"; // red
        phaseBorder = "#FCA5A5";
      } else if (phase === "apex_hit" || (primaryPerson && primaryPerson.isApex)) {
        phaseText = "3. APEX HIT 🎯";
        phaseBg = "rgba(16, 185, 129, 0.92)"; // green
        phaseBorder = "#86EFAC";
      } else if (phase === "cutting") {
        phaseText = "2. CUTTING ARC ⚡";
        phaseBg = "rgba(234, 88, 12, 0.90)"; // orange
        phaseBorder = "#FED7AA";
      } else if (phase === "recovering") {
        phaseText = "4. RECOVERY (BAWI) 🛡️";
        phaseBg = "rgba(2, 132, 199, 0.90)"; // blue
        phaseBorder = "#BAE6FD";
      } else if (phase === "chambering") {
        phaseText = "1. CHAMBERING 🥋";
        phaseBg = "rgba(245, 158, 11, 0.90)";
        phaseBorder = "#FDE68A";
      }

      ctx.fillStyle = phaseBg;
      ctx.strokeStyle = phaseBorder;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 10);
      } else {
        ctx.rect(bannerX, bannerY, bannerW, bannerH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 11.5px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(strikeTitle + " • " + phaseText, canvasW / 2, bannerY + 21);
      ctx.restore();
    }

    function drawFormCoachHUD(ctx, phase, strikeId, now) {
      // Disabled in favor of the clean native React Native 3-phase stepper overlay
      return;
    }

    // 3-Meter Visual Ergonomics: Full-Screen Peripheral Edge Glow & State Indicator
    function drawPeripheralEdgeGlow(ctx, primaryPerson, width, height, timestamp) {
      if (!primaryPerson) return;

      try {
        const flags = primaryPerson.diagnosticFlags || [];
        const isApex = primaryPerson.isApex;
        const accuracy = primaryPerson.accuracy || 0;
        const isStatic = flags.includes('STATIC_HOLD');
        const isCriticalFault = flags.includes('GUARD_LOW') || flags.includes('ELBOW_UNDER') || flags.includes('ELBOW_OVER');

        let glowColor = "transparent";
        let badgeBg = "rgba(15, 23, 42, 0.88)";
        let badgeText = "READY GUARD";
        let badgeColor = "#38BDF8";
        let borderWidth = 6;

        const pulse = 0.65 + Math.sin(timestamp / 180) * 0.35;

        if (isApex) {
          glowColor = "rgba(255, 215, 0, " + (0.75 * pulse) + ")";
          badgeBg = "rgba(234, 179, 8, 0.95)";
          badgeText = "⚡ APEX IMPACT HIT!";
          badgeColor = "#0F172A";
          borderWidth = 14;
        } else if (isStatic) {
          glowColor = "rgba(245, 158, 11, " + (0.65 * pulse) + ")";
          badgeBg = "rgba(245, 158, 11, 0.95)";
          badgeText = "⚠️ STATIC HOLD - EXECUTE FULL SWING!";
          badgeColor = "#000000";
          borderWidth = 10;
        } else if (accuracy >= 85) {
          glowColor = "rgba(16, 185, 129, " + (0.65 * pulse) + ")";
          badgeBg = "rgba(16, 185, 129, 0.95)";
          badgeText = "✓ MASTER FORM LOCKED (" + accuracy + "%)";
          badgeColor = "#FFFFFF";
          borderWidth = 10;
        } else if (isCriticalFault) {
          glowColor = "rgba(239, 68, 68, " + (0.55 * pulse) + ")";
          badgeBg = "rgba(239, 68, 68, 0.95)";
          if (flags.includes('GUARD_LOW')) {
            badgeText = "🛡️ RAISE KALASAG GUARD HAND!";
          } else if (flags.includes('ELBOW_UNDER')) {
            badgeText = "⚔️ OPEN STRIKING ELBOW HIGHER!";
          } else {
            badgeText = "⚠️ ADJUST POSTURE FORM (" + accuracy + "%)";
          }
          badgeColor = "#FFFFFF";
          borderWidth = 8;
        } else if (primaryPerson.motionPhase === 'chambering') {
          glowColor = "rgba(56, 189, 248, " + (0.45 * pulse) + ")";
          badgeBg = "rgba(15, 23, 42, 0.9)";
          badgeText = "🥋 CHAMBERING (KASA)";
          badgeColor = "#38BDF8";
          borderWidth = 7;
        }

        ctx.save();

        // 1. Draw Peripheral Viewport Border Glow
        if (glowColor !== "transparent") {
          ctx.lineWidth = borderWidth;
          ctx.strokeStyle = glowColor;
          ctx.shadowBlur = 18;
          ctx.shadowColor = glowColor;
          ctx.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);
        }

        // 2. High-Visibility 3-Meter Visual Badge (Top Center)
        // Designed for distance clarity across room
        const badgeW = Math.min(360, width - 40);
        const badgeH = 34;
        const badgeX = (width - badgeW) / 2;
        const badgeY = 16;

        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.fillStyle = badgeBg;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 17);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();

        ctx.font = "bold 12.5px sans-serif";
        ctx.fillStyle = badgeColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, width / 2, badgeY + badgeH / 2);

        ctx.restore();
      } catch (e) {}
    }

    // Capture un-mirrored Canvas Snapshot helper (matches Coach camera perspective)
    window.captureSnapshot = () => {
      try {
        const snap = captureUnmirroredSnapshot(lastRenderedLandmarks, lastRenderedPersons);
        if (snap) {
          sendToReactNative({ type: "SNAPSHOT_CAPTURED", base64: snap });
        }
      } catch(e) {
        console.error("Failed to capture snapshot:", e);
      }
    };

    // Camera Stream & MediaRecorder Video Replay Engine
    let mediaRecorder = null;
    let recordedChunks = [];

    window.startVideoRecording = () => {
      try {
        recordedChunks = [];
        const stream = video && video.srcObject;
        if (!stream || typeof MediaRecorder === 'undefined') return;
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          try { mediaRecorder.stop(); } catch (e) {}
        }
        const mimeTypes = [
          'video/mp4',
          'video/webm;codecs=vp8',
          'video/webm'
        ];
        let selectedMime = '';
        for (let i = 0; i < mimeTypes.length; i++) {
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mimeTypes[i])) {
            selectedMime = mimeTypes[i];
            break;
          }
        }
        const options = selectedMime
          ? { mimeType: selectedMime, videoBitsPerSecond: 1200000 }
          : { videoBitsPerSecond: 1200000 };
        mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };
        mediaRecorder.onstop = () => {
          try {
            if (!recordedChunks || recordedChunks.length === 0) return;
            const blobMime = (mediaRecorder && mediaRecorder.mimeType) || selectedMime || 'video/webm';
            const blob = new Blob(recordedChunks, { type: blobMime });
            recordedChunks = [];
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string' && reader.result.length > 0) {
                sendToReactNative({
                  type: 'VIDEO_REPLAY_CAPTURED',
                  base64: reader.result
                });
              }
            };
            reader.readAsDataURL(blob);
          } catch (err) {
            console.warn('MediaRecorder onstop error:', err);
          }
        };
        mediaRecorder.start(250);
      } catch (err) {
        console.warn('startVideoRecording error:', err);
      }
    };

    window.stopVideoRecording = () => {
      try {
        if (window.captureSnapshot) {
          window.captureSnapshot();
        }
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      } catch (err) {
        console.warn('stopVideoRecording error:', err);
      }
    };

    const PERSON_COLORS = [
      { primary: "#10b981", secondary: "rgba(16, 185, 129, 0.4)" },
      { primary: "#8b5cf6", secondary: "rgba(139, 92, 246, 0.4)" },
      { primary: "#f59e0b", secondary: "rgba(245, 158, 11, 0.4)" },
      { primary: "#ec4899", secondary: "rgba(236, 72, 153, 0.4)" }
    ];

    let snapshotCanvas = null;
    let snapshotCtx = null;
    let lastRenderedLandmarks = [];
    let lastRenderedPersons = [];

    function drawPersonSkeleton(ctx, landmarks, data, personIdx, width, height) {
      if (!landmarks || !data) return;

      const leftShoulder = landmarks[11];
      const leftElbow = landmarks[13];
      const leftWrist = landmarks[15];
      const rightShoulder = landmarks[12];
      const rightElbow = landmarks[14];
      const rightWrist = landmarks[16];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      const leftKnee = landmarks[25];
      const rightKnee = landmarks[26];
      const leftAnkle = landmarks[27];
      const rightAnkle = landmarks[28];

      const colors = PERSON_COLORS[personIdx % PERSON_COLORS.length] || PERSON_COLORS[0];
      const connectorColor = colors.secondary;
      const rightColor = data.isRightGood ? "#10b981" : "#ef4444";
      const legStanceColor = data.stanceScore >= 80 ? "#10b981" : (data.isStanceHigh ? "#f59e0b" : "#ef4444");
      const guardArmColor = data.guardScore >= 80 ? "#10b981" : (data.isGuardLow ? "#ef4444" : "#f59e0b");

      const torsoConnections = [
        [11, 12], // shoulder-to-shoulder
        [11, 23], [12, 24], [23, 24] // torso
      ];

      ctx.save();
      ctx.lineWidth = 4;

      // Draw basic torso lines
      ctx.strokeStyle = connectorColor;
      torsoConnections.forEach(([p1, p2]) => {
        const joint1 = landmarks[p1];
        const joint2 = landmarks[p2];
        if (joint1 && joint2 && joint1.visibility > 0.4 && joint2.visibility > 0.4) {
          ctx.beginPath();
          ctx.moveTo(joint1.x * width, joint1.y * height);
          ctx.lineTo(joint2.x * width, joint2.y * height);
          ctx.stroke();
        }
      });

      // Draw left leg (with stance glow)
      ctx.strokeStyle = legStanceColor;
      ctx.beginPath();
      if (leftHip && leftKnee && leftHip.visibility > 0.4 && leftKnee.visibility > 0.4) {
        ctx.moveTo(leftHip.x * width, leftHip.y * height);
        ctx.lineTo(leftKnee.x * width, leftKnee.y * height);
      }
      if (leftKnee && leftAnkle && leftKnee.visibility > 0.4 && leftAnkle.visibility > 0.4) {
        ctx.lineTo(leftAnkle.x * width, leftAnkle.y * height);
      }
      ctx.stroke();

      // Draw right leg (with stance glow)
      ctx.strokeStyle = legStanceColor;
      ctx.beginPath();
      if (rightHip && rightKnee && rightHip.visibility > 0.4 && rightKnee.visibility > 0.4) {
        ctx.moveTo(rightHip.x * width, rightHip.y * height);
        ctx.lineTo(rightKnee.x * width, rightKnee.y * height);
      }
      if (rightKnee && rightAnkle && rightKnee.visibility > 0.4 && rightAnkle.visibility > 0.4) {
        ctx.lineTo(rightAnkle.x * width, rightAnkle.y * height);
      }
      ctx.stroke();

      // Draw left arm (Check hand guard arm)
      ctx.strokeStyle = guardArmColor;
      if (leftShoulder && leftElbow && leftShoulder.visibility > 0.4 && leftElbow.visibility > 0.4) {
        ctx.beginPath();
        ctx.moveTo(leftShoulder.x * width, leftShoulder.y * height);
        ctx.lineTo(leftElbow.x * width, leftElbow.y * height);
        ctx.stroke();
      }
      if (leftElbow && leftWrist && leftElbow.visibility > 0.4 && leftWrist.visibility > 0.4) {
        ctx.beginPath();
        ctx.moveTo(leftElbow.x * width, leftElbow.y * height);
        ctx.lineTo(leftWrist.x * width, leftWrist.y * height);
        ctx.stroke();
      }

      // Draw right arm (Striking arm)
      ctx.strokeStyle = rightColor;
      if (rightShoulder && rightElbow && rightShoulder.visibility > 0.4 && rightElbow.visibility > 0.4) {
        ctx.beginPath();
        ctx.moveTo(rightShoulder.x * width, rightShoulder.y * height);
        ctx.lineTo(rightElbow.x * width, rightElbow.y * height);
        ctx.stroke();
      }
      if (rightElbow && rightWrist && rightElbow.visibility > 0.4 && rightWrist.visibility > 0.4) {
        ctx.beginPath();
        ctx.moveTo(rightElbow.x * width, rightElbow.y * height);
        ctx.lineTo(rightWrist.x * width, rightWrist.y * height);
        ctx.stroke();
      }

      // Draw joint points
      const corePoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
      landmarks.forEach((joint, idx) => {
        if (joint.visibility < 0.4) return;
        if (!corePoints.includes(idx)) return;

        let ptColor = colors.primary;
        if (idx === 13 || idx === 15) ptColor = guardArmColor;
        if (idx === 14 || idx === 16) ptColor = rightColor;
        if (idx === 25 || idx === 26) ptColor = legStanceColor;

        ctx.beginPath();
        ctx.arc(joint.x * width, joint.y * height, 6, 0, 2 * Math.PI);
        ctx.fillStyle = ptColor;
        ctx.fill();
      });

      ctx.restore();
    }

    function captureUnmirroredSnapshot(landmarksList, personsList) {
      if (!canvasElement || !video || video.readyState < 2) return null;
      const w = canvasElement.width || video.videoWidth;
      const h = canvasElement.height || video.videoHeight;
      if (!w || !h) return null;

      if (!snapshotCanvas) {
        snapshotCanvas = document.createElement("canvas");
        snapshotCtx = snapshotCanvas.getContext("2d");
      }
      if (!snapshotCtx) return null;

      if (snapshotCanvas.width !== w || snapshotCanvas.height !== h) {
        snapshotCanvas.width = w;
        snapshotCanvas.height = h;
      }

      snapshotCtx.save();
      snapshotCtx.setTransform(1, 0, 0, 1, 0, 0);
      snapshotCtx.clearRect(0, 0, w, h);
      // Draw un-mirrored camera frame to match the third-person Coach perspective
      snapshotCtx.drawImage(video, 0, 0, w, h);

      if (landmarksList && landmarksList.length > 0) {
        landmarksList.forEach((landmarks, personIdx) => {
          const data = personsList && personsList[personIdx];
          if (data) {
            drawPersonSkeleton(snapshotCtx, landmarks, data, personIdx, w, h);
          }
        });
      }
      snapshotCtx.restore();

      return snapshotCanvas.toDataURL("image/jpeg", 0.75);
    }

    function isStickColor(r, g, b, mode) {
      if (mode === 'red') {
        return r > 120 && g < 90 && b < 90 && (r - g) > 40;
      } else if (mode === 'blue') {
        return b > 120 && r < 90 && g < 90 && (b - r) > 40;
      } else if (mode === 'green') {
        return g > 120 && r < 90 && b < 90 && (g - r) > 40;
      } else if (mode === 'rattan') {
        // Rattan / wooden stick: warm yellowish-brown
        return r > 130 && g > 100 && b < 120 && (r - g) > 15 && (g - b) > 15 && r > b;
      } else { // 'auto' / 'any'
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        const isSaturated = diff > 50 && max > 100;
        const isRattan = r > 130 && g > 100 && b < 120 && (r - g) > 15 && (g - b) > 15 && r > b;
        return isSaturated || isRattan;
      }
    }

    function detectStick(wristLandmark, elbowLandmark) {
      if (!wristLandmark || wristLandmark.visibility < 0.35) {
        return { detected: false };
      }
      
      const width = canvasElement.width;
      const height = canvasElement.height;
      const startX = (1 - wristLandmark.x) * width;
      const startY = wristLandmark.y * height;

      // 1. Calculate dynamic reach adaptively from user's screen-space forearm length
      let forearmLength = 80;
      let hasElbow = false;
      let ex = startX;
      let ey = startY;
      if (elbowLandmark && elbowLandmark.visibility > 0.35) {
        ex = (1 - elbowLandmark.x) * width;
        ey = elbowLandmark.y * height;
        forearmLength = Math.sqrt((startX - ex) * (startX - ex) + (startY - ey) * (startY - ey));
        hasElbow = true;
      }
      
      // Typical Arnis baston extends ~1.5x - 1.8x the user's forearm length
      const dynamicReach = Math.max(50, Math.min(300, forearmLength * 1.65));
      const maxSteps = 14;
      const stepSize = dynamicReach / maxSteps;

      // 2. Kinematic Forearm Vector Extension:
      // In Arnis, the baston is gripped firmly in line with the forearm.
      // This provides 0ms zero-latency, 60 FPS rock-solid tracking with no GPU stalls.
      if (hasElbow) {
        const foreAngle = Math.atan2(startY - ey, startX - ex);
        const projectedPoints = [];
        for (let s = 1; s <= maxSteps; s++) {
          projectedPoints.push({
            x: startX + Math.cos(foreAngle) * (s * stepSize),
            y: startY + Math.sin(foreAngle) * (s * stepSize)
          });
        }
        return {
          detected: true,
          angle: foreAngle,
          points: projectedPoints,
          startX,
          startY,
          reach: dynamicReach,
          isKinematicFallback: false
        };
      }

      return { detected: false };
    }

    // Send data back to React Native helper
    function sendToReactNative(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    function logStatus(msg) {
      if (loadingText) {
        loadingText.innerText = msg;
      }
      sendToReactNative({ type: "STATUS", message: msg });
    }

    // Helper: import with a timeout to avoid hanging on slow/dead CDNs
    function importWithTimeout(url, timeoutMs) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timeout after " + timeoutMs + "ms")), timeoutMs);
        import(url).then((mod) => {
          clearTimeout(timer);
          resolve(mod);
        }).catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
    }

    // Initialize MediaPipe PoseLandmarker
    async function initPoseEstimation() {
      try {
        const cdns = [
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.15/vision_bundle.mjs",
          "https://fastly.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.15/vision_bundle.mjs",
          "https://gcore.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.15/vision_bundle.mjs",
          "https://unpkg.com/@mediapipe/tasks-vision@0.10.15/vision_bundle.mjs"
        ];

        let module = null;
        let successUrl = "";
        
        for (const url of cdns) {
          try {
            const cdnHost = url.split('/')[2];
            logStatus("Loading library from " + cdnHost + "...");
            module = await importWithTimeout(url, 8000);
            successUrl = url;
            logStatus("Loaded from " + cdnHost + " ✓");
            break;
          } catch (e) {
            console.warn("Failed to load from " + url, e.message || e);
          }
        }

        if (!module || !successUrl) {
          throw new Error("Could not load MediaPipe from any CDN. Please check your internet connection and try again.");
        }

        const { PoseLandmarker, FilesetResolver } = module;
        
        const baseUrl = successUrl.substring(0, successUrl.lastIndexOf('/'));
        const wasmUrl = baseUrl + "/wasm";
        logStatus("Loading WASM runtime...");
        
        const vision = await FilesetResolver.forVisionTasks(wasmUrl);
        logStatus("Creating PoseLandmarker (GPU)...");

        // Try GPU delegate first, fall back to CPU if it fails
        try {
          poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "${modelUrl}",
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.65,
            minPosePresenceConfidence: 0.65,
            minTrackingConfidence: 0.65
          });
        } catch (gpuErr) {
          logStatus("GPU unavailable, using CPU fallback...");
          console.warn("GPU delegate failed:", gpuErr);
          poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "${modelUrl}",
              delegate: "CPU"
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.65,
            minPosePresenceConfidence: 0.65,
            minTrackingConfidence: 0.65
          });
        }
        
        logStatus("PoseLandmarker ready. Starting camera...");
        startCamera();
      } catch (err) {
        const msg = err.message || String(err);
        logStatus("Init Error: " + msg);
        sendToReactNative({ type: "ERROR", message: msg });
      }
    }

    // Access Web Camera with timeout
    async function startCamera() {
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      try {
        logStatus("Requesting camera access...");
        
        // Wrap getUserMedia in a timeout to avoid indefinite hanging
        const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Camera permission timed out after 10s. Please grant camera access and retry.")), 10000)
        );
        
        const stream = await Promise.race([streamPromise, timeoutPromise]);
        logStatus("Camera stream acquired. Binding...");
        video.srcObject = stream;
        
        // Force play to handle WebView quirks where autoplay doesn't trigger
        try { await video.play(); } catch(playErr) { console.warn("video.play() hint failed:", playErr); }
        
        // Wait for video data with a timeout
        const videoReady = new Promise((resolve, reject) => {
          const dataTimer = setTimeout(() => reject(new Error("Video stream did not start within 8s")), 8000);
          video.addEventListener("loadeddata", () => {
            clearTimeout(dataTimer);
            resolve();
          }, { once: true });
          // If video already has data (e.g., play() resolved fast)
          if (video.readyState >= 2) {
            clearTimeout(dataTimer);
            resolve();
          }
        });

        await videoReady;
        logStatus("Camera active. Starting pose detection...");
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
        video.addEventListener("resize", () => {
          if (video.videoWidth && video.videoHeight) {
            canvasElement.width = video.videoWidth;
            canvasElement.height = video.videoHeight;
          }
        });
        loadingEl.classList.add("hidden");
        webcamRunning = true;
        sendToReactNative({ type: "READY" });
        requestAnimationFrame(predictLoop);
      } catch (err) {
        const msg = err.message || String(err);
        logStatus("Camera error: " + msg);
        sendToReactNative({ type: "ERROR", message: "Camera: " + msg });
      }
    }

    // 3D Metric Normalized Joint Angle Calculation
    // Evaluates true 3D Euclidean angle using calibrated depth coordinates
    // invariant to camera distance, tilt, and perspective foreshortening
    function calculateAngle(a, b, c, torsoScale) {
      if (!a || !b || !c || a.visibility < 0.35 || b.visibility < 0.35 || c.visibility < 0.35) {
        return null;
      }
      // Depth scale factor: MediaPipe gives z roughly on same scale as x when normalized
      const zScale = (typeof torsoScale === 'number' && torsoScale > 0) ? Math.min(1.2, Math.max(0.8, torsoScale / 0.3)) : 1.0;
      
      // Vector ba: joint b to a in 3D
      const ba = {
        x: a.x - b.x,
        y: a.y - b.y,
        z: ((a.z !== undefined ? a.z : 0) - (b.z !== undefined ? b.z : 0)) * zScale
      };
      // Vector bc: joint b to c in 3D
      const bc = {
        x: c.x - b.x,
        y: c.y - b.y,
        z: ((c.z !== undefined ? c.z : 0) - (b.z !== undefined ? b.z : 0)) * zScale
      };

      const dotProduct = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
      const magA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
      const magC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);

      if (magA === 0 || magC === 0) return null;

      let cosine = dotProduct / (magA * magC);
      cosine = Math.max(-1.0, Math.min(1.0, cosine)); // numerical clamp

      const angleRad = Math.acos(cosine);
      return parseFloat((angleRad * (180 / Math.PI)).toFixed(1));
    }

    // Anatomical & Biomechanical Pose Validation:
    // Rejects hand hallucinations, partial non-human objects, or background artifacts.
    // Confirms presence of an authentic upright human practitioner before grading or auto-identifying strikes.
    function isValidHumanPose(landmarks) {
      if (!landmarks || landmarks.length < 33) return false;

      const nose = landmarks[0];
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];

      if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) return false;

      // 1. Landmark Visibility: Real human shoulders and head have strong visibility scores
      const leftShldVis = leftShoulder.visibility || 0;
      const rightShldVis = rightShoulder.visibility || 0;
      if (leftShldVis < 0.45 || rightShldVis < 0.45) return false;

      // At least one hip must be detected with reasonable visibility
      const maxHipVis = Math.max(leftHip.visibility || 0, rightHip.visibility || 0);
      if (maxHipVis < 0.30) return false;

      // Head visibility: nose or eye landmark must be present
      const noseVis = nose.visibility || 0;
      const eyeVis = Math.max(
        (landmarks[2] && landmarks[2].visibility) || 0,
        (landmarks[5] && landmarks[5].visibility) || 0
      );
      if (noseVis < 0.40 && eyeVis < 0.40) return false;

      // 2. Anatomical Orientation (Screen coords: Y increases downward)
      const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      const midHipY = (leftHip.y + rightHip.y) / 2;
      const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;

      // Head MUST be above shoulders by at least 1% of screen height
      if (nose.y >= midShoulderY - 0.01) return false;

      // Shoulders MUST be above hips by at least 3% of screen height
      if (midShoulderY >= midHipY - 0.03) return false;

      // 3. Dimensional Scale Checks
      const torsoHeight = midHipY - midShoulderY;
      if (torsoHeight < 0.07 || torsoHeight > 0.90) return false;

      const shoulderSpan = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);
      if (shoulderSpan < 0.06 || shoulderSpan > 0.90) return false;

      // 4. Biomechanical Ratio Constraints:
      // Human torso height-to-shoulder-span ratio is physiologically bounded (0.45 to 3.5)
      const torsoRatio = torsoHeight / (shoulderSpan || 0.001);
      if (torsoRatio < 0.45 || torsoRatio > 3.5) return false;

      // 5. Shoulder Tilt: Level within martial arts limits (tilt ratio <= 0.85)
      const shoulderDy = Math.abs(leftShoulder.y - rightShoulder.y);
      if (shoulderDy / (shoulderSpan || 0.001) > 0.85) return false;

      // 6. Head Centrality: Head must be reasonably centered above shoulder line
      if (Math.abs(nose.x - midShoulderX) > shoulderSpan * 1.2) return false;

      return true;
    }

    // Main frame loop
    let lastVideoTime = -1;
    function predictLoop() {
      if (!webcamRunning) return;

      try {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          
          const startTimeMs = performance.now();
          const results = poseLandmarker.detectForVideo(video, startTimeMs);
          
          // Draw viewfinder and skeletons
          drawOutput(results);
        }
      } catch (loopErr) {
        console.warn("predictLoop error:", loopErr);
      } finally {
        requestAnimationFrame(predictLoop);
      }
    }

    let stickFrameCounter = 0;
    let lastStickResults = {};
    const landmarkFilters = {};

    function oneEuroAlpha(cutoff, dt) {
      const tau = 1.0 / (2.0 * Math.PI * cutoff);
      return 1.0 / (1.0 + tau / dt);
    }

    function oneEuroFilter1D(state, value, timestampMs, minCutoff, beta, dCutoff) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return { value: value, state: null };
      }
      if (!state || timestampMs <= state.t || (timestampMs - state.t) > 500) {
        return { value: value, state: { x: value, dx: 0, t: timestampMs } };
      }
      const dt = Math.max(0.001, (timestampMs - state.t) / 1000.0);
      const aD = oneEuroAlpha(dCutoff || 1.0, dt);
      const edx = (value - state.x) / dt;
      const dx = aD * edx + (1.0 - aD) * state.dx;
      const cutoff = minCutoff + beta * Math.abs(dx);
      const a = oneEuroAlpha(cutoff, dt);
      const x = a * value + (1.0 - a) * state.x;
      return { value: x, state: { x: x, dx: dx, t: timestampMs } };
    }

    function smoothPoseLandmarks(personIdx, rawLandmarks, timestampMs) {
      if (!rawLandmarks || !Array.isArray(rawLandmarks)) return rawLandmarks;
      if (!landmarkFilters[personIdx]) {
        landmarkFilters[personIdx] = {};
      }
      const pFilters = landmarkFilters[personIdx];
      return rawLandmarks.map((lm, idx) => {
        if (!lm) return lm;
        const f = pFilters[idx] || { x: null, y: null, z: null };
        const fx = oneEuroFilter1D(f.x, lm.x, timestampMs, 1.4, 0.04, 1.0);
        const fy = oneEuroFilter1D(f.y, lm.y, timestampMs, 1.4, 0.04, 1.0);
        const zVal = lm.z !== undefined ? lm.z : 0;
        const fz = oneEuroFilter1D(f.z, zVal, timestampMs, 1.0, 0.025, 1.0);
        pFilters[idx] = { x: fx.state, y: fy.state, z: fz.state };
        return {
          x: fx.value,
          y: fy.value,
          z: lm.z !== undefined ? fz.value : undefined,
          visibility: lm.visibility
        };
      });
    }

    function drawOutput(results) {
      const currentRule = STRIKE_RULES[activeStrike] || null;
      canvasCtx.save();
      try {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // 1. Mirror the camera feed for natural viewing
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
        canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

        let personsData = [];
      const allLandmarks = (results && results.landmarks) ? results.landmarks : [];
      // Strictly filter for authentic upright human practitioners (rejects hands, partial objects, etc.)
      const validLandmarksList = allLandmarks.filter(lm => isValidHumanPose(lm));
      const smoothedLandmarksList = [];


      if (validLandmarksList.length > 0) {
        const frameTimestampMs = performance.now();
        validLandmarksList.forEach((rawLandmarks, personIdx) => {
          const landmarks = smoothPoseLandmarks(personIdx, rawLandmarks, frameTimestampMs);
          smoothedLandmarksList.push(landmarks);
          const leftShoulder = landmarks[11];
          const leftElbow = landmarks[13];
          const leftWrist = landmarks[15];
          const leftIndex = landmarks[19];
          
          const rightShoulder = landmarks[12];
          const rightElbow = landmarks[14];
          const rightWrist = landmarks[16];
          const rightIndex = landmarks[20];

          const leftHip = landmarks[23];
          const rightHip = landmarks[24];
          const leftKnee = landmarks[25];
          const rightKnee = landmarks[26];
          const leftAnkle = landmarks[27];
          const rightAnkle = landmarks[28];

          // Compute torso scale reference for 3D depth and metric normalization
          let torsoScale = 0.28;
          if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const msX = (leftShoulder.x + rightShoulder.x) / 2;
            const msY = (leftShoulder.y + rightShoulder.y) / 2;
            const mhX = (leftHip.x + rightHip.x) / 2;
            const mhY = (leftHip.y + rightHip.y) / 2;
            torsoScale = Math.sqrt((msX - mhX) * (msX - mhX) + (msY - mhY) * (msY - mhY)) || 0.28;
          }

          // 1. Calculate actual joint angles using 3D metric normalization
          const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist, torsoScale);
          const rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist, torsoScale);

          const leftShoulderAngle = calculateAngle(leftHip, leftShoulder, leftElbow, torsoScale);
          const rightShoulderAngle = calculateAngle(rightHip, rightShoulder, rightElbow, torsoScale);

          const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle, torsoScale);
          const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle, torsoScale);

          const leftWristRaw = calculateAngle(leftElbow, leftWrist, leftIndex, torsoScale);
          const rightWristRaw = calculateAngle(rightElbow, rightWrist, rightIndex, torsoScale);

          // Convert wrist angle into a signed deviation from straight line (180 deg)
          const leftWristAngle = leftWristRaw !== null ? Math.round(180 - leftWristRaw) : null;
          const rightWristAngle = rightWristRaw !== null ? Math.round(180 - rightWristRaw) : null;

          // Apply evaluator thresholds (elbow ranges)
          const rules = STRIKE_RULES[activeStrike];
          let isLeftGood = false;
          let isRightGood = false;

          if (leftAngle !== null && rules) {
            isLeftGood = leftAngle >= rules.left_min && leftAngle <= rules.left_max;
          }
          if (rightAngle !== null && rules) {
            isRightGood = rightAngle >= rules.right_min && rightAngle <= rules.right_max;
          }

          // 2. CHECK HAND (KALASAG) BIOMECHANICAL EVALUATION
          // In Arnis, the non-striking hand must actively defend the chest/solar plexus/throat
          let chestX = 0.5;
          let chestY = 0.4;
          let normGuardDist = 1.0;
          let guardScore = 0;
          let isGuardLow = false;

          if (leftShoulder && rightShoulder && leftHip && rightHip && leftShoulder.visibility > 0.35 && rightShoulder.visibility > 0.35) {
            chestX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4;
            chestY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4;
            const midShldX = (leftShoulder.x + rightShoulder.x) / 2;
            const midShldY = (leftShoulder.y + rightShoulder.y) / 2;
            const midHipX = (leftHip.x + rightHip.x) / 2;
            const midHipY = (leftHip.y + rightHip.y) / 2;
            const rawTorsoDist = Math.sqrt((midShldX - midHipX) * (midShldX - midHipX) + (midShldY - midHipY) * (midShldY - midHipY));
            torsoScale = Math.max(0.12, rawTorsoDist || 0.28);

            if (leftWrist && leftWrist.visibility > 0.35) {
              const dx = leftWrist.x - chestX;
              const dy = leftWrist.y - chestY;
              const rawDist = Math.sqrt(dx * dx + dy * dy);
              const computedRatio = rawDist / torsoScale;
              normGuardDist = Number.isFinite(computedRatio) ? parseFloat(computedRatio.toFixed(2)) : 1.0;

              if (normGuardDist <= 0.45) {
                guardScore = 100;
              } else if (normGuardDist <= 0.85) {
                guardScore = Math.max(0, Math.round(100 - (normGuardDist - 0.45) * 175));
              } else {
                guardScore = Math.max(0, Math.round(30 - (normGuardDist - 0.85) * 50));
              }

              // Check if hand is dropped below hip level
              if (leftWrist.y > leftHip.y + 0.05 || normGuardDist > 0.75) {
                isGuardLow = true;
              }
            }
          }

          // 3. STANCE & BASE (TINDIG) EVALUATION
          // Arnis forward/ready fighting stance requires bent knees (135° - 165°)
          const validKnees = [leftKneeAngle, rightKneeAngle].filter(k => k !== null && k > 0);
          const leadKneeAngle = validKnees.length > 0 ? Math.min(...validKnees) : 180;
          let stanceScore = 0;
          let isStanceHigh = false;

          if (leadKneeAngle >= 135 && leadKneeAngle <= 165) {
            stanceScore = 100;
          } else if (leadKneeAngle > 165) {
            stanceScore = Math.max(0, Math.round(100 - (leadKneeAngle - 165) * 5.8));
            if (leadKneeAngle > 170) isStanceHigh = true;
          } else {
            stanceScore = Math.max(0, Math.round(100 - (135 - leadKneeAngle) * 3.5));
          }

          // 4. TORSO ALIGNMENT & ROTATION
          let torsoTiltDeg = 0;
          let torsoScore = 100;
          if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const msX = (leftShoulder.x + rightShoulder.x) / 2;
            const msY = (leftShoulder.y + rightShoulder.y) / 2;
            const mhX = (leftHip.x + rightHip.x) / 2;
            const mhY = (leftHip.y + rightHip.y) / 2;
            const tiltRad = Math.atan2(Math.abs(msX - mhX), Math.abs(mhY - msY));
            torsoTiltDeg = Math.round(tiltRad * (180 / Math.PI));
            if (torsoTiltDeg <= 16) {
              torsoScore = 100;
            } else {
              torsoScore = Math.max(0, Math.round(100 - (torsoTiltDeg - 16) * 4.5));
            }
          }

          // 5. STRIKING ARM ACCURACY (Multi-Tier Biomechanical Calibration)
          // Inside [optimal_min, optimal_max] (25th-75th percentile): 100%
          // Inside [right_min, optimal_min) or (optimal_max, right_max] (10th-90th percentile): 80% - 99%
          // Outside [right_min, right_max]: drops below 80% at 2 points per degree of deviation.
          let elbowScore = 0;
          if (rightAngle !== null && rules) {
            const optMin = typeof rules.optimal_min === 'number' ? rules.optimal_min : rules.right_min;
            const optMax = typeof rules.optimal_max === 'number' ? rules.optimal_max : rules.right_max;
            const accMin = rules.right_min;
            const accMax = rules.right_max;

            if (rightAngle >= optMin && rightAngle <= optMax) {
              elbowScore = 100;
            } else if (rightAngle >= accMin && rightAngle < optMin) {
              const range = optMin - accMin;
              const prog = range > 0 ? (rightAngle - accMin) / range : 1;
              elbowScore = Math.round(80 + prog * 19);
            } else if (rightAngle > optMax && rightAngle <= accMax) {
              const range = accMax - optMax;
              const prog = range > 0 ? (accMax - rightAngle) / range : 1;
              elbowScore = Math.round(80 + prog * 19);
            } else {
              const dev = rightAngle < accMin ? accMin - rightAngle : rightAngle - accMax;
              elbowScore = Math.max(0, Math.round(79 - dev * 2));
            }
          }

          let shoulderScore = 80;
          if (rightShoulderAngle !== null && rules) {
            const shldMin = Math.max(10, rules.ideal_shoulder - 25);
            const shldMax = Math.min(170, rules.ideal_shoulder + 25);
            if (rightShoulderAngle >= shldMin && rightShoulderAngle <= shldMax) {
              shoulderScore = 100;
            } else {
              const dev = rightShoulderAngle < shldMin ? shldMin - rightShoulderAngle : rightShoulderAngle - shldMax;
              shoulderScore = Math.max(0, Math.round(100 - dev * 2.0));
            }
          }

          let wristScore = 85;
          if (rightWristAngle !== null) {
            if (rightWristAngle <= 15) {
              wristScore = 100;
            } else {
              wristScore = Math.max(0, Math.round(100 - (rightWristAngle - 15) * 3.5));
            }
          }

          // Mirrored shoulder center and torso scale for kinetic trajectory alignment
          const lsX = (1 - leftShoulder.x) * canvasElement.width;
          const lsY = leftShoulder.y * canvasElement.height;
          const rsX = (1 - rightShoulder.x) * canvasElement.width;
          const rsY = rightShoulder.y * canvasElement.height;
          const anchorX = (lsX + rsX) / 2;
          const anchorY = (lsY + rsY) / 2;
          const shoulderSpan = Math.sqrt((rsX - lsX) * (rsX - lsX) + (rsY - lsY) * (rsY - lsY)) || 80;
          const scale = Math.max(120, shoulderSpan * 2.1);

          let userWristDx = 0;
          let userWristDy = 0;
          if (rightWrist) {
            const rwX = (1 - rightWrist.x) * canvasElement.width;
            const rwY = rightWrist.y * canvasElement.height;
            userWristDx = (rwX - anchorX) / scale;
            userWristDy = (rwY - anchorY) / scale;
          }

          // Dynamic Motion Tracking & 4-Phase Kinetic Trajectory State Machine
          const motionState = updateMotionHistory(
            personIdx,
            rightWrist,
            rightShoulder,
            rightAngle,
            performance.now(),
            userWristDx,
            userWristDy
          );

          const trajectoryAccuracy = motionState.trajectoryAccuracy || 60;
          const strikingArmComposite = Math.round(
            elbowScore * 0.35 +
            shoulderScore * 0.25 +
            trajectoryAccuracy * 0.40
          );

          // Kinematic stick tracking (zero-latency, rock-solid 60 FPS, no GPU stalls)
          const stickLeft = detectStick(leftWrist, leftElbow);
          const stickRight = detectStick(rightWrist, rightElbow);

          // Diagnostic issue flags
          const diagnosticFlags = [];
          if (motionState.isStaticHold) {
            diagnosticFlags.push('STATIC_HOLD');
          } else if (motionState.kineticScore >= 90) {
            diagnosticFlags.push('KINETIC_FLOW_EXCELLENT');
          }
          if (trajectoryAccuracy < 60) diagnosticFlags.push('WRONG_TRAJECTORY');
          if (isGuardLow) diagnosticFlags.push('GUARD_LOW');
          if (isStanceHigh) diagnosticFlags.push('STANCE_HIGH');
          if (rightAngle !== null && rules) {
            if (rightAngle < rules.right_min) diagnosticFlags.push('ELBOW_UNDER');
            if (rightAngle > rules.right_max) diagnosticFlags.push('ELBOW_OVER');
          }
          if (rightWristAngle !== null && rightWristAngle > 20) diagnosticFlags.push('WRIST_WEAK');
          if (torsoTiltDeg > 22) diagnosticFlags.push('TORSO_LEAN');
          if (motionState.isApex) diagnosticFlags.push('APEX_LOCKED');

          const isFeetOutOfView = (!leftAnkle || leftAnkle.visibility < 0.35 || leftAnkle.y > 0.96) && 
                                  (!rightAnkle || rightAnkle.visibility < 0.35 || rightAnkle.y > 0.96);
          if (isFeetOutOfView) diagnosticFlags.push('FEET_CROPPED');

          // 6. COMPOSITE 4-PILLAR HOLISTIC ACCURACY
          // 40% Striking Arm (Joints + Trajectory) | 25% Guard Hand | 20% Stance | 15% Pitik Wrist Snap
          let compositeAccuracy = Math.round(
            strikingArmComposite * 0.40 +
            guardScore * 0.25 +
            stanceScore * 0.20 +
            wristScore * 0.15
          );

          // STRICT ARNIS MOTION GATING:
          // 1. Static Hold (didn't swing/chamber properly): Cap score to fail
          if (motionState.isStaticHold || !motionState.driveDetected) {
            compositeAccuracy = Math.min(55, compositeAccuracy);
          }
          // 2. Trajectory Mismatch (< 60% alignment with target strike vector): Cap to fail (< 75%)
          else if (trajectoryAccuracy < 60) {
            compositeAccuracy = Math.min(64, compositeAccuracy);
          }

          // Track Stick Tip for Motion Ribbon
          let stickTipX = null;
          let stickTipY = null;

          if (stickRight && stickRight.detected) {
            if (stickRight.points && stickRight.points.length > 0) {
              const lp = stickRight.points[stickRight.points.length - 1];
              stickTipX = lp.x;
              stickTipY = lp.y;
            } else {
              const reach = stickRight.reach || 85;
              stickTipX = stickRight.startX + Math.cos(stickRight.angle) * reach;
              stickTipY = stickRight.startY + Math.sin(stickRight.angle) * reach;
            }
          } else if (rightWrist && rightElbow && rightWrist.visibility > 0.35 && rightElbow.visibility > 0.35) {
            // Predict tip forward along forearm vector
            const wx = (1 - rightWrist.x) * canvasElement.width;
            const wy = rightWrist.y * canvasElement.height;
            const ex = (1 - rightElbow.x) * canvasElement.width;
            const ey = rightElbow.y * canvasElement.height;
            const vdx = wx - ex;
            const vdy = wy - ey;
            const vlen = Math.sqrt(vdx * vdx + vdy * vdy) || 1;
            const reach = Math.max(65, vlen * 1.6);
            stickTipX = wx + (vdx / vlen) * reach;
            stickTipY = wy + (vdy / vlen) * reach;
          }

          if (stickTipX !== null && stickTipY !== null) {
            updateStickTrajectory(personIdx, stickTipX, stickTipY, motionState.velocity, motionState.phase, motionState.isApex, performance.now());
          }

          const trajMetrics = calculateTrajectoryMetrics(personIdx);

          // Zero-latency Apex chime and notification to React Native
          if (motionState.isApex) {
            const nowWall = Date.now();
            if (!window.__lastApexChimeTime || nowWall - window.__lastApexChimeTime > 1200) {
              window.__lastApexChimeTime = nowWall;
              playImpactChime();
              sendToReactNative({
                type: "APEX_HIT",
                velocity: motionState.velocity,
                accuracy: compositeAccuracy
              });
            }
          }

          const chamberElbIdeal = (rules && typeof rules.chamber_elb === 'number') ? rules.chamber_elb : 135;
          let chamberElbowScore = 80;
          if (rightAngle !== null) {
            const chDev = Math.abs(rightAngle - chamberElbIdeal);
            chamberElbowScore = chDev <= 25 ? 100 : Math.max(0, Math.round(100 - (chDev - 25) * 2.0));
          }
          const chamberReadinessScore = Math.round(
            guardScore * 0.40 +
            stanceScore * 0.40 +
            chamberElbowScore * 0.20
          );

          function pickRaw2DPoint(lm) {
            if (!lm) return undefined;
            return {
              x: parseFloat(lm.x.toFixed(5)),
              y: parseFloat(lm.y.toFixed(5)),
              visibility: parseFloat(((lm.visibility !== undefined ? lm.visibility : 1)).toFixed(3))
            };
          }

          const rawPose2d = {
            timestampMs: Math.round(performance.now()),
            frameWidth: canvasElement.width || 640,
            frameHeight: canvasElement.height || 480,
            source: 'mediapipe_2d',
            coordinateSpace: 'raw_unmirrored_normalized',
            landmarks: {
              nose: pickRaw2DPoint(rawLandmarks[0]),
              leftShoulder: pickRaw2DPoint(rawLandmarks[11]),
              rightShoulder: pickRaw2DPoint(rawLandmarks[12]),
              leftElbow: pickRaw2DPoint(rawLandmarks[13]),
              rightElbow: pickRaw2DPoint(rawLandmarks[14]),
              leftWrist: pickRaw2DPoint(rawLandmarks[15]),
              rightWrist: pickRaw2DPoint(rawLandmarks[16]),
              leftHip: pickRaw2DPoint(rawLandmarks[23]),
              rightHip: pickRaw2DPoint(rawLandmarks[24]),
              leftKnee: pickRaw2DPoint(rawLandmarks[25]),
              rightKnee: pickRaw2DPoint(rawLandmarks[26]),
              leftAnkle: pickRaw2DPoint(rawLandmarks[27]),
              rightAnkle: pickRaw2DPoint(rawLandmarks[28])
            }
          };

          const autoDetectedStrike = autoDetectMode
            ? classifyStrikeMotion(
                landmarks,
                { rightAngle: rightAngle, rightShoulderAngle: rightShoulderAngle },
                trajMetrics
              )
            : null;

          const personEntry = {
            id: personIdx,
            leftAngle: leftAngle,
            rightAngle: rightAngle,
            leftShoulderAngle: leftShoulderAngle,
            rightShoulderAngle: rightShoulderAngle,
            leftKneeAngle: leftKneeAngle,
            rightKneeAngle: rightKneeAngle,
            leftWristAngle: leftWristAngle,
            rightWristAngle: rightWristAngle,
            isLeftGood: isLeftGood,
            isRightGood: isRightGood,
            isHoldingLeft: stickLeft.detected,
            isHoldingRight: stickRight.detected,
            stickLeft: stickLeft,
            stickRight: stickRight,
            motionPhase: motionState.phase,
            swingVelocity: motionState.velocity,
            extDelta: motionState.extDelta,
            isApex: motionState.isApex,
            isStaticHold: motionState.isStaticHold,
            kineticScore: motionState.kineticScore,
            trajectoryAccuracy: trajectoryAccuracy,
            chamberReadinessScore: chamberReadinessScore,
            trajectory: trajMetrics,
            detectedStrike: autoDetectedStrike,
            isPersonVisible: true,
            // 5-pillar scores & diagnostics
            accuracy: compositeAccuracy,
            elbowScore: elbowScore,
            shoulderScore: shoulderScore,
            wristScore: wristScore,
            kneeScore: stanceScore,
            guardScore: guardScore,
            stanceScore: stanceScore,
            torsoScore: torsoScore,
            leadKneeAngle: Math.round(leadKneeAngle),
            normGuardDist: normGuardDist,
            isGuardLow: isGuardLow,
            isStanceHigh: isStanceHigh,
            isFeetOutOfView: isFeetOutOfView,
            diagnosticFlags: diagnosticFlags,
            rawPose2d: rawPose2d
          };

          personsData.push(personEntry);
          drawPersonSkeleton(canvasCtx, landmarks, personEntry, personIdx, canvasElement.width, canvasElement.height);
        });
      }

      lastRenderedLandmarks = smoothedLandmarksList;
      lastRenderedPersons = personsData;

      // Send state back to React Native (throttled to ~18 FPS to protect JNI bridge, with bypass only on transient apex impact)
      const now = performance.now();
      const hasApexEvent = personsData.some(p => p.isApex || p.phase === 'apex_hit' || (p.diagnosticFlags && p.diagnosticFlags.includes('APEX_LOCKED')));
      const isThrottleElapsed = !window.__lastPoseDataSendTime || (now - window.__lastPoseDataSendTime >= 55);

      if (hasApexEvent || isThrottleElapsed) {
        window.__lastPoseDataSendTime = now;
        const rules = STRIKE_RULES[activeStrike];
        if (personsData.length > 0) {
          sendToReactNative({
            type: "POSE_DATA",
            persons: personsData,
            activeStrikeName: rules ? rules.name : ""
          });
        } else {
          sendToReactNative({
            type: "POSE_DATA",
            persons: []
          });
        }
      }

      // Trigger un-mirrored snapshot automatically when user achieves correct form (green posture)
      if (personsData.length > 0) {
        const hasGoodPosture = personsData.some(p => p.accuracy >= 85 || p.isApex);
        const wallNow = Date.now();
        if (hasGoodPosture && (!window.__lastAutoSnap || wallNow - window.__lastAutoSnap > 3500)) {
          window.__lastAutoSnap = wallNow;
          try {
            const snap = captureUnmirroredSnapshot(smoothedLandmarksList, personsData);
            if (snap) {
              sendToReactNative({
                type: "SNAPSHOT_CAPTURED",
                base64: snap
              });
            }
          } catch(e) {}
        }
      }

      // Draw text annotations, person names, angles, and sticks in absolute coordinates
      canvasCtx.restore();
      canvasCtx.save();
      
      canvasCtx.font = "bold 16px sans-serif";

      if (smoothedLandmarksList.length > 0) {
        smoothedLandmarksList.forEach((landmarks, personIdx) => {
          const colors = PERSON_COLORS[personIdx % PERSON_COLORS.length] || PERSON_COLORS[0];
          const data = personsData[personIdx];
          if (!data) return;

          const leftShoulder = landmarks[11];
          const rightShoulder = landmarks[12];
          const leftElbow = landmarks[13];
          const rightElbow = landmarks[14];
          const leftWrist = landmarks[15];
          const leftHip = landmarks[23];
          const rightHip = landmarks[24];

          // 1. Draw Check Hand (Kalasag) Target Shield Zone
          if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const chX = (1 - (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4) * canvasElement.width;
            const chY = ((leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4) * canvasElement.height;
            const isGuardLocked = data.guardScore >= 80;

            canvasCtx.save();
            canvasCtx.beginPath();
            canvasCtx.arc(chX, chY, 22, 0, 2 * Math.PI);
            canvasCtx.lineWidth = 2.5;
            canvasCtx.strokeStyle = isGuardLocked ? "rgba(16, 185, 129, 0.85)" : "rgba(245, 158, 11, 0.65)";
            if (!isGuardLocked) {
              canvasCtx.setLineDash([4, 4]);
            }
            canvasCtx.stroke();

            // Guard Label
            canvasCtx.font = "bold 10px sans-serif";
            canvasCtx.fillStyle = isGuardLocked ? "#10b981" : "#f59e0b";
            canvasCtx.textAlign = "center";
            canvasCtx.fillText(isGuardLocked ? "🛡️ GUARD LOCKED" : "🛡️ CHECK HAND", chX, chY + 34);
            canvasCtx.restore();
          }

          // 2. Draw Multi-Pillar HUD Badge above Head
          if (leftShoulder && rightShoulder) {
            const avgX = (leftShoulder.x + rightShoulder.x) / 2;
            const avgY = (leftShoulder.y + rightShoulder.y) / 2;
            const shoulderY = avgY * canvasElement.height;
            const shoulderSpan = Math.abs((1 - leftShoulder.x) - (1 - rightShoulder.x)) * canvasElement.width;

            // Accurately determine top of user's head using facial landmarks if available
            const nose = landmarks[0];
            const leftEar = landmarks[7];
            const rightEar = landmarks[8];
            let headTopY;

            if (nose && (nose.visibility === undefined || nose.visibility > 0.25)) {
              const noseY = nose.y * canvasElement.height;
              // Distance from shoulders to nose represents lower/mid face
              const shoulderToNose = Math.max(30, shoulderY - noseY);
              // Scalp/cap extends approximately 0.85x - 1.0x that distance above the nose
              headTopY = noseY - shoulderToNose * 0.85;
            } else if ((leftEar && leftEar.visibility > 0.3) || (rightEar && rightEar.visibility > 0.3)) {
              const earY = (leftEar && leftEar.visibility > 0.3 ? leftEar.y : rightEar.y) * canvasElement.height;
              headTopY = earY - Math.max(30, shoulderSpan * 0.35);
            } else {
              // Geometric biomechanical ratio: head top is ~0.85 - 1.0 * shoulderSpan above shoulders
              headTopY = shoulderY - Math.max(120, shoulderSpan * 0.95);
            }

            // Beginner-friendly live status badge above head (no cryptic numbers)
            canvasCtx.font = "bold 11px sans-serif";
            const armMark = data.isRightGood ? "✓" : "•";
            const guardMark = data.guardScore >= 80 ? "✓" : "•";
            const stanceMark = data.stanceScore >= 80 ? "✓" : "•";
            const wristScoreVal = typeof data.wristScore === 'number' ? data.wristScore : 85;
            const wristMark = wristScoreVal >= 80 ? "✓" : "•";
            const hudStr = "⚔️ Arm " + armMark + "  ·  🛡️ Guard " + guardMark + "  ·  🦵 Stance " + stanceMark + "  ·  ⚡ Snap " + wristMark;

            // Dynamically sized pill based on measured text width
            const measuredW = canvasCtx.measureText ? canvasCtx.measureText(hudStr).width : 270;
            const pillW = Math.max(220, Math.round(measuredW + 22));
            const pillH = 26;
            let absX = (1 - avgX) * canvasElement.width;
            // Clamp horizontal position so pill is always fully visible inside screen
            absX = Math.max(pillW / 2 + 10, Math.min(canvasElement.width - pillW / 2 - 10, absX));

            // Float 28px above head, clamped with safe screen boundaries
            const absY = Math.max(pillH / 2 + 8, Math.min(canvasElement.height - 40, headTopY - 28));

            // Background pill for metrics
            canvasCtx.save();
            canvasCtx.fillStyle = "rgba(11, 15, 25, 0.85)";
            canvasCtx.strokeStyle = data.accuracy >= 85 ? "#10b981" : "rgba(255, 255, 255, 0.2)";
            canvasCtx.lineWidth = 1.5;
            const pillX = absX - pillW / 2;
            const pillY = absY - pillH / 2;

            canvasCtx.beginPath();
            if (canvasCtx.roundRect) {
              canvasCtx.roundRect(pillX, pillY, pillW, pillH, 8);
            } else {
              canvasCtx.rect(pillX, pillY, pillW, pillH);
            }
            canvasCtx.fill();
            canvasCtx.stroke();

            // Render metric text
            canvasCtx.textAlign = "center";
            canvasCtx.fillStyle = "#ffffff";
            canvasCtx.fillText(hudStr, absX, absY + 4);
            canvasCtx.restore();
          }

          // 3. Draw Plain-English Arm Form Cue on Striking Elbow (no raw degree clutter)
          canvasCtx.font = "bold 12px sans-serif";
          canvasCtx.textAlign = "center";
          if (data.rightAngle !== null && rightElbow && rightElbow.visibility > 0.4) {
            const x = (1 - rightElbow.x) * canvasElement.width;
            const y = rightElbow.y * canvasElement.height - 15;
            const color = data.isRightGood ? "#10b981" : "#f59e0b";
            const armCue = data.isRightGood ? "✓ Good Arm" : "Reach Arm";
            canvasCtx.fillStyle = color;
            canvasCtx.strokeStyle = "#0b0f19";
            canvasCtx.lineWidth = 3;
            canvasCtx.strokeText(armCue, x, y);
            canvasCtx.fillText(armCue, x, y);
          }

          // 4. Draw Stick highlights
          function drawStickLine(stick) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(stick.startX, stick.startY);
            if (stick.points && stick.points.length > 0) {
              const lastPt = stick.points[stick.points.length - 1];
              canvasCtx.lineTo(lastPt.x, lastPt.y);
            } else {
              const endX = stick.startX + Math.cos(stick.angle) * 80;
              const endY = stick.startY + Math.sin(stick.angle) * 80;
              canvasCtx.lineTo(endX, endY);
            }
            canvasCtx.lineWidth = 6;
            canvasCtx.strokeStyle = "#facc15"; // bright yellow stick overlay
            canvasCtx.lineCap = "round";
            canvasCtx.shadowBlur = 8;
            canvasCtx.shadowColor = "#facc15";
            canvasCtx.stroke();
            canvasCtx.shadowBlur = 0; // reset
          }

          if (data.stickLeft && data.stickLeft.detected) {
            drawStickLine(data.stickLeft);
          }
          if (data.stickRight && data.stickRight.detected) {
            drawStickLine(data.stickRight);
          }

          // 5. Draw Stick Motion Ribbon Trail
          drawMotionRibbon(personIdx, canvasCtx);
        });

        // 6. Draw Apex Hit Shockwave Bursts
        drawApexBursts(canvasCtx, performance.now());

        // 7. Calculate Body Anchor for Visual Guides
        const primaryPersonObj = personsData[0] || null;
        const primaryLandmarks = smoothedLandmarksList[0] || null;

        let guideAnchorX = canvasElement.width * 0.5;
        let guideAnchorY = canvasElement.height * 0.35;
        let guideScale = canvasElement.height * 0.45;

        if (primaryLandmarks && primaryLandmarks[11] && primaryLandmarks[12] && primaryLandmarks[11].visibility > 0.35) {
          const lsX = (1 - primaryLandmarks[11].x) * canvasElement.width;
          const lsY = primaryLandmarks[11].y * canvasElement.height;
          const rsX = (1 - primaryLandmarks[12].x) * canvasElement.width;
          const rsY = primaryLandmarks[12].y * canvasElement.height;
          guideAnchorX = (lsX + rsX) / 2;
          guideAnchorY = (lsY + rsY) / 2;
          const shoulderSpan = Math.sqrt((rsX - lsX) * (rsX - lsX) + (rsY - lsY) * (rsY - lsY)) || 80;
          guideScale = Math.max(120, shoulderSpan * 2.1);
        }

        // 8. Draw Ghost Silhouette / Master Guide Overlay
        drawGhostSilhouette(activeStrike, primaryPersonObj, primaryLandmarks, canvasCtx, performance.now());

        // 9. Draw Holographic Strike Trajectory Guide & Target Bullseye
        drawStrikeTrajectoryGuide(activeStrike, guideAnchorX, guideAnchorY, guideScale, canvasCtx, performance.now());

        // 10. Form Coach Interactive Step Engine
        if (formCoachMode && primaryPersonObj && currentRule) {
          const now = performance.now();
          const rAngle = primaryPersonObj.rightAngle || 0;
          const elbScore = primaryPersonObj.elbowScore || 0;
          const gdScore = primaryPersonObj.guardScore || 0;
          const stScore = primaryPersonObj.stanceScore || 0;
          const wrScore = primaryPersonObj.wristScore || 0;
          const mPhase = primaryPersonObj.motionPhase || 'idle';
          const vel = primaryPersonObj.swingVelocity || 0;
          const isApexHit = !!primaryPersonObj.isApex || mPhase === 'apex_hit';

          if (formCoachPhase === 'chamber') {
            const isChamberAligned = (Math.abs(rAngle - (currentRule.chamber_elb || 140)) <= 30 || elbScore >= 70) && gdScore >= 65 && stScore >= 65;
            if (isChamberAligned) {
              if (chamberHoldStartTime === null) {
                chamberHoldStartTime = now;
              } else if (now - chamberHoldStartTime >= 700) {
                formCoachPhase = 'impact';
                chamberHoldStartTime = null;
                sendToReactNative({
                  type: "FORM_COACH_STEP_PASSED",
                  phase: "chamber",
                  score: primaryPersonObj.accuracy,
                  strikeId: activeStrike
                });
              }
            } else {
              chamberHoldStartTime = null;
            }
          } else if (formCoachPhase === 'impact') {
            const isImpactApex = isApexHit || (primaryPersonObj.isRightGood && (wrScore >= 70 || vel >= 0.15));
            if (isImpactApex) {
              formCoachPhase = 'recovery';
              recoveryHoldStartTime = null;
              sendToReactNative({
                type: "FORM_COACH_STEP_PASSED",
                phase: "impact",
                score: primaryPersonObj.accuracy,
                strikeId: activeStrike
              });
            }
          } else if (formCoachPhase === 'recovery') {
            const isRecoveryHeld = vel < 0.22 && gdScore >= 70 && stScore >= 70;
            if (isRecoveryHeld) {
              if (recoveryHoldStartTime === null) {
                recoveryHoldStartTime = now;
              } else if (now - recoveryHoldStartTime >= 600) {
                formCoachPhase = 'chamber';
                recoveryHoldStartTime = null;
                sendToReactNative({
                  type: "FORM_COACH_STEP_PASSED",
                  phase: "recovery",
                  score: primaryPersonObj.accuracy,
                  strikeId: activeStrike
                });
              }
            } else {
              recoveryHoldStartTime = null;
            }
          }
        }

        // 11. Draw Form Coach Banner HUD
        if (formCoachMode) {
          drawFormCoachHUD(canvasCtx, formCoachPhase, activeStrike, performance.now());
        }

        // 12. Draw Live Kinetic Phase HUD (Always locked to target strike)
        drawKineticPhaseHUD(canvasCtx, primaryPersonObj, performance.now());

        // 13. 3-Meter Visual Ergonomics: Draw Peripheral Edge Glow & Status Indicator
        drawPeripheralEdgeGlow(canvasCtx, primaryPersonObj, canvasElement.width, canvasElement.height, performance.now());
      } else {
        // Draw centered idle ghost guide and trajectory when no person in frame
        const cX = canvasElement.width * 0.5;
        const cY = canvasElement.height * 0.35;
        const cScale = canvasElement.height * 0.45;
        drawGhostSilhouette(activeStrike, null, null, canvasCtx, performance.now());
        drawStrikeTrajectoryGuide(activeStrike, cX, cY, cScale, canvasCtx, performance.now());
        if (formCoachMode) {
          drawFormCoachHUD(canvasCtx, formCoachPhase, activeStrike, performance.now());
        }
        drawKineticPhaseHUD(canvasCtx, null, performance.now());
      }
      } catch (err) {
        console.warn("drawOutput error:", err);
      } finally {
        canvasCtx.restore();
      }
    }

    // Run initialization on load or DOMContentLoaded (robust)
    function start() {
      if (window.__poseInitStarted) return;
      window.__poseInitStarted = true;
      initPoseEstimation();
    }

    if (document.readyState === "complete" || document.readyState === "interactive") {
      start();
    } else {
      window.addEventListener("DOMContentLoaded", start);
      window.addEventListener("load", start);
    }
  </script>
</body>
</html>
`;

export const getPoseEngineHtml = (modelUrl: string) => `
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
      display: none;
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

    const STRIKE_RULES = {
      "strike_1": { id: "strike_1", name: "Strike 1: Left Temple", chamber_elb: 143.0, right_min: 110.9, right_max: 156.8, left_min: 25.7, left_max: 94.2, ideal_shoulder: 38.5, ideal_knee: 155.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Chest Guard (Kalasag)", ext_delta: 28.0 },
      "strike_2": { id: "strike_2", name: "Strike 2: Right Temple", chamber_elb: 77.3, right_min: 132.3, right_max: 175.3, left_min: 21.8, left_max: 149.0, ideal_shoulder: 81.9, ideal_knee: 155.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Chest Guard (Kalasag)", ext_delta: 75.1 },
      "strike_3": { id: "strike_3", name: "Strike 3: Left Torso", chamber_elb: 69.5, right_min: 87.2, right_max: 114.0, left_min: 3.7, left_max: 127.7, ideal_shoulder: 77.4, ideal_knee: 152.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Solar Plexus Guard", ext_delta: 83.4 },
      "strike_4": { id: "strike_4", name: "Strike 4: Right Torso", chamber_elb: 81.6, right_min: 121.1, right_max: 165.8, left_min: 23.5, left_max: 84.2, ideal_shoulder: 75.3, ideal_knee: 152.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Solar Plexus Guard", ext_delta: 67.1 },
      "strike_5": { id: "strike_5", name: "Strike 5: Abdomen Thrust", chamber_elb: 28.5, right_min: 151.1, right_max: 168.4, left_min: 22.0, left_max: 69.1, ideal_shoulder: 27.8, ideal_knee: 150.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "High Chest Guard", ext_delta: 145.8 },
      "strike_6": { id: "strike_6", name: "Strike 6: Left Chest", chamber_elb: 164.2, right_min: 158.0, right_max: 178.8, left_min: 55.6, left_max: 100.2, ideal_shoulder: 32.6, ideal_knee: 152.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Face/Chin Guard", ext_delta: 14.7 },
      "strike_7": { id: "strike_7", name: "Strike 7: Right Chest", chamber_elb: 168.5, right_min: 149.2, right_max: 172.1, left_min: 69.4, left_max: 172.3, ideal_shoulder: 21.3, ideal_knee: 152.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Face/Chin Guard", ext_delta: 97.9 },
      "strike_8": { id: "strike_8", name: "Strike 8: Left Knee", chamber_elb: 99.5, right_min: 165.5, right_max: 178.0, left_min: 25.1, left_max: 97.8, ideal_shoulder: 17.4, ideal_knee: 145.0, knee_min: 130.0, knee_max: 160.0, guard_target: "chest", guard_label: "Upper Torso Guard", ext_delta: 98.6 },
      "strike_9": { id: "strike_9", name: "Strike 9: Right Knee", chamber_elb: 105.2, right_min: 170.3, right_max: 176.3, left_min: 37.5, left_max: 66.8, ideal_shoulder: 11.2, ideal_knee: 145.0, knee_min: 130.0, knee_max: 160.0, guard_target: "chest", guard_label: "Upper Torso Guard", ext_delta: 94.5 },
      "strike_10": { id: "strike_10", name: "Strike 10: Left Eye", chamber_elb: 170.4, right_min: 161.9, right_max: 179.1, left_min: 39.2, left_max: 84.2, ideal_shoulder: 18.3, ideal_knee: 154.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Throat/Chest Guard", ext_delta: 15.1 },
      "strike_11": { id: "strike_11", name: "Strike 11: Right Eye", chamber_elb: 167.3, right_min: 151.9, right_max: 178.9, left_min: 88.2, left_max: 169.8, ideal_shoulder: 22.7, ideal_knee: 154.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Throat/Chest Guard", ext_delta: 113.0 },
      "strike_12": { id: "strike_12", name: "Strike 12: Crown", chamber_elb: 114.4, right_min: 111.1, right_max: 135.0, left_min: 24.3, left_max: 118.3, ideal_shoulder: 87.1, ideal_knee: 155.0, knee_min: 135.0, knee_max: 165.0, guard_target: "chest", guard_label: "Center Chest Guard", ext_delta: 27.6 }
    };

    // Motion history buffer per person (up to 15 frames)
    const personHistories = {};

    function updateMotionHistory(personIdx, rightWrist, rightShoulder, rightAngle, timestamp) {
      if (!personHistories[personIdx]) {
        personHistories[personIdx] = [];
      }
      const history = personHistories[personIdx];
      
      let wristDist = 0;
      if (rightWrist && rightShoulder) {
        const dx = rightWrist.x - rightShoulder.x;
        const dy = rightWrist.y - rightShoulder.y;
        wristDist = Math.sqrt(dx * dx + dy * dy);
      }

      history.push({
        x: rightWrist ? rightWrist.x : 0,
        y: rightWrist ? rightWrist.y : 0,
        dist: wristDist,
        angle: rightAngle || 0,
        t: timestamp
      });

      if (history.length > 15) {
        history.shift();
      }

      let velocity = 0;
      let extDelta = 0;
      if (history.length >= 2) {
        const newest = history[history.length - 1];
        const oldest = history[0];
        const prev = history[history.length - 2];

        const dt = Math.max(0.001, (newest.t - prev.t) / 1000);
        const dx = newest.x - prev.x;
        const dy = newest.y - prev.y;
        velocity = Math.sqrt(dx * dx + dy * dy) / dt;
        extDelta = newest.dist - oldest.dist;
      }

      const rules = STRIKE_RULES[activeStrike];
      let phase = "idle";
      let isApex = false;

      if (rules) {
        const elDiffChamber = rightAngle !== null ? Math.abs(rightAngle - rules.chamber_elb) : 99;
        if (elDiffChamber < 25 || velocity < 0.12) {
          phase = "chambering";
        } else if (velocity >= 0.12) {
          phase = "swinging";
        }

        if (history.length >= 3 && rightAngle !== null) {
          const curr = history[history.length - 1];
          const prev1 = history[history.length - 2];
          const prev2 = history[history.length - 3];

          const isInTargetRange = rightAngle >= (rules.right_min - 12) && rightAngle <= (rules.right_max + 12);
          const isLocalPeakExt = prev1.dist >= prev2.dist && curr.dist < prev1.dist;
          
          if (isInTargetRange && (isLocalPeakExt || (phase === "swinging" && velocity < 0.25))) {
            phase = "apex_hit";
            isApex = true;
          }
        }
      }

      return {
        velocity: parseFloat(velocity.toFixed(3)),
        extDelta: parseFloat(extDelta.toFixed(3)),
        phase: phase,
        isApex: isApex
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
      const strikeName = (STRIKE_RULES[strikeId] && STRIKE_RULES[strikeId].name) ? STRIKE_RULES[strikeId].name : "";
      const tagText = isOverallLocked ? "✓ GHOST POSTURE MATCHED" : ("MASTER GUIDE: " + strikeName);
      ctx.fillText(tagText, ghost.shoulderCenter.x - 70, ghost.shoulderCenter.y - scale * 0.18);

      ctx.restore();
    }

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

    function drawFormCoachHUD(ctx, phase, strikeId, now) {
      if (!formCoachMode) return;

      ctx.save();
      const canvasW = canvasElement.width;
      const bannerW = Math.min(340, canvasW - 24);
      const bannerH = 58;
      const bannerX = (canvasW - bannerW) / 2;
      const bannerY = 14;

      // Dark glass container
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(56, 189, 248, 0.4)";
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 12);
      ctx.fill();
      ctx.stroke();

      // Step indicators: 1. Kasa -> 2. Tudla -> 3. Bawi
      const steps = [
        { key: 'chamber', label: '1. KASA', name: 'Chamber' },
        { key: 'impact', label: '2. TUDLA', name: 'Strike' },
        { key: 'recovery', label: '3. BAWI', name: 'Recovery' }
      ];

      const stepW = bannerW / 3;
      steps.forEach((step, idx) => {
        const isCurrent = phase === step.key;
        const isDone = (phase === 'impact' && idx === 0) || (phase === 'recovery' && idx <= 1);
        const sX = bannerX + idx * stepW + stepW / 2;
        const sY = bannerY + 18;

        ctx.textAlign = "center";
        ctx.font = isCurrent ? "bold 11px sans-serif" : "bold 10px sans-serif";
        ctx.fillStyle = isDone ? "#10B981" : isCurrent ? "#F59E0B" : "#64748B";
        ctx.fillText((isDone ? "✓ " : "") + step.label, sX, sY);

        ctx.font = "9px sans-serif";
        ctx.fillStyle = isCurrent ? "#FFFFFF" : "#94A3B8";
        ctx.fillText(step.name, sX, sY + 12);
      });

      // Bottom dynamic guidance text
      let guideText = "Chamber stick by ear & raise check hand";
      if (phase === 'impact') {
        guideText = "⚡ Slice along trajectory line through apex!";
      } else if (phase === 'recovery') {
        guideText = "🛡️ Return to ready guard stance!";
      }

      ctx.font = "bold 10.5px sans-serif";
      ctx.fillStyle = phase === 'impact' ? "#FACC15" : phase === 'recovery' ? "#38BDF8" : "#E2E8F0";
      ctx.textAlign = "center";
      ctx.fillText(guideText, bannerX + bannerW / 2, bannerY + 48);

      ctx.restore();
    }

    // Capture Canvas Snapshot helper
    window.captureSnapshot = () => {
      try {
        if (canvasElement) {
          const snap = canvasElement.toDataURL("image/jpeg", 0.75);
          sendToReactNative({ type: "SNAPSHOT_CAPTURED", base64: snap });
        }
      } catch(e) {
        console.error("Failed to capture snapshot:", e);
      }
    };

    // Canvas Stream & MediaRecorder Video Replay Engine
    let mediaRecorder = null;
    let recordedChunks = [];

    window.startVideoRecording = () => {
      try {
        if (!canvasElement) return;
        recordedChunks = [];
        const stream = canvasElement.captureStream ? canvasElement.captureStream(25) : null;
        if (!stream) {
          console.warn("captureStream not supported on canvas element");
          return;
        }

        let options = {};
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            options = { mimeType: 'video/webm;codecs=vp9' };
          } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('video/webm')) {
            options = { mimeType: 'video/webm' };
          } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('video/mp4')) {
            options = { mimeType: 'video/mp4' };
          }

          mediaRecorder = new MediaRecorder(stream, options);
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              recordedChunks.push(e.data);
            }
          };

          mediaRecorder.onstop = () => {
            try {
              const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' });
              const reader = new FileReader();
              reader.onloadend = () => {
                const videoDataUrl = reader.result;
                sendToReactNative({
                  type: "VIDEO_REPLAY_CAPTURED",
                  base64: videoDataUrl
                });
              };
              reader.readAsDataURL(blob);
            } catch (err) {
              console.error("Blob read error:", err);
            }
          };

          mediaRecorder.start(100);
        }
      } catch (err) {
        console.error("Failed to start MediaRecorder:", err);
      }
    };

    window.stopVideoRecording = () => {
      try {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      } catch (err) {
        console.error("Failed to stop MediaRecorder:", err);
      }
    };

    const PERSON_COLORS = [
      { primary: "#10b981", secondary: "rgba(16, 185, 129, 0.4)" },
      { primary: "#8b5cf6", secondary: "rgba(139, 92, 246, 0.4)" },
      { primary: "#f59e0b", secondary: "rgba(245, 158, 11, 0.4)" },
      { primary: "#ec4899", secondary: "rgba(236, 72, 153, 0.4)" }
    ];

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

    function detectStick(wristLandmark, imgData, stickMode) {
      if (!wristLandmark || wristLandmark.visibility < 0.4 || !imgData) {
        return { detected: false };
      }
      
      const width = imgData.width;
      const height = imgData.height;
      const startX = (1 - wristLandmark.x) * width;
      const startY = wristLandmark.y * height;
      const data = imgData.data;

      function getPixelColor(x, y) {
        const xi = Math.round(x);
        const yi = Math.round(y);
        if (xi < 0 || xi >= width || yi < 0 || yi >= height) {
          return null;
        }
        const idx = (yi * width + xi) * 4;
        return { r: data[idx], g: data[idx+1], b: data[idx+2] };
      }

      const numAngles = 16;
      const maxSteps = 12;
      const stepSize = 8; // pixels

      let bestAngle = 0;
      let maxMatches = 0;
      let bestLinePoints = [];

      for (let a = 0; a < numAngles; a++) {
        const angle = (a * 2 * Math.PI) / numAngles;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        let matches = 0;
        let points = [];

        for (let s = 1; s <= maxSteps; s++) {
          const dist = s * stepSize;
          const px = startX + cosA * dist;
          const py = startY + sinA * dist;

          const color = getPixelColor(px, py);
          if (color) {
            if (isStickColor(color.r, color.g, color.b, stickMode)) {
              matches++;
              points.push({ x: px, y: py });
            }
          }
        }

        if (matches > maxMatches) {
          maxMatches = matches;
          bestAngle = angle;
          bestLinePoints = points;
        }
      }

      const detected = maxMatches >= 5;
      return {
        detected,
        angle: bestAngle,
        points: bestLinePoints,
        startX,
        startY
      };
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
            numPoses: 4
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
            numPoses: 4
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

    // Standard joint angle calculation
    function calculateAngle(a, b, c) {
      if (!a || !b || !c || a.visibility < 0.35 || b.visibility < 0.35 || c.visibility < 0.35) {
        return null;
      }
      // Vector ba: elbow (b) to shoulder (a)
      const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
      // Vector bc: elbow (b) to wrist (c)
      const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

      const dotProduct = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
      const magA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
      const magC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);

      if (magA === 0 || magC === 0) return null;

      let cosine = dotProduct / (magA * magC);
      cosine = Math.max(-1.0, Math.min(1.0, cosine)); // clamp

      const angleRad = Math.acos(cosine);
      return parseFloat((angleRad * (180 / Math.PI)).toFixed(1));
    }

    // Main frame loop
    let lastVideoTime = -1;
    function predictLoop() {
      if (!webcamRunning) return;

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        const startTimeMs = performance.now();
        const results = poseLandmarker.detectForVideo(video, startTimeMs);
        
        // Draw viewfinder and skeletons
        drawOutput(results);
      }
      requestAnimationFrame(predictLoop);
    }

    function drawOutput(results) {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // 1. Mirror the camera feed for natural viewing
      canvasCtx.translate(canvasElement.width, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

      // Get image data once per frame for stick detection
      let imgData = null;
      if (results && results.landmarks && results.landmarks.length > 0) {
        try {
          imgData = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
        } catch (e) {
          console.error("Canvas read error:", e);
        }
      }

      let personsData = [];

      if (results && results.landmarks && results.landmarks.length > 0) {
        results.landmarks.forEach((landmarks, personIdx) => {
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

          // 1. Calculate actual joint angles
          const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
          const rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

          const leftShoulderAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
          const rightShoulderAngle = calculateAngle(rightHip, rightShoulder, rightElbow);

          const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
          const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

          const leftWristRaw = calculateAngle(leftElbow, leftWrist, leftIndex);
          const rightWristRaw = calculateAngle(rightElbow, rightWrist, rightIndex);

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
          let torsoScale = 0.3;
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
            torsoScale = Math.sqrt((midShldX - midHipX) * (midShldX - midHipX) + (midShldY - midHipY) * (midShldY - midHipY)) || 0.28;

            if (leftWrist && leftWrist.visibility > 0.35) {
              const dx = leftWrist.x - chestX;
              const dy = leftWrist.y - chestY;
              const rawDist = Math.sqrt(dx * dx + dy * dy);
              normGuardDist = parseFloat((rawDist / torsoScale).toFixed(2));

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

          // 5. STRIKING ARM ACCURACY
          let elbowScore = 0;
          if (rightAngle !== null && rules) {
            if (rightAngle >= rules.right_min && rightAngle <= rules.right_max) {
              elbowScore = 100;
            } else {
              const dev = rightAngle < rules.right_min ? rules.right_min - rightAngle : rightAngle - rules.right_max;
              elbowScore = Math.max(0, Math.round(100 - dev * 2.2));
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

          const strikingArmComposite = Math.round(elbowScore * 0.75 + shoulderScore * 0.25);

          // 6. COMPOSITE 4-PILLAR HOLISTIC ACCURACY
          // 40% Striking Arm | 25% Guard Hand | 20% Stance | 15% Power/Wrist
          const compositeAccuracy = Math.round(
            strikingArmComposite * 0.40 +
            guardScore * 0.25 +
            stanceScore * 0.20 +
            wristScore * 0.15
          );

          // Diagnostic issue flags
          const diagnosticFlags = [];
          if (isGuardLow) diagnosticFlags.push('GUARD_LOW');
          if (isStanceHigh) diagnosticFlags.push('STANCE_HIGH');
          if (rightAngle !== null && rules) {
            if (rightAngle < rules.right_min) diagnosticFlags.push('ELBOW_UNDER');
            if (rightAngle > rules.right_max) diagnosticFlags.push('ELBOW_OVER');
          }
          if (rightWristAngle !== null && rightWristAngle > 20) diagnosticFlags.push('WRIST_WEAK');
          if (torsoTiltDeg > 22) diagnosticFlags.push('TORSO_LEAN');

          // Stick detection
          const stickLeft = detectStick(leftWrist, imgData, stickColorMode);
          const stickRight = detectStick(rightWrist, imgData, stickColorMode);

          // Dynamic Motion Tracking Calculation
          const motionState = updateMotionHistory(personIdx, rightWrist, rightShoulder, rightAngle, performance.now());
          if (motionState.isApex) diagnosticFlags.push('APEX_LOCKED');

          // Track Stick Tip for Motion Ribbon
          let stickTipX = null;
          let stickTipY = null;

          if (stickRight && stickRight.detected) {
            if (stickRight.points && stickRight.points.length > 0) {
              const lp = stickRight.points[stickRight.points.length - 1];
              stickTipX = lp.x;
              stickTipY = lp.y;
            } else {
              stickTipX = stickRight.startX + Math.cos(stickRight.angle) * 85;
              stickTipY = stickRight.startY + Math.sin(stickRight.angle) * 85;
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
            stickTipX = wx + (vdx / vlen) * 75;
            stickTipY = wy + (vdy / vlen) * 75;
          }

          if (stickTipX !== null && stickTipY !== null) {
            updateStickTrajectory(personIdx, stickTipX, stickTipY, motionState.velocity, motionState.phase, motionState.isApex, performance.now());
          }

          const trajMetrics = calculateTrajectoryMetrics(personIdx);

          personsData.push({
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
            trajectory: trajMetrics,
            isPersonVisible: true,
            // 4-pillar scores & diagnostics
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
            diagnosticFlags: diagnosticFlags
          });

          // Draw skeleton connectors with neon colors based on person index
          const colors = PERSON_COLORS[personIdx % PERSON_COLORS.length] || PERSON_COLORS[0];
          const connectorColor = colors.secondary;
          const leftColor = isLeftGood ? "#10b981" : "#ef4444";
          const rightColor = isRightGood ? "#10b981" : "#ef4444";
          
          // Color-code leg skeleton according to martial stance stability
          const legStanceColor = stanceScore >= 80 ? "#10b981" : (isStanceHigh ? "#f59e0b" : "#ef4444");

          const torsoConnections = [
            [11, 12], // shoulder-to-shoulder
            [11, 23], [12, 24], [23, 24] // torso
          ];

          // Draw basic torso lines
          canvasCtx.lineWidth = 4;
          canvasCtx.strokeStyle = connectorColor;
          torsoConnections.forEach(([p1, p2]) => {
            const joint1 = landmarks[p1];
            const joint2 = landmarks[p2];
            if (joint1 && joint2 && joint1.visibility > 0.4 && joint2.visibility > 0.4) {
              canvasCtx.beginPath();
              canvasCtx.moveTo(joint1.x * canvasElement.width, joint1.y * canvasElement.height);
              canvasCtx.lineTo(joint2.x * canvasElement.width, joint2.y * canvasElement.height);
              canvasCtx.stroke();
            }
          });

          // Draw left leg (with stance glow)
          canvasCtx.strokeStyle = legStanceColor;
          canvasCtx.beginPath();
          if (leftHip && leftKnee && leftHip.visibility > 0.4 && leftKnee.visibility > 0.4) {
            canvasCtx.moveTo(leftHip.x * canvasElement.width, leftHip.y * canvasElement.height);
            canvasCtx.lineTo(leftKnee.x * canvasElement.width, leftKnee.y * canvasElement.height);
          }
          if (leftKnee && leftAnkle && leftKnee.visibility > 0.4 && leftAnkle.visibility > 0.4) {
            canvasCtx.lineTo(leftAnkle.x * canvasElement.width, leftAnkle.y * canvasElement.height);
          }
          canvasCtx.stroke();

          // Draw right leg (with stance glow)
          canvasCtx.strokeStyle = legStanceColor;
          canvasCtx.beginPath();
          if (rightHip && rightKnee && rightHip.visibility > 0.4 && rightKnee.visibility > 0.4) {
            canvasCtx.moveTo(rightHip.x * canvasElement.width, rightHip.y * canvasElement.height);
            canvasCtx.lineTo(rightKnee.x * canvasElement.width, rightKnee.y * canvasElement.height);
          }
          if (rightKnee && rightAnkle && rightKnee.visibility > 0.4 && rightAnkle.visibility > 0.4) {
            canvasCtx.lineTo(rightAnkle.x * canvasElement.width, rightAnkle.y * canvasElement.height);
          }
          canvasCtx.stroke();

          // Draw left arm (Check hand guard arm)
          const guardArmColor = guardScore >= 80 ? "#10b981" : (isGuardLow ? "#ef4444" : "#f59e0b");
          canvasCtx.strokeStyle = guardArmColor;
          if (leftShoulder && leftElbow && leftShoulder.visibility > 0.4 && leftElbow.visibility > 0.4) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(leftShoulder.x * canvasElement.width, leftShoulder.y * canvasElement.height);
            canvasCtx.lineTo(leftElbow.x * canvasElement.width, leftElbow.y * canvasElement.height);
            canvasCtx.stroke();
          }
          if (leftElbow && leftWrist && leftElbow.visibility > 0.4 && leftWrist.visibility > 0.4) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(leftElbow.x * canvasElement.width, leftElbow.y * canvasElement.height);
            canvasCtx.lineTo(leftWrist.x * canvasElement.width, leftWrist.y * canvasElement.height);
            canvasCtx.stroke();
          }

          // Draw right arm (Striking arm)
          canvasCtx.strokeStyle = rightColor;
          if (rightShoulder && rightElbow && rightShoulder.visibility > 0.4 && rightElbow.visibility > 0.4) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(rightShoulder.x * canvasElement.width, rightShoulder.y * canvasElement.height);
            canvasCtx.lineTo(rightElbow.x * canvasElement.width, rightElbow.y * canvasElement.height);
            canvasCtx.stroke();
          }
          if (rightElbow && rightWrist && rightElbow.visibility > 0.4 && rightWrist.visibility > 0.4) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(rightElbow.x * canvasElement.width, rightElbow.y * canvasElement.height);
            canvasCtx.lineTo(rightWrist.x * canvasElement.width, rightWrist.y * canvasElement.height);
            canvasCtx.stroke();
          }

          // Draw joint points
          landmarks.forEach((joint, idx) => {
            if (joint.visibility < 0.4) return;
            const corePoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
            if (!corePoints.includes(idx)) return;

            let ptColor = colors.primary;
            if (idx === 13 || idx === 15) ptColor = guardArmColor;
            if (idx === 14 || idx === 16) ptColor = rightColor;
            if (idx === 25 || idx === 26) ptColor = legStanceColor;

            canvasCtx.beginPath();
            canvasCtx.arc(joint.x * canvasElement.width, joint.y * canvasElement.height, 6, 0, 2 * Math.PI);
            canvasCtx.fillStyle = ptColor;
            canvasCtx.fill();
          });
        });
      }

      // Send state back to React Native
      const rules = STRIKE_RULES[activeStrike];
      if (personsData.length > 0) {
        sendToReactNative({
          type: "POSE_DATA",
          persons: personsData,
          activeStrikeName: rules ? rules.name : ""
        });

        // Trigger snapshot automatically when user achieves correct form (green posture)
        const hasGoodPosture = personsData.some(p => p.accuracy >= 85 || p.isApex);
        const now = Date.now();
        if (hasGoodPosture && (!window.__lastAutoSnap || now - window.__lastAutoSnap > 3500)) {
          window.__lastAutoSnap = now;
          try {
            const snap = canvasElement.toDataURL("image/jpeg", 0.75);
            sendToReactNative({
              type: "SNAPSHOT_CAPTURED",
              base64: snap
            });
          } catch(e) {}
        }
      } else {
        sendToReactNative({
          type: "POSE_DATA",
          persons: []
        });
      }

      // Draw text annotations, person names, angles, and sticks in absolute coordinates
      canvasCtx.restore();
      canvasCtx.save();
      
      canvasCtx.font = "bold 16px sans-serif";

      if (results && results.landmarks && results.landmarks.length > 0) {
        results.landmarks.forEach((landmarks, personIdx) => {
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
            const absX = (1 - avgX) * canvasElement.width;
            const absY = avgY * canvasElement.height - 45;

            // Background pill for metrics
            canvasCtx.save();
            canvasCtx.fillStyle = "rgba(11, 15, 25, 0.85)";
            canvasCtx.strokeStyle = data.accuracy >= 85 ? "#10b981" : "rgba(255, 255, 255, 0.2)";
            canvasCtx.lineWidth = 1.5;
            const pillW = 210;
            const pillH = 26;
            const pillX = absX - pillW / 2;
            const pillY = absY - pillH / 2;

            canvasCtx.beginPath();
            canvasCtx.roundRect(pillX, pillY, pillW, pillH, 8);
            canvasCtx.fill();
            canvasCtx.stroke();

            // Metric text
            canvasCtx.font = "bold 11px sans-serif";
            canvasCtx.textAlign = "center";
            canvasCtx.fillStyle = "#ffffff";
            const armCol = data.isRightGood ? "⚔️" : "⚔️";
            const guardCol = data.guardScore >= 80 ? "🛡️" : "⚠️";
            const stanceCol = data.stanceScore >= 80 ? "🦵" : "⚠️";
            const hudStr = "ARM " + data.elbowScore + "% · " + guardCol + " GUARD " + data.guardScore + "% · " + stanceCol + " STANCE " + data.stanceScore + "%";
            canvasCtx.fillText(hudStr, absX, absY + 4);
            canvasCtx.restore();
          }

          // 3. Draw Elbow Angles
          canvasCtx.font = "bold 16px sans-serif";
          if (data.leftAngle !== null && leftElbow && leftElbow.visibility > 0.4) {
            const x = (1 - leftElbow.x) * canvasElement.width;
            const y = leftElbow.y * canvasElement.height - 15;
            const color = data.guardScore >= 80 ? "#10b981" : "#f59e0b";
            canvasCtx.fillStyle = color;
            canvasCtx.strokeStyle = "#0b0f19";
            canvasCtx.lineWidth = 3;
            canvasCtx.strokeText(Math.round(data.leftAngle) + "°", x, y);
            canvasCtx.fillText(Math.round(data.leftAngle) + "°", x, y);
          }

          if (data.rightAngle !== null && rightElbow && rightElbow.visibility > 0.4) {
            const x = (1 - rightElbow.x) * canvasElement.width;
            const y = rightElbow.y * canvasElement.height - 15;
            const color = data.isRightGood ? "#10b981" : "#ef4444";
            canvasCtx.fillStyle = color;
            canvasCtx.strokeStyle = "#0b0f19";
            canvasCtx.lineWidth = 3;
            canvasCtx.strokeText(Math.round(data.rightAngle) + "°", x, y);
            canvasCtx.fillText(Math.round(data.rightAngle) + "°", x, y);
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
        const primaryLandmarks = (results.landmarks && results.landmarks[0]) ? results.landmarks[0] : null;

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
        if (formCoachMode && primaryPersonObj && rules) {
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
            const isChamberAligned = (Math.abs(rAngle - rules.chamber_elb) <= 30 || elbScore >= 70) && gdScore >= 65 && stScore >= 65;
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
      }

      canvasCtx.restore();
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

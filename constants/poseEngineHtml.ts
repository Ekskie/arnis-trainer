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
      "strike_1": { name: "Strike 1: Left Temple", right_min: 92.3, right_max: 150.8, left_min: 55.2, left_max: 155.9 },
      "strike_2": { name: "Strike 2: Right Temple", right_min: 76.0, right_max: 148.5, left_min: 33.0, left_max: 65.3 },
      "strike_3": { name: "Strike 3: Left Torso", right_min: 72.6, right_max: 113.7, left_min: 41.8, left_max: 99.5 },
      "strike_4": { name: "Strike 4: Right Torso", right_min: 27.9, right_max: 139.2, left_min: 29.6, left_max: 61.0 },
      "strike_5": { name: "Strike 5: Abdomen Thrust", right_min: 155.7, right_max: 169.2, left_min: 40.4, left_max: 81.2 },
      "strike_6": { name: "Strike 6: Left Chest", right_min: 93.2, right_max: 155.2, left_min: 80.4, left_max: 107.2 },
      "strike_7": { name: "Strike 7: Right Chest", right_min: 96.3, right_max: 168.4, left_min: 50.7, left_max: 118.8 },
      "strike_8": { name: "Strike 8: Left Knee", right_min: 128.4, right_max: 174.1, left_min: 27.7, left_max: 98.2 },
      "strike_9": { name: "Strike 9: Right Knee", right_min: 109.2, right_max: 171.9, left_min: 41.1, left_max: 123.3 },
      "strike_10": { name: "Strike 10: Left Eye", right_min: 112.7, right_max: 153.0, left_min: 53.1, left_max: 116.6 },
      "strike_11": { name: "Strike 11: Right Eye", right_min: 101.6, right_max: 168.3, left_min: 48.2, left_max: 133.7 },
      "strike_12": { name: "Strike 12: Crown", right_min: 90.0, right_max: 130.2, left_min: 45.0, left_max: 114.5 }
    };

    let activeStrike = "strike_1";
    let stickColorMode = "rattan";
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

          // Stick detection
          const stickLeft = detectStick(leftWrist, imgData, stickColorMode);
          const stickRight = detectStick(rightWrist, imgData, stickColorMode);

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
            isPersonVisible: true
          });

          // Draw skeleton connectors with neon colors based on person index
          const colors = PERSON_COLORS[personIdx % PERSON_COLORS.length] || PERSON_COLORS[0];
          const connectorColor = colors.secondary;
          const leftColor = isLeftGood ? "#10b981" : "#ef4444";
          const rightColor = isRightGood ? "#10b981" : "#ef4444";
          
          const leftKneeColor = leftKneeAngle !== null && leftKneeAngle < 155 ? "#10b981" : colors.secondary;
          const rightKneeColor = rightKneeAngle !== null && rightKneeAngle < 155 ? "#10b981" : colors.secondary;

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

          // Draw left leg
          canvasCtx.strokeStyle = leftKneeColor;
          canvasCtx.beginPath();
          if (leftHip && leftKnee && leftHip.visibility > 0.4 && leftKnee.visibility > 0.4) {
            canvasCtx.moveTo(leftHip.x * canvasElement.width, leftHip.y * canvasElement.height);
            canvasCtx.lineTo(leftKnee.x * canvasElement.width, leftKnee.y * canvasElement.height);
          }
          if (leftKnee && leftAnkle && leftKnee.visibility > 0.4 && leftAnkle.visibility > 0.4) {
            canvasCtx.lineTo(leftAnkle.x * canvasElement.width, leftAnkle.y * canvasElement.height);
          }
          canvasCtx.stroke();

          // Draw right leg
          canvasCtx.strokeStyle = rightKneeColor;
          canvasCtx.beginPath();
          if (rightHip && rightKnee && rightHip.visibility > 0.4 && rightKnee.visibility > 0.4) {
            canvasCtx.moveTo(rightHip.x * canvasElement.width, rightHip.y * canvasElement.height);
            canvasCtx.lineTo(rightKnee.x * canvasElement.width, rightKnee.y * canvasElement.height);
          }
          if (rightKnee && rightAnkle && rightKnee.visibility > 0.4 && rightAnkle.visibility > 0.4) {
            canvasCtx.lineTo(rightAnkle.x * canvasElement.width, rightAnkle.y * canvasElement.height);
          }
          canvasCtx.stroke();

          // Draw left arm
          canvasCtx.strokeStyle = leftColor;
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

          // Draw right arm
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
            if (idx === 13 || idx === 15) ptColor = leftColor;
            if (idx === 14 || idx === 16) ptColor = rightColor;

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

          // 1. Draw Person Label (e.g. "Person 1")
          if (leftShoulder && rightShoulder) {
            const avgX = (leftShoulder.x + rightShoulder.x) / 2;
            const avgY = (leftShoulder.y + rightShoulder.y) / 2;
            const absX = (1 - avgX) * canvasElement.width;
            const absY = avgY * canvasElement.height - 35;

            canvasCtx.fillStyle = colors.primary;
            canvasCtx.font = "bold 14px sans-serif";
            canvasCtx.strokeStyle = "#0b0f19";
            canvasCtx.lineWidth = 3;
            canvasCtx.strokeText("Person " + (personIdx + 1), absX, absY);
            canvasCtx.fillText("Person " + (personIdx + 1), absX, absY);
          }

          // 2. Draw Elbow Angles
          canvasCtx.font = "bold 16px sans-serif";
          if (data.leftAngle !== null && leftElbow && leftElbow.visibility > 0.4) {
            const x = (1 - leftElbow.x) * canvasElement.width;
            const y = leftElbow.y * canvasElement.height - 15;
            const color = data.isLeftGood ? "#10b981" : "#ef4444";
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

          // 3. Draw Stick highlights
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
        });
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

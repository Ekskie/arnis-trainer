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
            numPoses: 1
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
            numPoses: 1
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

      // Reset transformations to draw overlay text natively, but keep skeleton mirrored
      let landmarks = null;
      if (results && results.landmarks && results.landmarks.length > 0) {
        landmarks = results.landmarks[0];
      }

      if (landmarks) {
        // Mapped joint indexes for MediaPipe
        // 11=L_Shoulder, 13=L_Elbow, 15=L_Wrist
        // 12=R_Shoulder, 14=R_Elbow, 16=R_Wrist
        const leftShoulder = landmarks[11];
        const leftElbow = landmarks[13];
        const leftWrist = landmarks[15];
        const rightShoulder = landmarks[12];
        const rightElbow = landmarks[14];
        const rightWrist = landmarks[16];

        const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

        // Apply evaluator thresholds
        const rules = STRIKE_RULES[activeStrike];
        let isLeftGood = false;
        let isRightGood = false;

        if (leftAngle !== null && rules) {
          isLeftGood = leftAngle >= rules.left_min && leftAngle <= rules.left_max;
        }
        if (rightAngle !== null && rules) {
          isRightGood = rightAngle >= rules.right_min && rightAngle <= rules.right_max;
        }

        // Send state back to React Native
        sendToReactNative({
          type: "POSE_DATA",
          leftAngle: leftAngle,
          rightAngle: rightAngle,
          isLeftGood: isLeftGood,
          isRightGood: isRightGood,
          activeStrikeName: rules ? rules.name : "",
          isPersonVisible: true
        });

        // 2. Draw Skeleton connectors with neon colors
        const connectorColor = "rgba(120, 180, 255, 0.4)";
        const leftColor = isLeftGood ? "#10b981" : "#ef4444"; // Green vs Red
        const rightColor = isRightGood ? "#10b981" : "#ef4444";

        const connections = [
          [11, 12], // shoulder-to-shoulder
          [11, 23], [12, 24], [23, 24], // torso
          [23, 25], [25, 27], // left leg
          [24, 26], [26, 28]  // right leg
        ];

        // Draw basic skeleton body lines
        canvasCtx.lineWidth = 4;
        canvasCtx.strokeStyle = connectorColor;
        connections.forEach(([p1, p2]) => {
          const joint1 = landmarks[p1];
          const joint2 = landmarks[p2];
          if (joint1 && joint2 && joint1.visibility > 0.4 && joint2.visibility > 0.4) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(joint1.x * canvasElement.width, joint1.y * canvasElement.height);
            canvasCtx.lineTo(joint2.x * canvasElement.width, joint2.y * canvasElement.height);
            canvasCtx.stroke();
          }
        });

        // Draw left arm (Shoulder -> Elbow -> Wrist)
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

        // Draw right arm (Shoulder -> Elbow -> Wrist)
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
          // Only draw points for core skeleton to keep it clean
          const corePoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
          if (!corePoints.includes(idx)) return;

          let ptColor = "#ffffff";
          if (idx === 13 || idx === 15) ptColor = leftColor;
          if (idx === 14 || idx === 16) ptColor = rightColor;

          canvasCtx.beginPath();
          canvasCtx.arc(joint.x * canvasElement.width, joint.y * canvasElement.height, 6, 0, 2 * Math.PI);
          canvasCtx.fillStyle = ptColor;
          canvasCtx.fill();
        });

        // 3. Draw text markers (Angles)
        // Since the canvas is mirrored, we temporarily restore matrix transformations to print text normally
        canvasCtx.restore();
        canvasCtx.save();
        
        canvasCtx.font = "bold 16px sans-serif";
        
        // Print Left Elbow Angle (Left side of physical body is drawn mirrored on canvas)
        if (leftAngle !== null && leftElbow && leftElbow.visibility > 0.4) {
          // Convert mirrored X to display X
          const x = (1 - leftElbow.x) * canvasElement.width;
          const y = leftElbow.y * canvasElement.height - 15;
          canvasCtx.fillStyle = leftColor;
          canvasCtx.strokeStyle = "#0b0f19";
          canvasCtx.lineWidth = 3;
          canvasCtx.strokeText(leftAngle + "°", x, y);
          canvasCtx.fillText(leftAngle + "°", x, y);
        }

        // Print Right Elbow Angle
        if (rightAngle !== null && rightElbow && rightElbow.visibility > 0.4) {
          const x = (1 - rightElbow.x) * canvasElement.width;
          const y = rightElbow.y * canvasElement.height - 15;
          canvasCtx.fillStyle = rightColor;
          canvasCtx.strokeStyle = "#0b0f19";
          canvasCtx.lineWidth = 3;
          canvasCtx.strokeText(rightAngle + "°", x, y);
          canvasCtx.fillText(rightAngle + "°", x, y);
        }
      } else {
        sendToReactNative({
          type: "POSE_DATA",
          isPersonVisible: false
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

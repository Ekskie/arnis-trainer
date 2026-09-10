import { useRef, useState, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import { EvaluationConfig, RawPersonPose } from '@/engine/pose/poseEngineTypes';
import { IncomingPoseMessage, OutgoingPoseMessage } from '@/engine/pose/poseEngineProtocol';

export interface UsePoseEngineCallbacks {
  onPoseData?: (persons: RawPersonPose[]) => void;
  onAutoDetectedStrike?: (strikeId: string, strikeName: string, confidence: number) => void;
  onFormCoachStepPassed?: (phase: 'chamber' | 'impact' | 'recovery', score: number) => void;
  onSnapshotCaptured?: (base64: string) => void;
  onVideoReplayCaptured?: (base64: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
}

export function usePoseEngine(callbacks?: UsePoseEngineCallbacks) {
  const webViewRef = useRef<WebView>(null);
  const [webReady, setWebReady] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Initializing MediaPipe...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  const [lastReplayVideo, setLastReplayVideo] = useState<string | null>(null);
  const [snapshotBannerVisible, setSnapshotBannerVisible] = useState(false);

  // Send a typed outgoing protocol message to the WebView
  const sendMessage = useCallback((msg: OutgoingPoseMessage) => {
    if (!webViewRef.current) return;
    const jsonStr = JSON.stringify(msg);
    const js = `
      if (window.handleReactNativeMessage) {
        window.handleReactNativeMessage(${jsonStr});
      }
      true;
    `;
    webViewRef.current.injectJavaScript(js);
  }, []);

  const sendSessionConfig = useCallback(
    (config: EvaluationConfig) => {
      sendMessage({ type: 'SET_SESSION', config });
    },
    [sendMessage]
  );

  const setTargetStrike = useCallback(
    (strikeId: string) => {
      sendMessage({ type: 'SET_TARGET_STRIKE', strikeId });
    },
    [sendMessage]
  );

  const startVideoRecording = useCallback(() => {
    sendMessage({ type: 'START_RECORDING' });
  }, [sendMessage]);

  const stopVideoRecording = useCallback(() => {
    sendMessage({ type: 'STOP_RECORDING' });
  }, [sendMessage]);

  const setFormCoachPhase = useCallback(
    (phase: 'chamber' | 'impact' | 'recovery') => {
      sendMessage({ type: 'SET_FORM_COACH_PHASE', phase });
    },
    [sendMessage]
  );

  // Centralized onMessage parser for events received from WebView
  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data: IncomingPoseMessage = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          case 'STATUS':
            setStatusMsg(data.message);
            if (data.message.includes('running')) {
              setWebReady(true);
            }
            break;

          case 'READY':
            setWebReady(true);
            setStatusMsg('Camera Active');
            callbacks?.onReady?.();
            break;

          case 'ERROR':
            setErrorMsg(data.message);
            callbacks?.onError?.(data.message);
            break;

          case 'POSE_DATA':
            callbacks?.onPoseData?.(data.persons || []);
            break;

          case 'AUTO_DETECTED_STRIKE':
            callbacks?.onAutoDetectedStrike?.(
              data.strikeId,
              data.strikeName || data.strikeId,
              data.confidence || 85
            );
            break;

          case 'FORM_COACH_STEP_PASSED':
            callbacks?.onFormCoachStepPassed?.(data.phase, data.score || 85);
            break;

          case 'SNAPSHOT_CAPTURED':
            if (data.base64) {
              setLastSnapshot(data.base64);
              setSnapshotBannerVisible(true);
              setTimeout(() => setSnapshotBannerVisible(false), 3000);
              callbacks?.onSnapshotCaptured?.(data.base64);
            }
            break;

          case 'VIDEO_REPLAY_CAPTURED':
            if (data.base64) {
              setLastReplayVideo(data.base64);
              callbacks?.onVideoReplayCaptured?.(data.base64);
            }
            break;
        }
      } catch (err) {
        console.error('Failed to parse message from WebView', err);
      }
    },
    [callbacks]
  );

  return {
    webViewRef,
    webReady,
    statusMsg,
    errorMsg,
    lastSnapshot,
    lastReplayVideo,
    snapshotBannerVisible,
    sendMessage,
    sendSessionConfig,
    setTargetStrike,
    startVideoRecording,
    stopVideoRecording,
    setFormCoachPhase,
    handleMessage,
  };
}

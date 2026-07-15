import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { getPoseEngineHtml } from '@/constants/poseEngineHtml';
import { saveSession } from '@/constants/historyStore';
import * as Speech from 'expo-speech';

const { width } = Dimensions.get('window');

interface StrikeRule {
  id: string;
  name: string;
  desc: string;
  right_min: number;
  right_max: number;
  left_min: number;
  left_max: number;
}

const STRIKE_RULES: Record<string, StrikeRule> = {
  "strike_1": { id: "strike_1", name: "Strike 1", desc: "Left Temple", right_min: 92.3, right_max: 150.8, left_min: 55.2, left_max: 155.9 },
  "strike_2": { id: "strike_2", name: "Strike 2", desc: "Right Temple", right_min: 76.0, right_max: 148.5, left_min: 33.0, left_max: 65.3 },
  "strike_3": { id: "strike_3", name: "Strike 3", desc: "Left Torso/Ribs", right_min: 72.6, right_max: 113.7, left_min: 41.8, left_max: 99.5 },
  "strike_4": { id: "strike_4", name: "Strike 4", desc: "Right Torso/Ribs", right_min: 27.9, right_max: 139.2, left_min: 29.6, left_max: 61.0 },
  "strike_5": { id: "strike_5", name: "Strike 5", desc: "Stomach Thrust", right_min: 155.7, right_max: 169.2, left_min: 40.4, left_max: 81.2 },
  "strike_6": { id: "strike_6", name: "Strike 6", desc: "Left Chest Thrust", right_min: 93.2, right_max: 155.2, left_min: 80.4, left_max: 107.2 },
  "strike_7": { id: "strike_7", name: "Strike 7", desc: "Right Chest Thrust", right_min: 96.3, right_max: 168.4, left_min: 50.7, left_max: 118.8 },
  "strike_8": { id: "strike_8", name: "Strike 8", desc: "Left Knee", right_min: 128.4, right_max: 174.1, left_min: 27.7, left_max: 98.2 },
  "strike_9": { id: "strike_9", name: "Strike 9", desc: "Right Knee", right_min: 109.2, right_max: 171.9, left_min: 41.1, left_max: 123.3 },
  "strike_10": { id: "strike_10", name: "Strike 10", desc: "Left Eye Thrust", right_min: 112.7, right_max: 153.0, left_min: 53.1, left_max: 116.6 },
  "strike_11": { id: "strike_11", name: "Strike 11", desc: "Right Eye Thrust", right_min: 101.6, right_max: 168.3, left_min: 48.2, left_max: 133.7 },
  "strike_12": { id: "strike_12", name: "Strike 12", desc: "Crown Strike", right_min: 90.0, right_max: 130.2, left_min: 45.0, left_max: 114.5 }
};

const getJointScore = (actual: number | null | undefined, minVal: number, maxVal: number) => {
  if (actual === null || actual === undefined || actual === 0) return 60;
  if (actual >= minVal && actual <= maxVal) return 100;
  const dev = actual < minVal ? minVal - actual : actual - maxVal;
  return Math.max(35, Math.round(100 - dev * 2));
};

interface PersonData {
  id: number;
  leftAngle: number | null;
  rightAngle: number | null;
  leftShoulderAngle: number | null;
  rightShoulderAngle: number | null;
  leftKneeAngle: number | null;
  rightKneeAngle: number | null;
  leftWristAngle: number | null;
  rightWristAngle: number | null;
  isLeftGood: boolean;
  isRightGood: boolean;
  isHoldingLeft: boolean;
  isHoldingRight: boolean;
  isPersonVisible: boolean;
  accuracy: number;
  elbowScore: number;
  shoulderScore: number;
  wristScore: number;
  kneeScore: number;
  leadKneeAngle: number;
}

export default function EvaluateScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  // Navigation states: 'selection' | 'live' | 'result'
  const [screenState, setScreenState] = useState<'selection' | 'live' | 'result'>('selection');
  const [selectedStrikeId, setSelectedStrikeId] = useState<string>('strike_1');
  const [evaluationMode, setEvaluationMode] = useState<'practice' | 'evaluate'>('practice');
  const [stickColor, setStickColor] = useState<string>('rattan');
  
  // MediaPipe Live Tracking States
  const [webReady, setWebReady] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Initializing MediaPipe...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  
  // Evaluation Stats
  const [poseScoreProgress, setPoseScoreProgress] = useState(0);

  // Countdown gamification states
  const [countdownState, setCountdownState] = useState<'waiting_for_person' | 'counting' | 'evaluating'>('waiting_for_person');
  const [countdownValue, setCountdownValue] = useState<number | string>(3);

  // Keep track of the best score during the strike window
  const bestScoreRef = useRef<number>(0);
  const bestAnglesRef = useRef({ 
    leftAngle: 0, 
    rightAngle: 0, 
    leftShoulderAngle: 0,
    rightShoulderAngle: 0,
    leftKneeAngle: 0,
    rightKneeAngle: 0,
    leftWristAngle: 0,
    rightWristAngle: 0,
    currentAccuracy: 0 
  });
  const isCountingRef = useRef<boolean>(false);
  const recordingIntervalRef = useRef<any>(null);
  
  // Real-time progress bars values
  const [rtElbowScore, setRtElbowScore] = useState(70);
  const [rtShoulderScore, setRtShoulderScore] = useState(70);
  const [rtWristScore, setRtWristScore] = useState(70);

  // Result Summary cache
  const [finalSessionStats, setFinalSessionStats] = useState<{
    score: number;
    grade: string;
    elbow: { score: number; actual: number; ideal: number };
    shoulder: { score: number; actual: number; ideal: number };
    wrist: { score: number; actual: number; ideal: number };
    knee: { score: number; actual: number; ideal: number };
  } | null>(null);

  // Multi-person states
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [primaryPersonId, setPrimaryPersonId] = useState<number>(0);

  // Voice Feedback states and refs
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const lastSpokenTimeRef = useRef<Record<number, number>>({});

  const speakCorrection = (personId: number, message: string) => {
    if (!voiceFeedbackEnabled) return;
    const now = Date.now();
    const lastTime = lastSpokenTimeRef.current[personId] || 0;
    
    // 6 seconds throttle to keep it friendly and clear
    if (now - lastTime > 6000) {
      lastSpokenTimeRef.current[personId] = now;
      
      let spokenText = `Person ${personId + 1}, ${message}`;
      
      // Clean up punctuation/details for speech
      spokenText = spokenText
        .replace("!", "")
        .replace(".", "")
        .replace("°", " degrees");
        
      Speech.speak(spokenText, {
        language: 'en',
        pitch: 1.0,
        rate: 0.95,
      });
    }
  };

  const modelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  const webBaseUrl = 'https://cdn.jsdelivr.net';

  const currentRule = STRIKE_RULES[selectedStrikeId] || STRIKE_RULES.strike_1;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Sync selected strike and stick color with WebView engine
  useEffect(() => {
    if (screenState === 'live' && webReady && webViewRef.current) {
      const injectJS = `
        if (window.setTargetStrike) {
          window.setTargetStrike('${selectedStrikeId}');
        }
        if (window.setStickColor) {
          window.setStickColor('${stickColor}');
        }
        true;
      `;
      webViewRef.current.injectJavaScript(injectJS);
    }
  }, [selectedStrikeId, stickColor, webReady, screenState]);

  // Start countdown logic
  const startCountdown = () => {
    setCountdownValue(3);
    
    // 3 -> 2
    setTimeout(() => {
      if (isCountingRef.current) setCountdownValue(2);
    }, 1000);

    // 2 -> 1
    setTimeout(() => {
      if (isCountingRef.current) setCountdownValue(1);
    }, 2000);

    // 1 -> GO!
    setTimeout(() => {
      if (isCountingRef.current) setCountdownValue('GO!');
    }, 3000);

    // GO! -> Evaluating (starts the 2.5 second recording window)
    setTimeout(() => {
      if (isCountingRef.current) {
        setCountdownState('evaluating');
        setPoseScoreProgress(0);
        bestScoreRef.current = 0;
        startEvaluationRecording();
      }
    }, 4000);
  };

  // Recording timer logic
  const startEvaluationRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    let progress = 0;
    recordingIntervalRef.current = setInterval(() => {
      progress += 4;
      setPoseScoreProgress(Math.min(progress, 100));
      
      if (progress >= 100) {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        
        // Timer completed! Read best recorded score
        const finalScore = bestScoreRef.current || 65;
        const angles = bestAnglesRef.current;
        
        // Calculate true joint scores using the peak angles
        // Right side is the primary striking arm in standard 12 strikes
        const finalElbowScore = getJointScore(angles.rightAngle, currentRule.right_min, currentRule.right_max);
        const finalShoulderScore = getJointScore(angles.rightShoulderAngle, 60, 130);
        const finalWristScore = getJointScore(angles.rightWristAngle, 0, 15);
        
        const leadKneeAngle = Math.min(angles.leftKneeAngle || 180, angles.rightKneeAngle || 180);
        const finalKneeScore = getJointScore(leadKneeAngle, 115, 150);
        
        const stats = {
          score: finalScore,
          grade: finalScore >= 95 ? 'Grade A' : finalScore >= 85 ? 'Grade B' : finalScore >= 75 ? 'Grade C' : 'Grade D',
          elbow: { 
            score: finalElbowScore, 
            actual: angles.rightAngle || 159, 
            ideal: Math.round((currentRule.right_min + currentRule.right_max) / 2) 
          },
          shoulder: { 
            score: finalShoulderScore, 
            actual: angles.rightShoulderAngle || 81, 
            ideal: 95 
          },
          wrist: { 
            score: finalWristScore, 
            actual: angles.rightWristAngle || 0, 
            ideal: 0 
          },
          knee: { 
            score: finalKneeScore, 
            actual: leadKneeAngle || 150, 
            ideal: 135 
          }
        };
        
        setFinalSessionStats(stats);
        
        // Save to offline storage
        saveSession(
          selectedStrikeId,
          currentRule.name,
          currentRule.desc,
          finalScore,
          {
            elbow: { score: finalElbowScore, actual: stats.elbow.actual, ideal: stats.elbow.ideal },
            shoulder: { score: finalShoulderScore, actual: stats.shoulder.actual, ideal: stats.shoulder.ideal },
            wrist: { score: finalWristScore, actual: stats.wrist.actual, ideal: stats.wrist.ideal },
            knee: { score: finalKneeScore, actual: stats.knee.actual, ideal: stats.knee.ideal }
          }
        );

        // Transition to results
        Speech.stop(); // Stop speaking immediately when evaluation ends
        setScreenState('result');
        isCountingRef.current = false;
        setWarningMsg(null);
        setCountdownState('waiting_for_person');
      }
    }, 100); // 2.5 seconds total
  };

  // Handle messages from the HTML Pose engine
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'STATUS') {
        setStatusMsg(data.message);
        if (data.message.includes('running')) {
          setWebReady(true);
        }
      } else if (data.type === 'ERROR') {
        setErrorMsg(data.message);
      } else if (data.type === 'READY') {
        setWebReady(true);
        setStatusMsg('Camera Active');
      } else if (data.type === 'POSE_DATA') {
        const rawPersons = data.persons || [];
        
        // Map raw persons to calculate joint scores and accuracy
        const updatedPersons: PersonData[] = rawPersons.map((p: any) => {
          const leftAngle = p.leftAngle ? Math.round(p.leftAngle) : 0;
          const rightAngle = p.rightAngle ? Math.round(p.rightAngle) : 0;
          
          const leftShoulderAngle = p.leftShoulderAngle ? Math.round(p.leftShoulderAngle) : 0;
          const rightShoulderAngle = p.rightShoulderAngle ? Math.round(p.rightShoulderAngle) : 0;
          
          const leftKneeAngle = p.leftKneeAngle ? Math.round(p.leftKneeAngle) : 0;
          const rightKneeAngle = p.rightKneeAngle ? Math.round(p.rightKneeAngle) : 0;
          
          const leftWristAngle = p.leftWristAngle !== null ? Math.round(p.leftWristAngle) : 0;
          const rightWristAngle = p.rightWristAngle !== null ? Math.round(p.rightWristAngle) : 0;

          // Calculate scores dynamically!
          const leftElbowScore = getJointScore(leftAngle, currentRule.left_min, currentRule.left_max);
          const rightElbowScore = getJointScore(rightAngle, currentRule.right_min, currentRule.right_max);
          const elbowScore = Math.round((leftElbowScore + rightElbowScore) / 2);

          // Shoulder score (Ideal range: 60 to 130)
          const leftShoulderScore = getJointScore(leftShoulderAngle, 60, 130);
          const rightShoulderScore = getJointScore(rightShoulderAngle, 60, 130);
          const shoulderScore = Math.round((leftShoulderScore + rightShoulderScore) / 2);

          // Wrist score (Ideal deviation from straight: 0 to 15 degrees)
          const leftWristScore = getJointScore(leftWristAngle, 0, 15);
          const rightWristScore = getJointScore(rightWristAngle, 0, 15);
          const wristScore = Math.round((leftWristScore + rightWristScore) / 2);

          // Knee score (Lead knee should bend to between 115 and 150 degrees)
          const leadKneeAngle = Math.min(leftKneeAngle || 180, rightKneeAngle || 180);
          const kneeScore = getJointScore(leadKneeAngle, 115, 150);

          // Total posture accuracy
          const accuracy = Math.round((elbowScore + shoulderScore + wristScore + kneeScore) / 4);

          // Voice feedback logic for this person
          let personWarning: string | null = null;
          const isHoldingStick = !!p.isHoldingLeft || !!p.isHoldingRight;
          if (!isHoldingStick) {
            personWarning = "please hold your stick";
          } else {
            if (leadKneeAngle > 155) {
              personWarning = "stance too high, bend your lead knee";
            } else if (rightWristAngle > 20 || leftWristAngle > 20) {
              personWarning = "adjust your angle, straighten your wrist";
            } else if (rightShoulderAngle < 55 && rightShoulderAngle > 0) {
              personWarning = "adjust your angle, raise your shoulder";
            } else if (!p.isRightGood && rightAngle > 0) {
              if (rightAngle < currentRule.right_min) {
                personWarning = "extend your striking arm more";
              } else if (rightAngle > currentRule.right_max) {
                personWarning = "keep your striking arm tighter";
              }
            }
          }

          if (personWarning) {
            speakCorrection(p.id, personWarning);
          }

          return {
            id: p.id,
            leftAngle,
            rightAngle,
            leftShoulderAngle,
            rightShoulderAngle,
            leftKneeAngle,
            rightKneeAngle,
            leftWristAngle,
            rightWristAngle,
            isLeftGood: !!p.isLeftGood,
            isRightGood: !!p.isRightGood,
            isHoldingLeft: !!p.isHoldingLeft,
            isHoldingRight: !!p.isHoldingRight,
            isPersonVisible: true,
            accuracy,
            elbowScore,
            shoulderScore,
            wristScore,
            kneeScore,
            leadKneeAngle
          };
        });

        setPersons(updatedPersons);

        // Find primary person
        const primaryPerson = updatedPersons.find((p) => p.id === primaryPersonId) || updatedPersons[0];
        const isPersonVisible = updatedPersons.length > 0;

        if (primaryPerson) {
          // Update real-time progress values
          setRtElbowScore(primaryPerson.elbowScore);
          setRtShoulderScore(primaryPerson.shoulderScore);
          setRtWristScore(primaryPerson.wristScore);

          // Generate warnings for incorrect posture and stick holding status
          let activeWarning: string | null = null;
          const isHoldingStick = primaryPerson.isHoldingLeft || primaryPerson.isHoldingRight;

          if (!isHoldingStick) {
            activeWarning = "Please hold your Arnis stick!";
          } else {
            if (primaryPerson.leadKneeAngle > 155) {
              activeWarning = "Stance too high! Bend your lead knee.";
            } else if ((primaryPerson.rightWristAngle || 0) > 20 || (primaryPerson.leftWristAngle || 0) > 20) {
              activeWarning = "Straighten your wrist for power.";
            } else if ((primaryPerson.rightShoulderAngle || 0) < 55 && (primaryPerson.rightShoulderAngle || 0) > 0) {
              activeWarning = "Raise your elbow/shoulder.";
            } else if (!primaryPerson.isRightGood && (primaryPerson.rightAngle || 0) > 0) {
              if ((primaryPerson.rightAngle || 0) < currentRule.right_min) {
                activeWarning = "Extend your striking arm more.";
              } else if ((primaryPerson.rightAngle || 0) > currentRule.right_max) {
                activeWarning = "Keep your striking arm tighter.";
              }
            }
          }
          setWarningMsg(activeWarning);

          if (evaluationMode === 'evaluate') {
            // Visibility & Countdown gatekeeper for evaluation mode
            if (isPersonVisible) {
              if (countdownState === 'waiting_for_person' && !isCountingRef.current) {
                isCountingRef.current = true;
                setCountdownState('counting');
                startCountdown();
              }
            } else {
              // If person leaves frame while counting, reset to waiting screen
              if (countdownState === 'counting') {
                isCountingRef.current = false;
                setCountdownState('waiting_for_person');
                setWarningMsg(null);
              }
            }

            // Only evaluate and track peak accuracy when in 'evaluating' state
            if (countdownState === 'evaluating') {
              if (primaryPerson.accuracy > bestScoreRef.current) {
                bestScoreRef.current = primaryPerson.accuracy;
                bestAnglesRef.current = { 
                  leftAngle: primaryPerson.leftAngle || 0, 
                  rightAngle: primaryPerson.rightAngle || 0, 
                  leftShoulderAngle: primaryPerson.leftShoulderAngle || 0, 
                  rightShoulderAngle: primaryPerson.rightShoulderAngle || 0, 
                  leftKneeAngle: primaryPerson.leftKneeAngle || 0, 
                  rightKneeAngle: primaryPerson.rightKneeAngle || 0, 
                  leftWristAngle: primaryPerson.leftWristAngle || 0, 
                  rightWristAngle: primaryPerson.rightWristAngle || 0, 
                  currentAccuracy: primaryPerson.accuracy 
                };
              }
            }
          } else {
            // Practice mode: continuously show current accuracy as the progress value
            setPoseScoreProgress(primaryPerson.accuracy);
          }
        } else {
          // No person visible
          setWarningMsg(null);
          if (evaluationMode === 'evaluate') {
            if (countdownState === 'counting') {
              isCountingRef.current = false;
              setCountdownState('waiting_for_person');
            }
          }
        }
      }
    } catch (e) {
      console.warn('WebView Message Parse Error', e);
    }
  };

  const handleStartEvaluation = async (strikeId: string) => {
    // Request native camera permission before entering live view
    // This ensures Android shows the permission dialog before WebView tries getUserMedia
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setErrorMsg('Camera permission is required for pose evaluation. Please grant camera access in your device settings.');
        return;
      }
    }
    
    setSelectedStrikeId(strikeId);
    setPoseScoreProgress(0);
    setWebReady(false);
    setErrorMsg(null);
    setStatusMsg('Initializing MediaPipe...');
    isCountingRef.current = false;
    setCountdownState('waiting_for_person');
    setPersons([]);
    setPrimaryPersonId(0);
    setScreenState('live');
  };

  const handleBackToSelection = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    isCountingRef.current = false;
    setCountdownState('waiting_for_person');
    setPersons([]);
    Speech.stop(); // Stop speaking immediately on exit
    setScreenState('selection');
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#10B981'; // Green
    if (score >= 85) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  // 1. STRIKE SELECTION SCREEN
  if (screenState === 'selection') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Evaluate</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Mode Selector Segmented Control */}
          <View style={styles.modeSelectorContainer}>
            <TouchableOpacity 
              style={[
                styles.modeOption, 
                evaluationMode === 'practice' && styles.modeOptionActive
              ]}
              onPress={() => setEvaluationMode('practice')}
            >
              <Text 
                style={[
                  styles.modeOptionText, 
                  evaluationMode === 'practice' && styles.modeOptionTextActive
                ]}
              >
                Practice Mode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.modeOption, 
                evaluationMode === 'evaluate' && styles.modeOptionActive
              ]}
              onPress={() => setEvaluationMode('evaluate')}
            >
              <Text 
                style={[
                  styles.modeOptionText, 
                  evaluationMode === 'evaluate' && styles.modeOptionTextActive
                ]}
              >
                Evaluate Mode
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modeDesc}>
            {evaluationMode === 'practice' 
              ? "Continuous real-time posture feedback. Exit manually when done."
              : "Step into camera frame to trigger a 3s countdown test. Auto-saves results."
            }
          </Text>

          {/* Stick Color Selector */}
          <Text style={styles.sectionHeading}>STICK SETTINGS</Text>
          <View style={styles.stickColorContainer}>
            {['rattan', 'red', 'blue', 'green', 'any'].map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.stickColorOption,
                  stickColor === color && styles.stickColorOptionActive
                ]}
                onPress={() => setStickColor(color)}
              >
                <Text
                  style={[
                    styles.stickColorOptionText,
                    stickColor === color && styles.stickColorOptionTextActive
                  ]}
                >
                  {color === 'rattan' ? 'Rattan (Wood)' : color.charAt(0).toUpperCase() + color.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Voice Settings */}
          <Text style={styles.sectionHeading}>VOICE ANNOUNCEMENTS</Text>
          <TouchableOpacity 
            style={[
              styles.voiceToggleButton,
              voiceFeedbackEnabled && styles.voiceToggleButtonActive
            ]}
            onPress={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
          >
            <Ionicons 
              name={voiceFeedbackEnabled ? "volume-high" : "volume-mute"} 
              size={18} 
              color="#FFFFFF" 
              style={{ marginRight: 8 }} 
            />
            <Text style={styles.voiceToggleButtonText}>
              {voiceFeedbackEnabled ? "Voice Corrections: ON" : "Voice Corrections: MUTED"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeading}>SELECT A STRIKE (1-12)</Text>
          <View style={styles.grid}>
            {Object.values(STRIKE_RULES).map((strike, index) => (
              <TouchableOpacity
                key={strike.id}
                style={styles.gridItem}
                activeOpacity={0.7}
                onPress={() => handleStartEvaluation(strike.id)}
              >
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{index + 1}</Text>
                </View>
                <View style={styles.gridDetails}>
                  <Text style={styles.gridTitle}>{strike.name}</Text>
                  <Text style={styles.gridDesc}>{strike.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 2. LIVE CAMERA SCREEN
  if (screenState === 'live') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Evaluate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.liveSubHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View 
              style={[
                styles.liveIndicatorContainer, 
                evaluationMode === 'practice' && { backgroundColor: '#3B82F620' }
              ]}
            >
              <View 
                style={[
                  styles.liveDot, 
                  evaluationMode === 'practice' && { backgroundColor: '#3B82F6' }
                ]} 
              />
              <Text 
                style={[
                  styles.liveText, 
                  evaluationMode === 'practice' && { color: '#3B82F6' }
                ]}
              >
                {evaluationMode === 'practice' ? 'PRACTICE' : 'LIVE'}
              </Text>
            </View>
            <Text style={styles.liveStrikeTitle} numberOfLines={1}>
              {currentRule.name} - <Text style={styles.liveStrikeDesc}>{currentRule.desc}</Text>
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.liveVoiceToggle}
            onPress={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
          >
            <Ionicons 
              name={voiceFeedbackEnabled ? "volume-high" : "volume-mute"} 
              size={20} 
              color={voiceFeedbackEnabled ? "#F59E0B" : "#64748B"} 
            />
          </TouchableOpacity>
        </View>

        {/* WebView Camera Viewport */}
        <View style={styles.viewportContainer}>
          <WebView
            ref={webViewRef}
            source={{
              html: getPoseEngineHtml(modelUrl),
              baseUrl: webBaseUrl
            }}
            originWhitelist={['*']}
            style={styles.webView}
            scrollEnabled={false}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            allowFileAccess={true}
            androidLayerType="hardware"
            mediaCapturePermissionGrantType="grant"
            // @ts-ignore
            onPermissionRequest={(event: any) => {
              event.grant(event.resources);
            }}
            onMessage={handleMessage}
          />
          
          {!webReady && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#D24B38" />
              <Text style={styles.loaderText}>{statusMsg}</Text>
            </View>
          )}

          {webReady && !errorMsg && evaluationMode === 'evaluate' && (
            <>
              {countdownState === 'waiting_for_person' && (
                <View style={styles.countdownOverlay}>
                  <Ionicons name="person-outline" size={48} color="#D24B38" />
                  <Text style={styles.countdownStatusText}>Please step into the camera frame</Text>
                </View>
              )}

              {countdownState === 'counting' && (
                <View style={styles.countdownOverlay}>
                  <Text style={styles.countdownNumber}>{countdownValue}</Text>
                  <Text style={styles.countdownSubtitle}>Get ready to strike!</Text>
                </View>
              )}

              {countdownState === 'evaluating' && (
                <View style={styles.countdownOverlay}>
                  <Text style={[styles.countdownStatusText, { color: '#10B981', fontWeight: 'bold' }]}>
                    SWING NOW! RECORDING...
                  </Text>
                </View>
              )}
            </>
          )}

          {webReady && !errorMsg && warningMsg && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.warningBannerText}>{warningMsg}</Text>
            </View>
          )}

          {errorMsg && (
            <View style={styles.errorOverlay}>
              <Text style={styles.errorText}>Error: {errorMsg}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => handleStartEvaluation(selectedStrikeId)}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Scrollable controls and analysis below camera */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {/* Stick Color Selector on Live screen */}
          <View style={styles.liveStickColorBar}>
            <Text style={styles.liveStickColorLabel}>Stick Color:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveStickColorScroll}>
              {['rattan', 'red', 'blue', 'green', 'any'].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.liveStickColorOption,
                    stickColor === color && styles.liveStickColorOptionActive
                  ]}
                  onPress={() => setStickColor(color)}
                >
                  <Text
                    style={[
                      styles.liveStickColorOptionText,
                      stickColor === color && styles.liveStickColorOptionTextActive
                    ]}
                  >
                    {color === 'rattan' ? 'Rattan' : color.charAt(0).toUpperCase() + color.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Progress Tracker bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>
                {evaluationMode === 'practice' ? 'Live Accuracy' : 'Analyzing pose...'}
              </Text>
              <Text style={styles.progressValue}>{poseScoreProgress}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${poseScoreProgress}%` },
                  evaluationMode === 'practice' && { backgroundColor: getScoreColor(poseScoreProgress) }
                ]} 
              />
            </View>
          </View>

          {/* Real-time Joint Analysis Panel */}
          <View style={styles.analysisPanel}>
            <Text style={styles.analysisHeading}>Real-time Joint Analysis</Text>

            {/* Joint Row 1 */}
            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>Elbow</Text>
              <View style={styles.analysisBarBg}>
                <View style={[styles.analysisBarFill, { width: `${rtElbowScore}%` }]} />
              </View>
              <Text style={styles.analysisValue}>{rtElbowScore}%</Text>
            </View>

            {/* Joint Row 2 */}
            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>Shoulder</Text>
              <View style={styles.analysisBarBg}>
                <View style={[styles.analysisBarFill, { width: `${rtShoulderScore}%` }]} />
              </View>
              <Text style={styles.analysisValue}>{rtShoulderScore}%</Text>
            </View>

            {/* Joint Row 3 */}
            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>Wrist</Text>
              <View style={styles.analysisBarBg}>
                <View style={[styles.analysisBarFill, { width: `${rtWristScore}%` }]} />
              </View>
              <Text style={styles.analysisValue}>{rtWristScore}%</Text>
            </View>
          </View>

          {/* Multi-Person Panel */}
          {persons.length > 0 && (
            <View style={styles.multiPersonPanel}>
              <Text style={styles.analysisHeading}>Detected Practitioners ({persons.length})</Text>
              {persons.map((person) => {
                const isPrimary = person.id === primaryPersonId;
                const hasStick = person.isHoldingLeft || person.isHoldingRight;
                return (
                  <TouchableOpacity
                    key={person.id}
                    style={[
                      styles.personRow,
                      isPrimary && styles.personRowActive
                    ]}
                    onPress={() => setPrimaryPersonId(person.id)}
                  >
                    <View style={styles.personHeader}>
                      <View style={styles.personBadgeContainer}>
                        <View style={[styles.personColorDot, { backgroundColor: ['#10b981', '#8b5cf6', '#f59e0b', '#ec4899'][person.id % 4] }]} />
                        <Text style={styles.personName}>Person {person.id + 1} {isPrimary ? '(Active)' : ''}</Text>
                      </View>
                      <Text style={styles.personAccuracy}>{person.accuracy || 0}% Acc</Text>
                    </View>
                    <View style={styles.personStickInfo}>
                      <Ionicons 
                        name={hasStick ? "checkmark-circle" : "alert-circle"} 
                        size={14} 
                        color={hasStick ? "#10B981" : "#EF4444"} 
                      />
                      <Text style={[styles.personStickText, { color: hasStick ? "#10B981" : "#EF4444" }]}>
                        {hasStick 
                          ? `Holding Stick (${person.isHoldingRight ? 'Right' : 'Left'} hand)` 
                          : 'No Stick Detected'
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 3. RESULT VIEW
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreenState('selection')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Evaluate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Score Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultMeta}>SESSION COMPLETE · SAVED TO HISTORY</Text>
          <Text style={styles.resultTitle}>{currentRule.name} — {currentRule.desc}</Text>
          
          <View style={[styles.resultCircle, { borderColor: getScoreColor(finalSessionStats?.score || 89) }]}>
            <Text style={styles.resultScoreText}>{finalSessionStats?.score || 89}</Text>
          </View>

          <View style={[styles.resultGradePill, { backgroundColor: getScoreColor(finalSessionStats?.score || 89) + '20' }]}>
            <Text style={[styles.resultGradeText, { color: getScoreColor(finalSessionStats?.score || 89) }]}>
              {finalSessionStats?.grade || 'Grade B'}
            </Text>
          </View>
        </View>

        {/* Breakdown Card */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownHeading}>Joint Breakdown</Text>

          {/* Metric 1 */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownTextRow}>
              <Text style={styles.breakdownLabel}>Striking Elbow</Text>
              <Text style={styles.breakdownValue}>{finalSessionStats?.elbow.score || 87}%</Text>
            </View>
            <View style={styles.breakdownBarBg}>
              <View style={[styles.breakdownBarFill, { width: `${finalSessionStats?.elbow.score || 87}%` }]} />
            </View>
            <Text style={styles.breakdownActual}>
              Actual: {finalSessionStats?.elbow.actual || 159}° · Ideal: {finalSessionStats?.elbow.ideal || 165}°
            </Text>
          </View>

          {/* Metric 2 */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownTextRow}>
              <Text style={styles.breakdownLabel}>Striking Shoulder</Text>
              <Text style={styles.breakdownValue}>{finalSessionStats?.shoulder.score || 80}%</Text>
            </View>
            <View style={styles.breakdownBarBg}>
              <View style={[styles.breakdownBarFill, { width: `${finalSessionStats?.shoulder.score || 80}%` }]} />
            </View>
            <Text style={styles.breakdownActual}>
              Actual: {finalSessionStats?.shoulder.actual || 81}° · Ideal: {finalSessionStats?.shoulder.ideal || 90}°
            </Text>
          </View>

          {/* Metric 3 */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownTextRow}>
              <Text style={styles.breakdownLabel}>Wrist Alignment</Text>
              <Text style={styles.breakdownValue}>{finalSessionStats?.wrist.score || 89}%</Text>
            </View>
            <View style={styles.breakdownBarBg}>
              <View style={[styles.breakdownBarFill, { width: `${finalSessionStats?.wrist.score || 89}%` }]} />
            </View>
            <Text style={styles.breakdownActual}>
              Actual: {finalSessionStats?.wrist.actual || -15}° · Ideal: {finalSessionStats?.wrist.ideal || -10}°
            </Text>
          </View>

          {/* Metric 4 */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownTextRow}>
              <Text style={styles.breakdownLabel}>Lead Knee</Text>
              <Text style={styles.breakdownValue}>{finalSessionStats?.knee.score || 100}%</Text>
            </View>
            <View style={styles.breakdownBarBg}>
              <View style={[styles.breakdownBarFill, { width: `${finalSessionStats?.knee.score || 100}%` }]} />
            </View>
            <Text style={styles.breakdownActual}>
              Actual: {finalSessionStats?.knee.actual || 150}° · Ideal: {finalSessionStats?.knee.ideal || 150}°
            </Text>
          </View>
        </View>

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneButton}
          activeOpacity={0.8}
          onPress={() => setScreenState('selection')}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1020',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (width - 52) / 2,
    backgroundColor: '#161930',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#D24B3820',
    borderWidth: 1,
    borderColor: '#D24B38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  badgeText: {
    color: '#D24B38',
    fontWeight: 'bold',
    fontSize: 12,
  },
  gridDetails: {
    flex: 1,
  },
  gridTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  gridDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  liveSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0A0C16',
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  liveText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  liveStrikeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  liveStrikeDesc: {
    color: '#FFFFFF',
    fontWeight: 'normal',
  },
  viewportContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#000000',
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0C16E0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loaderText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F1020',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#D24B38',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  progressContainer: {
    padding: 20,
    backgroundColor: '#0A0C16',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  progressValue: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  analysisPanel: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0F1020',
  },
  analysisHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 16,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisLabel: {
    width: 60,
    color: '#94A3B8',
    fontSize: 13,
  },
  analysisBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  analysisBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  analysisValue: {
    width: 36,
    textAlign: 'right',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#161930',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  resultMeta: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultScoreText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultGradePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resultGradeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  breakdownCard: {
    backgroundColor: '#161930',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    marginBottom: 25,
  },
  breakdownHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  breakdownItem: {
    marginBottom: 20,
  },
  breakdownTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#10B981',
  },
  breakdownBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#0A0C16',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  breakdownActual: {
    fontSize: 11,
    color: '#64748B',
  },
  doneButton: {
    backgroundColor: '#D24B38',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 22, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  countdownStatusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  countdownNumber: {
    color: '#F59E0B',
    fontSize: 72,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  countdownSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  modeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 4,
    marginBottom: 10,
  },
  modeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeOptionActive: {
    backgroundColor: '#D24B38',
  },
  modeOptionText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  modeOptionTextActive: {
    color: '#FFFFFF',
  },
  modeDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  warningBanner: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 16, 32, 0.95)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  warningBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  stickColorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#161930',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 4,
  },
  stickColorOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  stickColorOptionActive: {
    backgroundColor: '#D24B38',
  },
  stickColorOptionText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  stickColorOptionTextActive: {
    color: '#FFFFFF',
  },
  liveStickColorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1020',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
  },
  liveStickColorLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 10,
  },
  liveStickColorScroll: {
    alignItems: 'center',
  },
  liveStickColorOption: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginRight: 8,
    backgroundColor: '#161930',
  },
  liveStickColorOptionActive: {
    backgroundColor: '#D24B38',
    borderColor: '#D24B38',
  },
  liveStickColorOptionText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  liveStickColorOptionTextActive: {
    color: '#FFFFFF',
  },
  multiPersonPanel: {
    padding: 20,
    backgroundColor: '#0A0C16',
    borderTopWidth: 1,
    borderTopColor: '#161930',
  },
  personRow: {
    backgroundColor: '#161930',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  personRowActive: {
    borderColor: '#D24B38',
    backgroundColor: '#1E1E38',
  },
  personHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  personBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  personName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  personAccuracy: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  personStickInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personStickText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
  voiceToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceToggleButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  voiceToggleButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  liveVoiceToggle: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

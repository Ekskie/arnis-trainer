import React, { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRouter } from 'expo-router';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { PracticeHomeScreen } from '@/components/practice/PracticeHomeScreen';
import { PracticeLive } from '@/components/practice/PracticeLive';
import { PracticeResult } from '@/components/practice/PracticeResult';
import { StrikeVideoModal } from '@/components/StrikeVideoModal';
import { AppTutorialModal } from '@/components/AppTutorialModal';
import { SafetyCheckModal } from '@/components/SafetyCheckModal';
import { getCurriculumProgress, isStrikeUnlocked } from '@/constants/curriculumStore';
import { useAuth } from '@/contexts/AuthContext';
import { MartialTheme } from '@/constants/theme';

const DEFAULT_TAB_BAR_STYLE = {
  backgroundColor: '#FFFFFF',
  borderTopWidth: 1,
  borderTopColor: MartialTheme.colors.border,
  height: Platform.OS === 'ios' ? 88 : 66,
  paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  paddingTop: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 4,
};

/**
 * Route Container for Practice & Evaluation.
 * 
 * Orchestrates the learner flow:
 * - 'setup': Browse & select strikes, Anyo routines, and modes
 * - 'live': Real-time camera evaluation powered by decoupled Pose Engine
 * - 'result': Rewarding feedback, deltas, and coach corrections powered by Evaluation Engine
 */
export default function EvaluateScreen() {
  const practice = usePracticeSession();
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();

  // Modals for video demonstration & quickstart walkthrough
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoModalStrikeId, setVideoModalStrikeId] = useState('strike_1');
  const [tutorialModalVisible, setTutorialModalVisible] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [pendingSafetyStrikeId, setPendingSafetyStrikeId] = useState<string | null>(null);
  const [pendingSafetyStrikeMode, setPendingSafetyStrikeMode] = useState<'follow' | 'guided' | 'test'>('guided');

  const startStrikeWithSafety = async (
    sid: string,
    mode: 'follow' | 'guided' | 'test' = 'guided'
  ) => {
    try {
      const prog = await getCurriculumProgress(user?.id);
      if (!isStrikeUnlocked(sid, prog.completedLessonIds)) {
        const strikeNum = Number(sid.replace('strike_', '')) || 1;
        const prevNum = strikeNum > 1 ? strikeNum - 1 : 1;
        Alert.alert(
          'Strike Locked 🔒',
          `Complete and pass Strike ${prevNum} with at least Grade C (75%+) in the Journey first to unlock Strike ${strikeNum}.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Journey 🗺️', onPress: () => router.push('/explore' as any) },
          ]
        );
        return;
      }
      const hasSeen = await AsyncStorage.getItem('@arnis_has_seen_safety_modal');
      if (hasSeen === '1') {
        practice.startStrike(sid, mode);
      } else {
        setPendingSafetyStrikeId(sid);
        setPendingSafetyStrikeMode(mode);
        setShowSafetyModal(true);
      }
    } catch {
      practice.startStrike(sid, mode);
    }
  };

  const handleConfirmSafety = async () => {
    await AsyncStorage.setItem('@arnis_has_seen_safety_modal', '1');
    setShowSafetyModal(false);
    if (pendingSafetyStrikeId) {
      practice.startStrike(pendingSafetyStrikeId, pendingSafetyStrikeMode);
      setPendingSafetyStrikeId(null);
    }
  };

  // Dynamically hide tab bar on live camera evaluation or result feedback screen
  useEffect(() => {
    if (practice.screen === 'live' || practice.screen === 'result') {
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      navigation.setOptions({ tabBarStyle: DEFAULT_TAB_BAR_STYLE });
    }
    return () => {
      navigation.setOptions({ tabBarStyle: DEFAULT_TAB_BAR_STYLE });
    };
  }, [practice.screen, navigation]);

  switch (practice.screen) {
    case 'setup':
      return (
        <>
          <PracticeHomeScreen
            onStartStrike={startStrikeWithSafety}
            onStartAnyo={practice.startAnyo}
            onOpenVideoGuide={(strikeId) => {
              setVideoModalStrikeId(strikeId || practice.selectedStrikeId);
              setVideoModalVisible(true);
            }}
            onOpenTutorial={() => setTutorialModalVisible(true)}
            stickColor={practice.stickColor}
            setStickColor={practice.setStickColor}
            voiceFeedbackEnabled={practice.voiceFeedbackEnabled}
            setVoiceFeedbackEnabled={practice.setVoiceFeedbackEnabled}
          />

          {videoModalVisible && (
            <StrikeVideoModal
              visible={videoModalVisible}
              initialStrikeId={videoModalStrikeId}
              onClose={() => setVideoModalVisible(false)}
              onPracticeStrike={(sid) => {
                setVideoModalVisible(false);
                startStrikeWithSafety(sid);
              }}
            />
          )}

          <AppTutorialModal
            visible={tutorialModalVisible}
            onClose={() => setTutorialModalVisible(false)}
            onNavigateToPractice={(sid) => {
              setTutorialModalVisible(false);
              startStrikeWithSafety(sid || 'strike_1');
            }}
          />

          <SafetyCheckModal
            visible={showSafetyModal}
            onDismiss={() => {
              setShowSafetyModal(false);
              setPendingSafetyStrikeId(null);
            }}
            onConfirm={handleConfirmSafety}
          />
        </>
      );

    case 'live':
      return (
        <PracticeLive
          strikeRule={practice.currentRule}
          mode={practice.mode}
          evaluationConfig={practice.evaluationConfig}
          activeRoutine={practice.activeRoutine}
          autoStartEval={practice.autoStartEval}
          onComplete={practice.completeSingleStrikeSession}
          onCompleteAnyo={practice.completeAnyoSession}
          onExit={() => {
            if (practice.source === 'lesson') {
              practice.returnToLesson(false);
            } else {
              practice.exitToSetup();
            }
          }}
          onChangeMode={practice.setMode}
          onSelectStrike={practice.setSelectedStrikeId}
        />
      );

    case 'result':
      if (!practice.evaluationResult) {
        return null;
      }
      return (
        <PracticeResult
          result={practice.evaluationResult}
          improvement={practice.sessionImprovement}
          strikeRule={practice.currentRule}
          promotionResult={practice.promotionResult}
          sessionId={practice.lastSessionId}
          lastSnapshot={practice.lastSnapshot}
          lastReplayVideo={practice.lastReplayVideo}
          lastImpactMeta={practice.lastImpactMeta}
          researchCapture={practice.lastResearchCapture}
          isFromLesson={practice.source === 'lesson'}
          practiceMode={practice.mode}
          activeRoutine={practice.activeRoutine}
          anyoStepScores={practice.routineStepScores}
          onPracticeAnyoAgain={() => {
            if (practice.activeRoutine) {
              practice.startAnyo(practice.activeRoutine);
            }
          }}
          onNextRoutine={practice.nextAnyoRoutine}
          onRetry={practice.retry}
          onRetest={practice.retest}
          onNextStrike={practice.nextStrike}
          onExit={() => {
            if (practice.source === 'lesson') {
              practice.returnToLesson(false);
            } else {
              practice.exitToSetup();
            }
          }}
          onContinueLesson={() => practice.returnToLesson(true)}
          onExitLesson={() => practice.returnToLesson(false)}
        />
      );

    default:
      return null;
  }
}

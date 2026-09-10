import React, { useState } from 'react';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { PracticeHomeScreen } from '@/components/practice/PracticeHomeScreen';
import { PracticeLive } from '@/components/practice/PracticeLive';
import { PracticeResult } from '@/components/practice/PracticeResult';
import { StrikeVideoModal } from '@/components/StrikeVideoModal';
import { AppTutorialModal } from '@/components/AppTutorialModal';

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

  // Modals for video demonstration & quickstart walkthrough
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoModalStrikeId, setVideoModalStrikeId] = useState('strike_1');
  const [tutorialModalVisible, setTutorialModalVisible] = useState(false);

  switch (practice.screen) {
    case 'setup':
      return (
        <>
          <PracticeHomeScreen
            onStartStrike={practice.startStrike}
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

          <StrikeVideoModal
            visible={videoModalVisible}
            initialStrikeId={videoModalStrikeId}
            onClose={() => setVideoModalVisible(false)}
          />

          <AppTutorialModal
            visible={tutorialModalVisible}
            onClose={() => setTutorialModalVisible(false)}
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
          onComplete={practice.completeSingleStrikeSession}
          onCompleteAnyo={practice.completeAnyoSession}
          onExit={practice.exitToSetup}
          onChangeMode={practice.setMode}
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
          lastSnapshot={practice.lastSnapshot}
          lastReplayVideo={practice.lastReplayVideo}
          isFromLesson={practice.source === 'lesson'}
          onRetry={practice.retry}
          onNextStrike={practice.nextStrike}
          onExit={practice.exitToSetup}
          onContinueLesson={practice.returnToLesson}
        />
      );

    default:
      return null;
  }
}

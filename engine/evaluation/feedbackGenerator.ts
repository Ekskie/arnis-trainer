import { CoachFeedback, PillarScores } from './evaluationTypes';
import { StrikeRule } from '@/constants/strikeRules';

export function generateCoachFeedback(
  score: number,
  pillars: PillarScores,
  rule: StrikeRule,
  options?: { isNewPersonalBest?: boolean; isMastered?: boolean }
): CoachFeedback {
  // 1. Greeting
  let greeting = 'PRACTICE COMPLETE! 🥋';
  if (options?.isMastered || score >= 85) {
    greeting = 'STRIKE MASTERED! 🥋';
  } else if (options?.isNewPersonalBest) {
    greeting = 'NEW PERSONAL BEST! ⭐';
  } else if (score >= 75) {
    greeting = 'NICE WORK! 🎉';
  } else if (score >= 60) {
    greeting = 'KEEP PRACTICING! 💪';
  }

  // 2. Checklist of what was good
  const positives: string[] = [];
  if (pillars.stance >= 75) {
    positives.push('Solid Tindig stance & knee bend stability');
  }
  if (pillars.guard >= 75) {
    positives.push('Kalasag check hand pinned firmly to chest');
  }
  if (pillars.strikingArm >= 75) {
    positives.push('Clean slicing angle along target plane');
  }
  if (pillars.wrist >= 75) {
    positives.push('Sharp wrist alignment at impact apex');
  }
  if (positives.length === 0) {
    positives.push('Good attempt! Ready stance recognized');
  }

  // 3. Priority single thing to improve
  const improvements: string[] = [];
  if (pillars.strikingArm < 75) {
    improvements.push(
      `Forearm trajectory: Keep your elbow along the canonical plane for ${rule.name} (${rule.target}).`
    );
  } else if (pillars.guard < 75) {
    improvements.push('Check hand: Pin your non-striking fist to your solar plexus/chest.');
  } else if (pillars.stance < 75) {
    improvements.push('Stance base: Maintain an athletic bend in your lead knee (135°-165°).');
  } else if (pillars.wrist < 75) {
    improvements.push('Wrist alignment: Snap and lock your wrist with the stick at impact.');
  } else {
    improvements.push('Maintain consistent speed and explosive recovery back to guard.');
  }

  // 4. Coach Speech Advice
  let advice = rule.coachTip;
  if (score >= 85) {
    advice = `Masterful execution of ${rule.name}! Your trajectory and guard defense were locked in. Solid martial discipline!`;
  } else if (pillars.strikingArm < 70) {
    advice = `Your striking elbow was opening slightly off the angle. Focus on guiding your forearm through the ${rule.target}.`;
  } else if (pillars.guard < 70) {
    advice = 'Keep your check hand pinned firmly to your chest throughout the strike to protect against counter-strikes.';
  } else if (pillars.stance < 70) {
    advice = 'Sink slightly lower into your fighting stance (Tindig) to stabilize your striking power.';
  }

  const summary =
    score >= 85
      ? 'Excellent martial technique and kinetic chain alignment.'
      : score >= 70
      ? 'Solid foundation with a few minor angles to sharpen.'
      : 'Focus on chambering and check hand position before striking.';

  return {
    greeting,
    summary,
    advice,
    positives,
    improvements,
  };
}

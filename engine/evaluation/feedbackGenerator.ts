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
    positives.push('Balanced, steady stance with bent knees');
  }
  if (pillars.guard >= 75) {
    positives.push('Great job keeping your free hand on your chest');
  }
  if (pillars.strikingArm >= 75) {
    positives.push('Smooth, controlled arm swing on target');
  }
  if (pillars.wrist >= 75) {
    positives.push('Nice, crisp wrist control at the end of the strike');
  }
  if (positives.length === 0) {
    positives.push('Good effort! Keep practicing the motion smoothly');
  }

  // 3. Priority single thing to improve
  const improvements: string[] = [];
  const targetLabel = rule.target.split('/')[0].trim().toLowerCase();
  if (pillars.strikingArm < 75) {
    improvements.push(
      `Arm Path: Guide your arm smoothly toward the ${targetLabel} (${rule.name}).`
    );
  } else if (pillars.guard < 75) {
    improvements.push('Guard Hand: Keep your free hand flat against your chest for protection.');
  } else if (pillars.stance < 75) {
    improvements.push('Stance: Bend both knees slightly and stay low for better balance.');
  } else if (pillars.wrist < 75) {
    improvements.push('Wrist Control: Keep your wrist firm and give a quick snap at the target.');
  } else {
    improvements.push('Keep the same smooth speed, then bring your stick right back to guard.');
  }

  // 4. Coach Speech Advice
  let advice = rule.coachTip;
  if (score >= 85) {
    advice = `Awesome ${rule.name}! Your swing was smooth, your knees were balanced, and your free hand stayed safely on your chest.`;
  } else if (pillars.strikingArm < 70) {
    advice = `Aim your arm smoothly toward the ${targetLabel} from start to finish without rushing the swing.`;
  } else if (pillars.guard < 70) {
    advice = 'Remember to keep your free hand resting on your chest while you strike to protect yourself.';
  } else if (pillars.stance < 70) {
    advice = 'Bend both knees a little more into a comfortable, low stance so your strike feels steady.';
  } else if (pillars.wrist < 70) {
    advice = 'Keep your wrist firm and give a quick, light snap right as you reach the target.';
  }

  const summary =
    score >= 85
      ? 'Great job! Smooth strike and strong overall body control.'
      : score >= 70
      ? 'Good form! Just one or two small adjustments will make this shine.'
      : 'Nice try! Focus on starting ready, keeping your free hand up, and aiming smoothly.';

  return {
    greeting,
    summary,
    advice,
    positives,
    improvements,
  };
}

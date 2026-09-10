export interface PillarScores {
  strikingArm: number;
  guard: number;
  stance: number;
  wrist: number;
}

export interface CoachFeedback {
  greeting: string;
  summary: string;
  advice: string;
  positives: string[];
  improvements: string[];
}

export interface StrikeEvaluationResult {
  score: number; // 0..100
  accuracy: number; // 0..100
  grade: string; // 'Grade A', 'Grade B', etc.
  stars: number; // 0..5
  elbowScore: number;
  shoulderScore: number;
  wristScore: number;
  kneeScore: number;
  guardScore: number;
  stanceScore: number;
  kineticScore?: number;
  pillarScores: PillarScores;
  feedback: CoachFeedback;
  diagnosticFlags: string[];
  durationMs?: number;
}

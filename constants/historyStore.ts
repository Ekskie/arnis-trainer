import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionItem {
  id: string;
  strikeId: string;
  strikeName: string;
  description: string;
  score: number;
  grade: string;
  date: string;
  snapshotBase64?: string;
  replayVideoBase64?: string;
  breakdown: {
    elbow: { score: number; actual: number; ideal: number };
    shoulder: { score: number; actual: number; ideal: number };
    wrist: { score: number; actual: number; ideal: number };
    knee?: { score: number; actual: number; ideal: number };
    guard?: { score: number; actual: number; ideal: number };
    stance?: { score: number; actual: number; ideal: number };
  };
  routineId?: string;
  routineName?: string;
  anyoSteps?: AnyoStepResult[];
  totalDurationMs?: number;
  cadenceSpeedSec?: number;
}

export interface AnyoRoutine {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Master';
  strikes: string[];
  icon: string;
}

export interface AnyoStepResult {
  stepIndex: number;
  strikeId: string;
  strikeName: string;
  score: number;
  grade: string;
  durationMs: number;
  snapshotBase64?: string;
  breakdown?: {
    elbow: { score: number; actual: number; ideal: number };
    shoulder: { score: number; actual: number; ideal: number };
    wrist: { score: number; actual: number; ideal: number };
    knee?: { score: number; actual: number; ideal: number };
    guard?: { score: number; actual: number; ideal: number };
    stance?: { score: number; actual: number; ideal: number };
  };
}

export const ANYO_ROUTINES_CATALOG: AnyoRoutine[] = [
  {
    id: "routine_temple_crown",
    name: "Redonda Cross & Crown",
    subtitle: "Strikes 1 → 2 → 12",
    description: "Classic diagonal temple strikes followed by an overhead skull strike.",
    difficulty: "Beginner",
    strikes: ["strike_1", "strike_2", "strike_12"],
    icon: "sword-cross"
  },
  {
    id: "routine_torso_thrust",
    name: "Torso Slice & Core Thrust",
    subtitle: "Strikes 3 → 4 → 5",
    description: "Horizontal flank clearing strikes followed by an explosive core stomach thrust.",
    difficulty: "Beginner",
    strikes: ["strike_3", "strike_4", "strike_5"],
    icon: "shield-sword"
  },
  {
    id: "routine_chest_eye",
    name: "Upper Body & Face Precision",
    subtitle: "Strikes 6 → 7 → 10 → 11",
    description: "High angle clavicle thrusts chained with surgical eye thrusts.",
    difficulty: "Intermediate",
    strikes: ["strike_6", "strike_7", "strike_10", "strike_11"],
    icon: "target"
  },
  {
    id: "routine_low_high",
    name: "Low-High Level Change",
    subtitle: "Strikes 8 → 9 → 12",
    description: "Low knee sweeps forcing opponent guard down, transitioning straight up to the crown.",
    difficulty: "Intermediate",
    strikes: ["strike_8", "strike_9", "strike_12"],
    icon: "human-male-height"
  },
  {
    id: "routine_anyo_full",
    name: "Full 12 Strikes Anyo Master Form",
    subtitle: "Strikes 1 through 12",
    description: "The complete martial art routine executing all 12 strikes of Arnis in seamless continuous flow.",
    difficulty: "Master",
    strikes: [
      "strike_1", "strike_2", "strike_3", "strike_4", "strike_5", "strike_6",
      "strike_7", "strike_8", "strike_9", "strike_10", "strike_11", "strike_12"
    ],
    icon: "crown"
  }
];

export interface StrikeMasteryItem {
  id: string;
  strikeNumber: number;
  name: string;
  target: string;
  description: string;
  bestScore: number;
  avgScore: number;
  attempts: number;
  grade: string;
  isMastered: boolean;
}

export interface MasteryStats {
  strikes: StrikeMasteryItem[];
  overallMastery: number;
  masteredCount: number;
  totalSessions: number;
  strongestStrike: StrikeMasteryItem | null;
  weakestStrike: StrikeMasteryItem | null;
  rankTitle: string;
}

import { STRIKES_CATALOG, StrikeRule } from '@/constants/strikeRules';
export { STRIKES_CATALOG, StrikeRule };

const STORAGE_KEY = '@arnis_pose_sessions';

export function computeGrade(score: number): string {
  if (score >= 95) return 'Grade A';
  if (score >= 85) return 'Grade B';
  if (score >= 75) return 'Grade C';
  if (score >= 60) return 'Grade D';
  if (score > 0) return 'Grade F';
  return 'Unranked';
}

export function getStrikeMasteryStats(history: SessionItem[]): MasteryStats {
  const strikeMap: Record<string, { scores: number[]; best: number }> = {};
  
  STRIKES_CATALOG.forEach(s => {
    strikeMap[s.id] = { scores: [], best: 0 };
  });

  if (history && history.length > 0) {
    history.forEach(item => {
      // Normalize strikeId (handle 'strike_1' or '1')
      let normalizedId = item.strikeId;
      if (!normalizedId.startsWith('strike_')) {
        normalizedId = `strike_${normalizedId}`;
      }
      if (strikeMap[normalizedId]) {
        strikeMap[normalizedId].scores.push(item.score);
        if (item.score > strikeMap[normalizedId].best) {
          strikeMap[normalizedId].best = item.score;
        }
      }
    });
  }

  const strikes: StrikeMasteryItem[] = STRIKES_CATALOG.map(cat => {
    const data = strikeMap[cat.id];
    const attempts = data.scores.length;
    const bestScore = data.best;
    const avgScore = attempts > 0 
      ? Math.round(data.scores.reduce((a, b) => a + b, 0) / attempts)
      : 0;
    const grade = computeGrade(bestScore);
    const isMastered = bestScore >= 85;

    return {
      id: cat.id,
      strikeNumber: cat.strikeNumber,
      name: cat.name,
      target: cat.target,
      description: cat.desc,
      bestScore,
      avgScore,
      attempts,
      grade,
      isMastered
    };
  });

  const attemptedStrikes = strikes.filter(s => s.attempts > 0);
  const masteredCount = strikes.filter(s => s.isMastered).length;
  
  let overallMastery = 0;
  if (attemptedStrikes.length > 0) {
    // Average best score of all 12 strikes
    const sumBest = strikes.reduce((acc, s) => acc + s.bestScore, 0);
    overallMastery = Math.round(sumBest / 12);
  }

  let strongestStrike: StrikeMasteryItem | null = null;
  let weakestStrike: StrikeMasteryItem | null = null;

  if (attemptedStrikes.length > 0) {
    const sorted = [...attemptedStrikes].sort((a, b) => b.bestScore - a.bestScore);
    strongestStrike = sorted[0];
    weakestStrike = sorted[sorted.length - 1];
  }

  let rankTitle = 'Beginner (White Sash)';
  if (history.length === 0) {
    rankTitle = 'Novice Practitioner';
  } else if (masteredCount >= 12 && overallMastery >= 90) {
    rankTitle = 'Lakan / Master (Black Belt)';
  } else if (masteredCount >= 10) {
    rankTitle = 'Senior Striker (Brown Sash)';
  } else if (masteredCount >= 7) {
    rankTitle = 'Adept Striker (Blue Sash)';
  } else if (masteredCount >= 4) {
    rankTitle = 'Intermediate (Green Sash)';
  } else if (masteredCount >= 1) {
    rankTitle = 'Apprentice (Yellow Sash)';
  }

  return {
    strikes,
    overallMastery,
    masteredCount,
    totalSessions: history.length,
    strongestStrike,
    weakestStrike,
    rankTitle
  };
}

export async function getHistory(): Promise<SessionItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const items: SessionItem[] = JSON.parse(raw);
    // Filter out legacy mock data items (ids starting with 'mock_')
    const realItems = items.filter(item => !item.id.startsWith('mock_'));
    if (realItems.length !== items.length) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(realItems));
    }
    return realItems;
  } catch (e) {
    console.error('Failed to load history', e);
    return [];
  }
}

export async function saveSession(
  strikeId: string,
  strikeName: string,
  description: string,
  score: number,
  breakdown: SessionItem['breakdown'],
  snapshotBase64?: string,
  replayVideoBase64?: string
): Promise<SessionItem> {
  const grade = computeGrade(score);

  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const hours = now.getHours().toString().padStart(2, '0');
  const mins = now.getMinutes().toString().padStart(2, '0');
  const dateStr = `${month} ${day} · ${hours}:${mins}`;

  const newItem: SessionItem = {
    id: 'session_' + Date.now(),
    strikeId,
    strikeName,
    description,
    score,
    grade,
    date: dateStr,
    snapshotBase64,
    replayVideoBase64,
    breakdown
  };

  try {
    const history = await getHistory();
    const updated = [newItem, ...history];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newItem;
  } catch (e) {
    console.error('Failed to save session', e);
    return newItem;
  }
}

export async function saveAnyoSession(
  routine: AnyoRoutine,
  stepResults: AnyoStepResult[],
  totalDurationMs: number
): Promise<SessionItem> {
  const avgScore = stepResults.length > 0 
    ? Math.round(stepResults.reduce((a, b) => a + b.score, 0) / stepResults.length)
    : 0;
  const grade = computeGrade(avgScore);
  const cadenceSpeedSec = parseFloat(((totalDurationMs / 1000) / Math.max(1, stepResults.length)).toFixed(1));

  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const hours = now.getHours().toString().padStart(2, '0');
  const mins = now.getMinutes().toString().padStart(2, '0');
  const dateStr = `${month} ${day} · ${hours}:${mins}`;

  const firstStepBreakdown = stepResults[0]?.breakdown || {
    elbow: { score: avgScore, actual: 0, ideal: 0 },
    shoulder: { score: avgScore, actual: 0, ideal: 0 },
    wrist: { score: avgScore, actual: 0, ideal: 0 }
  };

  const bestSnapshot = stepResults.find(s => !!s.snapshotBase64)?.snapshotBase64;

  const newItem: SessionItem = {
    id: 'session_anyo_' + Date.now(),
    strikeId: routine.id,
    strikeName: routine.name,
    description: `Anyo Routine (${stepResults.length} strikes · ${cadenceSpeedSec}s/strike)`,
    score: avgScore,
    grade,
    date: dateStr,
    snapshotBase64: bestSnapshot,
    breakdown: firstStepBreakdown,
    routineId: routine.id,
    routineName: routine.name,
    anyoSteps: stepResults,
    totalDurationMs,
    cadenceSpeedSec
  };

  try {
    const history = await getHistory();
    const updated = [newItem, ...history];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newItem;
  } catch (e) {
    console.error('Failed to save anyo session', e);
    return newItem;
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear history', e);
  }
}

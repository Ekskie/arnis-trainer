import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { clearAllUserStrikeMedia } from '@/services/mediaStorageService';

export interface SessionItem {
  id: string;
  strikeId: string;
  strikeName: string;
  description: string;
  score: number;
  grade: string;
  date: string;
  isSharedWithCoach?: boolean;
  snapshotBase64?: string;
  replayVideoBase64?: string;
  userVideoUri?: string;
  userImpactSnapshotUri?: string;
  coachVideoUri?: string;
  coachImpactSnapshotUri?: string;
  impactFrame?: number;
  impactTime?: number;
  coachImpactTime?: number;
  impactConfidence?: number;
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

export interface SessionMediaPayload {
  userVideoUri?: string;
  userImpactSnapshotUri?: string;
  coachVideoUri?: string;
  coachImpactSnapshotUri?: string;
  impactFrame?: number;
  impactTime?: number;
  coachImpactTime?: number;
  impactConfidence?: number;
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

let activeHistoryUserId: string | null = null;

export function setActiveHistoryUserId(userId: string | null) {
  activeHistoryUserId = userId;
}

export function getHistoryStorageKey(userId?: string | null): string {
  const uid = userId !== undefined ? userId : activeHistoryUserId;
  return uid ? `@arnis_pose_sessions_${uid}` : '@arnis_pose_sessions';
}

export const AUTO_SHARE_COACH_PREF_KEY = '@arnis_auto_share_with_coach';
export const SHARE_TELEMETRY_PREF_KEY = '@arnis_share_telemetry_with_coach';

export async function getAutoShareCoachPreference(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(AUTO_SHARE_COACH_PREF_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setAutoShareCoachPreference(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTO_SHARE_COACH_PREF_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('[historyStore] Failed to save auto-share preference:', err);
  }
}

export async function getShareTelemetryPreference(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(SHARE_TELEMETRY_PREF_KEY);
    return val !== 'false'; // default to true
  } catch {
    return true;
  }
}

export async function setShareTelemetryPreference(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SHARE_TELEMETRY_PREF_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('[historyStore] Failed to save telemetry preference:', err);
  }
}

export interface StrikeMasteryRecord {
  strikeId: string;
  bestScore: number;
  attempts: number;
  isMastered: boolean;
  lastPracticed: string;
}

export function getStrikeMasteryStorageKey(userId?: string | null): string {
  const uid = userId !== undefined ? userId : activeHistoryUserId;
  return uid ? `@arnis_strike_mastery_${uid}` : '@arnis_strike_mastery';
}

export async function getStoredStrikeMasteryMap(userId?: string | null): Promise<Record<string, StrikeMasteryRecord>> {
  try {
    const key = getStrikeMasteryStorageKey(userId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load strike mastery map', err);
    return {};
  }
}

export async function saveStrikeMasteryRecord(
  strikeId: string,
  score: number,
  userId?: string | null
): Promise<StrikeMasteryRecord> {
  let normalizedId = strikeId;
  if (!normalizedId.startsWith('strike_')) {
    normalizedId = `strike_${normalizedId}`;
  }

  try {
    const key = getStrikeMasteryStorageKey(userId);
    const masteryMap = await getStoredStrikeMasteryMap(userId);
    const prev = masteryMap[normalizedId];

    const attempts = (prev?.attempts || 0) + 1;
    const bestScore = Math.max(prev?.bestScore || 0, score);
    // Once mastered, it stays permanently mastered
    const isMastered = Boolean(prev?.isMastered || bestScore >= 85 || score >= 85);

    const record: StrikeMasteryRecord = {
      strikeId: normalizedId,
      bestScore,
      attempts,
      isMastered,
      lastPracticed: new Date().toISOString(),
    };

    masteryMap[normalizedId] = record;
    await AsyncStorage.setItem(key, JSON.stringify(masteryMap));
    return record;
  } catch (err) {
    console.error('Failed to save strike mastery record', err);
    return {
      strikeId: normalizedId,
      bestScore: score,
      attempts: 1,
      isMastered: score >= 85,
      lastPracticed: new Date().toISOString(),
    };
  }
}

export async function clearStrikeMastery(userId?: string | null): Promise<void> {
  try {
    const key = getStrikeMasteryStorageKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify({}));
  } catch (err) {
    console.error('Failed to clear strike mastery', err);
  }
}

export function computeGrade(score: number): string {
  if (score >= 95) return 'Grade A';
  if (score >= 85) return 'Grade B';
  if (score >= 75) return 'Grade C';
  if (score >= 60) return 'Grade D';
  if (score > 0) return 'Grade F';
  return 'Unranked';
}

export function getStrikeMasteryStats(
  history: SessionItem[],
  masteryMap?: Record<string, StrikeMasteryRecord> | null
): MasteryStats {
  const strikeMap: Record<
    string,
    { scores: number[]; best: number; attempts: number; isMastered: boolean }
  > = {};
  
  STRIKES_CATALOG.forEach(s => {
    strikeMap[s.id] = { scores: [], best: 0, attempts: 0, isMastered: false };
  });

  // 1. Process history sessions
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

  // 2. Merge persistent mastery map to guarantee mastered strikes never reset
  if (masteryMap) {
    Object.keys(masteryMap).forEach((key) => {
      let normalizedId = key;
      if (!normalizedId.startsWith('strike_')) {
        normalizedId = `strike_${normalizedId}`;
      }
      if (strikeMap[normalizedId]) {
        const record = masteryMap[key];
        strikeMap[normalizedId].best = Math.max(strikeMap[normalizedId].best, record.bestScore);
        strikeMap[normalizedId].attempts = Math.max(
          strikeMap[normalizedId].scores.length,
          record.attempts || 0
        );
        if (record.isMastered || strikeMap[normalizedId].best >= 85) {
          strikeMap[normalizedId].isMastered = true;
        }
      }
    });
  }

  const strikes: StrikeMasteryItem[] = STRIKES_CATALOG.map(cat => {
    const data = strikeMap[cat.id];
    const attempts = data.attempts > 0 ? data.attempts : data.scores.length;
    const bestScore = data.best;
    const avgScore = data.scores.length > 0 
      ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
      : (bestScore > 0 ? bestScore : 0);
    const grade = computeGrade(bestScore);
    const isMastered = data.isMastered || bestScore >= 85;

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
  if (history.length === 0 && (!masteryMap || Object.keys(masteryMap).length === 0)) {
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
    totalSessions: Math.max(history.length, attemptedStrikes.length),
    strongestStrike,
    weakestStrike,
    rankTitle
  };
}

export async function getHistory(userId?: string): Promise<SessionItem[]> {
  try {
    const key = getHistoryStorageKey(userId);
    let items: SessionItem[] = [];

    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        items = JSON.parse(raw);
      }
    } catch (readErr) {
      console.warn('[historyStore] AsyncStorage read error, attempting recovery:', readErr);
    }

    // Filter out legacy mock data items (ids starting with 'mock_')
    let realItems = items.filter(item => !item.id.startsWith('mock_'));

    // Strip legacy bloated base64 videos/snapshots to ensure row fits SQLite CursorWindow limit
    let hasBloatedMedia = false;
    realItems = realItems.map(item => {
      let modified = false;
      if (item.replayVideoBase64) {
        delete item.replayVideoBase64;
        modified = true;
      }
      if (item.snapshotBase64 && item.snapshotBase64.length > 50000 && item.userImpactSnapshotUri) {
        delete item.snapshotBase64;
        modified = true;
      }
      if (modified) hasBloatedMedia = true;
      return item;
    });

    if (hasBloatedMedia || realItems.length !== items.length) {
      await AsyncStorage.setItem(key, JSON.stringify(realItems)).catch(() => {});
    }

    // If local cache is empty for this user and Supabase is configured, pull from cloud
    const uid = userId !== undefined ? userId : activeHistoryUserId;
    if (realItems.length === 0 && uid && isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('practice_sessions')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          const cloudItems: SessionItem[] = data.map((d: any) => ({
            id: d.id,
            strikeId: d.strike_id,
            strikeName: d.strike_name,
            description: d.strike_name,
            score: d.score,
            grade: d.grade,
            date: d.date,
            isSharedWithCoach: Boolean(d.is_shared_with_coach),
            snapshotBase64: d.snapshot_url,
            userVideoUri: d.video_url,
            breakdown: d.breakdown || {
              elbow: { score: d.score, actual: 45, ideal: 45 },
              shoulder: { score: d.score, actual: 55, ideal: 55 },
              wrist: { score: d.score, actual: 30, ideal: 30 },
            },
          }));
          await AsyncStorage.setItem(key, JSON.stringify(cloudItems)).catch(() => {});
          return cloudItems;
        }
      } catch (err) {
        // Fallback silently if offline
      }
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
  replayVideoBase64?: string,
  mediaPayload?: SessionMediaPayload,
  userId?: string
): Promise<SessionItem> {
  const grade = computeGrade(score);

  // 1. Immediately update and persist strike mastery record atomically
  await saveStrikeMasteryRecord(strikeId, score, userId);

  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const hours = now.getHours().toString().padStart(2, '0');
  const mins = now.getMinutes().toString().padStart(2, '0');
  const dateStr = `${month} ${day} · ${hours}:${mins}`;

  // Sanitize media payload: store file paths rather than multi-megabyte base64 strings
  const finalVideoUri = mediaPayload?.userVideoUri && !mediaPayload.userVideoUri.startsWith('data:')
    ? mediaPayload.userVideoUri
    : undefined;

  const finalSnapshotUri = mediaPayload?.userImpactSnapshotUri && !mediaPayload.userImpactSnapshotUri.startsWith('data:')
    ? mediaPayload.userImpactSnapshotUri
    : (snapshotBase64 && !snapshotBase64.startsWith('data:') ? snapshotBase64 : undefined);

  // Keep snapshotBase64 only if no file URI exists and payload size is safe (<50KB)
  const safeSnapshotBase64 = !finalSnapshotUri && snapshotBase64 && snapshotBase64.length < 50000
    ? snapshotBase64
    : undefined;

  const autoShare = await getAutoShareCoachPreference();

  const newItem: SessionItem = {
    id: 'session_' + Date.now(),
    strikeId,
    strikeName,
    description,
    score,
    grade,
    date: dateStr,
    isSharedWithCoach: autoShare,
    snapshotBase64: safeSnapshotBase64,
    replayVideoBase64: undefined, // Never store multi-MB video base64 in AsyncStorage
    userVideoUri: finalVideoUri,
    userImpactSnapshotUri: finalSnapshotUri,
    coachVideoUri: mediaPayload?.coachVideoUri,
    coachImpactSnapshotUri: mediaPayload?.coachImpactSnapshotUri,
    impactFrame: mediaPayload?.impactFrame,
    impactTime: mediaPayload?.impactTime,
    coachImpactTime: mediaPayload?.coachImpactTime,
    impactConfidence: mediaPayload?.impactConfidence,
    breakdown
  };

  try {
    const key = getHistoryStorageKey(userId);
    const history = await getHistory(userId);
    const updated = [newItem, ...history];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return newItem;
  } catch (e) {
    console.error('Failed to save session', e);
    return newItem;
  }
}

export async function saveAnyoSession(
  routine: AnyoRoutine,
  stepResults: AnyoStepResult[],
  totalDurationMs: number,
  userId?: string
): Promise<SessionItem> {
  const avgScore = stepResults.length > 0 
    ? Math.round(stepResults.reduce((a, b) => a + b.score, 0) / stepResults.length)
    : 0;
  const grade = computeGrade(avgScore);
  const cadenceSpeedSec = parseFloat(((totalDurationMs / 1000) / Math.max(1, stepResults.length)).toFixed(1));

  // Update mastery for all strikes included in the anyo
  for (const step of stepResults) {
    if (step.strikeId && step.score > 0) {
      await saveStrikeMasteryRecord(step.strikeId, step.score, userId);
    }
  }

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
  const safeBestSnapshot = bestSnapshot && bestSnapshot.length < 50000 ? bestSnapshot : undefined;

  // Sanitize steps for storage to prevent bloating
  const sanitizedSteps = stepResults.map(s => ({
    ...s,
    snapshotBase64: undefined,
  }));

  const autoShare = await getAutoShareCoachPreference();

  const newItem: SessionItem = {
    id: 'session_anyo_' + Date.now(),
    strikeId: routine.id,
    strikeName: routine.name,
    description: `Anyo Routine (${stepResults.length} strikes · ${cadenceSpeedSec}s/strike)`,
    score: avgScore,
    grade,
    date: dateStr,
    isSharedWithCoach: autoShare,
    snapshotBase64: safeBestSnapshot,
    breakdown: firstStepBreakdown,
    routineId: routine.id,
    routineName: routine.name,
    anyoSteps: sanitizedSteps,
    totalDurationMs,
    cadenceSpeedSec
  };

  try {
    const key = getHistoryStorageKey(userId);
    const history = await getHistory(userId);
    const updated = [newItem, ...history];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return newItem;
  } catch (e) {
    console.error('Failed to save anyo session', e);
    return newItem;
  }
}

export async function clearHistory(userId?: string, resetMastery: boolean = false): Promise<void> {
  try {
    const key = getHistoryStorageKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify([]));
    if (resetMastery) {
      await clearStrikeMastery(userId);
    }
    await clearAllUserStrikeMedia().catch(() => {});
  } catch (e) {
    console.error('Failed to clear history', e);
  }
}

/**
 * Update the sharing status of an individual session locally.
 */
export async function updateSessionSharing(
  sessionId: string,
  isShared: boolean,
  userId?: string
): Promise<SessionItem | null> {
  try {
    const key = getHistoryStorageKey(userId);
    const history = await getHistory(userId);
    let updatedItem: SessionItem | null = null;
    const updated = history.map((item) => {
      if (item.id === sessionId) {
        updatedItem = { ...item, isSharedWithCoach: isShared };
        return updatedItem;
      }
      return item;
    });
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updatedItem;
  } catch (e) {
    console.error('Failed to update session sharing in historyStore', e);
    return null;
  }
}

/**
 * Bulk update all stored sessions to shared or private.
 */
export async function bulkSetSessionsSharing(
  userId: string | undefined,
  isShared: boolean
): Promise<void> {
  try {
    const key = getHistoryStorageKey(userId);
    const history = await getHistory(userId);
    const updated = history.map((item) => ({
      ...item,
      isSharedWithCoach: isShared,
    }));
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to bulk set sessions sharing in historyStore', e);
  }
}

/**
 * Attach or update the recorded video URI for a practice session locally.
 */
export async function updateSessionVideo(
  sessionId: string,
  videoUri: string,
  userId?: string
): Promise<SessionItem | null> {
  try {
    const key = getHistoryStorageKey(userId);
    const history = await getHistory(userId);
    let updatedItem: SessionItem | null = null;
    const updated = history.map((item) => {
      if (item.id === sessionId) {
        updatedItem = { ...item, userVideoUri: videoUri };
        return updatedItem;
      }
      return item;
    });
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updatedItem;
  } catch (e) {
    console.error('Failed to update session video in historyStore', e);
    return null;
  }
}

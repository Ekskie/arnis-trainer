import AsyncStorage from '@react-native-async-storage/async-storage';

const GAMIFICATION_STORAGE_KEY = '@posefix_gamification_v1';

export interface GamificationStats {
  streakDays: number;
  lastTrainedDate: string; // YYYY-MM-DD
  totalXp: number;
  hearts: number; // 5 max
  level: number;
}

const DEFAULT_STATS: GamificationStats = {
  streakDays: 3,
  lastTrainedDate: new Date().toISOString().split('T')[0],
  totalXp: 120,
  hearts: 5,
  level: 1,
};

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export async function getGamificationStats(): Promise<GamificationStats> {
  try {
    const raw = await AsyncStorage.getItem(GAMIFICATION_STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(DEFAULT_STATS));
      return DEFAULT_STATS;
    }
    const parsed: GamificationStats = JSON.parse(raw);
    return parsed;
  } catch {
    return DEFAULT_STATS;
  }
}

export async function addXpAndStreak(xpEarned: number = 10): Promise<GamificationStats> {
  try {
    const stats = await getGamificationStats();
    const today = getTodayString();
    const yesterday = getYesterdayString();

    let newStreak = stats.streakDays;
    if (stats.lastTrainedDate === yesterday) {
      newStreak += 1;
    } else if (stats.lastTrainedDate === today) {
      // Already trained today, keep streak
    } else if (stats.lastTrainedDate && stats.lastTrainedDate < yesterday) {
      newStreak = 1; // streak reset
    }

    const newXp = stats.totalXp + xpEarned;
    const newLevel = Math.max(1, Math.floor(newXp / 100) + 1);

    const updated: GamificationStats = {
      ...stats,
      streakDays: Math.max(1, newStreak),
      lastTrainedDate: today,
      totalXp: newXp,
      level: newLevel,
    };

    await AsyncStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_STATS;
  }
}

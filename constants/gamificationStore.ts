import AsyncStorage from '@react-native-async-storage/async-storage';

const GAMIFICATION_STORAGE_KEY = '@posefix_gamification_v1';

export interface SashRankInfo {
  title: string;
  shortName: string;
  sashColor: string;
  textColor: string;
  borderColor: string;
  minLevel: number;
}

export const SASH_RANKS: SashRankInfo[] = [
  {
    title: 'Lakan / Master',
    shortName: 'Black Sash',
    sashColor: '#1E293B',
    textColor: '#F8FAFC',
    borderColor: '#D4AF37', // Gold trim
    minLevel: 10,
  },
  {
    title: 'Senior Striker',
    shortName: 'Brown Sash',
    sashColor: '#78350F',
    textColor: '#FFFFFF',
    borderColor: '#92400E',
    minLevel: 7,
  },
  {
    title: 'Adept Striker',
    shortName: 'Blue Sash',
    sashColor: '#2563EB',
    textColor: '#FFFFFF',
    borderColor: '#1D4ED8',
    minLevel: 5,
  },
  {
    title: 'Intermediate',
    shortName: 'Green Sash',
    sashColor: '#15803D',
    textColor: '#FFFFFF',
    borderColor: '#166534',
    minLevel: 3,
  },
  {
    title: 'Apprentice',
    shortName: 'Yellow Sash',
    sashColor: '#F59E0B',
    textColor: '#78350F',
    borderColor: '#D97706',
    minLevel: 2,
  },
  {
    title: 'Novice Practitioner',
    shortName: 'White Sash',
    sashColor: '#FFFFFF',
    textColor: '#1E293B',
    borderColor: '#CBD5E1',
    minLevel: 1,
  },
];

export function getSashRankByLevel(level: number = 1): SashRankInfo {
  for (const rank of SASH_RANKS) {
    if (level >= rank.minLevel) {
      return rank;
    }
  }
  return SASH_RANKS[SASH_RANKS.length - 1];
}

export interface GamificationStats {
  streakDays: number;
  lastTrainedDate: string; // YYYY-MM-DD
  totalXp: number;
  level: number;
}

const DEFAULT_STATS: GamificationStats = {
  streakDays: 3,
  lastTrainedDate: new Date().toISOString().split('T')[0],
  totalXp: 120,
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

let activeGamificationUserId: string | null = null;

export function setActiveGamificationUserId(userId: string | null) {
  activeGamificationUserId = userId;
}

export function getGamificationStorageKey(userId?: string | null): string {
  const uid = userId !== undefined ? userId : activeGamificationUserId;
  return uid ? `@posefix_gamification_${uid}` : GAMIFICATION_STORAGE_KEY;
}

export async function getGamificationStats(userId?: string): Promise<GamificationStats> {
  try {
    const key = getGamificationStorageKey(userId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      await AsyncStorage.setItem(key, JSON.stringify(DEFAULT_STATS));
      return DEFAULT_STATS;
    }
    const parsed: GamificationStats = JSON.parse(raw);
    return parsed;
  } catch {
    return DEFAULT_STATS;
  }
}

export interface AddXpResult extends GamificationStats {
  isPromoted?: boolean;
  oldRank?: SashRankInfo;
  newRank?: SashRankInfo;
}

export async function addXpAndStreak(xpEarned: number = 10, userId?: string): Promise<AddXpResult> {
  try {
    const key = getGamificationStorageKey(userId);
    const stats = await getGamificationStats(userId);
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

    const oldRank = getSashRankByLevel(stats.level);
    const newRank = getSashRankByLevel(newLevel);
    const isPromoted = newRank.minLevel > oldRank.minLevel;

    const updated: AddXpResult = {
      ...stats,
      streakDays: Math.max(1, newStreak),
      lastTrainedDate: today,
      totalXp: newXp,
      level: newLevel,
      isPromoted,
      oldRank,
      newRank,
    };

    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_STATS;
  }
}

export async function clearGamificationStats(userId?: string): Promise<void> {
  try {
    const key = getGamificationStorageKey(userId);
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to clear gamification stats', e);
  }
}

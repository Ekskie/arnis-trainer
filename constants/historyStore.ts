import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionItem {
  id: string;
  strikeId: string;
  strikeName: string;
  description: string;
  score: number;
  grade: string;
  date: string;
  breakdown: {
    elbow: { score: number; actual: number; ideal: number };
    shoulder: { score: number; actual: number; ideal: number };
    wrist: { score: number; actual: number; ideal: number };
    knee?: { score: number; actual: number; ideal: number };
  };
}

const STORAGE_KEY = '@arnis_pose_sessions';

const MOCK_HISTORY: SessionItem[] = [
  {
    id: 'mock_1',
    strikeId: 'strike_1',
    strikeName: 'Strike 1',
    description: 'Left Temple',
    score: 93,
    grade: 'Grade A',
    date: 'Jul 5 · 17:30',
    breakdown: {
      elbow: { score: 92, actual: 161, ideal: 165 },
      shoulder: { score: 90, actual: 86, ideal: 90 },
      wrist: { score: 95, actual: -11, ideal: -10 },
      knee: { score: 98, actual: 149, ideal: 150 }
    }
  },
  {
    id: 'mock_2',
    strikeId: 'strike_1',
    strikeName: 'Strike 1',
    description: 'Left Temple',
    score: 96,
    grade: 'Grade A',
    date: 'Jul 5 · 18:05',
    breakdown: {
      elbow: { score: 96, actual: 164, ideal: 165 },
      shoulder: { score: 95, actual: 89, ideal: 90 },
      wrist: { score: 97, actual: -10, ideal: -10 },
      knee: { score: 100, actual: 150, ideal: 150 }
    }
  },
  {
    id: 'mock_3',
    strikeId: 'strike_1',
    strikeName: 'Strike 1',
    description: 'Left Temple',
    score: 90,
    grade: 'Grade A',
    date: 'Jul 6 · 10:15',
    breakdown: {
      elbow: { score: 88, actual: 160, ideal: 165 },
      shoulder: { score: 91, actual: 85, ideal: 90 },
      wrist: { score: 92, actual: -12, ideal: -10 },
      knee: { score: 90, actual: 145, ideal: 150 }
    }
  },
  {
    id: 'mock_4',
    strikeId: 'strike_1',
    strikeName: 'Strike 1',
    description: 'Left Temple',
    score: 89,
    grade: 'Grade B',
    date: 'Jul 6 · 17:55',
    breakdown: {
      elbow: { score: 87, actual: 159, ideal: 165 },
      shoulder: { score: 80, actual: 81, ideal: 90 },
      wrist: { score: 89, actual: -15, ideal: -10 },
      knee: { score: 100, actual: 150, ideal: 150 }
    }
  }
];

export async function getHistory(): Promise<SessionItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_HISTORY));
      return MOCK_HISTORY;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load history', e);
    return MOCK_HISTORY;
  }
}

export async function saveSession(
  strikeId: string,
  strikeName: string,
  description: string,
  score: number,
  breakdown: SessionItem['breakdown']
): Promise<SessionItem> {
  let grade = 'Grade F';
  if (score >= 95) grade = 'Grade A';
  else if (score >= 85) grade = 'Grade B';
  else if (score >= 75) grade = 'Grade C';
  else if (score >= 60) grade = 'Grade D';

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

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear history', e);
  }
}

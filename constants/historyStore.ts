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

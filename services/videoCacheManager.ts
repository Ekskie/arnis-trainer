import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const VIDEO_CACHE_STORAGE_KEY = '@arnis_recent_video_replays';
const MAX_CACHE_ENTRIES = 5;
const REPLAY_SUBDIR = 'arnis_replays/';

interface CachedVideoEntry {
  uri: string;
  timestamp: number;
}

/**
 * Ensures the dedicated replays directory exists in the device cache.
 */
async function getReplayDirectory(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const baseCache = FileSystem.cacheDirectory;
  if (!baseCache) return null;
  const targetDir = `${baseCache}${REPLAY_SUBDIR}`;
  try {
    const dirInfo = await FileSystem.getInfoAsync(targetDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }
    return targetDir;
  } catch (err) {
    console.warn('[videoCacheManager] Failed to ensure replay directory:', err);
    return null;
  }
}

/**
 * Registers a newly recorded session video URI, moves/copies it into the managed
 * replay cache, and enforces a rolling LRU policy (retaining the 3–5 most recent recordings).
 */
export async function registerSessionVideo(sourceUri: string): Promise<string> {
  if (!sourceUri) return sourceUri;

  let finalUri = sourceUri;

  // On native platforms, copy into dedicated replay cache directory
  if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
    try {
      const replayDir = await getReplayDirectory();
      if (replayDir) {
        const ext = sourceUri.endsWith('.webm') ? 'webm' : 'mp4';
        const targetPath = `${replayDir}replay_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        await FileSystem.copyAsync({
          from: sourceUri,
          to: targetPath,
        });
        finalUri = targetPath;
      }
    } catch (copyErr) {
      console.warn('[videoCacheManager] Failed to copy to replay cache, using source URI:', copyErr);
      finalUri = sourceUri;
    }
  }

  // Manage rolling LRU list in AsyncStorage
  try {
    const raw = await AsyncStorage.getItem(VIDEO_CACHE_STORAGE_KEY);
    const entries: CachedVideoEntry[] = raw ? JSON.parse(raw) : [];

    // Prepend new entry
    entries.unshift({
      uri: finalUri,
      timestamp: Date.now(),
    });

    // Prune entries beyond MAX_CACHE_ENTRIES
    if (entries.length > MAX_CACHE_ENTRIES) {
      const toRemove = entries.splice(MAX_CACHE_ENTRIES);
      for (const item of toRemove) {
        if (Platform.OS !== 'web' && item.uri) {
          try {
            await FileSystem.deleteAsync(item.uri, { idempotent: true });
          } catch (delErr) {
            console.warn('[videoCacheManager] Failed to prune old video:', delErr);
          }
        }
      }
    }

    await AsyncStorage.setItem(VIDEO_CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch (storageErr) {
    console.warn('[videoCacheManager] Failed to update video cache registry:', storageErr);
  }

  return finalUri;
}

/**
 * Retrieves the list of currently retained recent video replay URIs (ordered from newest to oldest).
 */
export async function getRecentSessionVideos(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(VIDEO_CACHE_STORAGE_KEY);
    if (!raw) return [];
    const entries: CachedVideoEntry[] = JSON.parse(raw);
    return entries.map((e) => e.uri);
  } catch (err) {
    console.warn('[videoCacheManager] Failed to get recent videos:', err);
    return [];
  }
}

/**
 * Scans the managed replay directory and removes any video files that are no longer
 * referenced by the recent video index.
 */
export async function cleanupOrphanedVideos(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const replayDir = await getReplayDirectory();
    if (!replayDir) return;

    const raw = await AsyncStorage.getItem(VIDEO_CACHE_STORAGE_KEY);
    const activeUris = new Set<string>();
    if (raw) {
      const entries: CachedVideoEntry[] = JSON.parse(raw);
      entries.forEach((e) => activeUris.add(e.uri));
    }

    const files = await FileSystem.readDirectoryAsync(replayDir);
    for (const fileName of files) {
      const filePath = `${replayDir}${fileName}`;
      if (!activeUris.has(filePath)) {
        try {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn('[videoCacheManager] Failed cleanup of orphaned videos:', err);
  }
}

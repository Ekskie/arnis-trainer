import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserStrikeMediaPayload {
  strikeId: string;
  timestamp: number;
  videoBase64?: string;
  snapshotBase64?: string;
  impactFrame?: number;
  impactTime?: number;
  score?: number;
}

export interface StoredUserStrikeMedia {
  userVideoUri?: string;
  userImpactSnapshotUri?: string;
  impactFrame: number;
  impactTime: number;
  confidence: number;
  persistedPath?: string;
}

/**
 * Service to manage persistent storage of user recordings and impact snapshots.
 * Organizes storage conceptually under:
 * userStrike/strike_{id}/{timestamp}/
 *   - user.mp4
 *   - impact.jpg
 *   - metadata.json
 */
export async function persistUserStrikeMedia(
  payload: UserStrikeMediaPayload
): Promise<StoredUserStrikeMedia> {
  const {
    strikeId,
    timestamp,
    videoBase64,
    snapshotBase64,
    impactFrame = 45,
    impactTime = 1.5,
  } = payload;

  const folderName = `userStrike/${strikeId}/${timestamp}`;

  // Try to use native file-system if available on device (iOS / Android)
  let FileSystemModule: any = null;
  try {
    if (Platform.OS !== 'web') {
      FileSystemModule = require('expo-file-system');
    }
  } catch {
    // expo-file-system not installed or not supported in this runtime
  }

  if (FileSystemModule && FileSystemModule.documentDirectory) {
    try {
      const baseDir = `${FileSystemModule.documentDirectory}${folderName}/`;
      await FileSystemModule.makeDirectoryAsync(baseDir, { intermediates: true });

      let savedVideoUri: string | undefined;
      let savedSnapshotUri: string | undefined;

      // Persist user recorded video
      if (videoBase64) {
        const videoExt = videoBase64.includes('mp4') ? 'mp4' : 'webm';
        const videoPath = `${baseDir}user.${videoExt}`;
        const rawVideoData = videoBase64.replace(/^data:video\/[a-zA-Z0-9.-]+;base64,/, '');
        await FileSystemModule.writeAsStringAsync(videoPath, rawVideoData, {
          encoding: FileSystemModule.EncodingType.Base64,
        });
        savedVideoUri = videoPath;
      }

      // Persist user impact snapshot
      if (snapshotBase64) {
        const snapshotPath = `${baseDir}impact.jpg`;
        const rawSnapData = snapshotBase64.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '');
        await FileSystemModule.writeAsStringAsync(snapshotPath, rawSnapData, {
          encoding: FileSystemModule.EncodingType.Base64,
        });
        savedSnapshotUri = snapshotPath;
      }

      // Persist metadata.json
      const metaPath = `${baseDir}metadata.json`;
      const metadata = {
        strikeId,
        timestamp,
        impactFrame,
        impactTime,
        score: payload.score ?? 0,
        videoUri: savedVideoUri,
        snapshotUri: savedSnapshotUri,
        createdAt: new Date(timestamp).toISOString(),
      };
      await FileSystemModule.writeAsStringAsync(metaPath, JSON.stringify(metadata, null, 2));

      return {
        userVideoUri: savedVideoUri || videoBase64,
        userImpactSnapshotUri: savedSnapshotUri || snapshotBase64,
        impactFrame,
        impactTime,
        confidence: 0.85,
        persistedPath: baseDir,
      };
    } catch (fsErr) {
      console.warn('Persistent file system save failed, using memory fallback:', fsErr);
    }
  }

  // Graceful fallback for Web or environments without native FileSystem
  return {
    userVideoUri: videoBase64,
    userImpactSnapshotUri: snapshotBase64,
    impactFrame,
    impactTime,
    confidence: 0.80,
    persistedPath: folderName,
  };
}

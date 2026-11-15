import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUBLIC_SAVE_DIR_STORAGE_KEY = '@arnis_public_save_directory_uri_v1';

let pendingDirPermissionPromise: Promise<string | null> | null = null;
let autoPromptAttemptedInSession = false;

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
  publicDirectoryUri?: string;
}

export interface SavePublicFileOptions {
  fileName: string;
  mimeType: string;
  content: string;
  encoding?: 'utf8' | 'base64';
  promptIfNeeded?: boolean;
}

function getFileSystemModule(): any {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-file-system/legacy');
  } catch {
    try {
      return require('expo-file-system');
    } catch {
      return null;
    }
  }
}

export function stripBase64DataUrlPrefix(value: string): string {
  return value.replace(/^data:[^,]*;base64,/, '');
}

/**
 * Returns the remembered Android StorageAccessFramework directory URI (if previously granted).
 */
export async function getSavedPublicDirectoryUri(): Promise<string | null> {
  try {
    const uri = await AsyncStorage.getItem(PUBLIC_SAVE_DIR_STORAGE_KEY);
    return uri && uri.trim().length > 0 ? uri : null;
  } catch {
    return null;
  }
}

/**
 * Requests user permission via Android's StorageAccessFramework to create files in a
 * user-visible device folder (e.g. Downloads or Documents) and remembers the grant.
 */
export async function requestPublicDirectoryPermission(
  forcePrompt = false
): Promise<string | null> {
  const FileSystemModule = getFileSystemModule();
  if (!FileSystemModule) return null;

  if (Platform.OS !== 'android') {
    return FileSystemModule.documentDirectory ?? null;
  }

  if (!forcePrompt) {
    const existing = await getSavedPublicDirectoryUri();
    if (existing) return existing;
  }

  const SAF = FileSystemModule.StorageAccessFramework;
  if (!SAF || typeof SAF.requestDirectoryPermissionsAsync !== 'function') {
    return null;
  }

  if (pendingDirPermissionPromise) {
    return pendingDirPermissionPromise;
  }

  pendingDirPermissionPromise = (async () => {
    try {
      const permissions = await SAF.requestDirectoryPermissionsAsync();
      if (permissions?.granted && permissions?.directoryUri) {
        await AsyncStorage.setItem(PUBLIC_SAVE_DIR_STORAGE_KEY, permissions.directoryUri);
        return permissions.directoryUri as string;
      }
      return null;
    } catch (err) {
      console.warn('[mediaStorageService] Directory permission request failed:', err);
      return null;
    } finally {
      pendingDirPermissionPromise = null;
    }
  })();

  return pendingDirPermissionPromise;
}

async function writeSafFile(
  FileSystemModule: any,
  dirUri: string,
  baseName: string,
  mimeType: string,
  cleanContent: string,
  encoding: 'utf8' | 'base64'
): Promise<string> {
  const SAF = FileSystemModule.StorageAccessFramework;
  const createdUri: string = await SAF.createFileAsync(dirUri, baseName, mimeType);
  const fsEncoding =
    encoding === 'base64'
      ? FileSystemModule.EncodingType?.Base64 ?? 'base64'
      : FileSystemModule.EncodingType?.UTF8 ?? 'utf8';
  await FileSystemModule.writeAsStringAsync(createdUri, cleanContent, { encoding: fsEncoding });
  return createdUri;
}

/**
 * Creates and writes a file in the user's granted device folder (Downloads/Documents via SAF on Android).
 * Strips file extensions before calling SAF.createFileAsync so Android does not duplicate extensions.
 */
export async function saveFileToPublicFolder(
  options: SavePublicFileOptions
): Promise<string | null> {
  const FileSystemModule = getFileSystemModule();
  if (!FileSystemModule) return null;

  const encoding = options.encoding ?? 'utf8';
  const cleanContent =
    encoding === 'base64' ? stripBase64DataUrlPrefix(options.content) : options.content;

  if (Platform.OS !== 'android') {
    if (!FileSystemModule.documentDirectory) return null;
    const safeName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetUri = `${FileSystemModule.documentDirectory}${safeName}`;
    const fsEncoding =
      encoding === 'base64'
        ? FileSystemModule.EncodingType?.Base64 ?? 'base64'
        : FileSystemModule.EncodingType?.UTF8 ?? 'utf8';
    await FileSystemModule.writeAsStringAsync(targetUri, cleanContent, { encoding: fsEncoding });
    return targetUri;
  }

  const SAF = FileSystemModule.StorageAccessFramework;
  if (!SAF || typeof SAF.createFileAsync !== 'function') {
    return null;
  }

  const baseName = options.fileName
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  let dirUri = await getSavedPublicDirectoryUri();
  if (!dirUri && options.promptIfNeeded) {
    dirUri = await requestPublicDirectoryPermission(false);
  }
  if (!dirUri) return null;

  try {
    return await writeSafFile(
      FileSystemModule,
      dirUri,
      baseName,
      options.mimeType,
      cleanContent,
      encoding
    );
  } catch (err) {
    console.warn('[mediaStorageService] Public folder write failed, clearing stale folder grant:', err);
    await AsyncStorage.removeItem(PUBLIC_SAVE_DIR_STORAGE_KEY).catch(() => {});
    if (options.promptIfNeeded) {
      const refreshedDirUri = await requestPublicDirectoryPermission(true);
      if (refreshedDirUri) {
        try {
          return await writeSafFile(
            FileSystemModule,
            refreshedDirUri,
            baseName,
            options.mimeType,
            cleanContent,
            encoding
          );
        } catch (retryErr) {
          console.warn('[mediaStorageService] Retry public folder write failed:', retryErr);
        }
      }
    }
    return null;
  }
}

/**
 * Service to manage persistent storage of user recordings and impact snapshots.
 * Organizes internal storage under userStrike/{strikeId}/{timestamp}/ and mirrors files
 * into the user's granted device folder when permitted via StorageAccessFramework.
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
  const FileSystemModule = getFileSystemModule();
  const metadata = {
    strikeId,
    timestamp,
    impactFrame,
    impactTime,
    score: payload.score ?? 0,
    createdAt: new Date(timestamp).toISOString(),
  };

  let savedVideoUri: string | undefined;
  let savedSnapshotUri: string | undefined;
  let persistedPath = folderName;

  if (FileSystemModule && FileSystemModule.documentDirectory) {
    try {
      const baseDir = `${FileSystemModule.documentDirectory}${folderName}/`;
      await FileSystemModule.makeDirectoryAsync(baseDir, { intermediates: true });
      persistedPath = baseDir;

      // Persist user recorded video
      if (videoBase64) {
        const videoExt = videoBase64.includes('mp4') ? 'mp4' : 'webm';
        const videoPath = `${baseDir}user.${videoExt}`;
        const rawVideoData = stripBase64DataUrlPrefix(videoBase64);
        await FileSystemModule.writeAsStringAsync(videoPath, rawVideoData, {
          encoding: FileSystemModule.EncodingType.Base64,
        });
        savedVideoUri = videoPath;
      }

      // Persist user impact snapshot
      if (snapshotBase64) {
        const snapshotPath = `${baseDir}impact.jpg`;
        const rawSnapData = stripBase64DataUrlPrefix(snapshotBase64);
        await FileSystemModule.writeAsStringAsync(snapshotPath, rawSnapData, {
          encoding: FileSystemModule.EncodingType.Base64,
        });
        savedSnapshotUri = snapshotPath;
      }

      // Persist metadata.json
      const metaPath = `${baseDir}metadata.json`;
      await FileSystemModule.writeAsStringAsync(
        metaPath,
        JSON.stringify(
          {
            ...metadata,
            videoUri: savedVideoUri,
            snapshotUri: savedSnapshotUri,
          },
          null,
          2
        )
      );
    } catch (fsErr) {
      console.warn('Persistent internal file system save failed:', fsErr);
    }
  }

  // Mirror files to the user-accessible phone folder (prompt once per app session if not yet configured)
  let publicDirUri: string | null = await getSavedPublicDirectoryUri();
  if (!publicDirUri && !autoPromptAttemptedInSession && (videoBase64 || snapshotBase64)) {
    autoPromptAttemptedInSession = true;
    publicDirUri = await requestPublicDirectoryPermission(false).catch(() => null);
  }

  if (publicDirUri) {
    const safeStrikeId = strikeId.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (snapshotBase64) {
      await saveFileToPublicFolder({
        fileName: `arnis_${safeStrikeId}_${timestamp}_impact.jpg`,
        mimeType: 'image/jpeg',
        content: snapshotBase64,
        encoding: 'base64',
        promptIfNeeded: false,
      }).catch(() => null);
    }
    if (videoBase64) {
      const videoExt = videoBase64.includes('mp4') ? 'mp4' : 'webm';
      await saveFileToPublicFolder({
        fileName: `arnis_${safeStrikeId}_${timestamp}_replay.${videoExt}`,
        mimeType: videoExt === 'mp4' ? 'video/mp4' : 'video/webm',
        content: videoBase64,
        encoding: 'base64',
        promptIfNeeded: false,
      }).catch(() => null);
    }
    await saveFileToPublicFolder({
      fileName: `arnis_${safeStrikeId}_${timestamp}_metadata.json`,
      mimeType: 'application/json',
      content: JSON.stringify(metadata, null, 2),
      encoding: 'utf8',
      promptIfNeeded: false,
    }).catch(() => null);
  }

  return {
    userVideoUri: savedVideoUri || videoBase64,
    userImpactSnapshotUri: savedSnapshotUri || snapshotBase64,
    impactFrame,
    impactTime,
    confidence: savedVideoUri || savedSnapshotUri ? 0.85 : 0.8,
    persistedPath,
    publicDirectoryUri: publicDirUri ?? undefined,
  };
}

/**
 * Permanently deletes all local recorded strike videos and snapshots stored on disk.
 * Invoked on history reset or account deletion to recover storage and protect privacy.
 */
export async function clearAllUserStrikeMedia(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const FileSystemModule = getFileSystemModule();
    if (FileSystemModule?.documentDirectory) {
      const strikeDir = `${FileSystemModule.documentDirectory}userStrike/`;
      const info = await FileSystemModule.getInfoAsync(strikeDir);
      if (info.exists) {
        await FileSystemModule.deleteAsync(strikeDir, { idempotent: true });
      }
    }
  } catch (err) {
    console.warn('[mediaStorageService] Failed to clear user strike media:', err);
  }
}

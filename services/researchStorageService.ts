import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Share } from 'react-native';
import {
  CoordinateConvention,
  MovementSegmentationMode,
  ResearchCaptureSession,
} from '@/engine/reference/referenceTypes';
import {
  parseAndRegisterExpertReferenceJson,
  ReferenceValidationResult,
} from '@/engine/reference/referenceLoader';
import { EXPERIMENTAL_DTW_MAX_OFFSET_AT_50 } from '@/engine/reference/trajectoryMatcher';
import { saveFileToPublicFolder } from '@/services/mediaStorageService';

const RESEARCH_CONFIG_STORAGE_KEY = '@arnis_research_mode_config';
const RESEARCH_CAPTURES_SUBDIR = 'research/captures/';
const RESEARCH_REFERENCES_SUBDIR = 'research/references/';

export interface ResearchModeConfig {
  enabled: boolean;
  consentGranted: boolean;
  consentedAt: string | null;
  poseCoordinateConvention: CoordinateConvention;
  segmentationMode: MovementSegmentationMode;
  explicitStartFrame: number | null;
  explicitEndFrame: number | null;
  dtwMaxOffset: number;
}

export const DEFAULT_RESEARCH_MODE_CONFIG: ResearchModeConfig = {
  enabled: false,
  consentGranted: false,
  consentedAt: null,
  poseCoordinateConvention: 'unmirrored_image_2d',
  segmentationMode: 'full_captured',
  explicitStartFrame: null,
  explicitEndFrame: null,
  dtwMaxOffset: EXPERIMENTAL_DTW_MAX_OFFSET_AT_50,
};

export interface SavedResearchFileInfo {
  fileUri: string;
  fileName: string;
  byteSize: number;
  publicFileUri?: string;
}

export function buildResearchCaptureFileName(session: ResearchCaptureSession): string {
  const safeTimestamp = session.createdAt.replace(/[:.]/g, '-');
  return `research_capture_${session.selectedStrikeId}_${safeTimestamp}.json`;
}

function getBaseResearchDir(subdir: string): string | null {
  if (Platform.OS === 'web') return null;
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return null;
  return `${docDir}${subdir}`;
}

export function getLocalResearchDirectories(): {
  capturesDir: string | null;
  referencesDir: string | null;
} {
  return {
    capturesDir: getBaseResearchDir(RESEARCH_CAPTURES_SUBDIR),
    referencesDir: getBaseResearchDir(RESEARCH_REFERENCES_SUBDIR),
  };
}

export async function getResearchModeConfig(): Promise<ResearchModeConfig> {
  try {
    const raw = await AsyncStorage.getItem(RESEARCH_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RESEARCH_MODE_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_RESEARCH_MODE_CONFIG,
      ...parsed,
      enabled: Boolean(parsed?.enabled),
      consentGranted: Boolean(parsed?.consentGranted),
      consentedAt: typeof parsed?.consentedAt === 'string' ? parsed.consentedAt : null,
      poseCoordinateConvention:
        parsed?.poseCoordinateConvention === 'anatomical_mirrored_2d'
          ? 'anatomical_mirrored_2d'
          : 'unmirrored_image_2d',
      segmentationMode:
        parsed?.segmentationMode === 'explicit_frame_range' ||
        parsed?.segmentationMode === 'explicit_time_range' ||
        parsed?.segmentationMode === 'speed_threshold_experimental'
          ? parsed.segmentationMode
          : 'full_captured',
      explicitStartFrame:
        typeof parsed?.explicitStartFrame === 'number' ? parsed.explicitStartFrame : null,
      explicitEndFrame:
        typeof parsed?.explicitEndFrame === 'number' ? parsed.explicitEndFrame : null,
      dtwMaxOffset:
        typeof parsed?.dtwMaxOffset === 'number' && parsed.dtwMaxOffset >= 0
          ? parsed.dtwMaxOffset
          : EXPERIMENTAL_DTW_MAX_OFFSET_AT_50,
    };
  } catch {
    return { ...DEFAULT_RESEARCH_MODE_CONFIG };
  }
}

export async function saveResearchModeConfig(
  config: ResearchModeConfig
): Promise<ResearchModeConfig> {
  const sanitized: ResearchModeConfig = {
    ...DEFAULT_RESEARCH_MODE_CONFIG,
    ...config,
    consentedAt: config.consentGranted ? config.consentedAt ?? new Date().toISOString() : null,
  };
  await AsyncStorage.setItem(RESEARCH_CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}

/**
 * Saves a consented research capture JSON locally inside the app's documentDirectory
 * and mirrors it to the user's granted device folder (e.g. Downloads/Documents on Android).
 * Never uploads recordings to any remote server.
 */
export async function saveResearchCaptureLocally(
  session: ResearchCaptureSession
): Promise<SavedResearchFileInfo> {
  if (!session.consentGranted) {
    throw new Error('Cannot save research capture without explicit user consent.');
  }

  const capturesDir = getBaseResearchDir(RESEARCH_CAPTURES_SUBDIR);
  const fileName = buildResearchCaptureFileName(session);
  const jsonBody = JSON.stringify(session, null, 2);

  if (!capturesDir) {
    throw new Error('Local file storage is unavailable on this platform.');
  }

  await FileSystem.makeDirectoryAsync(capturesDir, { intermediates: true });
  const fileUri = `${capturesDir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, jsonBody, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const publicFileUri = await saveFileToPublicFolder({
    fileName,
    mimeType: 'application/json',
    content: jsonBody,
    encoding: 'utf8',
    promptIfNeeded: true,
  }).catch(() => null);

  return {
    fileUri,
    fileName,
    byteSize: jsonBody.length,
    publicFileUri: publicFileUri ?? undefined,
  };
}

/**
 * Exports a local research capture JSON file directly to the user's granted device folder
 * on Android (via StorageAccessFramework) or the OS Share sheet on iOS.
 */
export async function exportResearchCaptureWithShareSheet(
  session: ResearchCaptureSession,
  existingFileUri?: string | null
): Promise<SavedResearchFileInfo | null> {
  if (!session.consentGranted) {
    throw new Error('Cannot export research capture without explicit user consent.');
  }

  const fileName = buildResearchCaptureFileName(session);
  const jsonBody = JSON.stringify(session, null, 2);

  let saved: SavedResearchFileInfo | null = null;
  if (existingFileUri) {
    saved = {
      fileUri: existingFileUri,
      fileName: existingFileUri.split('/').pop() || fileName,
      byteSize: jsonBody.length,
    };
  } else {
    try {
      saved = await saveResearchCaptureLocally(session);
    } catch {
      saved = null;
    }
  }

  if (Platform.OS === 'android') {
    const publicFileUri =
      saved?.publicFileUri ||
      (await saveFileToPublicFolder({
        fileName,
        mimeType: 'application/json',
        content: jsonBody,
        encoding: 'utf8',
        promptIfNeeded: true,
      }).catch(() => null));

    if (publicFileUri) {
      return {
        fileUri: saved?.fileUri ?? publicFileUri,
        fileName,
        byteSize: jsonBody.length,
        publicFileUri,
      };
    }
  }

  const sharePayload = saved?.fileUri
    ? {
        title: `Arnis Research Capture (${session.selectedStrikeId})`,
        url: saved.fileUri,
        message:
          Platform.OS === 'android'
            ? jsonBody
            : `Arnis research capture ${saved.fileName} (${session.rawPoseFrames2D.length} frames)`,
      }
    : {
        title: `Arnis Research Capture (${session.selectedStrikeId})`,
        message: jsonBody,
      };

  await Share.share(sharePayload);
  return saved;
}

export async function listSavedResearchCaptures(): Promise<string[]> {
  const capturesDir = getBaseResearchDir(RESEARCH_CAPTURES_SUBDIR);
  if (!capturesDir) return [];
  try {
    const info = await FileSystem.getInfoAsync(capturesDir);
    if (!info.exists) return [];
    const files = await FileSystem.readDirectoryAsync(capturesDir);
    return files
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .map((f) => `${capturesDir}${f}`);
  } catch {
    return [];
  }
}

/**
 * Validates and loads an exported AlphaPose expert reference JSON string into memory,
 * and optionally caches a local copy under `research/references/<strikeId>.json`.
 */
export async function loadAndRegisterReferenceJsonText(
  jsonText: string,
  persistLocally = true
): Promise<{
  validation: ReferenceValidationResult;
  savedUri?: string;
}> {
  const validation = parseAndRegisterExpertReferenceJson(jsonText);
  if (!validation.valid || !validation.value) {
    return { validation };
  }

  if (!persistLocally) {
    return { validation };
  }

  const refsDir = getBaseResearchDir(RESEARCH_REFERENCES_SUBDIR);
  if (!refsDir) {
    return { validation };
  }

  await FileSystem.makeDirectoryAsync(refsDir, { intermediates: true });
  const targetUri = `${refsDir}${validation.value.strikeId}.json`;
  const formattedJson = JSON.stringify(validation.value, null, 2);
  await FileSystem.writeAsStringAsync(targetUri, formattedJson, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await saveFileToPublicFolder({
    fileName: `arnis_ref_${validation.value.strikeId}.json`,
    mimeType: 'application/json',
    content: formattedJson,
    encoding: 'utf8',
    promptIfNeeded: false,
  }).catch(() => null);

  return { validation, savedUri: targetUri };
}

/**
 * Loads a JSON reference from either an absolute `file://` URI or a filename in
 * `${documentDirectory}research/references/`.
 */
export async function loadReferenceFromLocalFile(
  uriOrFileName: string,
  persistCopy = true
): Promise<{
  validation: ReferenceValidationResult;
  savedUri?: string;
}> {
  const trimmed = uriOrFileName.trim();
  if (!trimmed) {
    return {
      validation: { valid: false, errors: ['Provide a local JSON filename or file:// URI.'] },
    };
  }

  const refsDir = getBaseResearchDir(RESEARCH_REFERENCES_SUBDIR);
  const resolvedUri =
    trimmed.startsWith('file://') || trimmed.startsWith('content://') || trimmed.startsWith('/')
      ? trimmed
      : refsDir
        ? `${refsDir}${trimmed}`
        : trimmed;

  try {
    const text = await FileSystem.readAsStringAsync(resolvedUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return loadAndRegisterReferenceJsonText(text, persistCopy);
  } catch (err) {
    return {
      validation: {
        valid: false,
        errors: [
          `Could not read "${resolvedUri}": ${err instanceof Error ? err.message : String(err)}`,
        ],
      },
    };
  }
}

/**
 * Restores any previously imported local test reference JSON files from `research/references/`.
 */
export async function restoreSavedLocalReferences(): Promise<string[]> {
  const refsDir = getBaseResearchDir(RESEARCH_REFERENCES_SUBDIR);
  if (!refsDir) return [];
  try {
    const info = await FileSystem.getInfoAsync(refsDir);
    if (!info.exists) return [];
    const files = await FileSystem.readDirectoryAsync(refsDir);
    const loadedIds: string[] = [];
    for (const fileName of files) {
      if (!fileName.endsWith('.json')) continue;
      const content = await FileSystem.readAsStringAsync(`${refsDir}${fileName}`, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const res = parseAndRegisterExpertReferenceJson(content);
      if (res.valid && res.value) {
        loadedIds.push(res.value.strikeId);
      }
    }
    return loadedIds;
  } catch {
    return [];
  }
}

import * as FileSystem from 'expo-file-system/legacy';
import { isSupabaseConfigured, supabase, UserProfile } from './supabase';
import { isUUID } from './messageService';
import { SessionItem } from '@/constants/historyStore';

export interface CloudPracticeSession {
  id: string;
  user_id: string;
  strike_id: string;
  strike_name: string;
  score: number;
  grade: string;
  date: string;
  breakdown: any;
  snapshot_url?: string | null;
  video_url?: string | null;
  is_shared_with_coach: boolean;
  created_at?: string;
}

export interface CloudCurriculumItem {
  id?: string;
  user_id: string;
  lesson_id: string;
  status: string;
  score: number;
  quiz_passed: boolean;
  completed_at?: string;
  updated_at?: string;
}

/**
 * Convert base64 string to Uint8Array safely in React Native
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Strip data URL prefixes if present
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bufferLength = cleanBase64.length * 0.75;
  const len = cleanBase64.length;

  if (cleanBase64[len - 1] === '=') {
    bufferLength--;
    if (cleanBase64[len - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = chars.indexOf(cleanBase64[i]);
    const encoded2 = chars.indexOf(cleanBase64[i + 1]);
    const encoded3 = chars.indexOf(cleanBase64[i + 2]);
    const encoded4 = chars.indexOf(cleanBase64[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64 && encoded3 !== -1) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== 64 && encoded4 !== -1) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }

  return bytes;
}

/**
 * Extract the storage object key from a Supabase Storage URL (public/sign) or raw path.
 */
function extractStoragePath(bucket: string, storedValue: string): string | null {
  if (!storedValue) return null;
  if (storedValue.startsWith('data:')) return null;

  const marker = `/storage/v1/object/`;
  const idx = storedValue.indexOf(marker);
  if (idx !== -1) {
    const rest = storedValue.slice(idx + marker.length).split('?')[0];
    // rest is e.g. "public/snapshots/uid/file.jpg" or "sign/snapshots/uid/file.jpg" or "snapshots/uid/file.jpg"
    const segments = rest.split('/');
    const bucketIdx = segments.indexOf(bucket);
    if (bucketIdx !== -1 && bucketIdx + 1 < segments.length) {
      return decodeURIComponent(segments.slice(bucketIdx + 1).join('/'));
    }
  }

  if (!storedValue.startsWith('http://') && !storedValue.startsWith('https://')) {
    return storedValue.replace(/^\/+/, '');
  }
  return null;
}

/**
 * Resolve a private bucket URL or object path into a fresh signed URL for authenticated viewing.
 */
async function resolvePrivateStorageUrl(
  bucket: 'snapshots' | 'practice-videos',
  storedValue?: string | null
): Promise<string | null> {
  if (!storedValue) return null;
  const path = extractStoragePath(bucket, storedValue);
  if (!path) return storedValue;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (e) {
    console.warn(`[CloudSync] Could not sign URL in ${bucket}:`, e);
  }
  return storedValue;
}

/**
 * Upload video safely to Supabase Storage with memory-safe binary/blob streaming
 * and 365-day signed URL generation for coach reviews.
 */
async function uploadVideoToStorage(
  userId: string,
  sessionId: string,
  videoSource: string
): Promise<string | null> {
  const isWebm = videoSource.startsWith('data:video/webm') || /\.webm(\?|$)/i.test(videoSource);
  const ext = isWebm ? 'webm' : 'mp4';
  const contentType = isWebm ? 'video/webm' : 'video/mp4';
  const videoPath = `${userId}/${sessionId}_video.${ext}`;
  try {
    let uploadSuccess = false;

    // Strategy A: Native fetch -> blob (zero base64 allocation, streamable, fast)
    if (
      videoSource.startsWith('file://') ||
      videoSource.startsWith('content://') ||
      videoSource.startsWith('ph://') ||
      videoSource.startsWith('/')
    ) {
      try {
        const response = await fetch(videoSource);
        const blob = await response.blob();
        const { error: blobErr } = await supabase.storage
          .from('practice-videos')
          .upload(videoPath, blob, {
            contentType,
            upsert: true,
          });

        if (!blobErr) {
          uploadSuccess = true;
        } else {
          console.warn('[CloudSync] Blob upload error, attempting fallback:', blobErr);
        }
      } catch (blobFetchErr) {
        console.warn('[CloudSync] Fetch to blob failed, trying base64 fallback:', blobFetchErr);
      }
    }

    // Strategy B: Fallback to base64 read if Strategy A did not succeed
    if (!uploadSuccess) {
      let videoBytes: Uint8Array | null = null;
      if (videoSource.startsWith('data:video')) {
        videoBytes = base64ToUint8Array(videoSource);
      } else {
        const base64Video = await FileSystem.readAsStringAsync(videoSource, {
          encoding: 'base64',
        });
        videoBytes = base64ToUint8Array(base64Video);
      }

      if (videoBytes) {
        const { error: uploadErr } = await supabase.storage
          .from('practice-videos')
          .upload(videoPath, videoBytes, {
            contentType,
            upsert: true,
          });
        if (!uploadErr) {
          uploadSuccess = true;
        } else {
          console.error('[CloudSync] Fallback upload failed:', uploadErr);
        }
      }
    }

    if (uploadSuccess) {
      // Store canonical storage path (resolved via signed URL when viewed)
      return videoPath;
    }
    return null;
  } catch (err) {
    console.warn('[CloudSync] Failed to upload video to storage:', err);
    return null;
  }
}

export const CloudSyncService = {
  /**
   * Sync a practice session to Supabase.
   * Uploads impact snapshot automatically.
   * Uploads video ONLY if shareVideoWithCoach is true!
   */
  async syncPracticeSession(
    userId: string,
    session: SessionItem,
    shareVideoWithCoach: boolean
  ): Promise<{ error: Error | null; videoUrl?: string }> {
    if (!isSupabaseConfigured) {
      return { error: null };
    }

    try {
      let snapshotUrl: string | null = null;
      let videoUrl: string | null = null;

      // 1. Upload Impact Snapshot (if present via base64 or stored file URI)
      const snapshotSource = session.snapshotBase64 || session.userImpactSnapshotUri;
      if (snapshotSource) {
        try {
          let snapshotBytes: Uint8Array | null = null;
          if (session.snapshotBase64) {
            snapshotBytes = base64ToUint8Array(session.snapshotBase64);
          } else if (session.userImpactSnapshotUri) {
            if (session.userImpactSnapshotUri.startsWith('data:image')) {
              snapshotBytes = base64ToUint8Array(session.userImpactSnapshotUri);
            } else {
              const base64Data = await FileSystem.readAsStringAsync(session.userImpactSnapshotUri, {
                encoding: 'base64',
              });
              snapshotBytes = base64ToUint8Array(base64Data);
            }
          }

          if (snapshotBytes) {
            const snapshotPath = `${userId}/${session.id}_snapshot.jpg`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('snapshots')
              .upload(snapshotPath, snapshotBytes, {
                contentType: 'image/jpeg',
                upsert: true,
              });

            if (!uploadErr && uploadData) {
              // Store object path; coach and student views resolve short-lived signed URLs from private bucket
              snapshotUrl = snapshotPath;
            } else if (uploadErr) {
              console.warn('[CloudSync] Snapshot upload failed:', uploadErr.message);
            }
          }
        } catch (e) {
          console.warn('[CloudSync] Snapshot upload error:', e);
        }
      }

      // 2. Upload Video ONLY if student granted explicit permission
      if (shareVideoWithCoach) {
        const videoSource = session.userVideoUri || session.replayVideoBase64;
        if (videoSource) {
          videoUrl = await uploadVideoToStorage(userId, session.id, videoSource);
        }
      }

      // 3. Upsert record in practice_sessions table
      const payload: CloudPracticeSession = {
        id: session.id,
        user_id: userId,
        strike_id: session.strikeId,
        strike_name: session.strikeName,
        score: session.score,
        grade: session.grade,
        date: session.date,
        breakdown: session.breakdown,
        snapshot_url: snapshotUrl,
        video_url: videoUrl,
        is_shared_with_coach: shareVideoWithCoach,
      };

      const { error: dbError } = await supabase
        .from('practice_sessions')
        .upsert(payload);

      if (dbError) {
        console.error('[CloudSync] DB error writing session:', dbError);
        return { error: new Error(dbError.message) };
      }

      return { error: null, videoUrl: videoUrl || undefined };
    } catch (err: any) {
      console.error('[CloudSync] Fatal session sync error:', err);
      return { error: err };
    }
  },

  /**
   * Update the coach sharing status for a single practice session in Supabase.
   * If toggled ON and video hasn't been uploaded yet, uploads the local video first.
   */
  async updateSessionSharing(
    userId: string,
    sessionId: string,
    isShared: boolean,
    session?: SessionItem
  ): Promise<{ error: Error | null; videoUrl?: string }> {
    if (!isSupabaseConfigured) {
      return { error: null };
    }

    try {
      let videoUrl: string | undefined = undefined;

      // If turning ON and session is provided, verify whether video needs uploading
      if (isShared && session) {
        const { data: existing } = await supabase
          .from('practice_sessions')
          .select('id, video_url')
          .eq('id', sessionId)
          .single();

        if (existing?.video_url) {
          videoUrl = existing.video_url;
        } else {
          const videoSource = session.userVideoUri || session.replayVideoBase64;
          if (videoSource) {
            videoUrl = await uploadVideoToStorage(userId, sessionId, videoSource) || undefined;
          }
        }
      }

      // Update the DB row
      const updatePayload: Record<string, any> = {
        is_shared_with_coach: isShared,
      };
      if (videoUrl) {
        updatePayload.video_url = videoUrl;
      }

      const { error: updateErr } = await supabase
        .from('practice_sessions')
        .update(updatePayload)
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (updateErr) {
        // If session was never synced to cloud, perform a full sync
        if (session) {
          return await this.syncPracticeSession(userId, session, isShared);
        }
        return { error: new Error(updateErr.message) };
      }

      return { error: null, videoUrl };
    } catch (err: any) {
      console.error('[CloudSync] Error updating session sharing:', err);
      return { error: err };
    }
  },

  /**
   * Bulk update all practice sessions sharing status for a student in Supabase.
   */
  async bulkUpdateSharing(
    userId: string,
    isShared: boolean
  ): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('practice_sessions')
        .update({ is_shared_with_coach: isShared })
        .eq('user_id', userId);

      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: any) {
      console.error('[CloudSync] Error during bulk sharing update:', err);
      return { error: err };
    }
  },

  /**
   * Sync a completed curriculum lesson to Supabase
   */
  async syncCurriculumProgress(
    userId: string,
    lessonId: string,
    status: string,
    score: number = 0,
    quizPassed: boolean = false
  ): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured || !isUUID(userId)) {
      return { error: null };
    }

    try {
      const { error } = await supabase.from('curriculum_progress').upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          status,
          score,
          quiz_passed: quizPassed,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' }
      );
      if (error) {
        console.warn('[CloudSync] Failed to sync curriculum progress:', error.message);
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (e: any) {
      console.warn('[CloudSync] Failed to sync curriculum progress:', e);
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  /**
   * Fetch all practice sessions and journey progress for a student (used by coaches)
   */
  async fetchStudentDataForCoach(studentId: string): Promise<{
    profile: UserProfile | null;
    sessions: CloudPracticeSession[];
    curriculum: CloudCurriculumItem[];
    error?: string | null;
  }> {
    if (!isSupabaseConfigured || !isUUID(studentId)) {
      return {
        profile: null,
        sessions: [],
        curriculum: [],
        error: 'Invalid or unconfigured student record.',
      };
    }

    try {
      const [profileRes, sessionsRes, curriculumRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', studentId).maybeSingle(),
        supabase
          .from('practice_sessions')
          .select('*')
          .eq('user_id', studentId)
          .order('created_at', { ascending: false }),
        supabase.from('curriculum_progress').select('*').eq('user_id', studentId),
      ]);

      const firstError =
        profileRes.error?.message ||
        sessionsRes.error?.message ||
        curriculumRes.error?.message ||
        null;

      const rawSessions = (sessionsRes.data || []) as CloudPracticeSession[];
      const resolvedSessions = await Promise.all(
        rawSessions.map(async (s) => ({
          ...s,
          snapshot_url: await resolvePrivateStorageUrl('snapshots', s.snapshot_url),
          video_url: s.is_shared_with_coach
            ? await resolvePrivateStorageUrl('practice-videos', s.video_url)
            : null,
        }))
      );

      return {
        profile: (profileRes.data as UserProfile) || null,
        sessions: resolvedSessions,
        curriculum: (curriculumRes.data || []) as CloudCurriculumItem[],
        error: firstError,
      };
    } catch (e: any) {
      console.error('[CloudSync] Error fetching student data for coach:', e);
      return {
        profile: null,
        sessions: [],
        curriculum: [],
        error: e?.message || 'Unable to fetch student data.',
      };
    }
  },
};

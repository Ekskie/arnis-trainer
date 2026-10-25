import * as FileSystem from 'expo-file-system';
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

      // 1. Upload Impact Snapshot (if present)
      if (session.snapshotBase64) {
        try {
          const snapshotBytes = base64ToUint8Array(session.snapshotBase64);
          const snapshotPath = `${userId}/${session.id}_snapshot.jpg`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('snapshots')
            .upload(snapshotPath, snapshotBytes, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (!uploadErr && uploadData) {
            const { data: publicData } = supabase.storage
              .from('snapshots')
              .getPublicUrl(snapshotPath);
            snapshotUrl = publicData.publicUrl;
          }
        } catch (e) {
          console.warn('[CloudSync] Snapshot upload error:', e);
        }
      }

      // 2. Upload Video ONLY if student granted explicit permission
      if (shareVideoWithCoach) {
        const videoSource = session.userVideoUri || session.replayVideoBase64;
        if (videoSource) {
          try {
            let videoBytes: Uint8Array | null = null;
            if (videoSource.startsWith('file://') || videoSource.startsWith('/')) {
              const base64Video = await FileSystem.readAsStringAsync(videoSource, {
                encoding: 'base64',
              });
              videoBytes = base64ToUint8Array(base64Video);
            } else if (session.replayVideoBase64) {
              videoBytes = base64ToUint8Array(session.replayVideoBase64);
            }

            if (videoBytes) {
              const videoPath = `${userId}/${session.id}_video.mp4`;
              const { error: videoUploadErr } = await supabase.storage
                .from('practice-videos')
                .upload(videoPath, videoBytes, {
                  contentType: 'video/mp4',
                  upsert: true,
                });

              if (!videoUploadErr) {
                // Get signed URL for authenticated coach access
                const { data: signedData } = await supabase.storage
                  .from('practice-videos')
                  .createSignedUrl(videoPath, 60 * 60 * 24 * 7); // 7-day signed URL

                videoUrl = signedData?.signedUrl || videoPath;
              }
            }
          } catch (e) {
            console.warn('[CloudSync] Video upload error:', e);
          }
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
   * Sync a completed curriculum lesson to Supabase
   */
  async syncCurriculumProgress(
    userId: string,
    lessonId: string,
    status: string,
    score: number = 0,
    quizPassed: boolean = false
  ): Promise<void> {
    if (!isSupabaseConfigured) return;

    try {
      await supabase.from('curriculum_progress').upsert(
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
    } catch (e) {
      console.warn('[CloudSync] Failed to sync curriculum progress:', e);
    }
  },

  /**
   * Fetch all practice sessions and journey progress for a student (used by coaches)
   */
  async fetchStudentDataForCoach(studentId: string): Promise<{
    profile: UserProfile | null;
    sessions: CloudPracticeSession[];
    curriculum: CloudCurriculumItem[];
  }> {
    if (!isSupabaseConfigured || !isUUID(studentId)) {
      return {
        profile: {
          id: studentId,
          role: 'student',
          display_name: 'Demo Student (Offline)',
          email: 'student@arnis.local',
          rank_sash: 'Green Sash',
          bio: 'Training in Laguna Arnis branch',
        },
        sessions: [
          {
            id: 'mock_s1',
            user_id: studentId,
            strike_id: 'strike_1',
            strike_name: 'Left Temple Strike',
            score: 88,
            grade: 'A',
            date: new Date().toLocaleDateString(),
            breakdown: {
              elbow: { score: 90, actual: 45, ideal: 45 },
              shoulder: { score: 85, actual: 60, ideal: 55 },
              wrist: { score: 92, actual: 30, ideal: 30 },
            },
            is_shared_with_coach: true,
          },
        ],
        curriculum: [
          {
            user_id: studentId,
            lesson_id: 'les_0_1',
            status: 'mastered',
            score: 95,
            quiz_passed: true,
          },
          {
            user_id: studentId,
            lesson_id: 'les_0_2',
            status: 'mastered',
            score: 90,
            quiz_passed: true,
          },
        ],
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

      return {
        profile: profileRes.data as UserProfile,
        sessions: (sessionsRes.data || []) as CloudPracticeSession[],
        curriculum: (curriculumRes.data || []) as CloudCurriculumItem[],
      };
    } catch (e) {
      console.error('[CloudSync] Error fetching student data for coach:', e);
      return { profile: null, sessions: [], curriculum: [] };
    }
  },
};

import { isSupabaseConfigured, supabase, UserProfile } from './supabase';
import { isUUID } from './messageService';

export interface MentorshipRequest {
  id: string;
  student_id: string;
  coach_id: string;
  status: 'pending' | 'accepted' | 'declined';
  note: string;
  created_at: string;
  updated_at: string;
  student?: UserProfile;
  coach?: UserProfile;
}

export const MentorshipService = {
  /**
   * Fetch all registered coaches in the academy
   */
  async getAvailableCoaches(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Cloud connection is not configured in this build.');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'coach')
      .order('display_name', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Unable to load certified coaches.');
    }

    return (data || []) as UserProfile[];
  },

  /**
   * Get the current mentorship status for a student (pending or accepted)
   */
  async getStudentMentorship(studentId: string): Promise<MentorshipRequest | null> {
    if (!isSupabaseConfigured || !isUUID(studentId)) {
      return null;
    }

    const { data, error } = await supabase
      .from('mentorship_requests')
      .select('*, coach:coach_id(*)')
      .eq('student_id', studentId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message || 'Unable to check mentorship status.');
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as MentorshipRequest;
  },

  /**
   * Send a mentorship request from a student to a coach
   */
  async sendMentorshipRequest(
    studentId: string,
    coachId: string,
    note: string
  ): Promise<{ error: Error | null; request?: MentorshipRequest }> {
    if (!isSupabaseConfigured) {
      return { error: new Error('Cloud connection is required to request a coach.') };
    }
    if (!isUUID(studentId) || !isUUID(coachId)) {
      return { error: new Error('Invalid user or coach account identifier.') };
    }

    try {
      // First, cleanly disconnect / decline any prior active or pending mentorship for this student
      // so previous coaches immediately release the student from their active roster.
      const { error: cleanupUpdateErr } = await supabase
        .from('mentorship_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .neq('coach_id', coachId);

      if (cleanupUpdateErr) {
        console.warn('[MentorshipService] Cleanup update notice:', cleanupUpdateErr.message);
      }

      const { error: cleanupDeleteErr } = await supabase
        .from('mentorship_requests')
        .delete()
        .eq('student_id', studentId)
        .neq('coach_id', coachId);

      if (cleanupDeleteErr) {
        console.warn('[MentorshipService] Cleanup delete notice:', cleanupDeleteErr.message);
      }

      const { data, error } = await supabase
        .from('mentorship_requests')
        .upsert(
          {
            student_id: studentId,
            coach_id: coachId,
            status: 'pending',
            note,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,coach_id' }
        )
        .select('*, coach:coach_id(*)')
        .single();

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null, request: data as MentorshipRequest };
    } catch (e: any) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  /**
   * Cancel an existing mentorship request
   */
  async cancelMentorshipRequest(requestId: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured || !isUUID(requestId)) {
      return { error: new Error('Unable to cancel mentorship request.') };
    }

    try {
      const { error: updateError } = await supabase
        .from('mentorship_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      const { error: deleteError } = await supabase
        .from('mentorship_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) {
        return { error: new Error(deleteError.message) };
      }
      if (updateError) {
        return { error: new Error(updateError.message) };
      }
      return { error: null };
    } catch (e: any) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  /**
   * End an active mentorship union (releases student and coach to connect elsewhere)
   */
  async endMentorship(requestId: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured || !isUUID(requestId)) {
      return { error: new Error('Unable to end mentorship connection.') };
    }

    try {
      const { error: updateError } = await supabase
        .from('mentorship_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      const { error: deleteError } = await supabase
        .from('mentorship_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) {
        return { error: new Error(deleteError.message) };
      }
      if (updateError) {
        return { error: new Error(updateError.message) };
      }

      return { error: null };
    } catch (e: any) {
      console.error('[MentorshipService] Exception ending mentorship:', e);
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  },

  /**
   * Fetch incoming pending requests for a coach
   */
  async getCoachPendingRequests(coachId: string): Promise<MentorshipRequest[]> {
    if (!isSupabaseConfigured || !isUUID(coachId)) {
      return [];
    }

    const { data, error } = await supabase
      .from('mentorship_requests')
      .select('*, student:student_id(*)')
      .eq('coach_id', coachId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load pending student requests.');
    }

    return (data || []) as MentorshipRequest[];
  },

  /**
   * Fetch accepted students connected to a coach
   */
  async getCoachStudents(coachId: string): Promise<MentorshipRequest[]> {
    if (!isSupabaseConfigured || !isUUID(coachId)) {
      return [];
    }

    const { data, error } = await supabase
      .from('mentorship_requests')
      .select('*, student:student_id(*)')
      .eq('coach_id', coachId)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load connected students.');
    }

    return (data || []) as MentorshipRequest[];
  },

  /**
   * Coach accepts or declines a mentorship request
   */
  async respondToRequest(
    requestId: string,
    status: 'accepted' | 'declined'
  ): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured || !isUUID(requestId)) {
      return { error: new Error('Unable to respond to mentorship request.') };
    }

    try {
      const { error } = await supabase
        .from('mentorship_requests')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      return { error: error ? new Error(error.message) : null };
    } catch (e: any) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  },
};

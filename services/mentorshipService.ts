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

// In-memory / local fallback for dev mode or non-UUID sessions
let localRequests: MentorshipRequest[] = [
  {
    id: 'req_demo_1',
    student_id: 'mock_student_1',
    coach_id: 'mock_coach_1',
    status: 'accepted',
    note: 'Magandang araw po Guro! I would like to request your guidance on Strike 1 and 2 angles.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    student: {
      id: 'mock_student_1',
      role: 'student',
      display_name: 'Juan Dela Cruz',
      email: 'student.juan@arnis.ph',
      rank_sash: 'Green Sash',
      bio: 'Training in modern Arnis fundamentals.',
    },
    coach: {
      id: 'mock_coach_1',
      role: 'coach',
      display_name: 'Guro Miguel Roxas',
      email: 'guro.miguel@arnis.ph',
      rank_sash: 'Lakan Tatlo (3rd Dan)',
      bio: 'Philippine National Arnis Federation Certified Instructor',
    },
  },
];

const mockCoaches: UserProfile[] = [
  {
    id: 'mock_coach_1',
    role: 'coach',
    display_name: 'Guro Miguel Roxas',
    email: 'guro.miguel@arnis.ph',
    rank_sash: 'Lakan Tatlo (3rd Dan)',
    bio: 'Philippine National Arnis Federation Certified Instructor. 15 years experience in Modern Arnis.',
    experience_years: 15,
  },
  {
    id: 'mock_coach_2',
    role: 'coach',
    display_name: 'Guro Maria Santos',
    email: 'maria.arnis@martial.ph',
    rank_sash: 'Lakan Dalawa (2nd Dan)',
    bio: 'Specialist in Anyo Kata and Espada y Daga flow drills.',
    experience_years: 11,
  },
  {
    id: 'mock_coach_3',
    role: 'coach',
    display_name: 'Punong Guro Rafael Cruz',
    email: 'rafael@arnisdecueto.org',
    rank_sash: 'Lakan Lima (5th Dan)',
    bio: 'Founder of Kalasag Combat Arnis. Master of 12 Canonical Strikes.',
    experience_years: 24,
  },
];

export const MentorshipService = {
  /**
   * Fetch all registered coaches in the academy
   */
  async getAvailableCoaches(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) {
      return mockCoaches;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'coach');

      if (error || !data || data.length === 0) {
        return mockCoaches;
      }

      return data as UserProfile[];
    } catch (e) {
      console.error('[MentorshipService] Exception getting coaches:', e);
      return mockCoaches;
    }
  },

  /**
   * Get the current mentorship status for a student (pending or accepted)
   */
  async getStudentMentorship(studentId: string): Promise<MentorshipRequest | null> {
    if (!isSupabaseConfigured || !isUUID(studentId)) {
      const found = localRequests.find(
        (r) => r.student_id === studentId && (r.status === 'pending' || r.status === 'accepted')
      );
      return found || null;
    }

    try {
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select('*, coach:coach_id(*)')
        .eq('student_id', studentId)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        const found = localRequests.find(
          (r) => r.student_id === studentId && (r.status === 'pending' || r.status === 'accepted')
        );
        return found || null;
      }

      return data[0] as MentorshipRequest;
    } catch (e) {
      console.error('[MentorshipService] Error fetching student mentorship:', e);
      return (
        localRequests.find(
          (r) => r.student_id === studentId && (r.status === 'pending' || r.status === 'accepted')
        ) || null
      );
    }
  },

  /**
   * Send a mentorship request from a student to a coach
   */
  async sendMentorshipRequest(
    studentId: string,
    coachId: string,
    note: string
  ): Promise<{ error: Error | null; request?: MentorshipRequest }> {
    if (!isSupabaseConfigured || !isUUID(studentId) || !isUUID(coachId)) {
      const coach = mockCoaches.find((c) => c.id === coachId) || mockCoaches[0];
      const newReq: MentorshipRequest = {
        id: `req_${Date.now()}`,
        student_id: studentId,
        coach_id: coachId,
        status: 'pending',
        note,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        coach,
      };
      localRequests = localRequests.filter((r) => r.student_id !== studentId);
      localRequests.push(newReq);
      return { error: null, request: newReq };
    }

    try {
      // First, cleanly disconnect / decline any prior active or pending mentorship for this student
      // so previous coaches immediately release the student from their active roster
      try {
        await supabase
          .from('mentorship_requests')
          .update({ status: 'declined', updated_at: new Date().toISOString() })
          .eq('student_id', studentId)
          .neq('coach_id', coachId);

        await supabase
          .from('mentorship_requests')
          .delete()
          .eq('student_id', studentId)
          .neq('coach_id', coachId);
      } catch (cleanupErr) {
        console.warn('[MentorshipService] Notice clearing previous coach connections:', cleanupErr);
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
      return { error: e };
    }
  },

  /**
   * Cancel an existing mentorship request
   */
  async cancelMentorshipRequest(requestId: string): Promise<{ error: Error | null }> {
    localRequests = localRequests.filter((r) => r.id !== requestId);

    if (!isSupabaseConfigured || !isUUID(requestId)) {
      return { error: null };
    }

    try {
      await supabase
        .from('mentorship_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      const { error } = await supabase
        .from('mentorship_requests')
        .delete()
        .eq('id', requestId);

      return { error: error ? new Error(error.message) : null };
    } catch (e: any) {
      return { error: e };
    }
  },

  /**
   * End an active mentorship union (releases student and coach to connect elsewhere)
   */
  async endMentorship(requestId: string): Promise<{ error: Error | null }> {
    localRequests = localRequests.filter((r) => r.id !== requestId);

    if (!isSupabaseConfigured || !isUUID(requestId)) {
      return { error: null };
    }

    try {
      // Step 1: Update status to 'declined' (allowed by RLS UPDATE policy)
      await supabase
        .from('mentorship_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      // Step 2: Delete row (allowed by RLS DELETE policy)
      await supabase
        .from('mentorship_requests')
        .delete()
        .eq('id', requestId);

      return { error: null };
    } catch (e: any) {
      console.error('[MentorshipService] Exception ending mentorship:', e);
      return { error: e };
    }
  },

  /**
   * Fetch incoming pending requests for a coach
   */
  async getCoachPendingRequests(coachId: string): Promise<MentorshipRequest[]> {
    if (!isSupabaseConfigured || !isUUID(coachId)) {
      return localRequests.filter((r) => r.coach_id === coachId && r.status === 'pending');
    }

    try {
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select('*, student:student_id(*)')
        .eq('coach_id', coachId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MentorshipService] Error getting coach pending requests:', error);
        return localRequests.filter((r) => r.coach_id === coachId && r.status === 'pending');
      }

      return (data || []) as MentorshipRequest[];
    } catch (e) {
      console.error('[MentorshipService] Exception getting pending requests:', e);
      return localRequests.filter((r) => r.coach_id === coachId && r.status === 'pending');
    }
  },

  /**
   * Fetch accepted students connected to a coach
   */
  async getCoachStudents(coachId: string): Promise<MentorshipRequest[]> {
    if (!isSupabaseConfigured || !isUUID(coachId)) {
      return localRequests.filter((r) => r.coach_id === coachId && r.status === 'accepted');
    }

    try {
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select('*, student:student_id(*)')
        .eq('coach_id', coachId)
        .eq('status', 'accepted')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[MentorshipService] Error getting coach students:', error);
        return localRequests.filter((r) => r.coach_id === coachId && r.status === 'accepted');
      }

      return (data || []) as MentorshipRequest[];
    } catch (e) {
      console.error('[MentorshipService] Exception getting coach students:', e);
      return localRequests.filter((r) => r.coach_id === coachId && r.status === 'accepted');
    }
  },

  /**
   * Coach accepts or declines a mentorship request
   */
  async respondToRequest(
    requestId: string,
    status: 'accepted' | 'declined'
  ): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured || !isUUID(requestId)) {
      const found = localRequests.find((r) => r.id === requestId);
      if (found) {
        found.status = status;
        found.updated_at = new Date().toISOString();
      }
      return { error: null };
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
      return { error: e };
    }
  },
};

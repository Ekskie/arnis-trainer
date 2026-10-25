-- ==============================================================================
-- ARNIS TRAINER - SUPABASE DATABASE SCHEMA & MIGRATIONS
-- Run this complete script in your Supabase Project's SQL Editor
-- (Dashboard -> SQL Editor -> New Query -> Paste & Run)
-- ==============================================================================

-- 1. PROFILES TABLE (Holds student & coach role metadata)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'coach')) DEFAULT 'student',
  display_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  rank_sash TEXT DEFAULT 'White Sash',
  experience_years INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- 2. MENTORSHIP REQUESTS (Coach-Student Pairing)
CREATE TABLE IF NOT EXISTS public.mentorship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_coach UNIQUE (student_id, coach_id)
);

CREATE INDEX IF NOT EXISTS idx_mentorship_student ON public.mentorship_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_coach ON public.mentorship_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_status ON public.mentorship_requests(status);

ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view mentorship requests involving them" ON public.mentorship_requests;
CREATE POLICY "Users can view mentorship requests involving them"
  ON public.mentorship_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = coach_id);

DROP POLICY IF EXISTS "Students can insert mentorship requests" ON public.mentorship_requests;
CREATE POLICY "Students can insert mentorship requests"
  ON public.mentorship_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Coaches and students can update their mentorship requests" ON public.mentorship_requests;
CREATE POLICY "Coaches and students can update their mentorship requests"
  ON public.mentorship_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches and students can delete their mentorship requests" ON public.mentorship_requests;
CREATE POLICY "Coaches and students can delete their mentorship requests"
  ON public.mentorship_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = coach_id);

-- 3. PRACTICE SESSIONS (Strike evaluation metrics, scores, breakdowns)
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strike_id TEXT NOT NULL,
  strike_name TEXT NOT NULL,
  score NUMERIC NOT NULL,
  grade TEXT NOT NULL,
  date TEXT NOT NULL,
  breakdown JSONB DEFAULT '{}'::jsonb,
  snapshot_url TEXT,
  video_url TEXT,
  is_shared_with_coach BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.practice_sessions(created_at DESC);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sessions and coaches can view connected students" ON public.practice_sessions;
CREATE POLICY "Users can view their own sessions and coaches can view connected students"
  ON public.practice_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.mentorship_requests 
      WHERE student_id = practice_sessions.user_id 
        AND coach_id = auth.uid() 
        AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can insert their own practice sessions"
  ON public.practice_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can update their own practice sessions"
  ON public.practice_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. CURRICULUM PROGRESS (Journey milestones & quiz completion)
CREATE TABLE IF NOT EXISTS public.curriculum_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  score INTEGER DEFAULT 0,
  quiz_passed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_user ON public.curriculum_progress(user_id);

ALTER TABLE public.curriculum_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their curriculum and coaches can view connected students" ON public.curriculum_progress;
CREATE POLICY "Users can view their curriculum and coaches can view connected students"
  ON public.curriculum_progress FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.mentorship_requests 
      WHERE student_id = curriculum_progress.user_id 
        AND coach_id = auth.uid() 
        AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can insert or update their curriculum progress" ON public.curriculum_progress;
CREATE POLICY "Users can insert or update their curriculum progress"
  ON public.curriculum_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own curriculum progress" ON public.curriculum_progress;
CREATE POLICY "Users can update their own curriculum progress"
  ON public.curriculum_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. DIRECT MESSAGES (1-on-1 Coach-Student Real-time Chat)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  session_id TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.direct_messages(created_at ASC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.direct_messages;
CREATE POLICY "Users can view messages they sent or received"
  ON public.direct_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can insert messages as sender" ON public.direct_messages;
CREATE POLICY "Users can insert messages as sender"
  ON public.direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Recipients can update read_at" ON public.direct_messages;
CREATE POLICY "Recipients can update read_at"
  ON public.direct_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id);

-- 6. REALTIME SUBSCRIPTIONS
-- Enable realtime on direct_messages and mentorship_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'mentorship_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_requests;
  END IF;
END $$;

-- 7. STORAGE BUCKETS (Snapshots & Practice Videos)
-- Note: Create buckets 'snapshots' and 'practice-videos' in Supabase Dashboard -> Storage
-- Insert bucket creation if storage extensions are active:
INSERT INTO storage.buckets (id, name, public)
VALUES ('snapshots', 'snapshots', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('practice-videos', 'practice-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for snapshots (public read, authenticated upload)
DROP POLICY IF EXISTS "Snapshots are publicly accessible" ON storage.objects;
CREATE POLICY "Snapshots are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'snapshots');

DROP POLICY IF EXISTS "Authenticated users can upload snapshots" ON storage.objects;
CREATE POLICY "Authenticated users can upload snapshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'snapshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage Policies for practice-videos (authenticated access)
DROP POLICY IF EXISTS "Users can upload their own practice videos" ON storage.objects;
CREATE POLICY "Users can upload their own practice videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'practice-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users and coaches can view shared practice videos" ON storage.objects;
CREATE POLICY "Users and coaches can view shared practice videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'practice-videos' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.mentorship_requests
        WHERE student_id::text = (storage.foldername(name))[1]
          AND coach_id = auth.uid()
          AND status = 'accepted'
      )
    )
  );

-- 8. ACCOUNT DELETION RPC FUNCTION
-- Allows an authenticated user to completely delete their account from auth.users,
-- which cascades down to profiles, practice_sessions, curriculum_progress, direct_messages, and mentorship_requests.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;


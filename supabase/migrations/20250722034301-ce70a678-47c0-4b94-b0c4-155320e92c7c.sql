-- Modify exam_sessions table to support both UUID and email user_ids
-- Change user_id from UUID to TEXT to support both registered users (UUID) and emails

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view sessions by session ID" ON public.exam_sessions;
DROP POLICY IF EXISTS "Users can update sessions by session ID" ON public.exam_sessions;
DROP POLICY IF EXISTS "Allow session creation for email assignments" ON public.exam_sessions;

-- Change user_id column from UUID to TEXT
ALTER TABLE public.exam_sessions ALTER COLUMN user_id TYPE TEXT;

-- Create new policies that work with both UUIDs and emails
CREATE POLICY "Users can view sessions by session ID"
ON public.exam_sessions
FOR SELECT
USING (
  -- Allow authenticated users to see their own sessions (convert UUID to text)
  (auth.uid() IS NOT NULL AND auth.uid()::text = user_id) 
  OR 
  -- Allow anyone to view sessions for email-based assignments (non-registered users)
  (user_id LIKE '%@%.%')
);

CREATE POLICY "Users can update sessions by session ID"
ON public.exam_sessions
FOR UPDATE
USING (
  -- Allow authenticated users to update their own sessions (convert UUID to text)
  (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
  OR 
  -- Allow anyone to update sessions for email-based assignments (non-registered users)
  (user_id LIKE '%@%.%')
);

-- Allow insertion of sessions for email assignments and authenticated users
CREATE POLICY "Allow session creation for all users"
ON public.exam_sessions
FOR INSERT
WITH CHECK (
  -- Allow authenticated users to create sessions (their own)
  (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
  OR
  -- Allow creation of sessions for email-based assignments (non-registered users)
  (user_id LIKE '%@%.%')
);
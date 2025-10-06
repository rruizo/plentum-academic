-- Modify RLS policies for exam_sessions to allow access to sessions by session ID for non-authenticated users
-- This is needed for users who access exams via unique links without being registered

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own exam sessions" ON public.exam_sessions;
DROP POLICY IF EXISTS "Users can update their own exam sessions" ON public.exam_sessions;

-- Create new policies that allow access by session ID for exam taking
CREATE POLICY "Users can view sessions by session ID"
ON public.exam_sessions
FOR SELECT
USING (
  -- Allow authenticated users to see their own sessions (UUID comparison)
  (auth.uid() IS NOT NULL AND auth.uid() = user_id::uuid) 
  OR 
  -- Allow anyone to view sessions for email-based assignments (non-registered users)
  (user_id LIKE '%@%.%')
);

CREATE POLICY "Users can update sessions by session ID"
ON public.exam_sessions
FOR UPDATE
USING (
  -- Allow authenticated users to update their own sessions (UUID comparison)
  (auth.uid() IS NOT NULL AND auth.uid() = user_id::uuid)
  OR 
  -- Allow anyone to update sessions for email-based assignments (non-registered users)
  (user_id LIKE '%@%.%')
);

-- Allow insertion of sessions for non-registered users (emails)
CREATE POLICY "Allow session creation for email assignments"
ON public.exam_sessions
FOR INSERT
WITH CHECK (
  -- Allow authenticated users to create sessions
  auth.uid() IS NOT NULL
  OR
  -- Allow creation of sessions for email-based assignments (non-registered users)
  (user_id LIKE '%@%.%')
);
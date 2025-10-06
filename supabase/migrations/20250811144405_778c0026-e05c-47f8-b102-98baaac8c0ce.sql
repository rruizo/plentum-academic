-- Secure exam_sessions: remove public read access, enforce auth-based access
BEGIN;

-- Remove overly permissive public read policies if they exist
DROP POLICY IF EXISTS "Allow public access to exam sessions for authentication" ON public.exam_sessions;
DROP POLICY IF EXISTS "Allow public access to psychometric sessions for authentication" ON public.exam_sessions;

-- Recreate a strict SELECT policy (drop first to avoid duplicates)
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.exam_sessions;
CREATE POLICY "Users can view their own sessions"
ON public.exam_sessions
FOR SELECT
USING (
  user_has_admin_or_teacher_role()
  OR ((auth.uid() IS NOT NULL) AND (auth.uid()::text = user_id))
  OR (user_id LIKE '%@%.%' AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.email = user_id
  ))
);

COMMIT;
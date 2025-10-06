-- Tighten RLS on exam_sessions to prevent email leakage via company-wide SELECT
BEGIN;

-- Drop broad company-wide SELECT policy if present
DROP POLICY IF EXISTS "Users can view exam sessions from their company" ON public.exam_sessions;

-- Ensure only admins/teachers or the session owner (by uuid or matching email) can SELECT
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
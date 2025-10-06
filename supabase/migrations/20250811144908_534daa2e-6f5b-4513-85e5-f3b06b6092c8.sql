-- Restrict access to questions: remove public SELECT, allow only admins/teachers and assigned candidates
BEGIN;

-- Remove overly permissive public read policies on questions
DROP POLICY IF EXISTS "Everyone can view questions" ON public.questions;
DROP POLICY IF EXISTS "Users can view all questions" ON public.questions;

-- Add targeted SELECT policy for candidates with active assignments
DROP POLICY IF EXISTS "Candidates with active assignments can view questions" ON public.questions;
CREATE POLICY "Candidates with active assignments can view questions"
ON public.questions
FOR SELECT
USING (
  -- Admins/teachers already covered by manage policy, but include here for clarity
  user_has_admin_or_teacher_role()
  OR EXISTS (
    SELECT 1 FROM public.exam_assignments ea
    WHERE ea.user_id = auth.uid()
      AND ea.status IN ('pending','notified','started')
  )
);

COMMIT;
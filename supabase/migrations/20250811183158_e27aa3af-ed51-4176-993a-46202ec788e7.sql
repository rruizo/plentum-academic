-- Restrict access to personality questions: remove public SELECT, allow only users with active sessions
BEGIN;

-- Remove overly permissive public read policy on personality_questions
DROP POLICY IF EXISTS "Everyone can view active personality questions" ON public.personality_questions;

-- Add targeted SELECT policy for users with active psychometric sessions
CREATE POLICY "Users with active psychometric sessions can view questions"
ON public.personality_questions
FOR SELECT
USING (
  -- Admins/teachers already covered by manage policy
  user_has_admin_or_teacher_role()
  OR (
    -- Users with active psychometric test sessions
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM public.exam_sessions es
      WHERE es.user_id = auth.uid()::text
        AND es.test_type = 'psychometric'
        AND es.status IN ('pending', 'in_progress', 'started')
        AND es.psychometric_test_id IS NOT NULL
    )
  )
);

COMMIT;
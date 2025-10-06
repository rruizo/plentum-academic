-- Fix security issue: Restrict psychometric_tests table access
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Admins can manage psychometric tests" ON public.psychometric_tests;
DROP POLICY IF EXISTS "Users can view active psychometric tests" ON public.psychometric_tests;

-- Create secure, role-based access policies
-- 1. Only admins can manage all psychometric tests
CREATE POLICY "Admins can manage all psychometric tests"
ON public.psychometric_tests
FOR ALL
TO authenticated
USING (user_is_admin())
WITH CHECK (user_is_admin());

-- 2. Teachers can view active psychometric tests only
CREATE POLICY "Teachers can view active psychometric tests"
ON public.psychometric_tests
FOR SELECT
TO authenticated
USING (
  user_has_admin_or_teacher_role() 
  AND is_active = true
);

-- 3. Students can only view psychometric tests they have active assignments for
CREATE POLICY "Students can view assigned psychometric tests"
ON public.psychometric_tests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.exam_assignments ea
    WHERE ea.user_id = auth.uid()
      AND ea.psychometric_test_id = psychometric_tests.id
      AND ea.test_type = 'psychometric'
      AND ea.status IN ('pending', 'notified', 'started')
  )
  OR 
  EXISTS (
    SELECT 1
    FROM public.exam_sessions es
    WHERE es.user_id = auth.uid()::text
      AND es.psychometric_test_id = psychometric_tests.id
      AND es.test_type = 'psychometric'
      AND es.status IN ('pending', 'in_progress', 'started')
  )
);
-- Restrict students from viewing their psychological results - CORRECTED VERSION
-- Only licensed professionals should have access to psychological analysis and test results

-- 1. Remove student access to HTP analysis (psychological reports)
DROP POLICY IF EXISTS "Users can view their own HTP analysis" ON public.htp_analysis;

-- 2. Remove student access to personality test results (OCEAN, psychometric)
DROP POLICY IF EXISTS "Users can view their own personality results" ON public.personality_results;

CREATE POLICY "Only licensed professionals can view personality results" 
ON public.personality_results 
FOR SELECT 
TO authenticated
USING (
  user_has_admin_or_teacher_role()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'teacher', 'supervisor')  
  )
);

-- 3. Remove student access to personality responses 
DROP POLICY IF EXISTS "Users can view their own personality responses" ON public.personality_responses;

CREATE POLICY "Only licensed professionals can view personality responses" 
ON public.personality_responses 
FOR SELECT 
TO authenticated
USING (
  user_has_admin_or_teacher_role()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'teacher', 'supervisor')
  )
);

-- 4. Remove student access to exam attempts and results
DROP POLICY IF EXISTS "Users can view their own exam attempts" ON public.exam_attempts;

CREATE POLICY "Only licensed professionals can view exam attempts" 
ON public.exam_attempts 
FOR SELECT 
TO authenticated
USING (
  user_has_admin_or_teacher_role()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'teacher', 'supervisor')
  )
);

-- 5. Remove student access to exam category results
DROP POLICY IF EXISTS "Users can view their own category results" ON public.exam_category_results;

CREATE POLICY "Only licensed professionals can view category results" 
ON public.exam_category_results 
FOR SELECT 
TO authenticated
USING (
  user_has_admin_or_teacher_role()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'teacher', 'supervisor')
  )
);

-- 6. Remove student access to generated reports
DROP POLICY IF EXISTS "Users can view their own generated reports" ON public.generated_reports;

-- 7. Remove student access to HTP submissions results (they can create but not view)
-- Keep the creation policy but restrict viewing to professionals only
DROP POLICY IF EXISTS "Users can create and view their own HTP submissions" ON public.htp_submissions;

-- Allow students to create HTP submissions
CREATE POLICY "Users can create their own HTP submissions" 
ON public.htp_submissions 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow students to update their own submissions (during the test)
CREATE POLICY "Users can update their own HTP submissions" 
ON public.htp_submissions 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Only professionals can view HTP submissions
CREATE POLICY "Only licensed professionals can view HTP submissions" 
ON public.htp_submissions 
FOR SELECT 
TO authenticated
USING (
  user_has_admin_or_teacher_role()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'teacher', 'supervisor')
  )
);

-- Summary: Students can now:
-- - Take tests (INSERT responses/attempts/submissions)
-- - Update their submissions during tests
-- But students CANNOT:
-- - View their results
-- - View their analysis 
-- - View generated reports
-- - View their completed submissions

-- Only licensed professionals (admin/teacher/supervisor) can access all results and analysis
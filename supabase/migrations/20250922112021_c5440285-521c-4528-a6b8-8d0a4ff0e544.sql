-- Restrict students from viewing their psychological results
-- Only licensed professionals should have access to psychological analysis and test results

-- 1. Remove student access to HTP analysis (psychological reports)
DROP POLICY IF EXISTS "Users can view their own HTP analysis" ON public.htp_analysis;

-- HTP analysis now only accessible to licensed professionals
-- (The "Licensed professionals can view HTP analysis" policy already exists)

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

-- Generated reports now only accessible to professionals
-- (The existing policy "Admins and teachers can view all generated reports" covers this)

-- 7. Students can still create their responses/attempts but cannot view results
-- Keep the INSERT policies for students to take tests, but remove SELECT access

-- Add audit log for when professionals access student results
CREATE OR REPLACE FUNCTION public.log_student_result_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when professionals access student psychological/test results
  INSERT INTO public.user_activity_log (
    user_id,
    activity_type,
    activity_description,
    metadata
  ) VALUES (
    auth.uid(),
    'student_result_access',
    'Professional accessed student test results',
    jsonb_build_object(
      'accessed_table', TG_TABLE_NAME,
      'student_user_id', NEW.user_id,
      'access_timestamp', NOW(),
      'professional_role', (SELECT role FROM public.profiles WHERE id = auth.uid())
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS log_htp_analysis_access_trigger ON public.htp_analysis;
CREATE TRIGGER log_htp_analysis_access_trigger
  AFTER SELECT ON public.htp_analysis
  FOR EACH ROW EXECUTE FUNCTION public.log_student_result_access();

DROP TRIGGER IF EXISTS log_personality_results_access_trigger ON public.personality_results;  
CREATE TRIGGER log_personality_results_access_trigger
  AFTER SELECT ON public.personality_results
  FOR EACH ROW EXECUTE FUNCTION public.log_student_result_access();

DROP TRIGGER IF EXISTS log_exam_attempts_access_trigger ON public.exam_attempts;
CREATE TRIGGER log_exam_attempts_access_trigger
  AFTER SELECT ON public.exam_attempts
  FOR EACH ROW EXECUTE FUNCTION public.log_student_result_access();
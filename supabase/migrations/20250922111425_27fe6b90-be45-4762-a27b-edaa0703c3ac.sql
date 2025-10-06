-- Fix critical security issue: Secure psychological analysis data in htp_analysis table
-- This addresses the security finding about psychological analysis reports being vulnerable

-- First, drop the overly permissive policy that allows anyone to insert
DROP POLICY IF EXISTS "System can insert HTP analysis" ON public.htp_analysis;

-- Create a more secure insert policy that only allows authenticated edge functions
-- Edge functions run with service role, not user context, so we need to handle this differently
CREATE POLICY "Secure HTP analysis insertion" 
ON public.htp_analysis 
FOR INSERT 
TO service_role
WITH CHECK (
  -- Only allow insertion with valid user_id and submission_id references
  user_id IS NOT NULL 
  AND submission_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.htp_submissions hs
    WHERE hs.id = htp_analysis.submission_id
    AND hs.user_id = htp_analysis.user_id
  )
);

-- Enhance the user access policy to be more restrictive
DROP POLICY IF EXISTS "Users can view their own HTP analysis" ON public.htp_analysis;

CREATE POLICY "Users can view their own HTP analysis" 
ON public.htp_analysis 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.htp_submissions hs
    WHERE hs.id = htp_analysis.submission_id
    AND hs.user_id = auth.uid()
  )
);

-- Enhance the professional access policy
DROP POLICY IF EXISTS "Admins and teachers can view all HTP analysis" ON public.htp_analysis;

CREATE POLICY "Licensed professionals can view HTP analysis" 
ON public.htp_analysis 
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

-- Add update policy for licensed professionals to modify analysis if needed
CREATE POLICY "Licensed professionals can update HTP analysis" 
ON public.htp_analysis 
FOR UPDATE 
TO authenticated
USING (
  user_has_admin_or_teacher_role()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'teacher')
  )
)
WITH CHECK (
  user_has_admin_or_teacher_role()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'teacher')
  )
);

-- Ensure no public/anonymous access to psychological data
-- (This is implicit since we only have authenticated policies, but let's be explicit)

-- Add audit logging trigger for HTP analysis access
CREATE OR REPLACE FUNCTION public.log_htp_analysis_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive psychological data
  INSERT INTO public.user_activity_log (
    user_id,
    activity_type,
    activity_description,
    metadata
  ) VALUES (
    auth.uid(),
    'htp_analysis_access',
    'Accessed HTP psychological analysis',
    jsonb_build_object(
      'analysis_id', NEW.id,
      'subject_user_id', NEW.user_id,
      'access_timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
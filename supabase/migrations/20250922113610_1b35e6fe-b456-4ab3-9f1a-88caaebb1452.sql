-- SECURITY FIX: Restrict access to question categories to prevent test gaming
-- Drop overly permissive policies that allow public/student access to assessment structure

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Everyone can view question categories" ON public.question_categories;
DROP POLICY IF EXISTS "Users can view all categories" ON public.question_categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.question_categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.question_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.question_categories;

-- Create secure policies that only allow authorized professionals access
CREATE POLICY "Only authorized professionals can view question categories" 
ON public.question_categories 
FOR SELECT 
USING (user_has_admin_or_teacher_role() AND (EXISTS ( 
  SELECT 1 FROM public.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher', 'supervisor')
)));

CREATE POLICY "Only authorized professionals can manage question categories" 
ON public.question_categories 
FOR ALL 
USING (user_has_admin_or_teacher_role() AND (EXISTS ( 
  SELECT 1 FROM public.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher', 'supervisor')
)))
WITH CHECK (user_has_admin_or_teacher_role() AND (EXISTS ( 
  SELECT 1 FROM public.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher', 'supervisor')
)));

-- Log the security fix for audit purposes
INSERT INTO public.user_activity_log (
  user_id,
  activity_type,
  activity_description,
  metadata
) VALUES (
  auth.uid(),
  'security_fix',
  'Restricted question_categories access to prevent test gaming',
  jsonb_build_object(
    'security_issue', 'Assessment categories publicly readable',
    'fix_applied', 'Restricted to authorized professionals only',
    'timestamp', NOW()
  )
);
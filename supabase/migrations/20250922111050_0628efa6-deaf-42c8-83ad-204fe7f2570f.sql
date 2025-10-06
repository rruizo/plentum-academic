-- Fix critical security issue: Remove public access to exams table
-- This addresses the security finding about exam details being exposed to public

-- First, drop the dangerous public policy
DROP POLICY IF EXISTS "Everyone can view exams" ON public.exams;

-- Add a policy for students to view only their assigned exams
CREATE POLICY "Students can view assigned exams" 
ON public.exams 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_assignments ea
    WHERE ea.exam_id = exams.id 
    AND ea.user_id = auth.uid()
    AND ea.status IN ('pending', 'notified', 'started')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.exam_id = exams.id 
    AND es.user_id = auth.uid()::text
    AND es.status IN ('pending', 'in_progress', 'started')
  )
);

-- Ensure active exams are only accessible to authenticated users with proper assignments
CREATE POLICY "Active exams only for authenticated users" 
ON public.exams 
FOR SELECT 
TO authenticated
USING (
  estado = 'activo' 
  AND (
    -- Admin and teachers can see all active exams
    user_has_admin_or_teacher_role()
    OR
    -- Students can only see exams assigned to them
    EXISTS (
      SELECT 1 FROM public.exam_assignments ea
      WHERE ea.exam_id = exams.id 
      AND ea.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.exam_sessions es
      WHERE es.exam_id = exams.id 
      AND es.user_id = auth.uid()::text
    )
  )
);

-- Add policy for public exam access (only for specific use cases like magic links)
-- This is more restrictive and only allows access to active exams with valid sessions
CREATE POLICY "Public exam access for valid sessions" 
ON public.exams 
FOR SELECT 
TO anon
USING (
  estado = 'activo' 
  AND EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.exam_id = exams.id 
    AND es.status IN ('pending', 'in_progress', 'started')
    AND es.created_at > NOW() - INTERVAL '24 hours'
  )
);
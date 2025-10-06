-- Fix RLS security vulnerability on exams table by replacing all policies
-- Remove all existing permissive policies and implement strict access controls

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Active exams only for authenticated users" ON public.exams;
DROP POLICY IF EXISTS "Public exam access for valid sessions" ON public.exams;
DROP POLICY IF EXISTS "Students can view assigned exams" ON public.exams;
DROP POLICY IF EXISTS "Users can view exams from their company" ON public.exams;
DROP POLICY IF EXISTS "Users can create their own exams" ON public.exams;
DROP POLICY IF EXISTS "Students can only view specifically assigned active exams" ON public.exams;
DROP POLICY IF EXISTS "Limited exam access for valid session owners only" ON public.exams;
DROP POLICY IF EXISTS "Company exams access for authorized personnel only" ON public.exams;
DROP POLICY IF EXISTS "Authenticated users can create exams" ON public.exams;

-- Create new secure policies with unique names

-- 1. Secure student access - only assigned active exams
CREATE POLICY "secure_student_assigned_exam_access" 
ON public.exams 
FOR SELECT 
USING (
  estado = 'activo' AND (
    -- User has a valid assignment
    EXISTS (
      SELECT 1 FROM exam_assignments ea 
      WHERE ea.exam_id = exams.id 
      AND ea.user_id = auth.uid()
      AND ea.status IN ('pending', 'notified', 'started')
    ) 
    OR
    -- User has a valid recent session
    EXISTS (
      SELECT 1 FROM exam_sessions es 
      WHERE es.exam_id = exams.id 
      AND es.user_id = auth.uid()::text
      AND es.status IN ('pending', 'in_progress', 'started')
      AND es.created_at > (now() - interval '7 days')
    )
  )
);

-- 2. Secure session-based access - only for session owners
CREATE POLICY "secure_session_owner_exam_access"
ON public.exams
FOR SELECT
USING (
  estado = 'activo' AND 
  EXISTS (
    SELECT 1 FROM exam_sessions es
    WHERE es.exam_id = exams.id
    AND (
      es.user_id = auth.uid()::text OR
      es.user_id IN (SELECT email FROM profiles WHERE id = auth.uid())
    )
    AND es.status IN ('pending', 'in_progress', 'started')
    AND es.created_at > (now() - interval '24 hours')
  )
);

-- 3. Secure company access - only for authorized personnel
CREATE POLICY "secure_authorized_personnel_company_access"
ON public.exams
FOR SELECT
USING (
  user_has_admin_or_teacher_role() AND 
  (company_id = get_current_user_company_id() OR company_id IS NULL)
);

-- 4. Secure exam creation - only authorized users
CREATE POLICY "secure_authorized_exam_creation"
ON public.exams
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  user_has_admin_or_teacher_role()
);
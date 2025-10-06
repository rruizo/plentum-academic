-- Fix RLS security vulnerability on exams table
-- Remove overly permissive policies and implement strict access controls

-- Drop the problematic public access policy
DROP POLICY IF EXISTS "Public exam access for valid sessions" ON public.exams;

-- Drop the overly broad company access policy  
DROP POLICY IF EXISTS "Users can view exams from their company" ON public.exams;

-- Drop and recreate the "Active exams only for authenticated users" policy with stricter conditions
DROP POLICY IF EXISTS "Active exams only for authenticated users" ON public.exams;

-- Create more secure policies

-- 1. Only allow viewing exams that users are specifically assigned to or have active sessions for
CREATE POLICY "Students can only view specifically assigned active exams" 
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
    -- User has a valid session
    EXISTS (
      SELECT 1 FROM exam_sessions es 
      WHERE es.exam_id = exams.id 
      AND es.user_id = auth.uid()::text
      AND es.status IN ('pending', 'in_progress', 'started')
      AND es.created_at > (now() - interval '7 days')
    )
  )
);

-- 2. Allow limited access for valid exam sessions (but only for the session owner)
CREATE POLICY "Limited exam access for valid session owners only"
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

-- 3. Company-based access only for admins and teachers within the same company
CREATE POLICY "Company exams access for authorized personnel only"
ON public.exams
FOR SELECT
USING (
  user_has_admin_or_teacher_role() AND 
  (company_id = get_current_user_company_id() OR company_id IS NULL)
);

-- 4. Restrict exam creation to authenticated users only
DROP POLICY IF EXISTS "Users can create their own exams" ON public.exams;
CREATE POLICY "Authenticated users can create exams"
ON public.exams
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  user_has_admin_or_teacher_role()
);
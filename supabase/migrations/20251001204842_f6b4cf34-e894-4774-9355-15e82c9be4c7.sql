
-- Eliminar políticas problemáticas que referencian auth.users y recrearlas correctamente

-- 1. EXAM_SESSIONS: Corregir políticas que usan auth.users
DROP POLICY IF EXISTS "Users can create their own exam sessions" ON public.exam_sessions;
DROP POLICY IF EXISTS "Users can view their own exam sessions" ON public.exam_sessions;
DROP POLICY IF EXISTS "Users can update their own exam sessions" ON public.exam_sessions;

-- Recrear políticas usando solo profiles
CREATE POLICY "Users can create their own exam sessions"
ON public.exam_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = (auth.uid())::text) 
  OR (user_id IN (SELECT email FROM public.profiles WHERE id = auth.uid()))
  OR (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'teacher', 'supervisor')
  ))
);

CREATE POLICY "Users can view their own exam sessions"
ON public.exam_sessions
FOR SELECT
TO authenticated
USING (
  (user_id = (auth.uid())::text)
  OR (user_id IN (SELECT email FROM public.profiles WHERE id = auth.uid()))
  OR (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'teacher', 'supervisor')
  ))
);

CREATE POLICY "Users can update their own exam sessions"
ON public.exam_sessions
FOR UPDATE
TO authenticated
USING (
  (user_id = (auth.uid())::text)
  OR (user_id IN (SELECT email FROM public.profiles WHERE id = auth.uid()))
  OR (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'teacher', 'supervisor')
  ))
);

-- 2. EXAMS: Asegurar que las políticas admin funcionen correctamente
-- Eliminar políticas duplicadas o conflictivas
DROP POLICY IF EXISTS "secure_authorized_personnel_company_access" ON public.exams;

-- Recrear política simplificada para profesionales autorizados
CREATE POLICY "Authorized personnel can view exams"
ON public.exams
FOR SELECT
TO authenticated
USING (
  public.user_has_admin_or_teacher_role()
  OR (
    estado = 'activo' 
    AND (
      EXISTS (
        SELECT 1 FROM public.exam_assignments ea
        WHERE ea.exam_id = exams.id 
        AND ea.user_id = auth.uid()
        AND ea.status IN ('pending', 'notified', 'started')
      )
      OR EXISTS (
        SELECT 1 FROM public.exam_sessions es
        WHERE es.exam_id = exams.id
        AND (
          es.user_id = (auth.uid())::text
          OR es.user_id IN (SELECT email FROM public.profiles WHERE id = auth.uid())
        )
        AND es.status IN ('pending', 'in_progress', 'started')
        AND es.created_at > (now() - interval '7 days')
      )
    )
  )
);

-- 3. EXAM_ASSIGNMENTS: Simplificar políticas
DROP POLICY IF EXISTS "Instructors and admins can manage assignments" ON public.exam_assignments;

CREATE POLICY "Instructors and admins can manage assignments"
ON public.exam_assignments
FOR ALL
TO authenticated
USING (
  public.user_has_admin_or_teacher_role()
)
WITH CHECK (
  public.user_has_admin_or_teacher_role()
);

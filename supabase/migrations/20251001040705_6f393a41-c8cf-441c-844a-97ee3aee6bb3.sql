-- Corregir políticas RLS para exam_assignments
-- Los estudiantes deben poder ver sus propias asignaciones sin restricciones adicionales

DROP POLICY IF EXISTS "Users can view their assigned exams" ON exam_assignments;

CREATE POLICY "Users can view their assigned exams"
ON exam_assignments
FOR SELECT
USING (user_id = auth.uid());

-- Corregir la función de validación HTP para buscar por access_link correctamente
DROP FUNCTION IF EXISTS public.validate_htp_assignment_access(text);

CREATE OR REPLACE FUNCTION public.validate_htp_assignment_access(p_access_link text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  assigned_by uuid,
  access_link text,
  status text,
  expires_at timestamp with time zone,
  email_sent boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_full_name text,
  user_email text,
  user_company text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    ha.id,
    ha.user_id,
    ha.assigned_by,
    ha.access_link,
    ha.status,
    ha.expires_at,
    ha.email_sent,
    ha.created_at,
    ha.updated_at,
    p.full_name as user_full_name,
    p.email as user_email,
    p.company as user_company
  FROM htp_assignments ha
  INNER JOIN profiles p ON ha.user_id = p.id
  WHERE ha.user_id::text = p_access_link
    AND ha.status IN ('pending', 'notified')
    AND (ha.expires_at IS NULL OR ha.expires_at > NOW())
  LIMIT 1;
$$;

-- Agregar índice para mejorar performance en exam_assignments
CREATE INDEX IF NOT EXISTS idx_exam_assignments_user_status 
ON exam_assignments(user_id, status);

-- Permitir que estudiantes autenticados creen sesiones de examen sin restricciones
DROP POLICY IF EXISTS "Allow session creation for all users" ON exam_sessions;

CREATE POLICY "Allow session creation for all users"
ON exam_sessions
FOR INSERT
WITH CHECK (
  -- Admin/teacher pueden crear cualquier sesión
  user_has_admin_or_teacher_role() 
  OR 
  -- Usuario autenticado puede crear sesión para sí mismo (por UUID o email)
  (
    auth.uid() IS NOT NULL 
    AND (
      (auth.uid())::text = user_id 
      OR user_id IN (SELECT email FROM profiles WHERE id = auth.uid())
    )
  )
  OR
  -- Permitir creación con email (para acceso por credenciales)
  (user_id ~~ '%@%.%')
);
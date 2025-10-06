-- Permitir acceso a sesiones de examen sin autenticación para el acceso inicial
DROP POLICY IF EXISTS "Users can view sessions by session ID" ON exam_sessions;

CREATE POLICY "Allow public access to exam sessions for authentication" 
ON exam_sessions 
FOR SELECT 
USING (true);

-- Mantener las otras políticas más restrictivas para las operaciones que requieren autenticación
DROP POLICY IF EXISTS "Users can update sessions by session ID" ON exam_sessions;

CREATE POLICY "Users can update their own sessions or email-based sessions" 
ON exam_sessions 
FOR UPDATE 
USING (
  user_has_admin_or_teacher_role() OR 
  ((auth.uid() IS NOT NULL) AND ((auth.uid())::text = user_id)) OR 
  (user_id ~~ '%@%.%'::text)
);
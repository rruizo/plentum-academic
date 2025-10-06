-- Crear tabla para log de actividades de usuarios
CREATE TABLE public.user_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins and teachers can view activity logs"
ON public.user_activity_log
FOR SELECT
USING (user_has_admin_or_teacher_role());

CREATE POLICY "Admins and teachers can create activity logs"
ON public.user_activity_log
FOR INSERT
WITH CHECK (user_has_admin_or_teacher_role());

-- Función para extender intentos de usuario
CREATE OR REPLACE FUNCTION public.extend_user_exam_attempts(
  target_user_id UUID,
  exam_id UUID,
  additional_attempts INTEGER,
  admin_reason TEXT DEFAULT 'Extensión manual de intentos'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_attempts INTEGER := 0;
  max_attempts INTEGER := 2;
  session_record RECORD;
  result JSONB;
BEGIN
  -- Verificar que el usuario que ejecuta tiene permisos
  IF NOT user_has_admin_or_teacher_role() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sin permisos para extender intentos');
  END IF;

  -- Buscar sesión activa del usuario para el examen
  SELECT * INTO session_record
  FROM public.exam_sessions
  WHERE user_id = target_user_id::text OR user_id IN (
    SELECT email FROM public.profiles WHERE id = target_user_id
  )
  AND exam_id = extend_user_exam_attempts.exam_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF session_record IS NOT NULL THEN
    -- Actualizar la sesión existente
    UPDATE public.exam_sessions
    SET max_attempts = max_attempts + additional_attempts,
        updated_at = now()
    WHERE id = session_record.id;
    
    current_attempts := session_record.attempts_taken;
    max_attempts := session_record.max_attempts + additional_attempts;
  ELSE
    -- Crear nueva sesión con intentos extendidos
    INSERT INTO public.exam_sessions (
      exam_id,
      user_id,
      max_attempts,
      status
    ) VALUES (
      extend_user_exam_attempts.exam_id,
      target_user_id::text,
      2 + additional_attempts,
      'pending'
    );
    
    current_attempts := 0;
    max_attempts := 2 + additional_attempts;
  END IF;

  -- Registrar en el log de actividades
  INSERT INTO public.user_activity_log (
    user_id,
    admin_id,
    activity_type,
    activity_description,
    previous_value,
    new_value,
    metadata
  ) VALUES (
    target_user_id,
    auth.uid(),
    'extend_exam_attempts',
    'Extensión de intentos de examen',
    jsonb_build_object('previous_max_attempts', session_record.max_attempts),
    jsonb_build_object('new_max_attempts', max_attempts),
    jsonb_build_object(
      'exam_id', extend_user_exam_attempts.exam_id,
      'additional_attempts', additional_attempts,
      'admin_reason', admin_reason
    )
  );

  result := jsonb_build_object(
    'success', true,
    'current_attempts', current_attempts,
    'max_attempts', max_attempts,
    'remaining_attempts', max_attempts - current_attempts
  );

  RETURN result;
END;
$$;
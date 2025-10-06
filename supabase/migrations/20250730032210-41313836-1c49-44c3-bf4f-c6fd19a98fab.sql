-- Crear función para purgar datos de prueba (solo para desarrollo)
CREATE OR REPLACE FUNCTION public.purge_test_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_attempts INTEGER;
  deleted_sessions INTEGER;
  deleted_assignments INTEGER;
  deleted_notifications INTEGER;
  deleted_credentials INTEGER;
  deleted_responses INTEGER;
  deleted_results INTEGER;
BEGIN
  -- Solo permitir en modo desarrollo (verificar si hay pocos usuarios)
  IF (SELECT COUNT(*) FROM public.profiles) > 20 THEN
    RETURN 'ERROR: No se puede purgar en producción (más de 20 usuarios)';
  END IF;
  
  -- Purgar respuestas psicométricas
  DELETE FROM public.personality_responses;
  GET DIAGNOSTICS deleted_responses = ROW_COUNT;
  
  -- Purgar resultados psicométricos
  DELETE FROM public.personality_results;
  GET DIAGNOSTICS deleted_results = ROW_COUNT;
  
  -- Purgar intentos de examen
  DELETE FROM public.exam_attempts;
  GET DIAGNOSTICS deleted_attempts = ROW_COUNT;
  
  -- Purgar sesiones de examen
  DELETE FROM public.exam_sessions;
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  
  -- Purgar asignaciones de examen
  DELETE FROM public.exam_assignments;
  GET DIAGNOSTICS deleted_assignments = ROW_COUNT;
  
  -- Purgar notificaciones de email
  DELETE FROM public.exam_email_notifications;
  GET DIAGNOSTICS deleted_notifications = ROW_COUNT;
  
  -- Purgar credenciales de examen
  DELETE FROM public.exam_credentials;
  GET DIAGNOSTICS deleted_credentials = ROW_COUNT;
  
  -- Resetear flags de usuarios
  UPDATE public.profiles 
  SET exam_completed = false, 
      last_exam_completed_at = NULL 
  WHERE role = 'student';
  
  RETURN FORMAT('PURGADO COMPLETO - Intentos: %s, Sesiones: %s, Asignaciones: %s, Notificaciones: %s, Credenciales: %s, Respuestas: %s, Resultados: %s', 
    deleted_attempts, deleted_sessions, deleted_assignments, deleted_notifications, deleted_credentials, deleted_responses, deleted_results);
END;
$$;

-- Función para normalizar user_id antes de insertar en exam_attempts
CREATE OR REPLACE FUNCTION public.normalize_user_id_for_attempts()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el user_id parece ser un email, intentar encontrar el UUID correspondiente
  IF NEW.user_id::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    -- Buscar el UUID del usuario por email
    SELECT id INTO NEW.user_id 
    FROM public.profiles 
    WHERE email = NEW.user_id::text;
    
    -- Si no se encuentra, mantener como texto pero generar un UUID temporal
    IF NEW.user_id IS NULL THEN
      NEW.user_id = gen_random_uuid();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para normalizar user_id en exam_attempts
DROP TRIGGER IF EXISTS normalize_user_id_trigger ON public.exam_attempts;
CREATE TRIGGER normalize_user_id_trigger
  BEFORE INSERT ON public.exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_user_id_for_attempts();
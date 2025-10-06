-- Función actualizada para purgar datos de usuarios específicos (eliminando referencias a tablas obsoletas)
CREATE OR REPLACE FUNCTION public.purge_specific_users_data(user_ids uuid[])
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  deleted_attempts INTEGER := 0;
  deleted_sessions INTEGER := 0;
  deleted_assignments INTEGER := 0;
  deleted_notifications INTEGER := 0;
  deleted_credentials INTEGER := 0;
  deleted_responses INTEGER := 0;
  deleted_results INTEGER := 0;
  deleted_analysis_cache INTEGER := 0;
  deleted_htp_submissions INTEGER := 0;
  deleted_htp_analysis INTEGER := 0;
  deleted_psychometric_assignments INTEGER := 0;
  deleted_respuestas_cognitivas INTEGER := 0;
  deleted_resultados_cognitivos INTEGER := 0;
  user_count INTEGER;
  user_emails TEXT[];
BEGIN
  -- Verificar que se proporcionen usuarios
  IF array_length(user_ids, 1) IS NULL OR array_length(user_ids, 1) = 0 THEN
    RETURN 'ERROR: No se especificaron usuarios para purgar';
  END IF;
  
  user_count := array_length(user_ids, 1);
  
  -- Obtener emails de los usuarios para logging
  SELECT array_agg(email) INTO user_emails
  FROM public.profiles 
  WHERE id = ANY(user_ids);
  
  -- Purgar AI analysis cache de los usuarios específicos
  BEGIN
    DELETE FROM public.ai_analysis_cache
    WHERE user_id = ANY(user_ids);
    GET DIAGNOSTICS deleted_analysis_cache = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_analysis_cache = 0;
  END;
  
  -- Purgar respuestas psicométricas
  BEGIN
    DELETE FROM public.personality_responses
    WHERE user_id = ANY(user_ids);
    GET DIAGNOSTICS deleted_responses = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_responses = 0;
  END;
  
  -- Purgar resultados psicométricas
  BEGIN
    DELETE FROM public.personality_results
    WHERE user_id = ANY(user_ids);
    GET DIAGNOSTICS deleted_results = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_results = 0;
  END;
  
  -- Purgar respuestas cognitivas
  BEGIN
    DELETE FROM public.respuestas_cognitivas
    WHERE user_id = ANY(user_ids);
    GET DIAGNOSTICS deleted_respuestas_cognitivas = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_respuestas_cognitivas = 0;
  END;
  
  -- Purgar resultados cognitivos
  BEGIN
    DELETE FROM public.resultados_cognitivos
    WHERE user_id = ANY(user_ids);
    GET DIAGNOSTICS deleted_resultados_cognitivos = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_resultados_cognitivos = 0;
  END;
  
  -- Purgar intentos de examen
  BEGIN
    DELETE FROM public.exam_attempts
    WHERE user_id = ANY(user_ids);
    GET DIAGNOSTICS deleted_attempts = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_attempts = 0;
  END;
  
  -- Purgar sesiones de examen (por user_id como texto)
  BEGIN
    DELETE FROM public.exam_sessions
    WHERE user_id = ANY(SELECT u.id::text FROM unnest(user_ids) u(id))
       OR user_id = ANY(user_emails);
    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_sessions = 0;
  END;
  
  -- Purgar asignaciones de examen
  BEGIN
    DELETE FROM public.exam_assignments
    WHERE user_id = ANY(user_ids);
    GET DIAGNOSTICS deleted_assignments = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_assignments = 0;
  END;
  
  -- Purgar asignaciones psicométricas
  BEGIN
    DELETE FROM public.psychometric_assignments
    WHERE user_id = ANY(user_ids);
    GET DIAGNOSTICS deleted_psychometric_assignments = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_psychometric_assignments = 0;
  END;
  
  -- Purgar credenciales de examen por email
  BEGIN
    DELETE FROM public.exam_credentials
    WHERE user_email = ANY(user_emails);
    GET DIAGNOSTICS deleted_credentials = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_credentials = 0;
  END;
  
  -- Purgar notificaciones de email
  BEGIN
    DELETE FROM public.exam_email_notifications
    WHERE user_email = ANY(user_emails);
    GET DIAGNOSTICS deleted_notifications = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_notifications = 0;
  END;
  
  -- Purgar submissions HTP
  BEGIN
    DELETE FROM public.htp_submissions
    WHERE user_id = ANY(user_ids);
    GET DIAGNOSTICS deleted_htp_submissions = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_htp_submissions = 0;
  END;
  
  -- Purgar análisis HTP
  BEGIN
    DELETE FROM public.htp_analysis
    WHERE user_id = ANY(user_ids);
    GET DIAGNOSTICS deleted_htp_analysis = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    deleted_htp_analysis = 0;
  END;
  
  -- Resetear flags de los usuarios específicos
  BEGIN
    UPDATE public.profiles 
    SET exam_completed = false, 
        last_exam_completed_at = NULL,
        access_restricted = false
    WHERE id = ANY(user_ids);
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar si hay errores en la actualización
    NULL;
  END;
  
  RETURN FORMAT('PURGADO DE %s USUARIOS - Cache: %s, Intentos: %s, Sesiones: %s, Asignaciones: %s, Notificaciones: %s, Credenciales: %s, Respuestas Psico: %s, Resultados Psico: %s, Respuestas Cogni: %s, Resultados Cogni: %s, HTP Submissions: %s, HTP Análisis: %s, Asignaciones Psico: %s', 
    user_count, deleted_analysis_cache, deleted_attempts, deleted_sessions, deleted_assignments, deleted_notifications, deleted_credentials, deleted_responses, deleted_results, deleted_respuestas_cognitivas, deleted_resultados_cognitivos, deleted_htp_submissions, deleted_htp_analysis, deleted_psychometric_assignments);
END;
$function$;
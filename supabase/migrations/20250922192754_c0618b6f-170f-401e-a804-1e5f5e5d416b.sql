-- Función actualizada para eliminar un usuario y todas sus dependencias (sin referencias a tablas obsoletas)
CREATE OR REPLACE FUNCTION public.delete_user_cascade(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_profile RECORD;
  deleted_count INTEGER := 0;
  result_text TEXT := '';
BEGIN
  -- Verificar que el usuario existe
  SELECT * INTO user_profile FROM public.profiles WHERE id = target_user_id;
  
  IF user_profile IS NULL THEN
    RETURN 'ERROR: Usuario no encontrado';
  END IF;
  
  result_text := 'Eliminando usuario: ' || user_profile.full_name || ' (' || user_profile.email || ')' || chr(10);
  
  -- Eliminar AI analysis cache
  BEGIN
    DELETE FROM public.ai_analysis_cache WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminados ' || deleted_count || ' análisis AI cache' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla ai_analysis_cache no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar respuestas psicométricas
  BEGIN
    DELETE FROM public.personality_responses WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminadas ' || deleted_count || ' respuestas psicométricas' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla personality_responses no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar resultados psicométricos
  BEGIN
    DELETE FROM public.personality_results WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminados ' || deleted_count || ' resultados psicométricos' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla personality_results no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar respuestas cognitivas
  BEGIN
    DELETE FROM public.respuestas_cognitivas WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminadas ' || deleted_count || ' respuestas cognitivas' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla respuestas_cognitivas no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar resultados cognitivos
  BEGIN
    DELETE FROM public.resultados_cognitivos WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminados ' || deleted_count || ' resultados cognitivos' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla resultados_cognitivos no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar intentos de examen (nueva tabla que reemplazó examen_aplicante)
  BEGIN
    DELETE FROM public.exam_attempts WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminados ' || deleted_count || ' intentos de examen' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla exam_attempts no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar sesiones de examen donde el user_id coincide
  BEGIN
    DELETE FROM public.exam_sessions WHERE user_id = target_user_id::text;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminadas ' || deleted_count || ' sesiones de examen' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla exam_sessions no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar asignaciones de examen
  BEGIN
    DELETE FROM public.exam_assignments WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminadas ' || deleted_count || ' asignaciones de examen' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla exam_assignments no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar asignaciones psicométricas
  BEGIN
    DELETE FROM public.psychometric_assignments WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminadas ' || deleted_count || ' asignaciones psicométricas' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla psychometric_assignments no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar credenciales de examen por email
  BEGIN
    DELETE FROM public.exam_credentials WHERE user_email = user_profile.email;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminadas ' || deleted_count || ' credenciales de examen' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla exam_credentials no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar notificaciones de email
  BEGIN
    DELETE FROM public.exam_email_notifications WHERE user_email = user_profile.email;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminadas ' || deleted_count || ' notificaciones de email' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla exam_email_notifications no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar submissions HTP
  BEGIN
    DELETE FROM public.htp_submissions WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminadas ' || deleted_count || ' submissions HTP' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla htp_submissions no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar análisis HTP
  BEGIN
    DELETE FROM public.htp_analysis WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminados ' || deleted_count || ' análisis HTP' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla htp_analysis no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar asignaciones HTP
  BEGIN
    DELETE FROM public.htp_assignments WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminadas ' || deleted_count || ' asignaciones HTP' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla htp_assignments no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar inscripciones en cursos
  BEGIN
    DELETE FROM public.course_enrollments WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminadas ' || deleted_count || ' inscripciones en cursos' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla course_enrollments no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar cursos creados por el usuario (si es instructor)
  BEGIN
    DELETE FROM public.courses WHERE instructor_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminados ' || deleted_count || ' cursos' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla courses no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar exámenes creados por el usuario
  BEGIN
    DELETE FROM public.exams WHERE created_by = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminados ' || deleted_count || ' exámenes' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla exams no existe (saltando)' || chr(10);
  END;
  
  -- Eliminar factores personales
  BEGIN
    DELETE FROM public.personal_factors WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || 'Eliminados ' || deleted_count || ' factores personales' || chr(10);
  EXCEPTION WHEN undefined_table THEN
    result_text := result_text || 'Tabla personal_factors no existe (saltando)' || chr(10);
  END;
  
  -- Por último, eliminar el perfil
  DELETE FROM public.profiles WHERE id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminado perfil de usuario' || chr(10);
  
  RETURN result_text || 'Usuario eliminado exitosamente con todas sus dependencias';
END;
$function$;
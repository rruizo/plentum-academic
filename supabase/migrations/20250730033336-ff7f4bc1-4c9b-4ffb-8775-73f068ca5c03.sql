-- Función para eliminar un usuario y todas sus dependencias
CREATE OR REPLACE FUNCTION public.delete_user_cascade(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
  
  -- Eliminar respuestas psicométricas
  DELETE FROM public.personality_responses WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminadas ' || deleted_count || ' respuestas psicométricas' || chr(10);
  
  -- Eliminar resultados psicométricos
  DELETE FROM public.personality_results WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminados ' || deleted_count || ' resultados psicométricos' || chr(10);
  
  -- Eliminar respuestas cognitivas
  DELETE FROM public.respuestas_cognitivas WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminadas ' || deleted_count || ' respuestas cognitivas' || chr(10);
  
  -- Eliminar resultados cognitivos
  DELETE FROM public.resultados_cognitivos WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminados ' || deleted_count || ' resultados cognitivos' || chr(10);
  
  -- Eliminar intentos de examen
  DELETE FROM public.exam_attempts WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminados ' || deleted_count || ' intentos de examen' || chr(10);
  
  -- Eliminar sesiones de evaluación
  DELETE FROM public.sesiones_evaluacion_aspirante WHERE id_aspirante = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminadas ' || deleted_count || ' sesiones de evaluación' || chr(10);
  
  -- Eliminar exámenes aplicante
  DELETE FROM public.examen_aplicante WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminados ' || deleted_count || ' exámenes aplicante' || chr(10);
  
  -- Eliminar sesiones de examen donde el user_id coincide
  DELETE FROM public.exam_sessions WHERE user_id = target_user_id::text;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminadas ' || deleted_count || ' sesiones de examen' || chr(10);
  
  -- Eliminar asignaciones de examen
  DELETE FROM public.exam_assignments WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminadas ' || deleted_count || ' asignaciones de examen' || chr(10);
  
  -- Eliminar credenciales de examen por email
  DELETE FROM public.exam_credentials WHERE user_email = user_profile.email;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminadas ' || deleted_count || ' credenciales de examen' || chr(10);
  
  -- Eliminar notificaciones de email
  DELETE FROM public.exam_email_notifications WHERE user_email = user_profile.email;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminadas ' || deleted_count || ' notificaciones de email' || chr(10);
  
  -- Eliminar inscripciones en cursos
  DELETE FROM public.course_enrollments WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminadas ' || deleted_count || ' inscripciones en cursos' || chr(10);
  
  -- Eliminar cursos creados por el usuario (si es instructor)
  DELETE FROM public.courses WHERE instructor_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminados ' || deleted_count || ' cursos' || chr(10);
  
  -- Eliminar exámenes creados por el usuario
  DELETE FROM public.exams WHERE created_by = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminados ' || deleted_count || ' exámenes' || chr(10);
  
  -- Por último, eliminar el perfil
  DELETE FROM public.profiles WHERE id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_text := result_text || 'Eliminado perfil de usuario' || chr(10);
  
  RETURN result_text || 'Usuario eliminado exitosamente con todas sus dependencias';
END;
$$;

-- Función para resetear el sistema dejando solo el admin especificado
CREATE OR REPLACE FUNCTION public.reset_system_to_admin_only(admin_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  admin_user_id UUID;
  user_record RECORD;
  deleted_users INTEGER := 0;
  result_text TEXT := '';
BEGIN
  -- Buscar el admin por email
  SELECT id INTO admin_user_id FROM public.profiles WHERE email = admin_email AND role = 'admin';
  
  IF admin_user_id IS NULL THEN
    RETURN 'ERROR: No se encontró usuario admin con email ' || admin_email;
  END IF;
  
  result_text := 'Iniciando reset del sistema manteniendo admin: ' || admin_email || chr(10);
  
  -- Purgar todos los datos de prueba primero
  result_text := result_text || 'Purgando datos de prueba...' || chr(10);
  PERFORM public.purge_test_data();
  
  -- Eliminar todos los usuarios excepto el admin especificado
  FOR user_record IN 
    SELECT id, full_name, email 
    FROM public.profiles 
    WHERE id != admin_user_id
  LOOP
    result_text := result_text || 'Eliminando usuario: ' || user_record.full_name || ' (' || user_record.email || ')' || chr(10);
    PERFORM public.delete_user_cascade(user_record.id);
    deleted_users := deleted_users + 1;
  END LOOP;
  
  RETURN result_text || 'Sistema reseteado exitosamente. Eliminados ' || deleted_users || ' usuarios. Admin ' || admin_email || ' mantenido.';
END;
$$;
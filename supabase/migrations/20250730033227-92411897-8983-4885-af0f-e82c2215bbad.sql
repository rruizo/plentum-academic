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
BEGIN
  -- Verificar que el usuario existe
  SELECT * INTO user_profile FROM public.profiles WHERE id = target_user_id;
  
  IF user_profile IS NULL THEN
    RETURN 'ERROR: Usuario no encontrado';
  END IF;
  
  -- Eliminar respuestas psicométricas
  DELETE FROM public.personality_responses WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminadas % respuestas psicométricas', deleted_count;
  
  -- Eliminar resultados psicométricos
  DELETE FROM public.personality_results WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % resultados psicométricos', deleted_count;
  
  -- Eliminar respuestas cognitivas
  DELETE FROM public.respuestas_cognitivas WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminadas % respuestas cognitivas', deleted_count;
  
  -- Eliminar resultados cognitivos
  DELETE FROM public.resultados_cognitivos WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % resultados cognitivos', deleted_count;
  
  -- Eliminar intentos de examen
  DELETE FROM public.exam_attempts WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % intentos de examen', deleted_count;
  
  -- Eliminar sesiones de evaluación
  DELETE FROM public.sesiones_evaluacion_aspirante WHERE id_aspirante = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminadas % sesiones de evaluación', deleted_count;
  
  -- Eliminar exámenes aplicante
  DELETE FROM public.examen_aplicante WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % exámenes aplicante', deleted_count;
  
  -- Eliminar sesiones de examen donde el user_id coincide
  DELETE FROM public.exam_sessions WHERE user_id = target_user_id::text;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminadas % sesiones de examen', deleted_count;
  
  -- Eliminar asignaciones de examen
  DELETE FROM public.exam_assignments WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminadas % asignaciones de examen', deleted_count;
  
  -- Eliminar credenciales de examen por email
  DELETE FROM public.exam_credentials WHERE user_email = user_profile.email;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminadas % credenciales de examen', deleted_count;
  
  -- Eliminar notificaciones de email
  DELETE FROM public.exam_email_notifications WHERE user_email = user_profile.email;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminadas % notificaciones de email', deleted_count;
  
  -- Eliminar inscripciones en cursos
  DELETE FROM public.course_enrollments WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminadas % inscripciones en cursos', deleted_count;
  
  -- Eliminar cursos creados por el usuario (si es instructor)
  DELETE FROM public.courses WHERE instructor_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % cursos', deleted_count;
  
  -- Eliminar exámenes creados por el usuario
  DELETE FROM public.exams WHERE created_by = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminados % exámenes', deleted_count;
  
  -- Por último, eliminar el perfil
  DELETE FROM public.profiles WHERE id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Eliminado perfil de usuario', deleted_count;
  
  RETURN FORMAT('Usuario %s (%s) eliminado exitosamente con todas sus dependencias', 
    user_profile.full_name, user_profile.email);
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
BEGIN
  -- Buscar el admin por email
  SELECT id INTO admin_user_id FROM public.profiles WHERE email = admin_email AND role = 'admin';
  
  IF admin_user_id IS NULL THEN
    RETURN FORMAT('ERROR: No se encontró usuario admin con email %s', admin_email);
  END IF;
  
  -- Purgar todos los datos de prueba primero
  PERFORM public.purge_test_data();
  
  -- Eliminar todos los usuarios excepto el admin especificado
  FOR user_record IN 
    SELECT id, full_name, email 
    FROM public.profiles 
    WHERE id != admin_user_id
  LOOP
    -- Llamar a la función de eliminación en cascada
    PERFORM public.delete_user_cascade(user_record.id);
    deleted_users := deleted_users + 1;
    RAISE NOTICE 'Eliminado usuario: % (%)', user_record.full_name, user_record.email;
  END LOOP;
  
  RETURN FORMAT('Sistema reseteado exitosamente. Eliminados %s usuarios. Admin %s mantenido.', 
    deleted_users, admin_email);
END;
$$;
-- Limpiar usuarios de prueba existentes
-- Primero eliminamos registros relacionados para evitar errores de foreign key

-- Eliminar asignaciones de exámenes de usuarios de prueba
DELETE FROM public.exam_assignments 
WHERE user_id IN (
  SELECT auth.users.id 
  FROM auth.users 
  WHERE email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com')
);

-- Eliminar credenciales de examen de usuarios de prueba
DELETE FROM public.exam_credentials 
WHERE user_email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com');

-- Eliminar sesiones de examen de usuarios de prueba
DELETE FROM public.exam_sessions 
WHERE user_id IN (
  SELECT auth.users.id::text 
  FROM auth.users 
  WHERE email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com')
);

-- Eliminar notificaciones de email de usuarios de prueba
DELETE FROM public.exam_email_notifications 
WHERE user_email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com');

-- Eliminar intentos de examen de usuarios de prueba
DELETE FROM public.exam_attempts 
WHERE user_id IN (
  SELECT auth.users.id 
  FROM auth.users 
  WHERE email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com')
);

-- Eliminar resultados de personalidad de usuarios de prueba
DELETE FROM public.personality_results 
WHERE user_id IN (
  SELECT auth.users.id 
  FROM auth.users 
  WHERE email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com')
);

-- Eliminar respuestas de personalidad de usuarios de prueba
DELETE FROM public.personality_responses 
WHERE user_id IN (
  SELECT auth.users.id 
  FROM auth.users 
  WHERE email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com')
);

-- Eliminar resultados cognitivos de usuarios de prueba
DELETE FROM public.resultados_cognitivos 
WHERE user_id IN (
  SELECT auth.users.id 
  FROM auth.users 
  WHERE email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com')
);

-- Eliminar respuestas cognitivas de usuarios de prueba
DELETE FROM public.respuestas_cognitivas 
WHERE user_id IN (
  SELECT auth.users.id 
  FROM auth.users 
  WHERE email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com')
);

-- Eliminar de audit de roles si existe
DELETE FROM public.role_change_audit 
WHERE user_id IN (
  SELECT auth.users.id 
  FROM auth.users 
  WHERE email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com')
);

-- Los perfiles se eliminarán automáticamente por CASCADE cuando eliminemos auth.users

-- Finalmente, eliminar usuarios de auth.users (esto eliminará profiles por CASCADE)
DELETE FROM auth.users 
WHERE email IN ('sinoselseco@gmail.com', 'rruiz@kuminova.com');
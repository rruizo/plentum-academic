-- Limpieza básica de datos de prueba (sin crear usuarios nuevos)

-- 1. Limpiar datos de evaluaciones y notificaciones
DELETE FROM public.exam_email_notifications;
DELETE FROM public.exam_assignments;
DELETE FROM public.exam_attempts;
DELETE FROM public.respuestas_cognitivas;
DELETE FROM public.personality_responses;
DELETE FROM public.resultados_cognitivos;
DELETE FROM public.personality_results;
DELETE FROM public.sesiones_evaluacion_aspirante;
DELETE FROM public.respuestas_preguntas_aspirante;
DELETE FROM public.exam_sessions;
DELETE FROM public.exam_credentials;

-- 2. Eliminar usuarios que no sean admin o teacher
DELETE FROM public.profiles 
WHERE role NOT IN ('admin', 'teacher');

-- 3. Crear examen de prueba para flujo masivo
INSERT INTO public.exams (
  id,
  title,
  description,
  created_by,
  estado,
  duracion_minutos,
  fecha_apertura,
  fecha_cierre,
  is_randomized,
  simulation_threshold
) VALUES (
  gen_random_uuid(),
  'Examen Prueba - Flujo Masivo',
  'Examen configurado para probar la carga masiva y envío de invitaciones',
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  'activo',
  60,
  NOW(),
  NOW() + INTERVAL '30 days',
  true,
  5.0
);

-- 4. Limpiar configuraciones de reportes antiguas
DELETE FROM public.report_config 
WHERE created_at < NOW() - INTERVAL '7 days';

-- 5. Configurar sistema con el nuevo correo
UPDATE public.system_config 
SET 
  resend_from_email = 'examen@plentum-academic.com.mx',
  resend_from_name = 'Plentum Academic',
  updated_at = NOW()
WHERE id IS NOT NULL;

-- 6. Insertar configuración por defecto si no existe
INSERT INTO public.system_config (
  system_name,
  resend_from_email,
  resend_from_name,
  primary_color,
  secondary_color,
  contact_email,
  support_email
) 
SELECT 
  'Plentum Academic',
  'examen@plentum-academic.com.mx',
  'Plentum Academic',
  '#3b82f6',
  '#1e40af',
  'contacto@plentum-academic.com.mx',
  'soporte@plentum-academic.com.mx'
WHERE NOT EXISTS (SELECT 1 FROM public.system_config);
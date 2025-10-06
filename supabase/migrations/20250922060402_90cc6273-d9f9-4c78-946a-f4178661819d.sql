-- PASO 1: CONSOLIDACIÓN DE ANÁLISIS CACHE
-- Migrar datos de exam_analysis_cache a ai_analysis_cache
INSERT INTO public.ai_analysis_cache (
  user_id,
  exam_id,
  analysis_type,
  input_data_hash,
  input_data,
  ai_analysis_result,
  generated_at,
  created_at,
  updated_at,
  requested_by
)
SELECT 
  -- Obtener user_id desde exam_sessions
  (SELECT CASE 
    WHEN es.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN es.user_id::uuid
    ELSE (SELECT id FROM profiles WHERE email = es.user_id LIMIT 1)
   END
   FROM exam_sessions es WHERE es.id = eac.exam_session_id) as user_id,
  
  -- Obtener exam_id desde exam_sessions
  (SELECT exam_id FROM exam_sessions es WHERE es.id = eac.exam_session_id) as exam_id,
  
  eac.analysis_type,
  md5(eac.analysis_input::text) as input_data_hash,
  COALESCE(eac.analysis_input, '{}'::jsonb) as input_data,
  eac.analysis_result as ai_analysis_result,
  eac.generated_at,
  eac.created_at,
  eac.updated_at,
  
  -- Usar el user_id como requested_by por defecto
  (SELECT CASE 
    WHEN es.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN es.user_id::uuid
    ELSE (SELECT id FROM profiles WHERE email = es.user_id LIMIT 1)
   END
   FROM exam_sessions es WHERE es.id = eac.exam_session_id) as requested_by

FROM public.exam_analysis_cache eac
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_analysis_cache aac 
  WHERE aac.input_data_hash = md5(eac.analysis_input::text)
  AND aac.analysis_type = eac.analysis_type
  AND aac.user_id = (SELECT CASE 
    WHEN es.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN es.user_id::uuid
    ELSE (SELECT id FROM profiles WHERE email = es.user_id LIMIT 1)
   END
   FROM exam_sessions es WHERE es.id = eac.exam_session_id)
);

-- PASO 2: MIGRACIÓN DE EXAMEN_APLICANTE A EXAM_ATTEMPTS
-- Migrar datos de examen_aplicante a exam_attempts
INSERT INTO public.exam_attempts (
  id,
  exam_id,
  user_id,
  questions,
  answers,
  score,
  started_at,
  completed_at,
  created_at
)
SELECT 
  ea.id,
  ea.examen_id as exam_id,
  ea.user_id,
  '{}'::jsonb as questions, -- Placeholder, se llenará con datos reales si están disponibles
  '{}'::jsonb as answers,   -- Placeholder, se llenará con datos reales si están disponibles
  ea.puntaje_total as score,
  ea.fecha_inicio as started_at,
  ea.fecha_finalizacion as completed_at,
  ea.created_at
FROM public.examen_aplicante ea
WHERE NOT EXISTS (
  SELECT 1 FROM public.exam_attempts eat 
  WHERE eat.id = ea.id
)
AND ea.user_id IS NOT NULL
AND ea.examen_id IS NOT NULL;

-- PASO 3: ACTUALIZAR REFERENCIAS EN OTRAS TABLAS
-- Si hay alguna tabla que referencie exam_analysis_cache, actualizarla
-- (No encontré referencias directas, pero es buena práctica verificar)

-- PASO 4: ELIMINAR TABLAS DUPLICADAS
-- Eliminar exam_analysis_cache después de migrar
DROP TABLE IF EXISTS public.exam_analysis_cache;

-- Eliminar examen_aplicante después de migrar
DROP TABLE IF EXISTS public.examen_aplicante;
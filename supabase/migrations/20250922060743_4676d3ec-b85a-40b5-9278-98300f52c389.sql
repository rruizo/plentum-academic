-- PRIMERO: Remover constraint existente y crear uno más amplio
ALTER TABLE public.ai_analysis_cache DROP CONSTRAINT IF EXISTS ai_analysis_cache_analysis_type_check;

-- Crear constraint que incluya todos los valores existentes y futuros
ALTER TABLE public.ai_analysis_cache 
ADD CONSTRAINT ai_analysis_cache_analysis_type_check 
CHECK (analysis_type IN (
  'reliability',
  'reliability_analysis',
  'psychometric_analysis', 
  'cognitive_analysis',
  'htp_analysis',
  'openai_analysis',
  'openai_psicometrico',
  'auto_completion_log',
  'exam_completion',
  'personality_analysis'
));

-- PASO 1: CONSOLIDACIÓN DE ANÁLISIS CACHE
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
  COALESCE(
    (SELECT CASE 
      WHEN es.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN es.user_id::uuid
      ELSE (SELECT id FROM profiles WHERE email = es.user_id LIMIT 1)
     END
     FROM exam_sessions es WHERE es.id = eac.exam_session_id),
    gen_random_uuid()
  ) as user_id,
  
  (SELECT exam_id FROM exam_sessions es WHERE es.id = eac.exam_session_id) as exam_id,
  
  -- Mapear analysis_type correctamente
  CASE 
    WHEN eac.analysis_type = 'openai_psicometrico' THEN 'psychometric_analysis'
    WHEN eac.analysis_type = 'openai_analysis' THEN 'reliability_analysis'
    ELSE eac.analysis_type
  END as analysis_type,
  
  md5(COALESCE(eac.analysis_input::text, eac.id::text)) as input_data_hash,
  COALESCE(eac.analysis_input, '{}'::jsonb) as input_data,
  eac.analysis_result as ai_analysis_result,
  eac.generated_at,
  eac.created_at,
  eac.updated_at,
  
  COALESCE(
    (SELECT CASE 
      WHEN es.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN es.user_id::uuid
      ELSE (SELECT id FROM profiles WHERE email = es.user_id LIMIT 1)
     END
     FROM exam_sessions es WHERE es.id = eac.exam_session_id),
    gen_random_uuid()
  ) as requested_by

FROM public.exam_analysis_cache eac
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_analysis_cache aac 
  WHERE aac.input_data_hash = md5(COALESCE(eac.analysis_input::text, eac.id::text))
);

-- PASO 2: MIGRACIÓN DE EXAMEN_APLICANTE A EXAM_ATTEMPTS
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
  '{}'::jsonb as questions,
  '{}'::jsonb as answers,
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

-- PASO 3: ELIMINAR TABLAS DUPLICADAS
DROP TABLE IF EXISTS public.exam_analysis_cache;
DROP TABLE IF EXISTS public.examen_aplicante;
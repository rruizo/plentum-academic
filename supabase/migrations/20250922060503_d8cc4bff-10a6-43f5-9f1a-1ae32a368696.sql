-- PRIMERO: Actualizar constraint de analysis_type para permitir todos los valores existentes
ALTER TABLE public.ai_analysis_cache DROP CONSTRAINT IF EXISTS ai_analysis_cache_analysis_type_check;

-- Agregar constraint más permisivo
ALTER TABLE public.ai_analysis_cache 
ADD CONSTRAINT ai_analysis_cache_analysis_type_check 
CHECK (analysis_type IN (
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

-- PASO 1: CONSOLIDACIÓN DE ANÁLISIS CACHE (versión corregida)
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
  COALESCE(
    (SELECT CASE 
      WHEN es.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN es.user_id::uuid
      ELSE (SELECT id FROM profiles WHERE email = es.user_id LIMIT 1)
     END
     FROM exam_sessions es WHERE es.id = eac.exam_session_id),
    gen_random_uuid() -- fallback si no se encuentra
  ) as user_id,
  
  -- Obtener exam_id desde exam_sessions
  (SELECT exam_id FROM exam_sessions es WHERE es.id = eac.exam_session_id) as exam_id,
  
  -- Mapear analysis_type a valores válidos
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
  
  -- Usar el user_id como requested_by por defecto
  COALESCE(
    (SELECT CASE 
      WHEN es.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN es.user_id::uuid
      ELSE (SELECT id FROM profiles WHERE email = es.user_id LIMIT 1)
     END
     FROM exam_sessions es WHERE es.id = eac.exam_session_id),
    gen_random_uuid() -- fallback si no se encuentra
  ) as requested_by

FROM public.exam_analysis_cache eac
ON CONFLICT (input_data_hash, analysis_type, user_id) DO NOTHING;
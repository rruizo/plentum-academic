-- COMPLETAR LA ELIMINACIÓN DE LA TABLA DUPLICADA RESTANTE
-- Primero verificar si quedan datos importantes en exam_analysis_cache
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count FROM public.exam_analysis_cache;
    
    IF record_count > 0 THEN
        RAISE NOTICE 'exam_analysis_cache contiene % registros, migrando antes de eliminar', record_count;
        
        -- Migrar cualquier dato restante
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
          eac.analysis_type,
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
        )
        ON CONFLICT (input_data_hash, analysis_type, user_id) DO NOTHING;
        
    END IF;
END $$;

-- Ahora eliminar la tabla duplicada
DROP TABLE IF EXISTS public.exam_analysis_cache CASCADE;
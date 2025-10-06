-- Script para revisar los análisis de OpenAI guardados
-- Ejecutar en Supabase SQL Editor

-- 1. Ver todos los análisis guardados con información básica
SELECT 
    id,
    user_id,
    analysis_type,
    model_used,
    generated_at,
    expires_at,
    is_active,
    tokens_used,
    CASE 
        WHEN ai_analysis_result->>'analysis' IS NOT NULL THEN 'Tiene análisis'
        ELSE 'Sin análisis'
    END as has_analysis,
    CASE 
        WHEN ai_analysis_result->>'conclusions' IS NOT NULL THEN 'Tiene conclusiones'
        ELSE 'Sin conclusiones'
    END as has_conclusions
FROM ai_analysis_cache 
WHERE analysis_type = 'reliability'
ORDER BY generated_at DESC;

-- 2. Ver el contenido completo de los análisis (últimos 5)
SELECT 
    id,
    user_id,
    generated_at,
    ai_analysis_result->>'analysis' as analysis_text,
    ai_analysis_result->>'conclusions' as conclusions_text,
    LENGTH(ai_analysis_result->>'analysis') as analysis_length,
    LENGTH(ai_analysis_result->>'conclusions') as conclusions_length
FROM ai_analysis_cache 
WHERE analysis_type = 'reliability'
    AND is_active = true
ORDER BY generated_at DESC
LIMIT 5;

-- 3. Estadísticas de los análisis
SELECT 
    COUNT(*) as total_analyses,
    COUNT(CASE WHEN is_active THEN 1 END) as active_analyses,
    COUNT(CASE WHEN ai_analysis_result->>'analysis' IS NOT NULL THEN 1 END) as with_analysis,
    COUNT(CASE WHEN ai_analysis_result->>'conclusions' IS NOT NULL THEN 1 END) as with_conclusions,
    AVG(tokens_used) as avg_tokens,
    MIN(generated_at) as oldest_analysis,
    MAX(generated_at) as newest_analysis
FROM ai_analysis_cache 
WHERE analysis_type = 'reliability';

-- 4. Ver análisis por usuario específico (cambiar el user_id)
-- SELECT 
--     id,
--     generated_at,
--     ai_analysis_result->>'analysis' as analysis_text,
--     ai_analysis_result->>'conclusions' as conclusions_text
-- FROM ai_analysis_cache 
-- WHERE analysis_type = 'reliability'
--     AND user_id = 'TU_USER_ID_AQUI'
--     AND is_active = true
-- ORDER BY generated_at DESC;

-- 5. Buscar análisis que contengan palabras específicas
-- SELECT 
--     id,
--     user_id,
--     generated_at,
--     ai_analysis_result->>'analysis' as analysis_text
-- FROM ai_analysis_cache 
-- WHERE analysis_type = 'reliability'
--     AND (
--         ai_analysis_result->>'analysis' ILIKE '%riesgo%' OR
--         ai_analysis_result->>'analysis' ILIKE '%confiabilidad%' OR
--         ai_analysis_result->>'conclusions' ILIKE '%recomendación%'
--     )
--     AND is_active = true
-- ORDER BY generated_at DESC;
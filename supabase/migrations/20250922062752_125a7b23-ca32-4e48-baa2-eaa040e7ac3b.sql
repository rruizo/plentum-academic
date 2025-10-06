-- ELIMINACIÓN DIRECTA DE LA TABLA DUPLICADA
-- Sin intentar migrar más datos ya que los importantes ya se migraron
DROP TABLE IF EXISTS public.exam_analysis_cache CASCADE;
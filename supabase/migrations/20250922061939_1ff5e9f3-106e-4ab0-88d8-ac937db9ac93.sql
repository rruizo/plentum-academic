-- MIGRACIÓN COMPLETA CON DEPENDENCIAS

-- PASO 1: Migrar respuesta_aplicante (equivalente a respuestas en exam_attempts)
-- Actualizar las respuestas en exam_attempts con datos de respuesta_aplicante
UPDATE exam_attempts 
SET answers = (
  SELECT jsonb_object_agg(
    ra.pregunta_id::text, 
    jsonb_build_object(
      'answer', ra.respuesta_texto,
      'score', ra.puntaje_obtenido,
      'timestamp', ra.timestamp_respuesta
    )
  )
  FROM respuesta_aplicante ra 
  WHERE ra.examen_aplicante_id = exam_attempts.id
  GROUP BY ra.examen_aplicante_id
)
WHERE EXISTS (
  SELECT 1 FROM respuesta_aplicante ra 
  WHERE ra.examen_aplicante_id = exam_attempts.id
);

-- PASO 2: Crear tabla unificada para resultados por categoría si no existe
CREATE TABLE IF NOT EXISTS exam_category_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_attempt_id uuid NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL,
  total_questions integer NOT NULL,
  total_score integer NOT NULL,
  difference numeric NOT NULL,
  risk_interpretation text NOT NULL,
  simulation_alert boolean DEFAULT false,
  population_average text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en la nueva tabla
ALTER TABLE exam_category_results ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para exam_category_results 
CREATE POLICY "Users can view their own category results" 
ON exam_category_results FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM exam_attempts ea 
  WHERE ea.id = exam_category_results.exam_attempt_id 
  AND ea.user_id = auth.uid()
));

CREATE POLICY "Admins and teachers can view all category results" 
ON exam_category_results FOR SELECT 
USING (user_has_admin_or_teacher_role());

-- PASO 3: Migrar datos de resultado_categoria
INSERT INTO exam_category_results (
  id,
  exam_attempt_id,
  category_id,
  total_questions,
  total_score,
  difference,
  risk_interpretation,
  simulation_alert,
  population_average,
  created_at
)
SELECT 
  rc.id,
  rc.examen_aplicante_id as exam_attempt_id,
  rc.categoria_id as category_id,
  rc.total_preguntas as total_questions,
  rc.puntaje_total as total_score,
  rc.diferencia as difference,
  rc.interpretacion_riesgo as risk_interpretation,
  COALESCE(rc.alerta_simulacion, false) as simulation_alert,
  rc.media_poblacional_total as population_average,
  rc.created_at
FROM resultado_categoria rc
WHERE EXISTS (
  SELECT 1 FROM exam_attempts ea 
  WHERE ea.id = rc.examen_aplicante_id
)
ON CONFLICT (id) DO NOTHING;

-- PASO 4: Eliminar tablas dependientes primero
DROP TABLE IF EXISTS respuesta_aplicante CASCADE;
DROP TABLE IF EXISTS resultado_categoria CASCADE;

-- PASO 5: Finalmente eliminar examen_aplicante
DROP TABLE IF EXISTS examen_aplicante CASCADE;
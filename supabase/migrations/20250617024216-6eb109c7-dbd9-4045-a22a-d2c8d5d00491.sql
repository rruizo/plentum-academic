
-- Primero, crear un índice único en la columna name si no existe
CREATE UNIQUE INDEX IF NOT EXISTS question_categories_name_unique_idx ON public.question_categories (name);

-- Actualizar la tabla de categorías para incluir el nombre específico
ALTER TABLE public.question_categories 
ADD COLUMN IF NOT EXISTS codigo_categoria TEXT;

-- Actualizar la tabla de preguntas para ajustarse a los requerimientos específicos
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS media_poblacional_pregunta DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS opciones_respuesta_fijas JSONB DEFAULT '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb;

-- Crear tabla de configuración de exámenes por categoría
CREATE TABLE IF NOT EXISTS public.examen_configuracion_categoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.question_categories(id) ON DELETE CASCADE,
  num_preguntas_a_incluir INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(examen_id, categoria_id)
);

-- Crear tabla de instancias de examen por aplicante
CREATE TABLE IF NOT EXISTS public.examen_aplicante (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fecha_finalizacion TIMESTAMP WITH TIME ZONE,
  tiempo_restante_minutos INTEGER,
  estado TEXT NOT NULL DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso', 'finalizado', 'tiempo_agotado')),
  puntaje_total DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(examen_id, user_id)
);

-- Crear tabla de respuestas de aplicantes
CREATE TABLE IF NOT EXISTS public.respuesta_aplicante (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_aplicante_id UUID NOT NULL REFERENCES public.examen_aplicante(id) ON DELETE CASCADE,
  pregunta_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  respuesta_texto TEXT NOT NULL CHECK (respuesta_texto IN ('Nunca', 'Rara vez', 'A veces', 'Frecuentemente')),
  puntaje_obtenido INTEGER NOT NULL CHECK (puntaje_obtenido BETWEEN 0 AND 3),
  timestamp_respuesta TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(examen_aplicante_id, pregunta_id)
);

-- Crear tabla de resultados por categoría
CREATE TABLE IF NOT EXISTS public.resultado_categoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_aplicante_id UUID NOT NULL REFERENCES public.examen_aplicante(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.question_categories(id) ON DELETE CASCADE,
  total_preguntas INTEGER NOT NULL,
  puntaje_total INTEGER NOT NULL,
  media_poblacional_total DECIMAL(5,2) NOT NULL,
  diferencia DECIMAL(5,2) NOT NULL,
  interpretacion_riesgo TEXT NOT NULL CHECK (interpretacion_riesgo IN ('RIESGO BAJO', 'RIESGO MEDIO', 'RIESGO ALTO')),
  alerta_simulacion BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(examen_aplicante_id, categoria_id)
);

-- Agregar campos adicionales a la tabla exams para los nuevos requerimientos
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS fecha_apertura TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS duracion_minutos INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'activo', 'finalizado', 'archivado'));

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.examen_configuracion_categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examen_aplicante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuesta_aplicante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultado_categoria ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para examen_configuracion_categoria
CREATE POLICY "Admins and teachers can manage exam category config" ON public.examen_configuracion_categoria
  FOR ALL USING (public.user_has_admin_or_teacher_role());

CREATE POLICY "Everyone can view exam category config" ON public.examen_configuracion_categoria
  FOR SELECT USING (true);

-- Políticas RLS para examen_aplicante
CREATE POLICY "Users can view their own exam attempts" ON public.examen_aplicante
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exam attempts" ON public.examen_aplicante
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam attempts" ON public.examen_aplicante
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins and teachers can view all exam attempts" ON public.examen_aplicante
  FOR SELECT USING (public.user_has_admin_or_teacher_role());

-- Políticas RLS para respuesta_aplicante
CREATE POLICY "Users can manage their own responses" ON public.respuesta_aplicante
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.examen_aplicante ea 
      WHERE ea.id = examen_aplicante_id AND ea.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and teachers can view all responses" ON public.respuesta_aplicante
  FOR SELECT USING (public.user_has_admin_or_teacher_role());

-- Políticas RLS para resultado_categoria
CREATE POLICY "Users can view their own results" ON public.resultado_categoria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.examen_aplicante ea 
      WHERE ea.id = examen_aplicante_id AND ea.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and teachers can view all results" ON public.resultado_categoria
  FOR SELECT USING (public.user_has_admin_or_teacher_role());

-- Limpiar datos de ejemplo existentes y agregar nuevos datos de ejemplo
DELETE FROM public.questions;

-- Insertar categorías basadas en la imagen de referencia (sin ON CONFLICT por ahora)
INSERT INTO public.question_categories (name, description, codigo_categoria, national_average) 
SELECT 'Abuso de confianza', 'Evaluación de comportamientos relacionados con abuso de confianza', 'ABUSO_CONF', 2.1
WHERE NOT EXISTS (SELECT 1 FROM public.question_categories WHERE name = 'Abuso de confianza');

INSERT INTO public.question_categories (name, description, codigo_categoria, national_average) 
SELECT 'Acoso sexual', 'Evaluación de comportamientos relacionados con acoso sexual', 'ACOSO_SEX', 1.8
WHERE NOT EXISTS (SELECT 1 FROM public.question_categories WHERE name = 'Acoso sexual');

INSERT INTO public.question_categories (name, description, codigo_categoria, national_average) 
SELECT 'Actitud pasiva', 'Evaluación de actitudes pasivas en el trabajo', 'ACT_PASIVA', 2.3
WHERE NOT EXISTS (SELECT 1 FROM public.question_categories WHERE name = 'Actitud pasiva');

INSERT INTO public.question_categories (name, description, codigo_categoria, national_average) 
SELECT 'Administración ética de recursos', 'Evaluación de la gestión ética de recursos', 'ADM_ETICA', 2.0
WHERE NOT EXISTS (SELECT 1 FROM public.question_categories WHERE name = 'Administración ética de recursos');

INSERT INTO public.question_categories (name, description, codigo_categoria, national_average) 
SELECT 'Alcohol', 'Evaluación de comportamientos relacionados con alcohol', 'ALCOHOL', 2.2
WHERE NOT EXISTS (SELECT 1 FROM public.question_categories WHERE name = 'Alcohol');

-- Insertar preguntas de ejemplo basadas en la imagen de referencia
INSERT INTO public.questions (category_id, question_text, question_type, options, media_poblacional_pregunta, opciones_respuesta_fijas)
SELECT 
  qc.id,
  '¿Ha accedido a recursos que no le correspondían por su jerarquía con un superior?',
  'scale',
  '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb,
  1.2,
  '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb
FROM public.question_categories qc WHERE qc.codigo_categoria = 'ABUSO_CONF'
LIMIT 1;

INSERT INTO public.questions (category_id, question_text, question_type, options, media_poblacional_pregunta, opciones_respuesta_fijas)
SELECT 
  qc.id,
  '¿Ha asignado servicios o tareas a personas cercanas sin justificarlo?',
  'scale',
  '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb,
  1.3,
  '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb
FROM public.question_categories qc WHERE qc.codigo_categoria = 'ABUSO_CONF'
LIMIT 1;

INSERT INTO public.questions (category_id, question_text, question_type, options, media_poblacional_pregunta, opciones_respuesta_fijas)
SELECT 
  qc.id,
  '¿Alguna vez hizo comentarios sobre el cuerpo de alguien?',
  'scale',
  '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb,
  1.1,
  '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb
FROM public.question_categories qc WHERE qc.codigo_categoria = 'ACOSO_SEX'
LIMIT 1;

INSERT INTO public.questions (category_id, question_text, question_type, options, media_poblacional_pregunta, opciones_respuesta_fijas)
SELECT 
  qc.id,
  '¿Espera a que otros tomen decisiones cuando algo sale mal?',
  'scale',
  '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb,
  1.5,
  '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb
FROM public.question_categories qc WHERE qc.codigo_categoria = 'ACT_PASIVA'
LIMIT 1;

-- Crear función para calcular puntaje de respuesta
CREATE OR REPLACE FUNCTION public.calcular_puntaje_respuesta(respuesta_texto TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE respuesta_texto
    WHEN 'Nunca' THEN RETURN 0;
    WHEN 'Rara vez' THEN RETURN 1;
    WHEN 'A veces' THEN RETURN 2;
    WHEN 'Frecuentemente' THEN RETURN 3;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Crear función para evaluar riesgo
CREATE OR REPLACE FUNCTION public.evaluar_riesgo(puntaje_total INTEGER, total_preguntas INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF puntaje_total >= total_preguntas * 2 THEN
    RETURN 'RIESGO ALTO';
  ELSIF puntaje_total >= total_preguntas * 1 THEN
    RETURN 'RIESGO MEDIO';
  ELSE
    RETURN 'RIESGO BAJO';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Crear función para detectar posible simulación
CREATE OR REPLACE FUNCTION public.detectar_simulacion(diferencia DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN ABS(diferencia) > 5;
END;
$$ LANGUAGE plpgsql STABLE;

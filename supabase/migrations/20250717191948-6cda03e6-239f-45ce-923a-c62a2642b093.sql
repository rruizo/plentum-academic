-- Crear tabla específica para preguntas de personalidad (modelo OCEAN)
CREATE TABLE public.personality_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  ocean_factor TEXT NOT NULL CHECK (ocean_factor IN ('apertura', 'responsabilidad', 'extraversion', 'amabilidad', 'neuroticismo', 'logro', 'poder', 'afiliacion', 'autonomia', 'seguridad', 'reconocimiento')),
  score_orientation TEXT NOT NULL DEFAULT 'positive' CHECK (score_orientation IN ('positive', 'negative')),
  likert_scale JSONB NOT NULL DEFAULT '["Totalmente en desacuerdo", "En desacuerdo", "Neutro", "De acuerdo", "Totalmente de acuerdo"]'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.personality_questions ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Everyone can view active personality questions" 
ON public.personality_questions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins and teachers can manage personality questions" 
ON public.personality_questions 
FOR ALL 
USING (user_has_admin_or_teacher_role());

-- Crear tabla para respuestas de personalidad
CREATE TABLE public.personality_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.personality_questions(id) ON DELETE CASCADE,
  response_value INTEGER NOT NULL CHECK (response_value BETWEEN 1 AND 5),
  session_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para respuestas
ALTER TABLE public.personality_responses ENABLE ROW LEVEL SECURITY;

-- Políticas para respuestas
CREATE POLICY "Users can view their own personality responses" 
ON public.personality_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personality responses" 
ON public.personality_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and teachers can view all personality responses" 
ON public.personality_responses 
FOR SELECT 
USING (user_has_admin_or_teacher_role());

-- Crear tabla para resultados de personalidad (puntuaciones OCEAN)
CREATE TABLE public.personality_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  apertura_score NUMERIC(5,2) NOT NULL,
  responsabilidad_score NUMERIC(5,2) NOT NULL,
  extraversion_score NUMERIC(5,2) NOT NULL,
  amabilidad_score NUMERIC(5,2) NOT NULL,
  neuroticismo_score NUMERIC(5,2) NOT NULL,
  logro_score NUMERIC(5,2),
  poder_score NUMERIC(5,2),
  afiliacion_score NUMERIC(5,2),
  autonomia_score NUMERIC(5,2),
  seguridad_score NUMERIC(5,2),
  reconocimiento_score NUMERIC(5,2),
  ai_interpretation JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para resultados
ALTER TABLE public.personality_results ENABLE ROW LEVEL SECURITY;

-- Políticas para resultados
CREATE POLICY "Users can view their own personality results" 
ON public.personality_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personality results" 
ON public.personality_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and teachers can view all personality results" 
ON public.personality_results 
FOR SELECT 
USING (user_has_admin_or_teacher_role());

-- Crear función trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_personality_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER update_personality_questions_updated_at
  BEFORE UPDATE ON public.personality_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_personality_questions_updated_at();

-- Insertar preguntas de ejemplo para cada factor OCEAN
INSERT INTO public.personality_questions (question_text, ocean_factor, score_orientation, order_index) VALUES
-- Apertura (10 preguntas)
('Me gusta experimentar con nuevas ideas y conceptos', 'apertura', 'positive', 1),
('Prefiero mantener las rutinas establecidas', 'apertura', 'negative', 2),
('Disfruto de actividades artísticas y creativas', 'apertura', 'positive', 3),
('Me siento cómodo con lo tradicional y convencional', 'apertura', 'negative', 4),
('Me gusta explorar diferentes formas de hacer las cosas', 'apertura', 'positive', 5),

-- Responsabilidad (10 preguntas)
('Siempre cumplo con mis compromisos y plazos', 'responsabilidad', 'positive', 6),
('A veces dejo las tareas importantes para después', 'responsabilidad', 'negative', 7),
('Soy muy organizado en mi trabajo y vida personal', 'responsabilidad', 'positive', 8),
('Me cuesta mantener el orden en mis espacios', 'responsabilidad', 'negative', 9),
('Planifico cuidadosamente antes de actuar', 'responsabilidad', 'positive', 10),

-- Extraversión (10 preguntas)
('Me siento energizado cuando estoy con otras personas', 'extraversion', 'positive', 11),
('Prefiero trabajar solo que en equipo', 'extraversion', 'negative', 12),
('Me gusta ser el centro de atención', 'extraversion', 'positive', 13),
('Me siento más cómodo en grupos pequeños', 'extraversion', 'negative', 14),
('Inicio conversaciones fácilmente con desconocidos', 'extraversion', 'positive', 15),

-- Amabilidad (10 preguntas)
('Me preocupo genuinamente por el bienestar de otros', 'amabilidad', 'positive', 16),
('Suelo ser competitivo antes que colaborativo', 'amabilidad', 'negative', 17),
('Trato de ayudar a otros cuando puedo', 'amabilidad', 'positive', 18),
('Me molesto cuando otros no siguen las reglas', 'amabilidad', 'negative', 19),
('Perdono fácilmente a quienes me han ofendido', 'amabilidad', 'positive', 20),

-- Neuroticismo (10 preguntas)
('Me preocupo frecuentemente por las cosas', 'neuroticismo', 'positive', 21),
('Mantengo la calma bajo presión', 'neuroticismo', 'negative', 22),
('Me siento ansioso en situaciones nuevas', 'neuroticismo', 'positive', 23),
('Controlo bien mis emociones', 'neuroticismo', 'negative', 24),
('A veces me siento abrumado por el estrés', 'neuroticismo', 'positive', 25);

-- Insertar algunas preguntas motivacionales de ejemplo
INSERT INTO public.personality_questions (question_text, ocean_factor, score_orientation, order_index) VALUES
-- Logro
('Me motiva superar desafíos difíciles', 'logro', 'positive', 26),
('Busco constantemente mejorar mi rendimiento', 'logro', 'positive', 27),

-- Poder
('Me gusta tener influencia sobre las decisiones importantes', 'poder', 'positive', 28),
('Disfruto liderar equipos y proyectos', 'poder', 'positive', 29),

-- Afiliación
('Valoro mucho las relaciones cercanas con colegas', 'afiliacion', 'positive', 30),
('Me motiva trabajar en equipo', 'afiliacion', 'positive', 31);
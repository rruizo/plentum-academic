
-- Actualizar la estructura de preguntas para que coincida con los requerimientos
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS texto_pregunta TEXT;

-- Copiar el contenido existente si hay datos
UPDATE public.questions 
SET texto_pregunta = question_text 
WHERE texto_pregunta IS NULL AND question_text IS NOT NULL;

-- Actualizar la tabla de categorías para incluir el nombre correcto
ALTER TABLE public.question_categories 
ADD COLUMN IF NOT EXISTS nombre TEXT;

-- Copiar el contenido de name a nombre si existe
UPDATE public.question_categories 
SET nombre = name 
WHERE nombre IS NULL;

-- Ahora podemos hacer que nombre sea NOT NULL
ALTER TABLE public.question_categories 
ALTER COLUMN nombre SET NOT NULL;

-- Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_questions_categoria_id ON public.questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_texto ON public.questions USING gin(to_tsvector('spanish', COALESCE(texto_pregunta, question_text)));

-- Habilitar RLS en las tablas que no lo tienen
ALTER TABLE public.examen_configuracion_categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examen_aplicante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuesta_aplicante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultado_categoria ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS sin IF NOT EXISTS
DROP POLICY IF EXISTS "Admins and teachers can manage exam category config" ON public.examen_configuracion_categoria;
CREATE POLICY "Admins and teachers can manage exam category config" ON public.examen_configuracion_categoria
  FOR ALL USING (public.user_has_admin_or_teacher_role());

DROP POLICY IF EXISTS "Everyone can view exam category config" ON public.examen_configuracion_categoria;
CREATE POLICY "Everyone can view exam category config" ON public.examen_configuracion_categoria
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view their own exam attempts" ON public.examen_aplicante;
CREATE POLICY "Users can view their own exam attempts" ON public.examen_aplicante
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own exam attempts" ON public.examen_aplicante;
CREATE POLICY "Users can create their own exam attempts" ON public.examen_aplicante
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own exam attempts" ON public.examen_aplicante;
CREATE POLICY "Users can update their own exam attempts" ON public.examen_aplicante
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and teachers can view all exam attempts" ON public.examen_aplicante;
CREATE POLICY "Admins and teachers can view all exam attempts" ON public.examen_aplicante
  FOR SELECT USING (public.user_has_admin_or_teacher_role());

DROP POLICY IF EXISTS "Users can manage their own responses" ON public.respuesta_aplicante;
CREATE POLICY "Users can manage their own responses" ON public.respuesta_aplicante
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.examen_aplicante ea 
      WHERE ea.id = examen_aplicante_id AND ea.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and teachers can view all responses" ON public.respuesta_aplicante;
CREATE POLICY "Admins and teachers can view all responses" ON public.respuesta_aplicante
  FOR SELECT USING (public.user_has_admin_or_teacher_role());

DROP POLICY IF EXISTS "Users can view their own results" ON public.resultado_categoria;
CREATE POLICY "Users can view their own results" ON public.resultado_categoria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.examen_aplicante ea 
      WHERE ea.id = examen_aplicante_id AND ea.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and teachers can view all results" ON public.resultado_categoria;
CREATE POLICY "Admins and teachers can view all results" ON public.resultado_categoria
  FOR SELECT USING (public.user_has_admin_or_teacher_role());

-- Función para validar que las respuestas solo puedan ser las opciones predefinidas
CREATE OR REPLACE FUNCTION public.validar_respuesta_fija(respuesta TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN respuesta IN ('Nunca', 'Rara vez', 'A veces', 'Frecuentemente');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Agregar constraint para validar respuestas
ALTER TABLE public.respuesta_aplicante 
DROP CONSTRAINT IF EXISTS respuesta_aplicante_respuesta_texto_check;

ALTER TABLE public.respuesta_aplicante 
ADD CONSTRAINT respuesta_aplicante_respuesta_texto_check 
CHECK (public.validar_respuesta_fija(respuesta_texto));

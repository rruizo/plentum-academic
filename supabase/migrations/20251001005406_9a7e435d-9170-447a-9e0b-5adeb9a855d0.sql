-- Create configuration table for Turnover Risk AI Analysis
CREATE TABLE public.turnover_risk_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openai_model TEXT NOT NULL DEFAULT 'gpt-4.1-mini-2025-04-14',
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 2000,
  system_message TEXT NOT NULL DEFAULT 'Eres un experto en análisis de riesgo de rotación de personal. Analiza las respuestas del candidato y proporciona un análisis detallado del riesgo de rotación.',
  user_prompt TEXT NOT NULL DEFAULT 'Analiza las siguientes respuestas del candidato:\n\n{{RESPUESTAS}}\n\nProporciona un análisis detallado del riesgo de rotación considerando:\n1. Estabilidad laboral proyectada\n2. Factores de riesgo identificados\n3. Recomendaciones específicas',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create categories table for Turnover Risk exam
CREATE TABLE public.turnover_risk_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  codigo_categoria TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create questions table for Turnover Risk exam
CREATE TABLE public.turnover_risk_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.turnover_risk_categories(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL DEFAULT 0,
  response_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.turnover_risk_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnover_risk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnover_risk_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for turnover_risk_config
CREATE POLICY "Admins and teachers can manage turnover config"
ON public.turnover_risk_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  )
);

CREATE POLICY "Everyone can view turnover config"
ON public.turnover_risk_config
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for turnover_risk_categories
CREATE POLICY "Admins and teachers can manage turnover categories"
ON public.turnover_risk_categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  )
);

CREATE POLICY "Everyone can view active turnover categories"
ON public.turnover_risk_categories
FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS Policies for turnover_risk_questions
CREATE POLICY "Admins and teachers can manage turnover questions"
ON public.turnover_risk_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  )
);

CREATE POLICY "Everyone can view active turnover questions"
ON public.turnover_risk_questions
FOR SELECT
TO authenticated
USING (is_active = true);

-- Insert default AI configuration
INSERT INTO public.turnover_risk_config (
  openai_model,
  temperature,
  max_tokens,
  system_message,
  user_prompt
) VALUES (
  'gpt-4.1-mini-2025-04-14',
  0.7,
  2000,
  'Eres un experto en análisis de riesgo de rotación de personal. Analiza las respuestas del candidato y proporciona un análisis detallado del riesgo de rotación considerando factores de estabilidad laboral, compromiso organizacional, y factores de riesgo potenciales.',
  'Analiza las siguientes respuestas del candidato sobre factores de rotación de personal:

{{RESPUESTAS}}

Proporciona un análisis estructurado que incluya:

1. **Evaluación de Riesgo Global**: Clasifica el riesgo como BAJO, MEDIO o ALTO
2. **Factores de Estabilidad**: Identifica elementos que indican permanencia
3. **Factores de Riesgo**: Señala aspectos que podrían motivar la salida
4. **Patrones Identificados**: Detecta comportamientos o tendencias relevantes
5. **Recomendaciones**: Sugiere acciones específicas para retención o manejo del candidato

Formato de respuesta en JSON:
{
  "riesgo_global": "BAJO|MEDIO|ALTO",
  "factores_estabilidad": ["factor1", "factor2"],
  "factores_riesgo": ["riesgo1", "riesgo2"],
  "patrones": ["patron1", "patron2"],
  "recomendaciones": ["recomendacion1", "recomendacion2"]
}'
);

-- Create example categories
INSERT INTO public.turnover_risk_categories (nombre, descripcion, codigo_categoria) VALUES
('Expectativas Laborales', 'Evalúa las expectativas del candidato sobre su desarrollo profesional y condiciones laborales', 'EXP'),
('Compromiso Organizacional', 'Mide el nivel de compromiso y lealtad hacia la organización', 'COM'),
('Estabilidad Personal', 'Analiza factores personales que pueden afectar la permanencia', 'EST'),
('Satisfacción Laboral', 'Evalúa el nivel de satisfacción con aspectos laborales actuales', 'SAT');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_turnover_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_turnover_config_updated_at
BEFORE UPDATE ON public.turnover_risk_config
FOR EACH ROW
EXECUTE FUNCTION update_turnover_updated_at();

CREATE TRIGGER update_turnover_categories_updated_at
BEFORE UPDATE ON public.turnover_risk_categories
FOR EACH ROW
EXECUTE FUNCTION update_turnover_updated_at();

CREATE TRIGGER update_turnover_questions_updated_at
BEFORE UPDATE ON public.turnover_risk_questions
FOR EACH ROW
EXECUTE FUNCTION update_turnover_updated_at();
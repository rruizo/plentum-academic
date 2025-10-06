-- Verificar si existe la tabla system_config, si no crearla
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_name TEXT NOT NULL DEFAULT 'Plentum Verify',
  logo_url TEXT,
  favicon_url TEXT,
  contact_email TEXT,
  support_email TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#3b82f6', 
  footer_text TEXT,
  social_facebook TEXT,
  social_instagram TEXT,
  social_linkedin TEXT,
  social_twitter TEXT,
  social_youtube TEXT,
  resend_from_email TEXT,
  resend_from_name TEXT,
  openai_model TEXT DEFAULT 'gpt-4.1-nano',
  ocean_modelo TEXT DEFAULT 'gpt-4.1-2025-04-14',
  ocean_temperatura NUMERIC DEFAULT 0.7,
  ocean_max_tokens INTEGER DEFAULT 2000,
  confiabilidad_analisis_modelo TEXT DEFAULT 'gpt-4.1-2025-04-14',
  confiabilidad_analisis_temperatura NUMERIC DEFAULT 0.7,
  confiabilidad_analisis_max_tokens INTEGER DEFAULT 1500,
  confiabilidad_conclusiones_modelo TEXT DEFAULT 'gpt-4.1-2025-04-14',
  confiabilidad_conclusiones_temperatura NUMERIC DEFAULT 0.7,
  confiabilidad_conclusiones_max_tokens INTEGER DEFAULT 1000,
  ocean_system_prompt TEXT,
  ocean_user_prompt TEXT,
  confiabilidad_analisis_system_prompt TEXT,
  confiabilidad_analisis_user_prompt TEXT,
  confiabilidad_conclusiones_system_prompt TEXT,
  confiabilidad_conclusiones_user_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Admins can manage system config" ON public.system_config;
DROP POLICY IF EXISTS "Everyone can read system config" ON public.system_config;
DROP POLICY IF EXISTS "Allow system config creation" ON public.system_config;
DROP POLICY IF EXISTS "Allow authenticated users to read system config" ON public.system_config;

-- Crear políticas RLS más permisivas
CREATE POLICY "Everyone can read system config"
ON public.system_config
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage system config"
ON public.system_config  
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Allow system config creation"
ON public.system_config
FOR INSERT
WITH CHECK (true);

-- Insertar configuración por defecto si no existe
INSERT INTO public.system_config (
  system_name,
  logo_url,
  favicon_url,
  contact_email,
  support_email,
  primary_color,
  secondary_color,
  footer_text,
  resend_from_email,
  resend_from_name,
  openai_model,
  ocean_modelo,
  ocean_temperatura,
  ocean_max_tokens,
  confiabilidad_analisis_modelo,
  confiabilidad_analisis_temperatura,
  confiabilidad_analisis_max_tokens,
  confiabilidad_conclusiones_modelo,
  confiabilidad_conclusiones_temperatura,
  confiabilidad_conclusiones_max_tokens,
  ocean_system_prompt,
  ocean_user_prompt,
  confiabilidad_analisis_system_prompt,
  confiabilidad_analisis_user_prompt,
  confiabilidad_conclusiones_system_prompt,
  confiabilidad_conclusiones_user_prompt
) 
SELECT 
  'Plentum Verify',
  '/lovable-uploads/688ca52e-d5b7-4cab-b25f-e7f916766599.png',
  '/lovable-uploads/99518379-e871-4367-9216-67ebb6fb5841.png',
  'admin@plentumverify.com',
  'soporte@plentumverify.com',
  '#1e40af',
  '#3b82f6',
  '© 2024 Plentum Verify. Todos los derechos reservados.',
  'onboarding@resend.dev',
  'Plentum Verify',
  'gpt-4.1-nano',
  'gpt-4.1-2025-04-14',
  0.7,
  2000,
  'gpt-4.1-2025-04-14',
  0.7,
  1500,
  'gpt-4.1-2025-04-14',
  0.7,
  1000,
  'Eres un experto en psicología organizacional especializado en evaluaciones de personalidad OCEAN (Big Five). Proporciona análisis profesionales y objetivos basados en los datos de personalidad para aplicaciones en desarrollo organizacional y selección de personal.',
  'Analiza los siguientes resultados de una evaluación de personalidad OCEAN (Big Five):

CANDIDATO: ${userInfo.name}
EMAIL: ${userInfo.email}
POSICIÓN: ${userInfo.area}
EMPRESA: ${userInfo.company}

ANÁLISIS DE FACTORES:
${factorAnalysis}

Por favor proporciona:
1. Un análisis detallado del perfil de personalidad OCEAN
2. Fortalezas y áreas de desarrollo basadas en el perfil
3. Recomendaciones para roles y ambientes de trabajo apropiados
4. Estrategias de gestión y desarrollo personal

Responde en español y de manera profesional, enfocándote en aplicaciones prácticas para el desarrollo laboral.',
  'Eres un experto en análisis de riesgo laboral y evaluación psicométrica. Tu especialidad es interpretar resultados de evaluaciones de confiabilidad y proporcionar análisis detallados y objetivos para la toma de decisiones en recursos humanos.',
  'Analiza los siguientes resultados de una evaluación de confiabilidad laboral:

CANDIDATO: ${examAttempt.profiles?.full_name}
ÁREA: ${examAttempt.profiles?.area}
EMPRESA: ${examAttempt.profiles?.company}

RESULTADOS POR CATEGORÍA:
${categoryData.categoryResults}

EVALUACIÓN GENERAL:
- Riesgo General: ${categoryData.overallRisk}
- Puntaje Total: ${categoryData.totalScore}/${categoryData.totalQuestions}

Proporciona un análisis detallado que incluya:
1. Interpretación de los resultados por categoría
2. Identificación de fortalezas y áreas de riesgo
3. Análisis del perfil de confiabilidad general
4. Factores de riesgo específicos detectados

Responde de manera profesional y objetiva, enfocándote en la evaluación de riesgo laboral.',
  'Eres un consultor especializado en recursos humanos con expertise en evaluaciones de confiabilidad. Tu función es proporcionar conclusiones prácticas y recomendaciones basadas en análisis de riesgo laboral.',
  'Basándote en el análisis de confiabilidad realizado:

CANDIDATO: ${examAttempt.profiles?.full_name}
ANÁLISIS PREVIO: ${analysisResult}

RESULTADOS GENERALES:
- Riesgo General: ${categoryData.overallRisk}
- Puntaje Total: ${categoryData.totalScore}/${categoryData.totalQuestions}

Proporciona conclusiones y recomendaciones que incluyan:
1. Recomendación final sobre la confiabilidad del candidato
2. Estrategias de mitigación de riesgos identificados
3. Recomendaciones para el proceso de selección
4. Sugerencias de seguimiento o evaluaciones adicionales

Mantén un enfoque práctico y orientado a la toma de decisiones en recursos humanos.'
WHERE NOT EXISTS (SELECT 1 FROM public.system_config LIMIT 1);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_system_config_updated_at ON public.system_config;
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
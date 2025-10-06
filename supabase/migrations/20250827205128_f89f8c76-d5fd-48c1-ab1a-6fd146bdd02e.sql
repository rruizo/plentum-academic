-- Agregar campos para prompts del sistema en system_config
ALTER TABLE public.system_config 
ADD COLUMN IF NOT EXISTS ocean_system_prompt text DEFAULT 'Eres un experto en psicología organizacional especializado en evaluaciones de personalidad OCEAN (Big Five). Proporciona análisis profesionales y objetivos basados en los datos de personalidad para aplicaciones en desarrollo organizacional y selección de personal.',
ADD COLUMN IF NOT EXISTS ocean_user_prompt text DEFAULT 'Analiza los siguientes resultados de una evaluación de personalidad OCEAN (Big Five):

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

ADD COLUMN IF NOT EXISTS confiabilidad_analisis_system_prompt text DEFAULT 'Eres un experto en análisis de riesgo laboral y evaluación psicométrica. Tu especialidad es interpretar resultados de evaluaciones de confiabilidad y proporcionar análisis detallados y objetivos para la toma de decisiones en recursos humanos.',

ADD COLUMN IF NOT EXISTS confiabilidad_analisis_user_prompt text DEFAULT 'Analiza los siguientes resultados de una evaluación de confiabilidad laboral:

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

ADD COLUMN IF NOT EXISTS confiabilidad_conclusiones_system_prompt text DEFAULT 'Eres un consultor especializado en recursos humanos con expertise en evaluaciones de confiabilidad. Tu función es proporcionar conclusiones prácticas y recomendaciones basadas en análisis de riesgo laboral.',

ADD COLUMN IF NOT EXISTS confiabilidad_conclusiones_user_prompt text DEFAULT 'Basándote en el análisis de confiabilidad realizado:

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

Mantén un enfoque práctico y orientado a la toma de decisiones en recursos humanos.';
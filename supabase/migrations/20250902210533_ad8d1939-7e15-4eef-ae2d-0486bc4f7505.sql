-- Actualizar configuración de OpenAI con los prompts especificados por el usuario

UPDATE system_config SET 
  -- Configuración OCEAN Test
  ocean_modelo = 'gpt-4o-mini',
  ocean_max_tokens = 1500,
  ocean_temperatura = 0.7,
  ocean_system_prompt = 'Eres un psicólogo organizacional experto en evaluación de personalidad usando el modelo de los Cinco Grandes (Big Five/OCEAN).
Proporciona análisis profesionales, objetivos, constructivos y visualmente estructurados en español para reportes empresariales.',
  ocean_user_prompt = 'Analiza los siguientes resultados de evaluación de personalidad OCEAN del candidato "${userInfo.name}" y proporciona un análisis profesional completo:

PUNTUACIONES OBTENIDAS:
${factorAnalysis}

DATOS ADICIONALES:
- Email: ${userInfo.email}
- Fecha de evaluación: ${new Date().toLocaleDateString(''es-ES'')}

Por favor proporciona un análisis estructurado que incluya:

1. **INTERPRETACIÓN DEL PERFIL DE PERSONALIDAD:**
   - Descripción detallada del perfil identificado
   - Análisis de cada factor de personalidad y su impacto
   - Patrones de comportamiento esperados

2. **FORTALEZAS PROFESIONALES:**
   - Competencias naturales identificadas
   - Áreas donde el candidato puede destacar
   - Ventajas competitivas del perfil

3. **ÁREAS DE DESARROLLO:**
   - Aspectos que podrían requerir atención
   - Oportunidades de crecimiento profesional
   - Sugerencias para maximizar el potencial

4. **RECOMENDACIONES ORGANIZACIONALES:**
   - Tipo de roles más adecuados
   - Estilo de liderazgo y trabajo en equipo
   - Consideraciones para la gestión y desarrollo
   - Estrategias de motivación

5. **VISUALIZACIÓN DE RESULTADOS (JSON):**
   Devuelve un objeto JSON que incluya:
   - "OCEAN": { apertura: X, responsabilidad: X, extroversión: X, amabilidad: X, neuroticismo: X }
   - "riesgosPotenciales": ["baja responsabilidad", "alta inestabilidad emocional"]
   - "recomendacionFinal": "APTO | APTO CON OBSERVACIONES | NO APTO"',

  -- Configuración Confiabilidad - Análisis
  confiabilidad_analisis_modelo = 'gpt-4.1-2025-04-14',
  confiabilidad_analisis_max_tokens = 1800,
  confiabilidad_analisis_temperatura = 0.7,
  confiabilidad_analisis_system_prompt = 'Eres un experto en evaluaciones psicométricas de confiabilidad. Proporciona análisis profesionales, objetivos y visualmente estructurados.',
  confiabilidad_analisis_user_prompt = 'Analiza los siguientes resultados de una evaluación de confiabilidad:

CANDIDATO: ${examAttempt.profiles?.full_name || ''No especificado''}
POSICIÓN: ${examAttempt.profiles?.area || ''No especificada''}
EMPRESA: ${examAttempt.profiles?.company || ''No especificada''}

RESULTADOS POR CATEGORÍA:
${categoryData.categoryResults.map((cat: any) => `
- ${cat.categoryName}: ${cat.totalScore}/${cat.totalQuestions * 3} puntos (${cat.risk})
  * Media poblacional: ${cat.nationalAverage}
  * Diferencia: ${cat.difference > 0 ? ''+'' : ''''}${cat.difference}
`).join('''')}

RIESGO GENERAL: ${categoryData.overallRisk}
PUNTUACIÓN TOTAL: ${categoryData.totalScore}/${categoryData.totalQuestions * 3}

Por favor proporciona:

1. **Análisis detallado de los resultados**
2. **Identificación de fortalezas y áreas de riesgo**
3. **Comparación con la media nacional**
4. **Visualización estructurada (JSON):**
   Devuelve un objeto JSON con:
   - "categorias": [ { nombre: "${cat.categoryName}", puntaje: X, media: Y, riesgo: "ALTO/MEDIO/BAJO" } ]
   - "riesgoGeneral": "${categoryData.overallRisk}"
   - "recomendacionFinal": "CONTRATAR | NO CONTRATAR | CONTRATAR CON CONDICIONES"',

  -- Configuración Confiabilidad - Conclusiones
  confiabilidad_conclusiones_modelo = 'gpt-4.1-2025-04-14',
  confiabilidad_conclusiones_max_tokens = 1000,
  confiabilidad_conclusiones_temperatura = 0.7,
  confiabilidad_conclusiones_system_prompt = 'Eres un experto en evaluaciones psicométricas de confiabilidad. Proporciona recomendaciones específicas y actionables.',
  confiabilidad_conclusiones_user_prompt = 'Basándote en el análisis anterior, proporciona 5 recomendaciones específicas para la toma de decisiones sobre este candidato.
Incluye una recomendación final en formato JSON:
{
  "recomendacion": "CONTRATAR | NO CONTRATAR | CONTRATAR CON CONDICIONES",
  "justificacion": "Resumen breve de motivos"
}',

  -- Actualizar timestamp
  updated_at = now()
WHERE id IS NOT NULL;
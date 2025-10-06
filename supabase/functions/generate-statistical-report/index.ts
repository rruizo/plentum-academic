
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { attemptId, analysis, attemptData, reportConfig } = await req.json()
    
    console.log('Generando gráfico horizontal mejorado para attempt:', attemptId)
    console.log('Análisis recibido:', analysis)
    console.log('Configuración de reporte aplicada:', reportConfig)

    if (!analysis || !analysis.categoryResults) {
      throw new Error('Datos de análisis no válidos')
    }

    // Generar análisis adicional con IA
    const aiAnalysis = await generateAIAnalysis(analysis, attemptData)
    
    // Generar SVG del histograma horizontal por pregunta individual
    const svgChart = generateHorizontalQuestionChart(analysis, attemptData, aiAnalysis)
    
    // Retornar el SVG directamente
    return new Response(svgChart, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="histograma-horizontal-${attemptId.substring(0, 8)}.svg"`
      }
    })

  } catch (error) {
    console.error('Error generating horizontal chart:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function generateAIAnalysis(analysis: any, attemptData: any): Promise<string> {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      return "Análisis IA no disponible - API key no configurada"
    }

    const prompt = `Analiza los siguientes resultados de evaluación psicométrica y proporciona insights profesionales:

Categorías y resultados:
${analysis.categoryResults.map((cat: any) => 
  `- ${cat.categoryName}: ${cat.totalScore}/${cat.totalQuestions * 3} puntos (${cat.interpretation})`
).join('\n')}

Riesgo global: ${(analysis.globalRisk * 100).toFixed(1)}%
Áreas de alto riesgo: ${analysis.highRiskAreas.join(', ') || 'Ninguna'}
Áreas de bajo puntaje: ${analysis.lowScoreAreas.join(', ') || 'Ninguna'}

Proporciona un análisis profesional de 2-3 párrafos que incluya:
1. Interpretación de los patrones de comportamiento
2. Fortalezas y áreas de mejora identificadas
3. Recomendaciones específicas para el desarrollo profesional`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Eres un psicólogo organizacional experto en evaluación de personal. Proporciona análisis profesionales, objetivos y constructivos.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content || "No se pudo generar el análisis"
  } catch (error) {
    console.error('Error generating AI analysis:', error)
    return "Análisis automatizado no disponible en este momento"
  }
}

function generateHorizontalQuestionChart(analysis: any, attemptData: any, aiAnalysis: string): string {
  const { categoryResults } = analysis
  const width = 1200
  const height = Math.max(1000, (attemptData?.questions?.length || 20) * 40 + 400)
  const margin = { top: 100, right: 200, bottom: 300, left: 300 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom - 200 // Espacio para análisis IA

  // Extraer preguntas individuales con sus respuestas
  const questions = attemptData?.questions || []
  const answers = attemptData?.answers || []
  
  // Mapear respuestas por pregunta
  const questionAnswerMap = new Map()
  answers.forEach((answer: any) => {
    questionAnswerMap.set(answer.questionId, answer.answer)
  })

  // Calcular puntaje por respuesta
  const calculateScore = (response: string): number => {
    switch (response) {
      case 'Nunca': return 0;
      case 'Rara vez': return 1;
      case 'A veces': return 2;
      case 'Frecuentemente': return 3;
      default: return 0;
    }
  }

  // Preparar datos por pregunta individual
  const questionData = questions.map((question: any, index: number) => {
    const userAnswer = questionAnswerMap.get(question.id) || 'Nunca'
    const userScore = calculateScore(userAnswer)
    
    return {
      id: question.id,
      text: question.question_text || question.texto_pregunta || `Pregunta ${index + 1}`,
      categoryName: question.category_name || 'Sin categoría',
      userScore,
      userAnswer,
      questionIndex: index
    }
  })

  // Agrupar por categoría para el layout visual
  const categoryGroups = new Map()
  questionData.forEach((q: any) => {
    if (!categoryGroups.has(q.categoryName)) {
      categoryGroups.set(q.categoryName, [])
    }
    categoryGroups.get(q.categoryName).push(q)
  })

  const maxScore = 3 // Puntaje máximo posible
  const scaleX = chartWidth / (maxScore + 0.5)
  const barHeight = Math.min(25, chartHeight / (questionData.length + Array.from(categoryGroups.keys()).length * 2))
  
  let bars = ''
  let labels = ''
  let categoryLabels = ''
  let userScoreLines = ''
  let currentY = margin.top

  // Generar barras por categoría
  Array.from(categoryGroups.entries()).forEach(([categoryName, questions], categoryIndex) => {
    // Etiqueta de categoría
    categoryLabels += `
      <text x="${margin.left - 10}" y="${currentY - 5}" 
            text-anchor="end" font-size="14" font-weight="bold" fill="#1f2937">
        ${categoryName}
      </text>
      <line x1="${margin.left}" y1="${currentY + 5}" x2="${margin.left + chartWidth}" y2="${currentY + 5}" 
            stroke="#d1d5db" stroke-width="1"/>
    `
    
    currentY += 30

    // Barras para cada pregunta en la categoría
    questions.forEach((question: any, qIndex: number) => {
      const y = currentY + (qIndex * (barHeight + 5))
      
      // Barra azul que muestra el valor numérico de la respuesta del usuario
      const barWidth = (question.userScore / maxScore) * chartWidth * 0.8
      bars += `
        <rect x="${margin.left}" y="${y}" 
              width="${barWidth}" height="${barHeight}" 
              fill="#3b82f6" stroke="#1e40af" stroke-width="1" rx="2"/>
      `
      
      // Línea punteada roja que marca el valor numérico de la respuesta del usuario
      const userScoreX = margin.left + (question.userScore * scaleX)
      userScoreLines += `
        <line x1="${userScoreX}" y1="${y - 5}" x2="${userScoreX}" y2="${y + barHeight + 5}" 
              stroke="#ef4444" stroke-width="3" stroke-dasharray="5,5"/>
      `
      
      // Etiqueta de la pregunta (completa, sin truncar)
      const questionLabel = question.text
      
      labels += `
        <text x="${margin.left - 15}" y="${y + barHeight/2 + 4}" 
              text-anchor="end" font-size="9" fill="#374151">
          ${questionLabel}
        </text>
      `
      
      // Mostrar el valor numérico en la barra
      if (question.userScore > 0) {
        bars += `
          <text x="${margin.left + barWidth/2}" y="${y + barHeight/2 + 4}" 
                text-anchor="middle" font-size="12" font-weight="bold" fill="white">
            ${question.userScore}
          </text>
        `
      }
    })
    
    currentY += questions.length * (barHeight + 5) + 20
  })

  // Líneas de cuadrícula y etiquetas del eje X
  let gridLines = ''
  for (let i = 0; i <= maxScore; i++) {
    const x = margin.left + (i * scaleX)
    gridLines += `
      <line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom - 200}" 
            stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2"/>
      <text x="${x}" y="${height - margin.bottom - 180}" text-anchor="middle" font-size="12" fill="#6b7280">
        ${i}
      </text>
    `
  }

  // Análisis de IA formateado
  const aiAnalysisFormatted = aiAnalysis.split('\n').map((line, index) => {
    const yPos = height - 150 + (index * 16)
    if (line.trim()) {
      return `<text x="60" y="${yPos}" font-size="11" fill="#374151" font-family="Arial">${line.substring(0, 120)}${line.length > 120 ? '...' : ''}</text>`
    }
    return ''
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .chart-title { font-family: 'Arial', sans-serif; font-size: 18px; font-weight: bold; fill: #1f2937; }
      .axis-label { font-family: 'Arial', sans-serif; font-size: 14px; font-weight: 600; fill: #374151; }
      .legend-text { font-family: 'Arial', sans-serif; font-size: 12px; fill: #374151; }
    </style>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="1" flood-color="#00000020"/>
    </filter>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fondo -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)" stroke="#e2e8f0" stroke-width="1"/>
  
  <!-- Título principal -->
  <text x="${width/2}" y="35" text-anchor="middle" class="chart-title">
    Gráfico de Confiabilidad por Categoria - Análisis por Pregunta Individual
  </text>
  <text x="${width/2}" y="55" text-anchor="middle" font-size="12" fill="#6b7280" font-family="Arial">
    Valores Numéricos de Respuestas del Usuario
  </text>
  
  <!-- Líneas de cuadrícula -->
  ${gridLines}
  
  <!-- Ejes principales -->
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom - 200}" 
        stroke="#374151" stroke-width="2"/>
  <line x1="${margin.left}" y1="${height - margin.bottom - 200}" x2="${margin.left + chartWidth}" y2="${height - margin.bottom - 200}" 
        stroke="#374151" stroke-width="2"/>
  
  <!-- Etiquetas de categorías y separadores -->
  ${categoryLabels}
  
  <!-- Barras del histograma -->
  ${bars}
  
  <!-- Líneas punteadas rojas que marcan el valor de la respuesta del usuario -->
  ${userScoreLines}
  
  <!-- Etiquetas de preguntas -->
  ${labels}
  
  <!-- Leyenda (movida abajo del gráfico) -->
  <g transform="translate(${margin.left}, ${height - margin.bottom - 140})">
    <rect x="-10" y="-10" width="400" height="90" fill="white" stroke="#d1d5db" stroke-width="1" rx="5" filter="url(#shadow)"/>
    <text x="190" y="8" text-anchor="middle" font-size="13" font-weight="bold" fill="#1f2937" font-family="Arial">Leyenda</text>
    
    <rect x="5" y="20" width="18" height="12" fill="#3b82f6" stroke="#1e40af" rx="2"/>
    <text x="28" y="30" font-size="11" fill="#374151" font-family="Arial">Valor de Respuesta</text>
    
    <line x1="200" y1="27" x2="218" y2="27" stroke="#ef4444" stroke-width="3" stroke-dasharray="3,3"/>
    <text x="223" y="31" font-size="11" fill="#374151" font-family="Arial">Marcador de Valor</text>
    
    <text x="5" y="50" font-size="10" fill="#6b7280" font-family="Arial">Escala de respuestas: 0=Nunca, 1=Rara vez, 2=A veces, 3=Frecuentemente</text>
  </g>
  
  <!-- Análisis con IA -->
  <g transform="translate(0, ${height - 180})">
    <rect x="50" y="-30" width="${width - 100}" height="160" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="8"/>
    <text x="60" y="-10" font-size="14" font-weight="bold" fill="#1e40af" font-family="Arial">Análisis Profesional con IA</text>
    ${aiAnalysisFormatted}
  </g>
  
  <!-- Etiquetas de ejes -->
  <text x="${margin.left + chartWidth/2}" y="${height - margin.bottom - 160}" text-anchor="middle" class="axis-label">
    Valor de Respuesta (0-3)
  </text>
  <text x="25" y="${margin.top + chartHeight/2}" text-anchor="middle" class="axis-label" 
        transform="rotate(-90 25 ${margin.top + chartHeight/2})">
    Preguntas por Categoría
  </text>
  
  <!-- Información adicional -->
  <text x="${width - 20}" y="${height - 10}" text-anchor="end" font-size="9" fill="#9ca3af" font-family="Arial">
    Generado: ${new Date().toLocaleDateString('es-ES')} | Análisis Granular por Pregunta con IA
  </text>
</svg>`
}

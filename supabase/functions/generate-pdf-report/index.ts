import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Inicializar cliente de Supabase
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  console.log('=== GENERATE-PDF-REPORT FUNCTION STARTED ===')
  console.log('Request method:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Parsing request body...')
    const requestBody = await req.json()
    console.log('Request body parsed successfully')
    
    const { sessionId, attemptId, analysis, userInfo, attemptData, reportConfig } = requestBody
    
    console.log('=== PARAMETERS ===')
    console.log('sessionId:', sessionId)
    console.log('attemptId:', attemptId)
    console.log('Has analysis:', !!analysis)
    console.log('Has userInfo:', !!userInfo)
    console.log('Has attemptData:', !!attemptData)
    
    if (sessionId) {
      console.log('Processing psychometric report...')
      return await generatePsychometricReport(sessionId)
    }
    
    if (attemptId) {
      console.log('Processing reliability report...')
      return await generateReliabilityReport(attemptId, analysis, userInfo, attemptData, reportConfig)
    }
    
    throw new Error('Se requiere sessionId o attemptId')

  } catch (error) {
    console.error('=== ERROR ===')
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Función para reportes psicométricos
async function generatePsychometricReport(sessionId: string) {
  console.log('=== generatePsychometricReport START ===')
  
  // Obtener resultados de personalidad
  const { data: personalityResults, error: resultsError } = await supabaseAdmin
    .from('personality_results')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (resultsError || !personalityResults || personalityResults.length === 0) {
    throw new Error('Personality results not found')
  }

  const personalityData = personalityResults[0]
  console.log('Personality data found:', personalityData.id)

  // Obtener información del usuario desde la sesión
  const { data: session } = await supabaseAdmin
    .from('exam_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single()

  let userInfo = null
  if (session?.user_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', session.user_id)
      .single()
    
    if (profile) {
      userInfo = {
        name: profile.full_name || 'Usuario',
        email: profile.email,
        company: profile.company || 'No especificada',
        area: profile.area || 'No especificada'
      }
    }
  }

  // Generar HTML del reporte
  const htmlContent = generatePsychometricReportHTML(personalityData, null, userInfo)

  return new Response(htmlContent, {
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'inline; filename="reporte-psicometrico.html"'
    }
  })
}

// Función para reportes de confiabilidad
async function generateReliabilityReport(attemptId: string, analysis: any, userInfo: any, attemptData: any, reportConfig: any) {
  console.log('=== generateReliabilityReport START ===')
  console.log('Parameters:', { attemptId, hasAnalysis: !!analysis, hasUserInfo: !!userInfo })
  
  try {
    // Obtener datos del intento de examen
    console.log('Fetching exam attempt...')
    const { data: examAttempt, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('id', attemptId)
      .single()

    if (attemptError || !examAttempt) {
      console.error('Exam attempt error:', attemptError)
      throw new Error('Exam attempt not found')
    }

    console.log('Exam attempt found:', {
      id: examAttempt.id,
      score: examAttempt.score,
      user_id: examAttempt.user_id
    })

    // Obtener información del examen
    const { data: examInfo } = await supabaseAdmin
      .from('exams')
      .select('title, description')
      .eq('id', examAttempt.exam_id)
      .single()

    console.log('Exam info:', examInfo?.title || 'Not found')

    // Preparar información del candidato
    const candidateInfo = {
      name: userInfo?.full_name || userInfo?.name || 'Usuario',
      email: userInfo?.email || 'email@ejemplo.com',
      position: userInfo?.area || 'Posición no especificada',
      company: userInfo?.company || 'Empresa no especificada',
      date: new Date().toLocaleDateString('es-ES')
    }

    // Preparar datos del reporte
    let categoryScores = []
    let overallRisk = 'RIESGO BAJO'
    
    if (analysis?.categoryResults) {
      categoryScores = analysis.categoryResults.map((cat: any) => ({
        category: cat.categoryName || cat.category_name || 'Categoría',
        score: cat.totalScore / cat.totalQuestions || 0,
        percentage: ((cat.totalScore / (cat.totalQuestions * 3)) * 100) || 0,
        risk: cat.totalScore >= cat.totalQuestions * 2 ? 'RIESGO ALTO' : 
              cat.totalScore >= cat.totalQuestions * 1 ? 'RIESGO MEDIO' : 'RIESGO BAJO',
        nationalAverage: cat.nationalAverage || 1.5,
        totalQuestions: cat.totalQuestions || 1,
        totalScore: cat.totalScore || 0
      }))
      
      overallRisk = analysis.globalRisk < 0.3 ? 'RIESGO BAJO' : 
                    analysis.globalRisk < 0.7 ? 'RIESGO MEDIO' : 'RIESGO ALTO'
    }

    const reportData = {
      candidate: candidateInfo,
      scores: categoryScores,
      overallRisk: overallRisk,
      examTitle: examInfo?.title || 'Evaluación de Confiabilidad',
      examScore: examAttempt.score || 0,
      completedAt: examAttempt.completed_at
    }

    console.log('Generating HTML...')
    const htmlContent = generateReliabilityReportHTML(reportData, reportConfig)
    
    console.log('HTML generated, length:', htmlContent.length)

    return new Response(htmlContent, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline; filename="reporte-confiabilidad.html"'
      }
    })

  } catch (error) {
    console.error('=== ERROR in generateReliabilityReport ===')
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}

// Generar HTML para reporte psicométrico
function generatePsychometricReportHTML(personalityData: any, analysis: any, userInfo: any): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Psicométrico OCEAN</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #2c5aa0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .candidate-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .score-section {
            margin-bottom: 30px;
        }
        .score-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            margin: 5px 0;
            background: #f1f3f4;
            border-radius: 5px;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Reporte de Evaluación Psicométrica</h1>
        <h2>Modelo OCEAN</h2>
    </div>

    <div class="candidate-info">
        <h3>Información del Candidato</h3>
        <p><strong>Nombre:</strong> ${userInfo?.name || 'Usuario'}</p>
        <p><strong>Email:</strong> ${userInfo?.email || 'No disponible'}</p>
        <p><strong>Empresa:</strong> ${userInfo?.company || 'No especificada'}</p>
        <p><strong>Área:</strong> ${userInfo?.area || 'No especificada'}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
    </div>

    <div class="score-section">
        <h3>Resultados por Factor</h3>
        <div class="score-item">
            <span>Apertura a la Experiencia</span>
            <span>${personalityData.apertura_score?.toFixed(2) || 'N/A'}</span>
        </div>
        <div class="score-item">
            <span>Responsabilidad</span>
            <span>${personalityData.responsabilidad_score?.toFixed(2) || 'N/A'}</span>
        </div>
        <div class="score-item">
            <span>Extraversión</span>
            <span>${personalityData.extraversion_score?.toFixed(2) || 'N/A'}</span>
        </div>
        <div class="score-item">
            <span>Amabilidad</span>
            <span>${personalityData.amabilidad_score?.toFixed(2) || 'N/A'}</span>
        </div>
        <div class="score-item">
            <span>Neuroticismo</span>
            <span>${personalityData.neuroticismo_score?.toFixed(2) || 'N/A'}</span>
        </div>
    </div>

    <div class="footer">
        <p>Reporte generado automáticamente por el Sistema de Evaluación</p>
        <p>Este documento es confidencial y debe ser tratado de acuerdo con las políticas de privacidad de la organización</p>
    </div>
</body>
</html>
  `
}

// Generar HTML para reporte de confiabilidad
function generateReliabilityReportHTML(reportData: any, config: any): string {
  const { candidate, scores, overallRisk, examTitle, examScore } = reportData
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Confiabilidad</title>
    <style>
        body {
            font-family: ${config?.font_family || 'Arial'}, sans-serif;
            margin: 40px;
            line-height: 1.6;
            color: #333;
            font-size: ${config?.font_size || 12}px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #2c5aa0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-info {
            text-align: center;
            margin-bottom: 20px;
        }
        .candidate-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .score-summary {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 30px;
        }
        .score-value {
            font-size: 36px;
            font-weight: bold;
            color: #1976d2;
        }
        .risk-level {
            font-size: 18px;
            font-weight: bold;
            margin-top: 10px;
            padding: 10px;
            border-radius: 5px;
            ${overallRisk === 'RIESGO ALTO' ? 'background: #ffebee; color: #c62828;' :
              overallRisk === 'RIESGO MEDIO' ? 'background: #fff3e0; color: #f57c00;' :
              'background: #e8f5e8; color: #2e7d32;'}
        }
        .scores-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .scores-table th,
        .scores-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .scores-table th {
            background: #f5f5f5;
            font-weight: bold;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 11px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Reporte de Evaluación de Confiabilidad</h1>
        ${config?.company_name ? `<div class="company-info"><h2>${config.company_name}</h2></div>` : ''}
    </div>

    <div class="candidate-info">
        <h3>Información del Candidato</h3>
        <div class="info-grid">
            <div><strong>Nombre:</strong> ${candidate.name}</div>
            <div><strong>Email:</strong> ${candidate.email}</div>
            <div><strong>Empresa:</strong> ${candidate.company}</div>
            <div><strong>Posición:</strong> ${candidate.position}</div>
            <div><strong>Fecha de Evaluación:</strong> ${candidate.date}</div>
        </div>
    </div>

    <div class="score-summary">
        <h3>Resultado General</h3>
        <div class="score-value">${examScore}%</div>
        <div class="risk-level">${overallRisk}</div>
    </div>

    ${scores && scores.length > 0 ? `
    <div class="scores-section">
        <h3>Resultados por Categoría</h3>
        <table class="scores-table">
            <thead>
                <tr>
                    <th>Categoría</th>
                    <th>Puntaje</th>
                    <th>Porcentaje</th>
                    <th>Media Nacional</th>
                    <th>Nivel de Riesgo</th>
                </tr>
            </thead>
            <tbody>
                ${scores.map((score: any) => `
                <tr>
                    <td>${score.category}</td>
                    <td>${score.score.toFixed(2)}</td>
                    <td>${score.percentage.toFixed(1)}%</td>
                    <td>${score.nationalAverage.toFixed(2)}</td>
                    <td style="font-weight: bold; color: ${
                      score.risk === 'RIESGO ALTO' ? '#c62828' :
                      score.risk === 'RIESGO MEDIO' ? '#f57c00' : '#2e7d32'
                    }">${score.risk}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="footer">
        <p><strong>Reporte generado automáticamente por el Sistema de Evaluación</strong></p>
        <p>Este documento es confidencial y debe ser tratado de acuerdo con las políticas de privacidad de la organización</p>
        ${config?.company_name ? `<p>© ${new Date().getFullYear()} ${config.company_name}</p>` : ''}
        ${config?.contact_email ? `<p>Contacto: ${config.contact_email}</p>` : ''}
    </div>
</body>
</html>
  `
}
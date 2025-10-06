import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== GENERATE-ALTERNATIVE-PDF-REPORT FUNCTION STARTED ===');
  console.log('Request method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...');
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const { examAttemptId, reportConfig, includeAnalysis } = requestBody;

    if (!examAttemptId) {
      throw new Error('examAttemptId es requerido');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching exam attempt data...');
    
    // Fetch exam attempt data
    const { data: examAttempt, error: examError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', examAttemptId)
      .single();

    if (examError || !examAttempt) {
      throw new Error(`Error fetching exam attempt: ${examError?.message || 'Not found'}`);
    }

    // Fetch profile data separately
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', examAttempt.user_id)
      .single();

    if (profileError || !profileData) {
      throw new Error(`Error fetching profile: ${profileError?.message || 'Profile not found'}`);
    }

    // Attach profile data to exam attempt
    examAttempt.profiles = profileData;

    console.log('Fetching related data...');
    
    // Fetch exam data
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examAttempt.exam_id)
      .single();

    // Fetch personal factors
    const { data: personalFactors } = await supabase
      .from('personal_factors')
      .select('*')
      .eq('user_id', examAttempt.user_id)
      .eq('exam_id', examAttempt.exam_id)
      .single();

    console.log('Processing reliability data (alternative method)...');
    
    // Process reliability data
    const processedData = processReliabilityData(examAttempt);
    console.log('Processed reliability data:', JSON.stringify(processedData, null, 2));

    // Get or generate AI analysis if requested
    let aiAnalysis = null;
    if (includeAnalysis) {
      console.log('Checking for cached AI analysis...');
      
      const { data: cachedAnalysis } = await supabase
        .from('ai_analysis_cache')
        .select('ai_analysis_result')
        .eq('user_id', examAttempt.user_id)
        .eq('exam_id', examAttempt.exam_id)
        .eq('analysis_type', 'reliability-alternative')
        .gte('generated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30 days
        .eq('is_active', true)
        .single();

      if (cachedAnalysis?.ai_analysis_result) {
        console.log('Using cached AI analysis');
        aiAnalysis = cachedAnalysis.ai_analysis_result;
      } else {
        console.log('No cached analysis found, generating new AI analysis...');
        aiAnalysis = await generateAIAnalysis(examAttempt, processedData);
        
        if (aiAnalysis) {
          console.log('Saving new AI analysis to cache for user:', examAttempt.user_id);
          
          try {
            await supabase.from('ai_analysis_cache').insert({
              user_id: examAttempt.user_id,
              exam_id: examAttempt.exam_id,
              analysis_type: 'reliability',  // Changed from 'reliability-alternative' to 'reliability'
              input_data_hash: generateHash(JSON.stringify({ examAttempt: examAttempt.id, processedData })),
              input_data: { examId: examAttempt.exam_id, userId: examAttempt.user_id },
              ai_analysis_result: aiAnalysis,
              tokens_used: 1500,
              model_used: 'gpt-4.1-2025-04-14',
              requested_by: examAttempt.user_id,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
          } catch (cacheError) {
            console.error('Error inserting AI analysis to cache:', cacheError);
          }
        }
      }
    }

    console.log('Processing custom template...');
    const reportHTML = await generateAlternativeReportHTML(
      examAttempt,
      examData,
      examAttempt.profiles,
      processedData,
      personalFactors,
      aiAnalysis,
      reportConfig
    );
    
    console.log('Report HTML generated, length:', reportHTML?.length);
    console.log('Custom template processed successfully');

    return new Response(JSON.stringify({ 
      htmlContent: reportHTML,
      reportData: {
        candidateName: examAttempt.profiles?.full_name,
        examTitle: examData?.title,
        totalScore: processedData.totalScore,
        riskLevel: processedData.riskLevel
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-alternative-pdf-report:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to process reliability data
function processReliabilityData(examAttempt: any) {
  if (!examAttempt.answers || !examAttempt.questions) {
    throw new Error('No se encontraron respuestas o preguntas en el intento de examen');
  }

  const answers = examAttempt.answers;
  const questions = examAttempt.questions;
  
  // Create answers map for easy lookup
  const answersMap: Record<string, string> = {};
  if (Array.isArray(answers)) {
    answers.forEach((answer: any) => {
      if (answer.question_id && answer.selected_answer) {
        answersMap[answer.question_id] = answer.selected_answer;
      }
    });
  }

  // Process questions and calculate scores
  const categoryScores: Record<string, any> = {};
  const questionDetails: any[] = [];
  let totalScore = 0;
  let totalQuestions = 0;
  let answersCount = 0;

  if (Array.isArray(questions)) {
    questions.forEach((question: any) => {
      if (!question.id) return;

      const categoryName = question.category || 'Sin categoría';
      const answer = answersMap[question.id];
      
      if (answer) {
        answersCount++;
        const points = convertAnswerToPoints(answer);
        totalScore += points;

        if (!categoryScores[categoryName]) {
          categoryScores[categoryName] = {
            category: categoryName,
            score: 0,
            totalQuestions: 0,
            nationalAverage: 1.5,
            maxScore: 0
          };
        }

        categoryScores[categoryName].score += points;
        categoryScores[categoryName].totalQuestions += 1;
        categoryScores[categoryName].maxScore += 3;

        questionDetails.push({
          id: question.id,
          text: question.question_text || question.texto_pregunta,
          category: categoryName,
          answer: answer,
          points: points
        });
      }
      
      totalQuestions++;
    });
  }

  // Convert to array and calculate risk levels
  const categoryScoresArray = Object.values(categoryScores).map((category: any) => {
    const difference = category.score - category.nationalAverage;
    const adjustedScore = category.score + (examAttempt.personal_adjustment || 0);
    
    let risk = 'RIESGO BAJO';
    if (category.score >= category.totalQuestions * 2) {
      risk = 'RIESGO ALTO';
    } else if (category.score >= category.totalQuestions * 1) {
      risk = 'RIESGO MEDIO';
    }

    return {
      ...category,
      difference,
      adjustedScore,
      personalAdjustment: examAttempt.personal_adjustment || 0,
      risk
    };
  });

  // Calculate overall risk
  const maxPossibleScore = totalQuestions * 3;
  const scorePercentage = (totalScore / maxPossibleScore) * 100;
  
  let riskLevel = 'BAJO';
  let riskColor = '#28A745';
  
  if (scorePercentage >= 66.67) {
    riskLevel = 'ALTO';
    riskColor = '#DC3545';
  } else if (scorePercentage >= 33.33) {
    riskLevel = 'MEDIO';
    riskColor = '#F59E0B';
  }

  return {
    categoryScores: categoryScoresArray,
    questionDetails,
    totalScore,
    maxPossibleScore,
    scorePercentage,
    riskLevel,
    riskColor,
    questionsCount: totalQuestions,
    answersCount,
    personalAdjustment: examAttempt.personal_adjustment || 0
  };
}

// Helper function to convert answer text to points
function convertAnswerToPoints(answer: string): number {
  switch (answer) {
    case 'Nunca': return 0;
    case 'Rara vez': return 1;
    case 'A veces': return 2;
    case 'Frecuentemente': return 3;
    default: return 0;
  }
}

// Helper function to get risk CSS class
function getRiskClass(riskLevel: string): string {
  if (riskLevel.includes('ALTO')) return 'risk-high';
  if (riskLevel.includes('MEDIO')) return 'risk-medium';
  return 'risk-low';
}

// Helper function to generate category table rows
function generateCategoryRows(categoryScores: any[]): string {
  return categoryScores.map(category => `
    <tr>
      <td>${category.category}</td>
      <td>${category.score}</td>
      <td>${category.nationalAverage || 'N/A'}</td>
      <td>${((category.score / (category.maxScore || category.totalQuestions * 3)) * 100).toFixed(0)}%</td>
      <td class="${getRiskClass(category.risk)}">${category.risk}</td>
    </tr>
  `).join('');
}

// Helper function to generate comparison chart
function generateComparisonChart(categoryScores: any[]): string {
  const maxValue = Math.max(...categoryScores.map(c => c.score));
  const bars = categoryScores.map((category, index) => {
    const height = (category.score / maxValue) * 200;
    const y = 220 - height;
    return `
      <rect x="${index * 60 + 50}" y="${y}" width="40" height="${height}" fill="#4A90E2"/>
      <text x="${index * 60 + 70}" y="240" text-anchor="middle" font-size="10">${category.category.substring(0, 8)}</text>
      <text x="${index * 60 + 70}" y="${y - 5}" text-anchor="middle" font-size="10">${category.score}</text>
    `;
  }).join('');
  
  return `<svg width="400" height="250" xmlns="http://www.w3.org/2000/svg">
    ${bars}
    <line x1="40" y1="220" x2="380" y2="220" stroke="#333" stroke-width="2"/>
    <line x1="40" y1="220" x2="40" y2="20" stroke="#333" stroke-width="2"/>
  </svg>`;
}

// Generate AI analysis
async function generateAIAnalysis(examAttempt: any, processedData: any) {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.log('No OpenAI API key found, skipping AI analysis');
      return null;
    }

    const prompt = `Analiza los siguientes resultados de una evaluación de confiabilidad laboral:

CANDIDATO: ${examAttempt.profiles?.full_name}
ÁREA: ${examAttempt.profiles?.area}
EMPRESA: ${examAttempt.profiles?.company}

RESULTADOS POR CATEGORÍA:
${processedData.categoryScores.map((cat: any) => `${cat.category}: ${cat.score}/${cat.maxScore || cat.totalQuestions * 3} - ${cat.risk}`).join('\n')}

EVALUACIÓN GENERAL:
- Riesgo General: ${processedData.riskLevel}
- Puntaje Total: ${processedData.totalScore}/${processedData.maxPossibleScore}

Proporciona un análisis detallado que incluya:
1. Interpretación de los resultados por categoría
2. Identificación de fortalezas y áreas de riesgo
3. Análisis del perfil de confiabilidad general
4. Recomendaciones específicas

Responde de manera profesional y objetiva, enfocándote en la evaluación de riesgo laboral.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de riesgo laboral y evaluación psicométrica. Tu especialidad es interpretar resultados de evaluaciones de confiabilidad y proporcionar análisis detallados y objetivos para la toma de decisiones en recursos humanos.'
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1500,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API error:', data.error);
      return null;
    }

    const analysisText = data.choices[0].message.content;
    
    return {
      analysis: {
        detalle: analysisText,
        conclusiones: analysisText,
        seguimiento: 'Se sugiere realizar evaluaciones periódicas para monitorear el desarrollo del candidato.'
      }
    };

  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return null;
  }
}

// Generate hash for caching
function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Generate the HTML report
async function generateAlternativeReportHTML(
  examAttempt: any,
  examData: any,
  profileData: any,
  processedData: any,
  personalFactors: any,
  aiAnalysis: any,
  reportConfig: any
): Promise<string> {
  console.log('Loading reliability report template...');

  // Helper functions for template processing
  function getRiskClass(riskLevel: string): string {
    if (riskLevel.includes('ALTO')) return 'risk-high';
    if (riskLevel.includes('MEDIO')) return 'risk-medium';
    return 'risk-low';
  }

  function generateCategoryRows(categoryScores: any[]): string {
    return categoryScores.map(category => `
      <tr>
        <td>${category.category}</td>
        <td>${category.score}</td>
        <td>${category.nationalAverage || 'N/A'}</td>
        <td>${((category.score / (category.maxScore || category.totalQuestions * 3)) * 100).toFixed(0)}%</td>
        <td class="${getRiskClass(category.risk)}">${category.risk}</td>
      </tr>
    `).join('');
  }

  function generateComparisonChart(categoryScores: any[]): string {
    const maxValue = Math.max(...categoryScores.map(c => c.score));
    const bars = categoryScores.map((category, index) => {
      const height = (category.score / maxValue) * 200;
      const y = 220 - height;
      return `
        <rect x="${index * 60 + 50}" y="${y}" width="40" height="${height}" fill="#4A90E2"/>
        <text x="${index * 60 + 70}" y="240" text-anchor="middle" font-size="10">${category.category.substring(0, 8)}</text>
        <text x="${index * 60 + 70}" y="${y - 5}" text-anchor="middle" font-size="10">${category.score}</text>
      `;
    }).join('');
    
    return `<svg width="400" height="250" xmlns="http://www.w3.org/2000/svg">
      ${bars}
      <line x1="40" y1="220" x2="380" y2="220" stroke="#333" stroke-width="2"/>
      <line x1="40" y1="220" x2="40" y2="20" stroke="#333" stroke-width="2"/>
    </svg>`;
  }

  const defaultTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template - Reporte de Confiabilidad</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #4A90E2;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-bottom: 15px;
        }
        .logo-placeholder {
            width: 80px;
            height: 80px;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10pt;
            color: #666;
        }
        .company-info h1 {
            color: #4A90E2;
            font-size: 24pt;
            margin: 0;
            font-weight: bold;
        }
        .report-title {
            color: #666;
            font-size: 16pt;
            margin: 5px 0 0 0;
        }
        .section {
            margin: 25px 0;
            page-break-inside: avoid;
        }
        .section-title {
            background-color: #f5f5f5;
            padding: 10px;
            font-weight: bold;
            font-size: 14pt;
            border-left: 4px solid #4A90E2;
            margin-bottom: 15px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 15px 0;
        }
        .info-item {
            padding: 8px;
            border-bottom: 1px solid #eee;
        }
        .info-label {
            font-weight: bold;
            color: #666;
        }
        .score-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 11pt;
        }
        .score-table th,
        .score-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .score-table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .risk-high { color: #d32f2f; font-weight: bold; }
        .risk-medium { color: #f57c00; font-weight: bold; }
        .risk-low { color: #388e3c; font-weight: bold; }
        .chart-placeholder {
            width: 100%;
            height: 300px;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px 0;
            font-size: 14pt;
            color: #666;
        }
        .analysis-section {
            background-color: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #4A90E2;
            margin: 20px 0;
        }
        .footer {
            border-top: 2px solid #4A90E2;
            padding-top: 20px;
            margin-top: 40px;
            text-align: center;
            font-size: 10pt;
            color: #666;
        }
        .page-break { page-break-before: always; }
        @media print {
            body { margin: 0; padding: 15px; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <!-- HEADER SECTION -->
    <div class="header">
        <div class="logo-section">
            <div class="logo-placeholder">{{COMPANY_LOGO}}</div>
            <div class="company-info">
                <h1>{{COMPANY_NAME}}</h1>
                <div class="report-title">Reporte de Evaluación de Confiabilidad</div>
            </div>
        </div>
        <div style="font-size: 11pt; color: #666;">
            Fecha de generación: {{GENERATION_DATE}}
        </div>
    </div>

    <!-- INFORMACIÓN PERSONAL -->
    <div class="section">
        <div class="section-title">Información Personal del Candidato</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Nombre Completo:</div>
                <div>{{CANDIDATE_NAME}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Email:</div>
                <div>{{CANDIDATE_EMAIL}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Empresa:</div>
                <div>{{CANDIDATE_COMPANY}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Área:</div>
                <div>{{CANDIDATE_AREA}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Sección:</div>
                <div>{{CANDIDATE_SECTION}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Fecha de Evaluación:</div>
                <div>{{EXAM_DATE}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Duración del Examen:</div>
                <div>{{EXAM_DURATION}} minutos</div>
            </div>
            <div class="info-item">
                <div class="info-label">Estado:</div>
                <div>{{EXAM_STATUS}}</div>
            </div>
        </div>
    </div>

    <!-- RESUMEN EJECUTIVO -->
    <div class="section">
        <div class="section-title">Resumen Ejecutivo</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center;">
            <div style="padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <div style="font-size: 24pt; font-weight: bold; color: #4A90E2;">{{OVERALL_SCORE}}</div>
                <div>Puntaje General</div>
            </div>
            <div style="padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <div style="font-size: 18pt; font-weight: bold;" class="{{RISK_LEVEL_CLASS}}">{{RISK_LEVEL}}</div>
                <div>Nivel de Riesgo</div>
            </div>
            <div style="padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <div style="font-size: 18pt; font-weight: bold; color: #666;">{{QUESTIONS_ANSWERED}}</div>
                <div>Preguntas Respondidas</div>
            </div>
        </div>
    </div>

    <!-- PUNTAJES POR CATEGORÍA -->
    <div class="section">
        <div class="section-title">Puntajes por Categoría</div>
        <table class="score-table">
            <thead>
                <tr>
                    <th>Categoría</th>
                    <th>Puntaje Obtenido</th>
                    <th>Promedio Nacional</th>
                    <th>Percentil</th>
                    <th>Nivel de Riesgo</th>
                </tr>
            </thead>
            <tbody>
                {{CATEGORY_ROWS}}
            </tbody>
        </table>
    </div>

    <!-- GRÁFICO COMPARATIVO -->
    <div class="section">
        <div class="section-title">Comparación con Promedio Nacional</div>
        <div class="chart-placeholder">
            {{COMPARISON_CHART}}
        </div>
    </div>

    <div class="page-break"></div>

    <!-- FACTORES PERSONALES -->
    <div class="section">
        <div class="section-title">Factores Personales de Ajuste</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Estado Civil:</div>
                <div>{{MARITAL_STATUS}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Tiene Hijos:</div>
                <div>{{HAS_CHILDREN}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Situación Habitacional:</div>
                <div>{{HOUSING_STATUS}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Edad:</div>
                <div>{{AGE}} años</div>
            </div>
        </div>
        <div style="margin-top: 15px;">
            <div class="info-label">Ajuste Personal Total:</div>
            <div style="font-size: 14pt; font-weight: bold; color: #4A90E2;">{{PERSONAL_ADJUSTMENT}}%</div>
        </div>
    </div>

    <!-- ANÁLISIS AI -->
    <div class="section">
        <div class="section-title">Análisis Detallado</div>
        <div class="analysis-section">
            {{AI_DETAILED_ANALYSIS}}
        </div>
    </div>

    <!-- CONCLUSIONES -->
    <div class="section">
        <div class="section-title">Conclusiones y Recomendaciones</div>
        <div class="analysis-section">
            {{AI_CONCLUSIONS}}
        </div>
    </div>

    <!-- INTERPRETACIÓN DE NIVELES DE RIESGO -->
    <div class="section">
        <div class="section-title">Interpretación de Niveles de Riesgo</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div style="padding: 15px; background-color: #e8f5e8; border-left: 4px solid #388e3c;">
                <div style="font-weight: bold; color: #388e3c;">RIESGO BAJO</div>
                <div style="font-size: 10pt;">Comportamiento confiable y consistente con las normas organizacionales.</div>
            </div>
            <div style="padding: 15px; background-color: #fff3e0; border-left: 4px solid #f57c00;">
                <div style="font-weight: bold; color: #f57c00;">RIESGO MEDIO</div>
                <div style="font-size: 10pt;">Requiere supervisión adicional y seguimiento periódico.</div>
            </div>
            <div style="padding: 15px; background-color: #ffebee; border-left: 4px solid #d32f2f;">
                <div style="font-weight: bold; color: #d32f2f;">RIESGO ALTO</div>
                <div style="font-size: 10pt;">Requiere evaluación adicional antes de la contratación.</div>
            </div>
        </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
        <div class="logo-placeholder" style="width: 50px; height: 50px; margin: 0 auto 10px;">{{FOOTER_LOGO}}</div>
        <div style="font-weight: bold;">{{COMPANY_NAME}}</div>
        {{COMPANY_ADDRESS}}<br>
        Teléfono: {{COMPANY_PHONE}}<br>
        Email: {{COMPANY_EMAIL}}<br>
        <div style="margin-top: 10px; font-style: italic;">
            Reporte generado automáticamente el {{GENERATION_DATE}}
        </div>
    </div>
</body>
</html>`;

  // Verificar si hay un template personalizado en la configuración
  const templateToUse = reportConfig?.custom_template || defaultTemplate;
  
  console.log('Processing template with placeholders...');
  
  // Crear el contexto completo para el procesamiento
  const templateContext = {
    COMPANY_NAME: reportConfig?.company_name || 'Avsec Trust',
    COMPANY_LOGO: reportConfig?.header_logo_url || '',
    GENERATION_DATE: new Date().toLocaleDateString('es-ES'),
    CANDIDATE_NAME: profileData?.full_name || examAttempt.profiles?.full_name || '',
    CANDIDATE_EMAIL: profileData?.email || examAttempt.profiles?.email || '',
    CANDIDATE_COMPANY: profileData?.company || examAttempt.profiles?.company || '',
    CANDIDATE_AREA: profileData?.area || examAttempt.profiles?.area || '',
    CANDIDATE_SECTION: profileData?.section || examAttempt.profiles?.section || '',
    EXAM_DATE: examAttempt.started_at ? new Date(examAttempt.started_at).toLocaleDateString('es-ES') : '',
    EXAM_DURATION: examData?.duracion_minutos || 60,
    EXAM_STATUS: examAttempt.completed_at ? 'Completado' : 'En progreso',
    OVERALL_SCORE: `${processedData.totalScore}/${processedData.maxPossibleScore}`,
    RISK_LEVEL: processedData.riskLevel,
    RISK_LEVEL_CLASS: getRiskClass(processedData.riskLevel),
    QUESTIONS_ANSWERED: `${processedData.answersCount}/${processedData.questionsCount}`,
    CATEGORY_ROWS: generateCategoryRows(processedData.categoryScores),
    COMPARISON_CHART: generateComparisonChart(processedData.categoryScores),
    MARITAL_STATUS: personalFactors?.estado_civil || 'No especificado',
    HAS_CHILDREN: personalFactors?.tiene_hijos ? 'Sí' : 'No',
    HOUSING_STATUS: personalFactors?.situacion_habitacional || 'No especificado',
    AGE: personalFactors?.edad || 'No especificado',
    PERSONAL_ADJUSTMENT: ((personalFactors?.ajuste_total || 0) * 100).toFixed(1),
    AI_DETAILED_ANALYSIS: aiAnalysis?.analysis?.detalle || 'Análisis no disponible',
    AI_CONCLUSIONS: aiAnalysis?.analysis?.conclusiones || 'Conclusiones no disponibles',
    FOOTER_LOGO: reportConfig?.footer_logo_url || reportConfig?.header_logo_url || '',
    COMPANY_ADDRESS: reportConfig?.company_address || '',
    COMPANY_PHONE: reportConfig?.company_phone || '',
    COMPANY_EMAIL: reportConfig?.company_email || ''
  };
  
  console.log('Template context created:', Object.keys(templateContext));
  
  // Reemplazar todos los placeholders en el template
  let processedTemplate = templateToUse;
  
  // Reemplazar cada placeholder
  Object.entries(templateContext).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const replacement = String(value || '');
    processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), replacement);
  });
  
  console.log('Template processing completed');
  return processedTemplate;
}
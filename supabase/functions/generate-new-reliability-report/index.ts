/*
Modificación René Ruiz, primera prueba con Claude
12082025 17:34 hrs
Archivo original
Ruta de donde se encontraba ubicado: supabase/functions/generate-new-reliability-report/index.ts

CORRECCIONES APLICADAS:
1. Corregida la obtención de datos de preguntas y respuestas
2. Corregido el cálculo de media poblacional por categoría
3. Corregido el mapeo de respuestas numéricas
4. Corregida la estructura de datos del examAttempt
*/

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== GENERATE-NEW-RELIABILITY-REPORT FUNCTION STARTED ===')
  console.log('Request method:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...')
    const requestBody = await req.json()
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    
    const { examAttemptId, includeCharts = true, includeAnalysis = true, forceRegenerate = false } = requestBody;
    
    if (!examAttemptId) {
      return new Response(
        JSON.stringify({ error: 'examAttemptId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Generating new reliability report for attempt:', examAttemptId);

    // 1. Obtener datos de la evaluación
    const { data: examAttempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', examAttemptId)
      .single();

    if (attemptError || !examAttempt) {
      console.error('Error fetching exam attempt:', attemptError);
      return new Response(
        JSON.stringify({ error: 'No se encontró el intento de examen' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1.1. Obtener datos del examen
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('title, description')
      .eq('id', examAttempt.exam_id)
      .single();

    // 1.2. Obtener datos del perfil
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, company, area, section')
      .eq('id', examAttempt.user_id)
      .single();

    // Asignar los datos obtenidos
    examAttempt.exams = examData;
    examAttempt.profiles = profileData;


    // 2. Obtener las preguntas del examen con sus categorías
    // Primero obtenemos las preguntas del examen desde exam_attempts.questions (JSONB)
    const examQuestions = examAttempt.questions || [];
    const questionIds = examQuestions.map((q: any) => q.id);

    // Obtener detalles de las preguntas con sus categorías
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        national_average,
        question_categories(name)
      `)
      .in('id', questionIds);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Error al obtener las preguntas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Usar las respuestas del JSONB en exam_attempts
    const examAnswers = examAttempt.answers || {};

    // 4. Estructurar los datos para el procesamiento
    // Mapear las preguntas con su información de categoría
    const questionsWithCategories = examQuestions.map((examQ: any) => {
      const questionDetail = questions?.find((q: any) => q.id === examQ.id);
      return {
        ...examQ,
        question_text: questionDetail?.question_text || examQ.question_text,
        category_name: (questionDetail?.question_categories as any)?.name || 'Sin categoria',
        national_average: questionDetail?.national_average || examQ.national_average
      };
    });

    examAttempt.questions = questionsWithCategories;
    examAttempt.answers = examAnswers;

    // 5. Obtener configuración del reporte y del sistema
    const { data: reportConfig } = await supabase
      .from('report_config')
      .select('*')
      .eq('exam_id', examAttempt.exam_id)
      .single();
    
    const { data: systemConfig } = await supabase
      .from('system_config')
      .select('system_name, logo_url')
      .single();

    const config = reportConfig || {
      include_sections: {
        personal_info: true,
        category_scores: true,
        risk_analysis: true,
        recommendations: true,
        charts: true,
        detailed_breakdown: true,
        conclusion: true
      },
      font_family: 'Arial',
      font_size: 12,
      company_name: '',
      company_address: '',
      company_phone: '',
      company_email: ''
    };

    // 6. Procesar datos de categorías
    const categoryData = await processReliabilityData(examAttempt, supabase);
    
    // 7. Generar análisis con OpenAI usando sistema de cache mejorado
    let aiAnalysis = null;
    let aiConclusions = null;
    
    if (includeAnalysis) {
      console.log('Checking for cached AI analysis for user:', examAttempt.user_id);
      
      // Buscar análisis cacheado existente para este usuario y examen
      const { data: existingAnalysis, error: searchError } = await supabase
        .from('ai_analysis_cache')
        .select('ai_analysis_result, generated_at')
        .eq('user_id', examAttempt.user_id)
        .eq('exam_id', examAttempt.exam_id)
        .eq('analysis_type', 'reliability')
        .eq('is_active', true)
        .gte('generated_at', new Date(Date.now() - (720 * 60 * 60 * 1000)).toISOString()) // 720 horas
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!searchError && existingAnalysis?.ai_analysis_result) {
        console.log('Using cached AI analysis for user:', examAttempt.user_id);
        const cachedResult = existingAnalysis.ai_analysis_result;
        aiAnalysis = cachedResult.analysis || null;
        aiConclusions = cachedResult.conclusions || null;
      } else {
        try {
          console.log('Generating new AI analysis for user:', examAttempt.user_id);
          const analysisResult = await generateOpenAIAnalysis(examAttempt, categoryData, supabase);
          aiAnalysis = analysisResult.analysis;
          aiConclusions = analysisResult.conclusions;
          
          // Guardar en cache solo si tenemos análisis válido y no existe uno previo
          if (aiAnalysis && aiConclusions) {
            // Preparar datos de entrada para el hash
            const inputData = {
              exam_id: examAttempt.exam_id,
              user_id: examAttempt.user_id,
              analysis_version: '2.1'
            };
            
            const cacheResult = {
              analysis: aiAnalysis,
              conclusions: aiConclusions,
              generated_at: new Date().toISOString(),
              model_used: 'gpt-4.1-2025-04-14'
            };
            
            // Desactivar análisis previos para este usuario y examen
            await supabase
              .from('ai_analysis_cache')
              .update({ is_active: false })
              .eq('user_id', examAttempt.user_id)
              .eq('exam_id', examAttempt.exam_id)
              .eq('analysis_type', 'reliability');
            
            try {
              console.log('Saving new AI analysis to cache for user:', examAttempt.user_id);
              
              // Generar hash único basado en user_id y exam_id
              const inputHash = `reliability_${examAttempt.user_id}_${examAttempt.exam_id}`;
              
              const { data: cacheInsert, error: insertError } = await supabase
                .from('ai_analysis_cache')
                .insert({
                  user_id: examAttempt.user_id,
                  exam_id: examAttempt.exam_id,
                  psychometric_test_id: null,
                  analysis_type: 'reliability',
                  input_data_hash: inputHash,
                  input_data: inputData,
                  ai_analysis_result: cacheResult,
                  tokens_used: null,
                  model_used: 'gpt-4.1-2025-04-14',
                  requested_by: examAttempt.user_id,
                  expires_at: new Date(Date.now() + (720 * 60 * 60 * 1000)).toISOString(),
                  is_active: true
                })
                .select()
                .single();
              
              if (insertError) {
                console.error('Error inserting AI analysis to cache:', insertError);
                console.error('Insert error details:', JSON.stringify(insertError, null, 2));
              } else {
                console.log('AI analysis inserted to cache successfully:', cacheInsert?.id);
                
                // Actualizar el hash ahora que tenemos el ID
                if (cacheInsert?.id) {
                  const inputHash = 'hash_' + cacheInsert.id;
                  await supabase
                    .from('ai_analysis_cache')
                    .update({ input_data_hash: inputHash })
                    .eq('id', cacheInsert.id);
                }
              }
            } catch (cacheError) {
              console.error('Exception saving analysis to cache:', cacheError);
              console.error('Cache exception details:', JSON.stringify(cacheError, null, 2));
            }
            
            // Mantener compatibilidad con el cache anterior
            await supabase
              .from('exam_attempts')
              .update({
                ai_analysis: { analysis: aiAnalysis, conclusions: aiConclusions },
                ai_analysis_generated_at: new Date().toISOString()
              })
              .eq('id', examAttemptId);
              
            console.log('AI analysis also saved to exam_attempts table for compatibility');
          } else {
            console.log('No AI analysis generated, skipping cache save');
          }
        } catch (error) {
          console.error('Error generating AI analysis:', error);
          console.error('AI generation error details:', JSON.stringify(error, null, 2));
          // Continuar sin análisis de IA
        }
      }
    }

    // 8. Generar HTML del reporte
    const reportHtml = generateReliabilityReportHTML({
      config,
      examAttempt,
      categoryData,
      aiAnalysis,
      aiConclusions,
      includeCharts,
      systemName: systemConfig?.system_name || 'Sistema',
      logoUrl: systemConfig?.logo_url || null
    });

    return new Response(
      JSON.stringify({ 
        html: reportHtml,
        success: true,
        metadata: {
          candidate: examAttempt.profiles?.full_name || 'Sin nombre',
          exam: examAttempt.exams?.title || 'Sin título',
          date: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-new-reliability-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processReliabilityData(examAttempt: any, supabase: any) {
  const questions = examAttempt.questions || [];
  const rawAnswers = examAttempt.answers ?? [];
  
  // Normalizar respuestas a un mapa { [questionId]: answerString }
  const answersMap: Record<string, string> = (() => {
    const map: Record<string, string> = {};
    if (Array.isArray(rawAnswers)) {
      for (let i = 0; i < rawAnswers.length; i++) {
        const a: any = rawAnswers[i];
        const qid = a?.question_id || a?.questionId || a?.id || questions[i]?.id;
        const ans = a?.answer || a?.value || a?.selected_option || a?.selectedAnswer || (typeof a === 'string' ? a : undefined);
        if (qid && typeof ans === 'string') map[qid] = ans;
      }
    } else if (rawAnswers && typeof rawAnswers === 'object') {
      return rawAnswers as Record<string, string>;
    }
    return map;
  })();
  
  console.log('Processing reliability data for', questions.length, 'questions');
  console.log('Answers received (normalized):', Object.keys(answersMap).length, 'answers');
  
  // Agrupar por categorias
  const categoryGroups: { [key: string]: any[] } = {};
  
  questions.forEach((question: any) => {
    const categoryName = question.category_name || 'Sin categoria';
    if (!categoryGroups[categoryName]) {
      categoryGroups[categoryName] = [];
    }
    
    const userAnswer = answersMap[question.id] || question.userAnswer || question.answer || 'Nunca';
    const numericValue = getNumericValue(userAnswer);
    
    categoryGroups[categoryName].push({
      ...question,
      userAnswer: userAnswer,
      numericValue: numericValue
    });
    
    console.log('Question', question.id, ':', userAnswer, '=', numericValue);
  });

  // Calcular estadísticas por categoría
  const categoryResults = Object.entries(categoryGroups).map(([categoryName, categoryQuestions]) => {
    const totalQuestions = categoryQuestions.length;
    const totalScore = categoryQuestions.reduce((sum, q) => sum + q.numericValue, 0);
    const average = totalScore / totalQuestions;
    
    // Calcular media poblacional de las preguntas de esta categoría
    // CORRECCIÓN: Usar los valores reales de national_average o media_poblacional_pregunta
    const nationalAverage = categoryQuestions.reduce((sum, q) => {
      // Priorizar national_average, luego media_poblacional_pregunta, por defecto 1.5
      let questionAvg = 1.5; // Valor por defecto
      
      if (q.national_average !== null && q.national_average !== undefined) {
        questionAvg = parseFloat(q.national_average);
      } else if (q.media_poblacional_pregunta !== null && q.media_poblacional_pregunta !== undefined) {
        questionAvg = parseFloat(q.media_poblacional_pregunta);
      }
      
      console.log(`Category ${categoryName}, Question ${q.id}: using national_average=${questionAvg}`);
      return sum + questionAvg;
    }, 0) / totalQuestions;
    
    const difference = average - nationalAverage;
    
    // CORRECCIÓN: Interpretación según VBA mejorada
    // >= 2*preguntas = ALTO, >= 1*preguntas = MEDIO, < 1*preguntas = BAJO
    let risk = "RIESGO BAJO";
    const percentage = (totalScore / (totalQuestions * 3)) * 100;
    
    if (totalScore >= totalQuestions * 2) {
      risk = "RIESGO ALTO";
    } else if (totalScore >= totalQuestions * 1) {
      risk = "RIESGO MEDIO";
    }

    console.log(`Category ${categoryName}: ${totalScore}/${totalQuestions * 3} points, ${percentage.toFixed(2)}%, ${risk}`);

    return {
      categoryName,
      totalQuestions,
      totalScore,
      average: parseFloat(average.toFixed(2)),
      percentage: parseFloat(percentage.toFixed(2)),
      nationalAverage: parseFloat(nationalAverage.toFixed(2)),
      difference: parseFloat(difference.toFixed(2)),
      risk,
      questions: categoryQuestions
    };
  });

  // Calcular riesgo general
  const totalQuestions = questions.length;
  const totalScore = Object.values(answersMap).reduce((sum: number, answer: any) => {
    return sum + getNumericValue(answer as string);
  }, 0);
  
  // Calcular scores ajustados por factores personales si hay sessionId
  let adjustedTotalScore = totalScore;
  let personalAdjustment = 0;
  let personalFactors = null;

  // Buscar sessionId asociado al attempt
  const { data: sessionData } = await supabase
    .from('exam_sessions')
    .select('id')
    .eq('exam_id', examAttempt.exam_id)
    .eq('user_id', examAttempt.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionData?.id) {
    try {
      const adjustmentResponse = await supabase.functions.invoke('calculate-adjusted-scores', {
        body: {
          sessionId: sessionData.id,
          baseScores: totalScore,
          resultType: 'reliability',
          attemptId: examAttempt.id
        }
      });

      if (adjustmentResponse.data?.success) {
        adjustedTotalScore = adjustmentResponse.data.adjustedScores;
        personalAdjustment = adjustmentResponse.data.adjustment;
        personalFactors = adjustmentResponse.data.personalFactors;
        console.log('Applied personal adjustment to reliability score:', personalAdjustment);
      }
    } catch (error) {
      console.error('Error calculating adjusted reliability scores:', error);
      // Continue with base scores if adjustment fails
    }
  }
  
  let overallRisk = "RIESGO BAJO";
  if (totalScore >= totalQuestions * 2) {
    overallRisk = "RIESGO ALTO";
  } else if (totalScore >= totalQuestions * 1) {
    overallRisk = "RIESGO MEDIO";
  }

  // Calcular riesgo ajustado
  let adjustedOverallRisk = "RIESGO BAJO";
  if (adjustedTotalScore >= totalQuestions * 2) {
    adjustedOverallRisk = "RIESGO ALTO";
  } else if (adjustedTotalScore >= totalQuestions * 1) {
    adjustedOverallRisk = "RIESGO MEDIO";
  }

  console.log(`Overall base: ${totalScore}/${totalQuestions * 3} points, ${overallRisk}`);
  console.log(`Overall adjusted: ${adjustedTotalScore}/${totalQuestions * 3} points, ${adjustedOverallRisk}`);

  return {
    categoryResults,
    overallRisk,
    adjustedOverallRisk,
    totalQuestions,
    totalScore,
    adjustedTotalScore,
    personalAdjustment,
    personalFactors,
    overallAverage: parseFloat((totalScore / totalQuestions).toFixed(2)),
    adjustedOverallAverage: parseFloat((adjustedTotalScore / totalQuestions).toFixed(2))
  };
}

function getNumericValue(answer: string): number {
  if (!answer) return 0;
  
  const normalizedAnswer = answer.toString().trim().toLowerCase();
  
  switch (normalizedAnswer) {
    case 'nunca':
      return 0;
    case 'rara vez':
      return 1;
    case 'a veces':
      return 2;
    case 'frecuentemente':
      return 3;
    default:
      console.log(`Unknown answer: "${answer}", defaulting to 0`);
      return 0;
  }
}

// Función para obtener configuración específica de OpenAI
async function getOpenAIConfig(supabase: any, testType: string) {
  try {
    const { data: config, error } = await supabase
      .from('system_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !config) {
      console.log('No se pudo obtener configuración, usando defaults');
      return {
        model: 'gpt-4.1-2025-04-14',
        temperature: 0.7,
        max_tokens: 1500
      };
    }

    // Configuración específica según el tipo de test
    switch(testType) {
      case 'reliability_analysis':
        return {
          model: config.confiabilidad_analisis_modelo || 'gpt-4.1-2025-04-14',
          temperature: config.confiabilidad_analisis_temperatura || 0.7,
          max_tokens: config.confiabilidad_analisis_max_tokens || 1500
        };
      case 'reliability_conclusions':
        return {
          model: config.confiabilidad_conclusiones_modelo || 'gpt-4.1-2025-04-14',
          temperature: config.confiabilidad_conclusiones_temperatura || 0.7,
          max_tokens: config.confiabilidad_conclusiones_max_tokens || 1000
        };
      default:
        return {
          model: config.openai_model || 'gpt-4.1-2025-04-14',
          temperature: 0.7,
          max_tokens: 1500
        };
    }
  } catch (error) {
    console.error('Error obteniendo configuración OpenAI:', error);
    return {
      model: 'gpt-4.1-2025-04-14',
      temperature: 0.7,
      max_tokens: 1500
    };
  }
}

async function generateOpenAIAnalysis(examAttempt: any, categoryData: any, supabase: any) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    console.log('OpenAI API key not found, skipping AI analysis');
    return { analysis: null, conclusions: null };
  }

  // Obtener configuración específica
  const analysisConfig = await getOpenAIConfig(supabase, 'reliability_analysis');
  const conclusionsConfig = await getOpenAIConfig(supabase, 'reliability_conclusions');
  
  // Obtener prompts de la base de datos
  const { data: systemConfig, error: configError } = await supabase
    .from('system_config')
    .select('confiabilidad_analisis_system_prompt, confiabilidad_analisis_user_prompt, confiabilidad_conclusiones_system_prompt, confiabilidad_conclusiones_user_prompt')
    .limit(1)
    .maybeSingle();

  if (configError) {
    console.error('Error obteniendo prompts:', configError);
  }

  console.log('Usando configuración análisis:', analysisConfig);
  console.log('Usando configuración conclusiones:', conclusionsConfig);

  // Formatear datos para las variables
  const categoryResults = categoryData.categoryResults.map((category: any) => {
    return `
- ${category.categoryName}:
  * Puntaje: ${category.totalScore}/${category.totalQuestions * 3} (${category.percentage}%)
  * Promedio: ${category.average}/3.0
  * Media Nacional: ${category.nationalAverage}/3.0
  * Diferencia: ${category.difference > 0 ? '+' : ''}${category.difference}
  * Evaluación: ${category.risk}
  * Preguntas evaluadas: ${category.totalQuestions}
    `.trim();
  }).join('\n\n');

  // Usar prompts de la base de datos o fallback
  const analysisSystemPrompt = systemConfig?.confiabilidad_analisis_system_prompt || 
    'Eres un experto en análisis de riesgo laboral y evaluación psicométrica. Tu especialidad es interpretar resultados de evaluaciones de confiabilidad y proporcionar análisis detallados y objetivos para la toma de decisiones en recursos humanos.';

  const analysisUserPromptTemplate = systemConfig?.confiabilidad_analisis_user_prompt || `
Analiza los siguientes resultados de una evaluación de confiabilidad laboral:

CANDIDATO: \${examAttempt.profiles?.full_name}
ÁREA: \${examAttempt.profiles?.area}
EMPRESA: \${examAttempt.profiles?.company}

RESULTADOS POR CATEGORÍA:
\${categoryData.categoryResults}

EVALUACIÓN GENERAL:
- Riesgo General: \${categoryData.overallRisk}
- Puntaje Total: \${categoryData.totalScore}/\${categoryData.totalQuestions}

Proporciona un análisis detallado que incluya:
1. Interpretación de los resultados por categoría
2. Identificación de fortalezas y áreas de riesgo
3. Análisis del perfil de confiabilidad general
4. Factores de riesgo específicos detectados

Responde de manera profesional y objetiva, enfocándote en la evaluación de riesgo laboral.`;

  const conclusionsSystemPrompt = systemConfig?.confiabilidad_conclusiones_system_prompt || 
    'Eres un consultor especializado en recursos humanos con expertise en evaluaciones de confiabilidad. Tu función es proporcionar conclusiones prácticas y recomendaciones basadas en análisis de riesgo laboral.';

  const conclusionsUserPromptTemplate = systemConfig?.confiabilidad_conclusiones_user_prompt || `
Basándote en el análisis de confiabilidad realizado:

CANDIDATO: \${examAttempt.profiles?.full_name}
ANÁLISIS PREVIO: \${analysisResult}

RESULTADOS GENERALES:
- Riesgo General: \${categoryData.overallRisk}
- Puntaje Total: \${categoryData.totalScore}/\${categoryData.totalQuestions}

Proporciona conclusiones y recomendaciones que incluyan:
1. Recomendación final sobre la confiabilidad del candidato
2. Estrategias de mitigación de riesgos identificados
3. Recomendaciones para el proceso de selección
4. Sugerencias de seguimiento o evaluaciones adicionales

Mantén un enfoque práctico y orientado a la toma de decisiones en recursos humanos.`;

  // Importar procesador de prompts con fallback
  const { processPrompt } = await import('../_shared/promptProcessor.ts').catch(() => {
    // Fallback simple en caso de que no se pueda importar
    return {
      processPrompt: (prompt: string, vars: any) => ({
        processedPrompt: prompt.replace(/\$\{examAttempt\.profiles\?\.full_name\}/g, vars.examAttempt?.profiles?.full_name || 'No especificado')
          .replace(/\$\{examAttempt\.profiles\?\.area\}/g, vars.examAttempt?.profiles?.area || 'No especificada')
          .replace(/\$\{examAttempt\.profiles\?\.company\}/g, vars.examAttempt?.profiles?.company || 'No especificada')
          .replace(/\$\{categoryData\.categoryResults\}/g, vars.categoryData?.categoryResults || 'No disponible')
          .replace(/\$\{categoryData\.overallRisk\}/g, vars.categoryData?.overallRisk || 'No calculado')
          .replace(/\$\{categoryData\.totalScore\}/g, String(vars.categoryData?.totalScore || 0))
          .replace(/\$\{categoryData\.totalQuestions\}/g, String(vars.categoryData?.totalQuestions || 0))
          .replace(/\$\{analysisResult\}/g, vars.analysisResult || 'No disponible'),
        validation: { isValid: true, missingVariables: [], errors: [] }
      })
    };
  });

  try {
    console.log('=== INICIANDO ANÁLISIS DE OPENAI ===');
    console.log('Analysis Config:', JSON.stringify(analysisConfig, null, 2));
    console.log('Conclusions Config:', JSON.stringify(conclusionsConfig, null, 2));
    
    // Primera llamada: Análisis detallado
    const analysisVariables = {
      examAttempt: examAttempt,
      categoryData: {
        categoryResults: categoryResults,
        overallRisk: categoryData.overallRisk,
        totalScore: categoryData.totalScore,
        totalQuestions: categoryData.totalQuestions
      }
    };

    const { processedPrompt: analysisPrompt, validation: analysisValidation } = 
      processPrompt(analysisUserPromptTemplate, analysisVariables, 'reliability_analysis');

    if (!analysisValidation.isValid) {
      console.error('Validación del prompt de análisis falló:', analysisValidation.errors);
      return { analysis: null, conclusions: null };
    }

    console.log('Analysis Prompt Preview (first 200 chars):', analysisPrompt.substring(0, 200) + '...');
    console.log('Calling OpenAI for analysis with model:', analysisConfig.model);

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: analysisConfig.model,
        messages: [
          {
            role: 'system',
            content: analysisSystemPrompt
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        // Usar siempre max_completion_tokens para gpt-5 y otros modelos nuevos
        max_completion_tokens: analysisConfig.max_tokens || 1500,
        // Solo incluir temperature para modelos legacy
        ...(analysisConfig.model.includes('gpt-4o') ? { temperature: analysisConfig.temperature || 0.7 } : {})
      }),
    });

    console.log('OpenAI Analysis Response Status:', analysisResponse.status);

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('OpenAI Analysis Error Response:', errorText);
      throw new Error(`OpenAI API error: ${analysisResponse.status} - ${errorText}`);
    }

    const analysisResult = await analysisResponse.json();
    console.log('Analysis Response Structure:', Object.keys(analysisResult));
    console.log('Analysis Choices Count:', analysisResult.choices?.length);
    
    if (!analysisResult.choices || analysisResult.choices.length === 0) {
      console.error('No choices in OpenAI response:', analysisResult);
      throw new Error('Invalid OpenAI response structure');
    }

    const analysisText = analysisResult.choices[0].message.content;
    
    if (typeof analysisText !== 'string') {
      console.error('Analysis text is not a string:', typeof analysisText, analysisText);
      throw new Error('Invalid analysis response format');
    }

    console.log('AI analysis generated successfully, length:', analysisText.length);

    // Segunda llamada: Conclusiones y recomendaciones
    console.log('=== INICIANDO CONCLUSIONES DE OPENAI ==='); 
    const conclusionsVariables = {
      examAttempt: examAttempt,
      analysisResult: analysisText,
      categoryData: {
        overallRisk: categoryData.overallRisk,
        totalScore: categoryData.totalScore,
        totalQuestions: categoryData.totalQuestions
      }
    };

    const { processedPrompt: conclusionsPrompt, validation: conclusionsValidation } = 
      processPrompt(conclusionsUserPromptTemplate, conclusionsVariables, 'reliability_conclusions');

    if (!conclusionsValidation.isValid) {
      console.error('Validación del prompt de conclusiones falló:', conclusionsValidation.errors);
      return { analysis: analysisText, conclusions: null };
    }

    console.log('Conclusions Prompt Preview (first 200 chars):', conclusionsPrompt.substring(0, 200) + '...');
    console.log('Calling OpenAI for conclusions with model:', conclusionsConfig.model);

    const conclusionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: conclusionsConfig.model,
        messages: [
          {
            role: 'system',
            content: conclusionsSystemPrompt
          },
          {
            role: 'user',
            content: conclusionsPrompt
          }
        ],
        // Usar siempre max_completion_tokens para gpt-5 y otros modelos nuevos
        max_completion_tokens: conclusionsConfig.max_tokens || 1000,
        // Solo incluir temperature para modelos legacy
        ...(conclusionsConfig.model.includes('gpt-4o') ? { temperature: conclusionsConfig.temperature || 0.7 } : {})
      }),
    });

    console.log('OpenAI Conclusions Response Status:', conclusionsResponse.status);

    if (!conclusionsResponse.ok) {
      const errorText = await conclusionsResponse.text();
      console.error('OpenAI Conclusions Error Response:', errorText);
      throw new Error(`OpenAI API error: ${conclusionsResponse.status} - ${errorText}`);
    }

    const conclusionsResult = await conclusionsResponse.json();
    console.log('Conclusions Response Structure:', Object.keys(conclusionsResult));
    console.log('Conclusions Choices Count:', conclusionsResult.choices?.length);
    
    if (!conclusionsResult.choices || conclusionsResult.choices.length === 0) {
      console.error('No choices in OpenAI conclusions response:', conclusionsResult);
      throw new Error('Invalid OpenAI conclusions response structure');
    }

    const conclusionsText = conclusionsResult.choices[0].message.content;
    
    if (typeof conclusionsText !== 'string') {
      console.error('Conclusions text is not a string:', typeof conclusionsText, conclusionsText);
      throw new Error('Invalid conclusions response format');
    }

    console.log('AI conclusions generated successfully, length:', conclusionsText.length);
    console.log('=== ANÁLISIS OPENAI COMPLETADO ===');

    return { analysis: analysisText, conclusions: conclusionsText };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return { analysis: null, conclusions: null };
  }
}

function generateHorizontalChart(categoryData: any, config: any): string {
  const categories = categoryData.categoryResults.slice(0, 20); // Limitar a 20 categorías para el gráfico
  const maxValue = 3; // Escala de 0 a 3
  const spacing = 35; // Aumentar espacio entre categorías para mejor legibilidad
  const chartHeight = categories.length * spacing + 250; // Más espacio para leyenda
  const chartWidth = 1000; // Ancho mayor para mejor visualización
  const labelWidth = 200; // Ancho reservado para etiquetas de categorías
  const barAreaWidth = 500; // Ancho del área de barras
  
  return `
    <div class="section">
      <h2>Gráfico de Confiabilidad por Categoría</h2>
      <p style="margin-bottom: 20px; font-style: italic;">Promedio del candidato vs. Media poblacional (línea roja punteada)</p>
      
      <svg width="${chartWidth}" height="${chartHeight}" style="border: 1px solid #ccc; background: white;">
        <g transform="translate(${labelWidth + 20}, 30)">
          ${categories.map((category: any, index: number) => {
            const y = index * spacing;
            const barWidth = (category.average / maxValue) * barAreaWidth;
            const nationalLineX = (category.nationalAverage / maxValue) * barAreaWidth;
            
            return `
              <!-- Etiqueta de categoría (texto completo) -->
              <text x="-15" y="${y + 18}" text-anchor="end" style="font-size: 12px; font-weight: bold; fill: #333;">
                ${category.categoryName}
              </text>
              
              <!-- Línea de referencia de fondo -->
              <rect x="0" y="${y + 8}" width="${barAreaWidth}" height="1" fill="#e5e7eb"/>
              
              <!-- Barra del candidato -->
              <rect x="0" y="${y + 5}" width="${barWidth}" height="20" 
                    fill="#3b82f6" opacity="0.8" rx="3"/>
              
              <!-- Valor del candidato -->
              <text x="${Math.max(barWidth + 8, 25)}" y="${y + 18}" style="font-size: 11px; fill: #333; font-weight: bold;">
                ${category.average.toFixed(2)}
              </text>
              
              <!-- Línea punteada de media poblacional -->
              <line x1="${nationalLineX}" y1="${y}" x2="${nationalLineX}" y2="${y + 30}" 
                    stroke="red" stroke-width="3" stroke-dasharray="6,4"/>
              
              <!-- Valor de media poblacional -->
              <text x="${nationalLineX}" y="${y - 5}" style="font-size: 10px; fill: red; font-weight: bold;" text-anchor="middle">
                ${category.nationalAverage.toFixed(2)}
              </text>
              
              <!-- Interpretación de riesgo -->
              <text x="${barAreaWidth + 15}" y="${y + 18}" style="font-size: 11px; font-weight: bold; 
                    fill: ${category.risk.includes('ALTO') ? '#dc2626' : category.risk.includes('MEDIO') ? '#f59e0b' : '#16a34a'};">
                ${category.risk}
              </text>
            `;
          }).join('')}
          
          <!-- Eje X -->
          <line x1="0" y1="${categories.length * spacing + 10}" x2="${barAreaWidth}" y2="${categories.length * spacing + 10}" 
                stroke="#333" stroke-width="2"/>
          
          <!-- Marcas y etiquetas del eje X -->
          <line x1="0" y1="${categories.length * spacing + 10}" x2="0" y2="${categories.length * spacing + 15}" stroke="#333" stroke-width="2"/>
          <text x="0" y="${categories.length * spacing + 30}" text-anchor="middle" style="font-size: 11px; font-weight: bold;">0.0</text>
          
          <line x1="${barAreaWidth / 3}" y1="${categories.length * spacing + 10}" x2="${barAreaWidth / 3}" y2="${categories.length * spacing + 15}" stroke="#333" stroke-width="1"/>
          <text x="${barAreaWidth / 3}" y="${categories.length * spacing + 30}" text-anchor="middle" style="font-size: 11px;">1.0</text>
          
          <line x1="${(barAreaWidth * 2) / 3}" y1="${categories.length * spacing + 10}" x2="${(barAreaWidth * 2) / 3}" y2="${categories.length * spacing + 15}" stroke="#333" stroke-width="1"/>
          <text x="${(barAreaWidth * 2) / 3}" y="${categories.length * spacing + 30}" text-anchor="middle" style="font-size: 11px;">2.0</text>
          
          <line x1="${barAreaWidth}" y1="${categories.length * spacing + 10}" x2="${barAreaWidth}" y2="${categories.length * spacing + 15}" stroke="#333" stroke-width="2"/>
          <text x="${barAreaWidth}" y="${categories.length * spacing + 30}" text-anchor="middle" style="font-size: 11px; font-weight: bold;">3.0</text>
          
          <!-- Título del eje X -->
          <text x="${barAreaWidth / 2}" y="${categories.length * spacing + 55}" text-anchor="middle" 
                style="font-size: 13px; font-weight: bold; fill: #1e40af;">
            Promedio de Respuestas (0=Nunca, 1=Rara vez, 2=A veces, 3=Frecuentemente)
          </text>
        </g>
        
        <!-- Leyenda (movida abajo del gráfico) -->
        <g transform="translate(50, ${categories.length * spacing + 120})">
          <rect x="0" y="0" width="${chartWidth - 100}" height="100" fill="white" stroke="#ccc" stroke-width="1" rx="5"/>
          <text x="${(chartWidth - 100) / 2}" y="25" text-anchor="middle" style="font-size: 16px; font-weight: bold; fill: #1e40af;">Leyenda</text>
          
          <!-- Promedio del Candidato -->
          <rect x="80" y="40" width="25" height="15" fill="#3b82f6" opacity="0.8" rx="3"/>
          <text x="115" y="52" style="font-size: 13px; font-weight: bold;">Promedio del Candidato</text>
          
          <!-- Media Poblacional -->
          <line x1="350" y1="47" x2="380" y2="47" stroke="red" stroke-width="3" stroke-dasharray="6,4"/>
          <text x="390" y="52" style="font-size: 13px; font-weight: bold;">Media Poblacional</text>
          
          <!-- Interpretación -->
          <text x="80" y="75" style="font-size: 12px; font-weight: bold;">Interpretación:</text>
          <text x="180" y="75" style="font-size: 11px; color: #16a34a; font-weight: bold;">Verde = Riesgo Bajo</text>
          <text x="350" y="75" style="font-size: 11px; color: #f59e0b; font-weight: bold;">Amarillo = Riesgo Medio</text>
          <text x="550" y="75" style="font-size: 11px; color: #dc2626; font-weight: bold;">Rojo = Riesgo Alto</text>
        </g>
      </svg>
    </div>
  `;
}

function generateReliabilityReportHTML(params: any): string {
  const { config, examAttempt, categoryData, aiAnalysis, aiConclusions, includeCharts, systemName, logoUrl } = params;
  
  const candidate = {
    name: examAttempt.profiles?.full_name || 'Sin nombre',
    email: examAttempt.profiles?.email || 'Sin email',
    position: examAttempt.profiles?.area || 'Sin área',
    company: examAttempt.profiles?.company || 'Sin empresa',
    section: examAttempt.profiles?.section || 'Sin sección',
    date: new Date(examAttempt.completed_at).toLocaleDateString('es-ES')
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reporte de Evaluación de Confiabilidad - ${candidate.name}</title>
      <style>
        body { 
          font-family: "${config.font_family}", sans-serif; 
          font-size: ${config.font_size}pt; 
          margin: 40px;
          line-height: 1.6;
          color: #333;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #1e40af; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .header-logo { max-height: 80px; margin-bottom: 15px; }
        .company-info {
          text-align: right;
          margin-bottom: 20px;
          font-size: ${Math.max(config.font_size - 2, 8)}pt;
          color: #666;
          border-left: 3px solid #3b82f6;
          padding-left: 15px;
        }
        .section { 
          margin: 25px 0; 
          padding: 20px;
          border-left: 4px solid #3b82f6;
          background-color: #f8fafc;
          border-radius: 0 8px 8px 0;
          page-break-inside: avoid;
        }
        .section h2 {
          color: #1e40af;
          margin-top: 0;
          font-size: ${config.font_size + 4}pt;
        }
        .section h3 {
          color: #3b82f6;
          font-size: ${config.font_size + 2}pt;
        }
        .risk-high { color: #dc2626; font-weight: bold; }
        .risk-medium { color: #f59e0b; font-weight: bold; }
        .risk-low { color: #16a34a; font-weight: bold; }
        .score-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: ${Math.max(config.font_size - 1, 8)}pt;
        }
        .score-table th, .score-table td {
          border: 1px solid #d1d5db;
          padding: 12px 15px;
          text-align: left;
        }
        .score-table th {
          background-color: #1e40af;
          color: white;
          font-weight: bold;
        }
        .score-table tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .ai-analysis {
          background-color: #eff6ff;
          border-left-color: #2563eb;
        }
        .conclusions {
          background-color: #f0fdf4;
          border-left-color: #16a34a;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          font-size: ${Math.max(config.font_size - 2, 8)}pt;
          color: #6b7280;
        }
        .footer-logo { max-height: 40px; margin-bottom: 10px; }
        @media print {
          body { margin: 20px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 30px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo del Sistema" style="height: 180px; margin-right: 30px; max-width: 250px; object-fit: contain;">` : ''}
          <div style="text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: #1e40af; font-weight: bold;">${systemName}</h1>
            <h2 style="margin: 10px 0 0 0; font-size: 22px; font-weight: normal; color: #374151;">Reporte de Evaluación de Confiabilidad</h2>
          </div>
        </div>
        <p style="margin: 0; font-size: 16px; color: #666;">${examAttempt.exams?.title || 'Evaluación de Confiabilidad'}</p>
      </div>

      ${config.company_name ? `
      <div class="company-info">
        <strong>${config.company_name}</strong><br>
        ${config.company_address ? `${config.company_address}<br>` : ''}
        ${config.company_phone ? `Tel: ${config.company_phone}<br>` : ''}
        ${config.company_email ? `Email: ${config.company_email}` : ''}
      </div>
      ` : ''}

      ${config.include_sections.personal_info ? `
      <div class="section">
        <h2>Información del Candidato</h2>
        <table style="width: 100%; border: none;">
          <tr>
            <td style="border: none; padding: 5px 0; width: 150px;"><strong>Nombre:</strong></td>
            <td style="border: none; padding: 5px 0;">${candidate.name}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 5px 0;"><strong>Email:</strong></td>
            <td style="border: none; padding: 5px 0;">${candidate.email}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 5px 0;"><strong>Área/Posición:</strong></td>
            <td style="border: none; padding: 5px 0;">${candidate.position}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 5px 0;"><strong>Empresa:</strong></td>
            <td style="border: none; padding: 5px 0;">${candidate.company}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 5px 0;"><strong>Sección:</strong></td>
            <td style="border: none; padding: 5px 0;">${candidate.section}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 5px 0;"><strong>Fecha de Evaluación:</strong></td>
            <td style="border: none; padding: 5px 0;">${candidate.date}</td>
          </tr>
        </table>
      </div>
      ` : ''}

      ${config.include_sections.category_scores ? `
      <div class="section">
        <h2>Puntuaciones por Categoría</h2>
        <table class="score-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Total Preguntas</th>
              <th>Puntaje Total</th>
              <th>Interpretación</th>
              <th>Media Poblacional</th>
              <th>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            ${categoryData.categoryResults.map((cat: any) => `
            <tr>
              <td><strong>${cat.categoryName}</strong></td>
              <td>${cat.totalQuestions}</td>
              <td>${cat.average.toFixed(2)}</td>
              <td class="risk-${cat.risk.includes('ALTO') ? 'high' : cat.risk.includes('MEDIO') ? 'medium' : 'low'}">
                ${cat.risk}
              </td>
              <td>${cat.nationalAverage.toFixed(2)}</td>
              <td style="color: ${cat.difference > 0 ? '#dc2626' : '#16a34a'};">
                ${cat.difference > 0 ? '+' : ''}${cat.difference.toFixed(2)}
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${config.include_sections.charts && includeCharts ? generateHorizontalChart(categoryData, config) : ''}

      ${aiAnalysis && config.include_sections.risk_analysis ? `
      <div class="section ai-analysis">
        <h2>Análisis de ${systemName}</h2>
        <div style="white-space: pre-wrap; word-wrap: break-word;">${typeof aiAnalysis === 'string' ? aiAnalysis.replace(/</g, '&lt;').replace(/>/g, '&gt;') : JSON.stringify(aiAnalysis)}</div>
      </div>
      ` : ''}

      ${aiConclusions && config.include_sections.conclusion ? `
      <div class="section conclusions">
        <h2>Conclusiones y Recomendaciones (${systemName})</h2>
        <div style="white-space: pre-wrap; word-wrap: break-word;">${typeof aiConclusions === 'string' ? aiConclusions.replace(/</g, '&lt;').replace(/>/g, '&gt;') : JSON.stringify(aiConclusions)}</div>
      </div>
      ` : ''}

      <div class="footer">
        ${config.footer_logo_url ? `<img src="${config.footer_logo_url}" alt="Logo" class="footer-logo">` : ''}
        <p>Reporte generado el ${new Date().toLocaleDateString('es-ES')} por el Sistema de Evaluación Psicométrica</p>
        <p>© ${new Date().getFullYear()} - Documento Confidencial</p>
        <p style="font-size: ${Math.max(config.font_size - 3, 7)}pt; color: #999;">
          Este reporte es confidencial y debe ser tratado de acuerdo con las políticas de privacidad de la organización.
        </p>
      </div>
    </body>
    </html>
  `;
}
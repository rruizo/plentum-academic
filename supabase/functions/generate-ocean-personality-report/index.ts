import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== GENERATE-OCEAN-PERSONALITY-REPORT FUNCTION STARTED ===')
  console.log('Request method:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...')
    const requestBody = await req.json()
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    
    const { personalityResultId, includeCharts = true, includeAnalysis = true, forceRegenerate = false, selectedModel } = requestBody;
    
    if (!personalityResultId) {
      return new Response(
        JSON.stringify({ error: 'personalityResultId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Generating OCEAN personality report for result:', personalityResultId);

    // 1. Obtener datos de la evaluación psicométrica
    const { data: personalityResult, error: resultError } = await supabase
      .from('personality_results')
      .select('*')
      .eq('id', personalityResultId)
      .single();

    if (resultError || !personalityResult) {
      console.error('Error fetching personality result:', resultError);
      return new Response(
        JSON.stringify({ error: 'No se encontró el resultado de personalidad' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos del perfil por separado
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, email, company, area, section')
      .eq('id', personalityResult.user_id)
      .single();

    // Obtener respuestas individuales para análisis detallado
    const { data: responses } = await supabase
      .from('personality_responses')
      .select('*')
      .eq('session_id', personalityResult.session_id);

    // Combinar los datos
    personalityResult.profiles = profileData;
    personalityResult.responses = responses || [];

    // 2. Obtener configuración del reporte y del sistema
    const { data: reportConfig } = await supabase
      .from('report_config')
      .select('*')
      .limit(1)
      .single();
    
    const { data: systemConfig } = await supabase
      .from('system_config')
      .select('system_name')
      .single();

    const config = reportConfig || {
      include_sections: {
        personal_info: true,
        personality_scores: true,
        ocean_analysis: true,
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

    // 3. Procesar datos OCEAN
    const oceanData = processOceanData(personalityResult);
    
    // 4. Generar análisis con OpenAI si está habilitado
    let aiAnalysis = null;
    let aiConclusions = null;
    
    if (includeAnalysis) {
      console.log('Checking for cached AI analysis for user:', personalityResult.user_id);
      
      // Calcular scores ajustados por factores personales si hay sessionId
      let adjustedScores = {
        apertura: personalityResult.apertura_score,
        responsabilidad: personalityResult.responsabilidad_score,
        extraversion: personalityResult.extraversion_score,
        amabilidad: personalityResult.amabilidad_score,
        neuroticismo: personalityResult.neuroticismo_score
      };
      let personalAdjustment = 0;
      let personalFactors = null;

      if (personalityResult.session_id) {
        try {
          const adjustmentResponse = await supabase.functions.invoke('calculate-adjusted-scores', {
            body: {
              sessionId: personalityResult.session_id,
              baseScores: adjustedScores,
              resultType: 'ocean',
              personalityResultId: personalityResult.id
            }
          });

          if (adjustmentResponse.data?.success) {
            adjustedScores = adjustmentResponse.data.adjustedScores;
            personalAdjustment = adjustmentResponse.data.adjustment;
            personalFactors = adjustmentResponse.data.personalFactors;
            console.log('Applied personal adjustment to OCEAN scores:', personalAdjustment);
          }
        } catch (error) {
          console.error('Error calculating adjusted OCEAN scores:', error);
          // Continue with base scores if adjustment fails
        }
      }
      
      // Preparar datos de entrada para el cache
      const inputData = {
        ocean_scores: adjustedScores, // Usar scores ajustados
        motivations: {
          logro: personalityResult.logro_score,
          poder: personalityResult.poder_score,
          afiliacion: personalityResult.afiliacion_score,
          autonomia: personalityResult.autonomia_score,
          seguridad: personalityResult.seguridad_score,
          reconocimiento: personalityResult.reconocimiento_score
        },
        user_profile: {
          company: personalityResult.profiles?.company,
          area: personalityResult.profiles?.area,
          section: personalityResult.profiles?.section
        },
        analysis_version: '2.1' // Versión del análisis para invalidar cache si cambia
      };
      
      // Buscar análisis cacheado
      const { data: cachedAnalysis, error: cacheError } = await supabase
        .rpc('get_cached_ai_analysis', {
          p_user_id: personalityResult.user_id,
          p_analysis_type: 'ocean',
          p_input_data: inputData,
          p_max_age_hours: 720 // 30 días
        });
      
      if (!cacheError && cachedAnalysis) {
        console.log('Using cached AI analysis for user:', personalityResult.user_id);
        aiAnalysis = cachedAnalysis.analysis;
        aiConclusions = cachedAnalysis.conclusions;
      } else {
        try {
        // Llamar análisis con configuración específica y modelo seleccionado
        const analysisResult = await generateOceanOpenAIAnalysis(personalityResult, oceanData, supabase, selectedModel);
          aiAnalysis = analysisResult.analysis;
          aiConclusions = analysisResult.conclusions;
          
          // Guardar en cache avanzado
          if (aiAnalysis || aiConclusions) {
            const cacheResult = {
              analysis: aiAnalysis,
              conclusions: aiConclusions,
              generated_at: new Date().toISOString(),
              model_used: 'gpt-4.1-2025-04-14'
            };
            
            try {
              const { error: saveError } = await supabase
                .rpc('save_ai_analysis_cache', {
                  p_user_id: personalityResult.user_id,
                  p_exam_id: null,
                  p_psychometric_test_id: personalityResult.psychometric_test_id || null,
                  p_analysis_type: 'ocean',
                  p_input_data: inputData,
                  p_ai_analysis_result: cacheResult,
                  p_tokens_used: null,
                  p_model_used: 'gpt-4.1-2025-04-14',
                  p_requested_by: null,
                  p_expires_hours: 720
                });
              
              if (saveError) {
                console.error('Error saving AI analysis to cache:', saveError);
              } else {
                console.log('AI analysis saved to cache for user:', personalityResult.user_id);
              }
            } catch (cacheError) {
              console.error('Error saving analysis to cache:', cacheError);
            }
            
            // Mantener compatibilidad con el cache anterior
            await supabase
              .from('personality_results')
              .update({
                ai_interpretation: { analysis: aiAnalysis, conclusions: aiConclusions },
                ai_analysis_generated_at: new Date().toISOString()
              })
              .eq('id', personalityResultId);
          }
        } catch (error) {
          console.error('Error generating AI analysis:', error);
          // Continuar sin análisis de IA
        }
      }
    }

    // 5. Generar HTML del reporte
    const reportHtml = generateOceanReportHTML({
      config,
      personalityResult,
      oceanData,
      aiAnalysis,
      aiConclusions,
      includeCharts,
      systemName: systemConfig?.system_name || 'Sistema'
    });

    return new Response(
      JSON.stringify({ 
        html: reportHtml,
        success: true,
        metadata: {
          candidate: personalityResult.profiles?.full_name || 'Sin nombre',
          test: 'Evaluación de Personalidad OCEAN',
          date: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-ocean-personality-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function processOceanData(personalityResult: any) {
  console.log('Processing OCEAN data for personality result');
  
  // Definir las dimensiones OCEAN
  const oceanDimensions = [
    {
      name: 'Apertura a la Experiencia',
      shortName: 'apertura',
      score: personalityResult.apertura_score,
      description: 'Refleja la disposición a experimentar nuevas ideas, valores y comportamientos.',
      traits: ['Creatividad', 'Curiosidad intelectual', 'Imaginación', 'Originalidad']
    },
    {
      name: 'Responsabilidad',
      shortName: 'responsabilidad', 
      score: personalityResult.responsabilidad_score,
      description: 'Indica el nivel de organización, persistencia y motivación hacia metas.',
      traits: ['Autodisciplina', 'Organización', 'Persistencia', 'Responsabilidad']
    },
    {
      name: 'Extraversión',
      shortName: 'extraversion',
      score: personalityResult.extraversion_score,
      description: 'Mide la tendencia hacia la sociabilidad y la búsqueda de estimulación externa.',
      traits: ['Sociabilidad', 'Asertividad', 'Energía', 'Emociones positivas']
    },
    {
      name: 'Amabilidad',
      shortName: 'amabilidad',
      score: personalityResult.amabilidad_score,
      description: 'Refleja la tendencia hacia la cooperación y la confianza en otros.',
      traits: ['Confianza', 'Altruismo', 'Cooperación', 'Modestia']
    },
    {
      name: 'Neuroticismo',
      shortName: 'neuroticismo',
      score: personalityResult.neuroticismo_score,
      description: 'Indica la tendencia a experimentar emociones negativas y inestabilidad emocional.',
      traits: ['Ansiedad', 'Hostilidad', 'Depresión', 'Impulsividad']
    }
  ];

  // Calcular percentiles y interpretaciones
  const processedDimensions = oceanDimensions.map(dimension => {
    // Los scores ya vienen normalizados a escala 0-100
    const percentile = Math.round(dimension.score);
    let interpretation = '';
    let level = '';
    
    if (percentile >= 80) {
      interpretation = `Muy alto en ${dimension.name}`;
      level = 'Muy Alto';
    } else if (percentile >= 60) {
      interpretation = `Alto en ${dimension.name}`;
      level = 'Alto';
    } else if (percentile >= 40) {
      interpretation = `Moderado en ${dimension.name}`;
      level = 'Moderado';
    } else if (percentile >= 20) {
      interpretation = `Bajo en ${dimension.name}`;
      level = 'Bajo';
    } else {
      interpretation = `Muy bajo en ${dimension.name}`;
      level = 'Muy Bajo';
    }

    return {
      ...dimension,
      percentile,
      interpretation,
      level,
      normalizedScore: parseFloat(dimension.score.toFixed(2))
    };
  });

  // Motivaciones adicionales si están disponibles
  const motivations = [];
  if (personalityResult.logro_score) {
    motivations.push({ name: 'Logro', score: personalityResult.logro_score });
  }
  if (personalityResult.poder_score) {
    motivations.push({ name: 'Poder', score: personalityResult.poder_score });
  }
  if (personalityResult.afiliacion_score) {
    motivations.push({ name: 'Afiliación', score: personalityResult.afiliacion_score });
  }
  if (personalityResult.autonomia_score) {
    motivations.push({ name: 'Autonomía', score: personalityResult.autonomia_score });
  }
  if (personalityResult.seguridad_score) {
    motivations.push({ name: 'Seguridad', score: personalityResult.seguridad_score });
  }
  if (personalityResult.reconocimiento_score) {
    motivations.push({ name: 'Reconocimiento', score: personalityResult.reconocimiento_score });
  }

  return {
    dimensions: processedDimensions,
    motivations,
    overallProfile: calculateOverallProfile(processedDimensions),
    totalResponses: personalityResult.responses.length
  };
}

function calculateOverallProfile(dimensions: any[]) {
  const averageScore = dimensions.reduce((sum, dim) => sum + dim.normalizedScore, 0) / dimensions.length;
  
  // Determinar perfil dominante
  const sortedDimensions = [...dimensions].sort((a, b) => b.normalizedScore - a.normalizedScore);
  const dominantTrait = sortedDimensions[0];
  const secondaryTrait = sortedDimensions[1];
  
  return {
    averageScore: parseFloat(averageScore.toFixed(2)),
    dominantTrait: dominantTrait.name,
    secondaryTrait: secondaryTrait.name,
    profileType: getProfileType(dimensions)
  };
}

function getProfileType(dimensions: any[]) {
  // Crear un perfil basado en las puntuaciones más altas
  const high = dimensions.filter(d => d.percentile >= 60);
  const low = dimensions.filter(d => d.percentile <= 40);
  
  if (high.length >= 3) {
    return 'Perfil Equilibrado Alto';
  } else if (low.length >= 3) {
    return 'Perfil Introvertido';
  } else {
    return 'Perfil Balanceado';
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
        max_tokens: 2000
      };
    }

    // Configuración específica según el tipo de test
    switch(testType) {
      case 'ocean':
        return {
          model: config.ocean_modelo || 'gpt-4.1-2025-04-14',
          temperature: config.ocean_temperatura || 0.7,
          max_tokens: config.ocean_max_tokens || 2000
        };
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

async function generateOceanOpenAIAnalysis(personalityResult: any, oceanData: any, supabase: any, selectedModel?: string) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    console.log('OpenAI API key not found, skipping AI analysis');
    return { analysis: null, conclusions: null };
  }

  // Obtener configuración específica para OCEAN
  const oceanConfig = await getOpenAIConfig(supabase, 'ocean');
  
  // Usar modelo seleccionado si se proporciona
  if (selectedModel) {
    oceanConfig.model = selectedModel;
  }
  
  // Obtener prompts de la base de datos
  const { data: systemConfig, error: configError } = await supabase
    .from('system_config')
    .select('ocean_system_prompt, ocean_user_prompt')
    .limit(1)
    .maybeSingle();

  if (configError) {
    console.error('Error obteniendo prompts:', configError);
  }

  // Usar prompts de la base de datos o fallback
  const systemPrompt = systemConfig?.ocean_system_prompt || 
    'Eres un experto en psicología organizacional especializado en evaluaciones de personalidad OCEAN (Big Five). Proporciona análisis profesionales y objetivos basados en los datos de personalidad para aplicaciones en desarrollo organizacional y selección de personal.';

  const userPromptTemplate = systemConfig?.ocean_user_prompt || `
Analiza los siguientes resultados de una evaluación de personalidad OCEAN (Big Five):

CANDIDATO: \${userInfo.name}
EMAIL: \${userInfo.email}
POSICIÓN: \${userInfo.area}
EMPRESA: \${userInfo.company}

ANÁLISIS DE FACTORES:
\${factorAnalysis}

Por favor proporciona:
1. Un análisis detallado del perfil de personalidad OCEAN
2. Fortalezas y áreas de desarrollo basadas en el perfil
3. Recomendaciones para roles y ambientes de trabajo apropiados
4. Estrategias de gestión y desarrollo personal

Responde en español y de manera profesional, enfocándote en aplicaciones prácticas para el desarrollo laboral.`;

  // Preparar variables para el procesamiento
  const factorAnalysis = `
PUNTUACIONES OCEAN:
${oceanData.dimensions.map((dim: any) => `
- ${dim.name}: ${dim.normalizedScore}/5.0 (Percentil ${dim.percentile}% - ${dim.level})
  * ${dim.description}
  * Rasgos clave: ${dim.traits.join(', ')}
`).join('')}

PERFIL GENERAL:
- Rasgo Dominante: ${oceanData.overallProfile.dominantTrait}
- Rasgo Secundario: ${oceanData.overallProfile.secondaryTrait}
- Tipo de Perfil: ${oceanData.overallProfile.profileType}
- Promedio General: ${oceanData.overallProfile.averageScore}/5.0

${oceanData.motivations.length > 0 ? `
MOTIVACIONES ADICIONALES:
${oceanData.motivations.map((mot: any) => `- ${mot.name}: ${mot.score}`).join('\n')}
` : ''}`;

  // Procesar el prompt con las variables usando el sistema centralizado
  const variables = {
    userInfo: {
      name: personalityResult.profiles?.full_name || 'No especificado',
      email: personalityResult.profiles?.email || 'No especificado',
      area: personalityResult.profiles?.area || 'No especificada',
      company: personalityResult.profiles?.company || 'No especificada'
    },
    factorAnalysis: factorAnalysis
  };

  // Importar y usar el procesador de prompts
  const { processPrompt } = await import('../_shared/promptProcessor.ts').catch(() => {
    // Fallback en caso de que no se pueda importar
    return {
      processPrompt: (prompt: string, vars: any) => ({
        processedPrompt: prompt.replace(/\$\{userInfo\.name\}/g, vars.userInfo.name)
          .replace(/\$\{userInfo\.email\}/g, vars.userInfo.email)
          .replace(/\$\{userInfo\.area\}/g, vars.userInfo.area)
          .replace(/\$\{userInfo\.company\}/g, vars.userInfo.company)
          .replace(/\$\{factorAnalysis\}/g, vars.factorAnalysis),
        validation: { isValid: true, missingVariables: [], errors: [] }
      })
    };
  });

  const { processedPrompt, validation } = processPrompt(userPromptTemplate, variables, 'ocean');

  if (!validation.isValid) {
    console.error('Validación del prompt falló:', validation.errors);
    return { analysis: null, conclusions: null };
  }

  console.log('Usando configuración OCEAN:', oceanConfig);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: oceanConfig.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: processedPrompt
          }
        ],
        // Manejo de parámetros según modelo
        ...(oceanConfig.model.startsWith('gpt-5') || oceanConfig.model.startsWith('gpt-4.1') || oceanConfig.model.startsWith('o3') || oceanConfig.model.startsWith('o4') 
          ? { max_completion_tokens: oceanConfig.max_tokens }
          : { 
              max_tokens: oceanConfig.max_tokens,
              temperature: oceanConfig.temperature 
            }
        ),
        // Solo añadir temperature para modelos legacy
        ...(oceanConfig.model.includes('gpt-4o') && { temperature: oceanConfig.temperature })
      }),
    });

    const data = await response.json();
    const analysis = data.choices[0]?.message?.content || null;

    // Generar conclusiones específicas
    const conclusionsPrompt = `
Basándote en el análisis anterior, proporciona 4-6 conclusiones específicas y accionables para la gestión y desarrollo de ${personalityResult.profiles?.full_name || 'este candidato'}.

Considera:
- Perfil dominante: ${oceanData.overallProfile.dominantTrait}
- Tipo de personalidad: ${oceanData.overallProfile.profileType}
- Dimensiones más altas y más bajas
- Recomendaciones para: ROLES APROPIADOS / ESTILO DE GESTIÓN / DESARROLLO PROFESIONAL / COLABORACIÓN EN EQUIPO

Responde en formato de lista numerada, de manera concisa y profesional, enfocándote en aplicaciones prácticas.
    `;

    const conclusionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: oceanConfig.model,
        messages: [
          {
            role: 'system',
            content: 'Proporciona conclusiones específicas y recomendaciones para desarrollo organizacional basadas en perfiles OCEAN.'
          },
          {
            role: 'user',
            content: conclusionsPrompt
          }
        ],
        // Manejo de parámetros según modelo - conclusiones más cortas
        ...(oceanConfig.model.startsWith('gpt-5') || oceanConfig.model.startsWith('gpt-4.1') || oceanConfig.model.startsWith('o3') || oceanConfig.model.startsWith('o4') 
          ? { max_completion_tokens: Math.floor(oceanConfig.max_tokens * 0.6) }
          : { 
              max_tokens: Math.floor(oceanConfig.max_tokens * 0.6),
              temperature: Math.max(0.6, oceanConfig.temperature - 0.1)
            }
        ),
        // Solo añadir temperature para modelos legacy
        ...(oceanConfig.model.includes('gpt-4o') && { temperature: Math.max(0.6, oceanConfig.temperature - 0.1) })
      }),
    });

    const conclusionsData = await conclusionsResponse.json();
    const conclusions = conclusionsData.choices[0]?.message?.content || null;

    return { analysis, conclusions };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return { analysis: null, conclusions: null };
  }
}

function generateOceanChart(oceanData: any, config: any): string {
  const dimensions = oceanData.dimensions;
  const maxValue = 100; // Escala máxima OCEAN (percentil 0-100)
  const chartHeight = Math.max(600, dimensions.length * 60 + 280); // Más espacio para la leyenda abajo
  const chartWidth = 900; // Ampliar el marco
  const barHeight = 30;
  const spacing = 60;
  
  // Calcular posición de la leyenda (debajo del chart)
  const chartAreaHeight = dimensions.length * spacing + 80; // 80 para eje X y etiquetas
  const legendY = chartAreaHeight + 60; // 60px de separación

  return `
    <div style="width: 100%; margin: 20px 0; page-break-inside: avoid;">
      <h3 style="font-size: ${config.font_size + 2}pt; color: #3b82f6; margin: 15px 0; font-weight: bold;">
        Perfil de Personalidad OCEAN (Big Five)
      </h3>
      <p style="font-size: ${config.font_size - 1}pt; color: #666; margin: 5px 0;">
        Puntuaciones por dimensión (percentil 0-100%)
      </p>
      
      <svg width="${chartWidth}" height="${chartHeight}" style="border: 1px solid #ccc; background: white;">
        <defs>
          <pattern id="oceanGrid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="${chartWidth}" height="${chartHeight}" fill="url(#oceanGrid)"/>
        
        <!-- Chart area -->
        <g transform="translate(220, 40)">
          <!-- Eje Y (dimensiones) -->
          <line x1="0" y1="0" x2="0" y2="${dimensions.length * spacing}" stroke="#333" stroke-width="2"/>
          
          <!-- Barras horizontales -->
          ${dimensions.map((dimension: any, index: number) => {
            const y = index * spacing;
            // Usar percentil para el cálculo del ancho de la barra (0-100 -> 0-500px)
            const barWidth = Math.max(5, (dimension.percentile / maxValue) * 500);
            const color = getOceanColor(dimension.shortName);
            
            return `
              <!-- Etiqueta de dimensión -->
              <text x="-15" y="${y + barHeight/2 + 5}" text-anchor="end" style="font-size: 11px; fill: #333; font-weight: bold;">
                ${dimension.name}
              </text>
              
              <!-- Barra de puntuación -->
              <rect x="0" y="${y}" width="${barWidth}" height="${barHeight}" 
                    fill="${color}" opacity="0.8" rx="3"/>
              
              <!-- Valor numérico -->
              <text x="${barWidth + 10}" y="${y + barHeight/2 + 4}" style="font-size: 11px; fill: #333; font-weight: bold;">
                ${dimension.percentile}%
              </text>
              
              <!-- Nivel interpretativo -->
              <text x="530" y="${y + barHeight/2 + 4}" style="font-size: 10px; font-weight: bold; fill: ${getLevelColor(dimension.level)};">
                ${dimension.level}
              </text>
            `;
          }).join('')}
          
          <!-- Eje X -->
          <line x1="0" y1="${dimensions.length * spacing}" x2="500" y2="${dimensions.length * spacing}" 
                stroke="#333" stroke-width="2"/>
          
          <!-- Etiquetas del eje X -->
          <text x="0" y="${dimensions.length * spacing + 20}" text-anchor="middle" style="font-size: 10px;">0%</text>
          <text x="125" y="${dimensions.length * spacing + 20}" text-anchor="middle" style="font-size: 10px;">25%</text>
          <text x="250" y="${dimensions.length * spacing + 20}" text-anchor="middle" style="font-size: 10px;">50%</text>
          <text x="375" y="${dimensions.length * spacing + 20}" text-anchor="middle" style="font-size: 10px;">75%</text>
          <text x="500" y="${dimensions.length * spacing + 20}" text-anchor="middle" style="font-size: 10px;">100%</text>
          
          <!-- Título del eje X -->
          <text x="250" y="${dimensions.length * spacing + 40}" text-anchor="middle" 
                style="font-size: 12px; font-weight: bold;">
            Percentil (0% = Muy Bajo, 100% = Muy Alto)
          </text>
        </g>
        
        <!-- Leyenda movida debajo del chart -->
        <g transform="translate(250, ${legendY})">
          <rect x="0" y="0" width="400" height="160" fill="white" stroke="#ccc" stroke-width="2" rx="8"/>
          <text x="200" y="25" text-anchor="middle" style="font-size: 14px; font-weight: bold;">Interpretación de Niveles</text>
          
          <!-- Dividir en dos columnas para mejor aprovechamiento del espacio -->
          <text x="30" y="50" style="font-size: 11px; font-weight: bold; color: #16a34a;">● Muy Alto (80-100%)</text>
          <text x="30" y="70" style="font-size: 11px; font-weight: bold; color: #22c55e;">● Alto (60-79%)</text>
          <text x="30" y="90" style="font-size: 11px; font-weight: bold; color: #fbbf24;">● Moderado (40-59%)</text>
          
          <text x="230" y="50" style="font-size: 11px; font-weight: bold; color: #f97316;">● Bajo (20-39%)</text>
          <text x="230" y="70" style="font-size: 11px; font-weight: bold; color: #dc2626;">● Muy Bajo (0-19%)</text>
          
          <text x="200" y="125" text-anchor="middle" style="font-size: 12px; font-weight: bold; color: #3b82f6;">
            Perfil General: ${oceanData.overallProfile.profileType}
          </text>
        </g>
      </svg>
    </div>
  `;
}

function getOceanColor(dimension: string): string {
  switch (dimension) {
    case 'apertura': return '#8b5cf6'; // Púrpura
    case 'responsabilidad': return '#3b82f6'; // Azul
    case 'extraversion': return '#f59e0b'; // Naranja
    case 'amabilidad': return '#10b981'; // Verde
    case 'neuroticismo': return '#ef4444'; // Rojo
    default: return '#6b7280'; // Gris
  }
}

function getLevelColor(level: string): string {
  switch (level) {
    case 'Muy Alto': return '#16a34a';
    case 'Alto': return '#22c55e';
    case 'Moderado': return '#fbbf24';
    case 'Bajo': return '#f97316';
    case 'Muy Bajo': return '#dc2626';
    default: return '#6b7280';
  }
}

function generateOceanReportHTML(params: any): string {
  const { config, personalityResult, oceanData, aiAnalysis, aiConclusions, includeCharts, systemName } = params;
  
  const candidate = {
    name: personalityResult.profiles?.full_name || 'Sin nombre',
    email: personalityResult.profiles?.email || 'Sin email',
    position: personalityResult.profiles?.area || 'Sin área',
    company: personalityResult.profiles?.company || 'Sin empresa',
    section: personalityResult.profiles?.section || 'Sin sección',
    date: new Date(personalityResult.created_at).toLocaleDateString('es-ES')
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reporte de Personalidad OCEAN - ${candidate.name}</title>
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
        }
        .section h2 { 
          color: #1e40af; 
          font-size: ${config.font_size + 4}pt; 
          margin: 0 0 15px 0;
          font-weight: bold;
        }
        .dimension-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .dimension-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .dimension-name {
          font-weight: bold;
          font-size: ${config.font_size + 1}pt;
          color: #1f2937;
        }
        .dimension-score {
          font-weight: bold;
          font-size: ${config.font_size + 2}pt;
          padding: 5px 12px;
          border-radius: 20px;
          color: white;
        }
        .score-muy-alto { background-color: #16a34a; }
        .score-alto { background-color: #22c55e; }
        .score-moderado { background-color: #fbbf24; }
        .score-bajo { background-color: #f97316; }
        .score-muy-bajo { background-color: #dc2626; }
        .dimension-description {
          color: #6b7280;
          font-size: ${config.font_size - 1}pt;
          margin-bottom: 8px;
        }
        .dimension-traits {
          font-size: ${config.font_size - 1}pt;
          color: #374151;
        }
        .traits-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 5px;
        }
        .trait-tag {
          background-color: #e0e7ff;
          color: #3730a3;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: ${config.font_size - 2}pt;
        }
        .personality-summary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px;
          border-radius: 12px;
          margin: 20px 0;
        }
        .summary-title {
          font-size: ${config.font_size + 3}pt;
          font-weight: bold;
          margin-bottom: 15px;
          text-align: center;
        }
        .summary-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-label {
          font-size: ${config.font_size - 1}pt;
          opacity: 0.9;
          margin-bottom: 5px;
        }
        .summary-value {
          font-size: ${config.font_size + 1}pt;
          font-weight: bold;
        }
        .ai-section {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 25px;
          border-radius: 12px;
          margin: 25px 0;
        }
        .ai-title {
          font-size: ${config.font_size + 2}pt;
          font-weight: bold;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ai-content {
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 8px;
          margin-top: 15px;
          backdrop-filter: blur(10px);
        }
        .motivations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 15px 0;
        }
        .motivation-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .motivation-name {
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .motivation-score {
          font-size: ${config.font_size + 2}pt;
          font-weight: bold;
          color: #3b82f6;
        }
        .page-break { page-break-before: always; }
        @media print {
          .section { page-break-inside: avoid; }
          .dimension-card { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        ${config.header_logo_url ? `<img src="${config.header_logo_url}" alt="Logo" class="header-logo">` : ''}
        <h1 style="font-size: ${config.font_size + 8}pt; margin: 10px 0; color: #1e40af;">
          Reporte de Personalidad OCEAN
        </h1>
        <p style="font-size: ${config.font_size + 2}pt; color: #666; margin: 5px 0;">
          Evaluación de los Cinco Grandes Factores de Personalidad
        </p>
        <p style="font-size: ${config.font_size}pt; color: #999;">
          Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}
        </p>
      </div>

      <!-- Company Info -->
      ${config.company_name ? `
      <div class="company-info">
        <strong>${config.company_name}</strong><br>
        ${config.company_address || ''}<br>
        ${config.company_phone || ''}<br>
        ${config.company_email || ''}
      </div>
      ` : ''}

      <!-- Información Personal -->
      <div class="section">
        <h2>Información del Evaluado</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p><strong>Nombre:</strong> ${candidate.name}</p>
            <p><strong>Email:</strong> ${candidate.email}</p>
            <p><strong>Empresa:</strong> ${candidate.company}</p>
          </div>
          <div>
            <p><strong>Área:</strong> ${candidate.position}</p>
            <p><strong>Sección:</strong> ${candidate.section}</p>
            <p><strong>Fecha de Evaluación:</strong> ${candidate.date}</p>
          </div>
        </div>
      </div>

      <!-- Resumen de Personalidad -->
      <div class="personality-summary">
        <div class="summary-title">Resumen del Perfil de Personalidad</div>
        <div class="summary-content">
          <div class="summary-item">
            <div class="summary-label">Rasgo Dominante</div>
            <div class="summary-value">${oceanData.overallProfile.dominantTrait}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Rasgo Secundario</div>
            <div class="summary-value">${oceanData.overallProfile.secondaryTrait}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Tipo de Perfil</div>
            <div class="summary-value">${oceanData.overallProfile.profileType}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Promedio General</div>
            <div class="summary-value">${oceanData.overallProfile.averageScore}/5.0</div>
          </div>
        </div>
      </div>

      <!-- Dimensiones OCEAN -->
      <div class="section">
        <h2>Análisis por Dimensiones OCEAN</h2>
        ${oceanData.dimensions.map((dimension: any) => `
          <div class="dimension-card">
            <div class="dimension-header">
              <div class="dimension-name">${dimension.name}</div>
              <div class="dimension-score score-${dimension.level.toLowerCase().replace(' ', '-')}">
                ${dimension.normalizedScore}/5.0
              </div>
            </div>
            <div class="dimension-description">
              ${dimension.description}
            </div>
            <div class="dimension-traits">
              <strong>Características asociadas:</strong>
              <div class="traits-list">
                ${dimension.traits.map((trait: string) => `<span class="trait-tag">${trait}</span>`).join('')}
              </div>
            </div>
            <div style="margin-top: 10px; padding: 10px; background-color: #f3f4f6; border-radius: 6px;">
              <strong>Interpretación:</strong> ${dimension.interpretation} (Percentil ${dimension.percentile}%)
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Gráfico -->
      ${includeCharts ? `
      <div class="page-break">
        ${generateOceanChart(oceanData, config)}
      </div>
      ` : ''}

      <!-- Motivaciones Adicionales -->
      ${oceanData.motivations.length > 0 ? `
      <div class="section">
        <h2>Motivaciones Adicionales</h2>
        <div class="motivations-grid">
          ${oceanData.motivations.map((motivation: any) => `
            <div class="motivation-card">
              <div class="motivation-name">${motivation.name}</div>
              <div class="motivation-score">${motivation.score.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Análisis con IA -->
      ${aiAnalysis ? `
      <div class="ai-section">
        <div class="ai-title">
          🤖 Análisis Profesional de ${systemName}
        </div>
        <div class="ai-content">
          ${aiAnalysis.replace(/\n/g, '<br>')}
        </div>
      </div>
      ` : ''}

      <!-- Conclusiones -->
      ${aiConclusions ? `
      <div class="section">
        <h2>Conclusiones y Recomendaciones (${systemName})</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a;">
          ${aiConclusions.replace(/\n/g, '<br>')}
        </div>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: ${config.font_size - 1}pt;">
        <p>Este reporte ha sido generado automáticamente basado en las respuestas del evaluado.</p>
        <p>Para interpretación profesional, consulte con un psicólogo organizacional calificado.</p>
        ${config.footer_logo_url ? `<img src="${config.footer_logo_url}" alt="Footer Logo" style="max-height: 40px; margin-top: 10px;">` : ''}
      </div>
    </body>
    </html>
  `;
}
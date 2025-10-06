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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, forceReanalysis = false } = await req.json()
    
    console.log('Generating psychometric analysis for session:', sessionId)

    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    // Obtener datos de la sesión psicométrica
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('test_type', 'psychometric')
      .maybeSingle()

    if (sessionError) {
      throw new Error(`Session query error: ${sessionError.message}`)
    }
    
    if (!session) {
      throw new Error('Psychometric session not found')
    }

    // Obtener resultados de personalidad (el más reciente si hay duplicados)
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

    // Obtener información del usuario (puede ser email para sesiones anónimas)
    let userInfo = {
      name: 'Usuario',
      email: session.user_id
    }

    // Si user_id parece ser un UUID, buscar en profiles
    if (session.user_id && !session.user_id.includes('@')) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.user_id)
        .single()
      
      if (profile) {
        userInfo = {
          name: profile.full_name || 'Usuario',
          email: profile.email
        }
      }
    } else if (session.user_id && session.user_id.includes('@')) {
      // Es un email, extraer nombre
      const emailParts = session.user_id.split('@')[0].split('.')
      userInfo.name = emailParts.map((part: string) => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ')
    }

    // Verificar si ya existe análisis en caché
    if (!forceReanalysis) {
      const { data: cachedAnalysis } = await supabaseAdmin
        .from('exam_analysis_cache')
        .select('*')
        .eq('exam_session_id', sessionId)
        .eq('analysis_type', 'psychometric_openai')
        .maybeSingle()

      if (cachedAnalysis) {
        console.log('Returning cached psychometric analysis')
        return new Response(JSON.stringify({
          success: true,
          analysis: cachedAnalysis.analysis_result,
          userInfo,
          personalityResults
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Generar nuevo análisis con OpenAI
    const analysisResult = await generatePsychometricAnalysis(personalityResults, userInfo)

    // Guardar en caché
    const { error: cacheError } = await supabaseAdmin
      .from('exam_analysis_cache')
      .upsert({
        exam_session_id: sessionId,
        analysis_type: 'psychometric_openai',
        analysis_input: { personalityResults, userInfo },
        analysis_result: analysisResult,
        re_analysis_count: forceReanalysis ? 1 : 0
      }, {
        onConflict: 'exam_session_id,analysis_type'
      })

    if (cacheError) {
      console.error('Error caching analysis:', cacheError)
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisResult,
      userInfo,
      personalityResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error generating psychometric analysis:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function generatePsychometricAnalysis(personalityResults: any, userInfo: any): Promise<any> {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      return {
        interpretation: "Análisis IA no disponible - API key no configurada",
        recommendations: "Consulte con el administrador del sistema",
        conclusion: "Análisis manual requerido"
      }
    }

    // Calcular percentiles relativos
    const scores = {
      apertura: personalityResults.apertura_score || 0,
      responsabilidad: personalityResults.responsabilidad_score || 0,
      extraversion: personalityResults.extraversion_score || 0,
      amabilidad: personalityResults.amabilidad_score || 0,
      neuroticismo: personalityResults.neuroticismo_score || 0
    }

    // Los scores ya vienen normalizados a escala 0-100
    const getPercentile = (score: number) => Math.round(score)
    const getLevel = (percentile: number) => {
      if (percentile >= 80) return "Muy Alto"
      if (percentile >= 60) return "Alto"
      if (percentile >= 40) return "Moderado"
      if (percentile >= 20) return "Bajo"
      return "Muy Bajo"
    }

    const factorAnalysis = Object.entries(scores).map(([factor, score]) => {
      const percentile = getPercentile(score)
      const level = getLevel(percentile)
      
      let factorName = ''
      switch(factor) {
        case 'apertura': factorName = 'Apertura a la Experiencia'; break
        case 'responsabilidad': factorName = 'Responsabilidad'; break
        case 'extraversion': factorName = 'Extraversión'; break
        case 'amabilidad': factorName = 'Amabilidad'; break
        case 'neuroticismo': factorName = 'Neuroticismo'; break
      }
      
      return `${factorName}: ${percentile}/100 (${level})`
    }).join('\n')

    const systemMessage = `Eres un psicólogo organizacional experto en evaluación de personalidad usando el modelo de los Cinco Grandes (Big Five/OCEAN). 
    Proporciona análisis profesionales, objetivos y constructivos en español para reportes empresariales.`

    const prompt = `Analiza los siguientes resultados de evaluación de personalidad OCEAN del candidato "${userInfo.name}" y proporciona un análisis profesional completo:

PUNTUACIONES OBTENIDAS:
${factorAnalysis}

DATOS ADICIONALES:
- Email: ${userInfo.email}
- Fecha de evaluación: ${new Date().toLocaleDateString('es-ES')}

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

Mantén un tono profesional, constructivo y orientado al desarrollo. El análisis será usado para toma de decisiones de recursos humanos.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1200,
        temperature: 0.7
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const analysisContent = data.choices[0].message.content

    // Dividir el análisis en secciones
    const sections = analysisContent.split(/\*\*[^*]+\*\*/)
    
    return {
      interpretation: analysisContent,
      personalityScores: scores,
      factorAnalysis: factorAnalysis,
      recommendations: "Ver análisis completo en la sección de interpretación",
      conclusion: "Evaluación de personalidad completada exitosamente",
      generated_at: new Date().toISOString(),
      candidate_info: {
        name: userInfo.name,
        email: userInfo.email,
        evaluation_date: new Date().toLocaleDateString('es-ES')
      }
    }

  } catch (error) {
    console.error('Error generating AI analysis:', error)
    return {
      interpretation: "Error al generar análisis automático. Consulte con el administrador.",
      recommendations: "Análisis manual requerido",
      conclusion: "Error en el sistema de análisis",
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
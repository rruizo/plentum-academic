import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, analysisType, analysis, model } = await req.json()
    
    console.log('Saving analysis to cache:', { sessionId, analysisType, model })

    if (!sessionId || !analysisType || !analysis) {
      throw new Error('Missing required parameters')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener información del usuario desde la sesión
    let userId = null
    
    if (analysisType === 'ocean') {
      // Para análisis OCEAN, buscar en personality_results
      const { data: personalityResult } = await supabaseAdmin
        .from('personality_results')
        .select('user_id')
        .eq('session_id', sessionId)
        .single()
      
      userId = personalityResult?.user_id
    } else {
      // Para análisis de confiabilidad, buscar en exam_sessions
      const { data: examSession } = await supabaseAdmin
        .from('exam_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single()
      
      // Convertir email a UUID si es necesario
      if (examSession?.user_id && examSession.user_id.includes('@')) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', examSession.user_id)
          .single()
        
        userId = profile?.id
      } else {
        userId = examSession?.user_id
      }
    }

    if (!userId) {
      throw new Error('No se pudo determinar el usuario para el análisis')
    }

    // Preparar datos para el cache
    const inputData = {
      session_id: sessionId,
      analysis_type: analysisType,
      model_used: model,
      generated_at: new Date().toISOString()
    }

    const analysisResult = {
      analysis,
      model_used: model,
      generated_at: new Date().toISOString(),
      session_id: sessionId
    }

    // Guardar en cache usando la función RPC
    const { error: cacheError } = await supabaseAdmin
      .rpc('save_ai_analysis_cache', {
        p_user_id: userId,
        p_exam_id: analysisType === 'reliability' ? sessionId : null,
        p_psychometric_test_id: analysisType === 'ocean' ? sessionId : null,
        p_analysis_type: analysisType,
        p_input_data: inputData,
        p_ai_analysis_result: analysisResult,
        p_tokens_used: null,
        p_model_used: model,
        p_requested_by: null,
        p_expires_hours: 720 // 30 días
      })

    if (cacheError) {
      console.error('Error saving to cache:', cacheError)
      throw new Error('Error al guardar análisis en cache')
    }

    // También actualizar la tabla correspondiente
    if (analysisType === 'ocean') {
      await supabaseAdmin
        .from('personality_results')
        .update({
          ai_interpretation: analysis,
          ai_analysis_generated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
    } else {
      await supabaseAdmin
        .from('exam_attempts')
        .update({
          ai_analysis: analysis,
          ai_analysis_generated_at: new Date().toISOString()
        })
        .eq('exam_id', sessionId) // Assuming exam_id relationship
    }

    console.log('Analysis saved successfully')

    return new Response(JSON.stringify({
      success: true,
      message: 'Análisis guardado exitosamente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error saving analysis:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
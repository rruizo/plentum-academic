import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  sessionId: string;
  baseScores: any;
  resultType: 'reliability' | 'ocean';
  attemptId?: string;
  personalityResultId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { sessionId, baseScores, resultType, attemptId, personalityResultId }: RequestBody = await req.json();

    if (!sessionId || !baseScores || !resultType) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calculating adjusted scores for session:', sessionId);

    // Obtener factores personales
    const { data: personalFactors, error: factorsError } = await supabase
      .from('personal_factors')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (factorsError) {
      console.error('Error fetching personal factors:', factorsError);
      return new Response(
        JSON.stringify({ error: 'Personal factors not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adjustment = personalFactors.ajuste_total;
    console.log('Personal adjustment factor:', adjustment);

    // Calcular scores ajustados
    let adjustedScores: any;
    
    if (resultType === 'ocean' && typeof baseScores === 'object') {
      // Para OCEAN, ajustar cada dimensión individualmente
      adjustedScores = {};
      for (const [dimension, score] of Object.entries(baseScores)) {
        if (typeof score === 'number') {
          adjustedScores[dimension] = Math.max(0, Math.min(100, score * (1 + adjustment)));
        } else {
          adjustedScores[dimension] = score;
        }
      }
    } else if (resultType === 'reliability' && typeof baseScores === 'number') {
      // Para confiabilidad, ajustar el score total
      adjustedScores = Math.max(0, baseScores * (1 + adjustment));
    } else {
      adjustedScores = baseScores;
    }

    console.log('Base scores:', baseScores);
    console.log('Adjusted scores:', adjustedScores);

    // Actualizar la tabla correspondiente con los scores ajustados
    if (resultType === 'reliability' && attemptId) {
      const { error: updateError } = await supabase
        .from('exam_attempts')
        .update({
          score_base: baseScores,
          personal_adjustment: adjustment,
          score_adjusted: adjustedScores
        })
        .eq('id', attemptId);

      if (updateError) {
        console.error('Error updating exam attempt:', updateError);
        throw updateError;
      }
    } else if (resultType === 'ocean' && personalityResultId) {
      const { error: updateError } = await supabase
        .from('personality_results')
        .update({
          scores_base: baseScores,
          personal_adjustment: adjustment,
          scores_adjusted: adjustedScores
        })
        .eq('id', personalityResultId);

      if (updateError) {
        console.error('Error updating personality result:', updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        baseScores,
        adjustedScores,
        adjustment,
        personalFactors: {
          estado_civil: personalFactors.estado_civil,
          tiene_hijos: personalFactors.tiene_hijos,
          situacion_habitacional: personalFactors.situacion_habitacional,
          edad: personalFactors.edad
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in calculate-adjusted-scores function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
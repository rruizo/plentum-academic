import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveHTPAnalysisRequest {
  submissionId: string;
  analysisContent: any;
  model: string;
  wordCount: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      submissionId, 
      analysisContent, 
      model, 
      wordCount 
    }: SaveHTPAnalysisRequest = await req.json();

    console.log(`💾 Guardando análisis HTP para submission: ${submissionId}`);

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get submission details
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('htp_submissions')
      .select('user_id')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      throw new Error(`Submission no encontrada: ${submissionError?.message || 'ID no válido'}`);
    }

    // Save analysis to database
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from('htp_analysis')
      .insert({
        submission_id: submissionId,
        user_id: submission.user_id,
        analysis_content: analysisContent,
        openai_model_used: model,
        tokens_used: 0, // Will be updated if available
        word_count: wordCount
      })
      .select()
      .single();

    if (analysisError) {
      console.error('❌ Error guardando análisis:', analysisError);
      throw new Error('Error guardando análisis en la base de datos');
    }

    // Update submission status
    await supabaseAdmin
      .from('htp_submissions')
      .update({
        analysis_generated: true,
        analysis_generated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    console.log('✅ Análisis HTP guardado exitosamente');

    return new Response(JSON.stringify({
      success: true,
      analysisId: analysis.id,
      message: 'Análisis guardado exitosamente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error en save-htp-analysis:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
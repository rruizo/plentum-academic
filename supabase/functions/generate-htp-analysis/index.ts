import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateHTPAnalysisRequest {
  submissionId: string;
  forceRegenerate?: boolean;
  model?: string;
  saveToDatabase?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      submissionId, 
      forceRegenerate = false, 
      model, 
      saveToDatabase = true 
    }: GenerateHTPAnalysisRequest = await req.json();

    console.log(`🧠 Iniciando análisis HTP para submission: ${submissionId}`);

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get submission details
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('htp_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      console.error('❌ Error obteniendo submission:', submissionError);
      throw new Error(`Submission no encontrada: ${submissionError?.message || 'ID no válido'}`);
    }

    // Get user profile separately
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, company, area, section')
      .eq('id', submission.user_id)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ Error obteniendo perfil:', profileError);
      throw new Error(`Perfil de usuario no encontrado: ${profileError?.message || 'Usuario no válido'}`);
    }

    // Check if analysis already exists (only if not forcing regeneration)
    if (!forceRegenerate) {
      const { data: existingAnalysis } = await supabaseAdmin
        .from('htp_analysis')
        .select('id')
        .eq('submission_id', submissionId)
        .limit(1)
        .single();

      if (existingAnalysis) {
        console.log('⚠️ Análisis ya existe para esta submission');
        return new Response(JSON.stringify({
          success: true,
          message: 'Análisis ya existe',
          analysisId: existingAnalysis.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get HTP configuration
    const { data: config, error: configError } = await supabaseAdmin
      .from('htp_config')
      .select('*')
      .limit(1)
      .single();

    if (configError || !config) {
      throw new Error('Configuración HTP no encontrada');
    }

    // Use provided model or fall back to config
    const selectedModel = model || config.openai_model;
    console.log(`🔧 Usando modelo: ${selectedModel}, Temperatura: ${config.temperature}`);

    // Prepare analysis prompt
    const analysisPrompt = `
Analiza el siguiente caso de evaluación HTP (House-Tree-Person):

**DATOS DEL EVALUADO:**
- Nombre: ${userProfile.full_name}
- Email: ${userProfile.email}  
- Empresa: ${userProfile.company}
- Área: ${userProfile.area}
- Sección: ${userProfile.section}

**MATERIAL PROPORCIONADO:**
- Imagen del dibujo HTP: ${submission.image_url}
- Explicación del evaluado: "${submission.explanation_text}"

**INSTRUCCIONES PARA EL ANÁLISIS:**
${config.system_prompt}

Por favor, elabora un informe psicológico profesional que incluya:

1. **DESCRIPCIÓN DEL DIBUJO**: Análisis detallado de los elementos gráficos observados
2. **INTERPRETACIÓN PSICOLÓGICA**: Análisis de personalidad, emociones y dinámicas internas
3. **RELACIONES INTERPERSONALES**: Capacidad de interacción y adaptación social
4. **ESTABILIDAD LABORAL**: Indicadores de desempeño y permanencia en el trabajo
5. **CONFIABILIDAD**: Evaluación de honestidad, integridad y compromiso
6. **FACTORES DE RIESGO**: Identificación de posibles áreas de atención
7. **RECOMENDACIONES**: Sugerencias para el proceso de selección o desarrollo

El informe debe tener entre ${config.min_words} y ${config.max_words} palabras, ser profesional, objetivo y basado en técnicas proyectivas validadas.
    `;

    console.log('🚀 Enviando prompt a OpenAI...');

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: config.system_prompt
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        // Only include temperature for models that support it (older models)
        ...(selectedModel.includes('gpt-4') || selectedModel.includes('gpt-3') ? { temperature: config.temperature } : {}),
        max_completion_tokens: Math.min(config.max_words * 2, 4000) // Aproximación de tokens
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('❌ Error de OpenAI:', errorData);
      throw new Error(`Error de OpenAI: ${openAIResponse.status} - ${errorData}`);
    }

    const openAIData = await openAIResponse.json();
    const analysisContent = openAIData.choices[0].message.content;
    const tokensUsed = openAIData.usage?.total_tokens || 0;

    console.log(`📝 Análisis generado. Tokens utilizados: ${tokensUsed}`);

    // Count words in analysis
    const wordCount = analysisContent.split(/\s+/).length;

    let analysisId = null;

    // Save analysis to database only if requested
    if (saveToDatabase) {
      const { data: analysis, error: analysisError } = await supabaseAdmin
        .from('htp_analysis')
        .insert({
          submission_id: submissionId,
          user_id: submission.user_id,
          analysis_content: {
            text: analysisContent,
            prompt_used: analysisPrompt,
            generated_at: new Date().toISOString(),
            user_profile: userProfile,
            submission_details: {
              image_filename: submission.image_filename,
              explanation: submission.explanation_text
            }
          },
          openai_model_used: selectedModel,
          tokens_used: tokensUsed,
          word_count: wordCount
        })
        .select()
        .single();

      if (analysisError) {
        console.error('❌ Error guardando análisis:', analysisError);
        throw new Error('Error guardando análisis en la base de datos');
      }

      analysisId = analysis.id;

      // Update submission status
      await supabaseAdmin
        .from('htp_submissions')
        .update({
          analysis_generated: true,
          analysis_generated_at: new Date().toISOString()
        })
        .eq('id', submissionId);
    }

    console.log('✅ Análisis HTP completado exitosamente');

    return new Response(JSON.stringify({
      success: true,
      analysisId,
      analysisContent: {
        text: analysisContent,
        generated_at: new Date().toISOString(),
        user_profile: userProfile,
        submission_details: {
          image_filename: submission.image_filename,
          explanation: submission.explanation_text
        }
      },
      wordCount,
      tokensUsed,
      model: selectedModel,
      saved: saveToDatabase,
      message: saveToDatabase ? 'Análisis generado y guardado exitosamente' : 'Análisis temporal generado'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error en generate-htp-analysis:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
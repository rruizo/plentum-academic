import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  examAttemptId?: string;
  examSessionId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { examAttemptId, examSessionId }: RequestBody = await req.json();

    if (!examAttemptId && !examSessionId) {
      return new Response(
        JSON.stringify({ error: 'Se requiere examAttemptId o examSessionId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let examData: any = null;

    if (examAttemptId) {
      // Obtener datos del intento usando la función de la base de datos
      const { data: functionResult, error: functionError } = await supabase
        .rpc('get_exam_analysis_data', { attempt_id: examAttemptId });

      if (functionError) {
        console.error('Error calling get_exam_analysis_data:', functionError);
        throw functionError;
      }

      examData = functionResult;
    } else if (examSessionId) {
      // Obtener datos de la sesión y el intento más reciente
      const { data: sessionData, error: sessionError } = await supabase
        .from('exam_sessions')
        .select(`
          *,
          exams (
            id,
            title,
            description,
            duracion_minutos
          )
        `)
        .eq('id', examSessionId)
        .single();

      if (sessionError) {
        console.error('Error fetching session data:', sessionError);
        throw sessionError;
      }

      // Buscar el intento más reciente para esta sesión
      const { data: attemptData, error: attemptError } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          profiles (
            id,
            full_name,
            email,
            company,
            area,
            section,
            role
          )
        `)
        .eq('exam_id', sessionData.exam_id)
        .eq('user_id', sessionData.user_id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (attemptError) {
        console.error('Error fetching attempt data:', attemptError);
        throw attemptError;
      }

      if (!attemptData || attemptData.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No se encontró un intento completado para esta sesión' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const attempt = attemptData[0];

      // Estructurar los datos en el formato esperado
      examData = {
        exam_attempt: {
          id: attempt.id,
          exam_id: attempt.exam_id,
          user_id: attempt.user_id,
          questions: attempt.questions,
          answers: attempt.answers,
          started_at: attempt.started_at,
          completed_at: attempt.completed_at
        },
        exam_details: {
          id: sessionData.exams.id,
          title: sessionData.exams.title,
          description: sessionData.exams.description,
          duracion_minutos: sessionData.exams.duracion_minutos
        },
        user_profile: attempt.profiles || {
          id: sessionData.user_id,
          full_name: sessionData.user_id, // Para usuarios anónimos, usar el email
          email: sessionData.user_id,
          company: 'No especificado',
          area: 'No especificado',
          section: 'No especificado',
          role: 'student'
        }
      };
    }

    if (!examData) {
      return new Response(
        JSON.stringify({ error: 'No se pudieron obtener los datos del examen' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: examData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-exam-data function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("🚀 SESSION_AUTH: Function started, method:", req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("📨 SESSION_AUTH: Reading request body...")
    const body = await req.json()
    const { sessionId } = body
    console.log("📨 SESSION_AUTH: Received sessionId:", sessionId)

    if (!sessionId) {
      console.log("❌ SESSION_AUTH: No sessionId provided")
      return new Response(
        JSON.stringify({ error: 'Session ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log("🔧 SESSION_AUTH: Environment check:", { 
      hasUrl: !!SUPABASE_URL, 
      hasKey: !!SERVICE_ROLE_KEY,
      url: SUPABASE_URL?.substring(0, 20) + '...'
    })

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.log("❌ SESSION_AUTH: Missing environment variables")
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    console.log("🔍 SESSION_AUTH: Looking up session...")
    // Find session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    console.log("🔍 SESSION_AUTH: Session lookup result:", { 
      found: !!session, 
      error: sessionError?.message,
      sessionId: session?.id
    })

    if (sessionError) {
      console.log("❌ SESSION_AUTH: Session lookup error:", sessionError)
      return new Response(
        JSON.stringify({ error: 'Database error', details: sessionError instanceof Error ? sessionError.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!session) {
      console.log("❌ SESSION_AUTH: Session not found")
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log("📋 SESSION_AUTH: Looking up exam...")
    let exam = null;
    let examError = null;
    
    // Solo buscar examen si session.exam_id no es null (tests de fiabilidad)
    if (session.exam_id) {
      const { data: examData, error: examLookupError } = await supabaseAdmin
        .from('exams')
        .select('*, type, psychometric_test_id')
        .eq('id', session.exam_id)
        .maybeSingle()
      
      exam = examData;
      examError = examLookupError;
    } else if (session.psychometric_test_id) {
      // Para tests psicométricos, buscar en la tabla psychometric_tests
      console.log("🧠 SESSION_AUTH: Looking up psychometric test...")
      const { data: psychometricData, error: psychometricError } = await supabaseAdmin
        .from('psychometric_tests')
        .select('*')
        .eq('id', session.psychometric_test_id)
        .maybeSingle()
      
      if (psychometricData) {
        // Crear un objeto similar al exam para compatibilidad
        exam = {
          id: psychometricData.id,
          title: psychometricData.name,
          estado: psychometricData.is_active ? 'activo' : 'inactivo',
          test_type: 'psychometric'
        };
      }
      examError = psychometricError;
    }

    console.log("📋 SESSION_AUTH: Exam lookup result:", { 
      found: !!exam, 
      error: examError?.message,
      examId: exam?.id,
      examTitle: exam?.title,
      testType: session.test_type
    })

    if (examError) {
      console.log("❌ SESSION_AUTH: Exam lookup error:", examError)
      return new Response(
        JSON.stringify({ error: 'Database error', details: examError instanceof Error ? examError.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!exam) {
      console.log("❌ SESSION_AUTH: Exam/Test not found")
      return new Response(
        JSON.stringify({ error: 'Exam or psychometric test not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log("👤 SESSION_AUTH: Looking up user by ID:", session.user_id)
    
    let userEmail = null;
    let authUser = null;
    
    // Verificar si user_id es un email o un UUID
    const isEmail = session.user_id.includes('@');
    
    if (isEmail) {
      // Para tests psicométricos, user_id es el email directamente
      userEmail = session.user_id;
      console.log("✅ SESSION_AUTH: Using email directly from session:", userEmail)
    } else {
      // Para exámenes regulares, user_id es un UUID
      const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(session.user_id)
      
      console.log("👤 SESSION_AUTH: User lookup result:", { 
        found: !!authUserData?.user, 
        hasEmail: !!authUserData?.user?.email,
        error: authUserError?.message
      })

      if (authUserError || !authUserData?.user || !authUserData.user.email) {
        console.error('❌ SESSION_AUTH: User lookup failed:', authUserError)
        return new Response(
          JSON.stringify({ error: 'User not found or missing email' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      authUser = authUserData;
      userEmail = authUserData.user.email;
    }
    
    console.log("👤 SESSION_AUTH: User email found:", userEmail)

    // Buscar las credenciales del usuario por email (obtener las más recientes)
    console.log("🔑 SESSION_AUTH: Looking up user credentials by email:", userEmail)
    let credentials = null;
    let credentialsError = null;
    
    if (session.exam_id) {
      // Para tests de fiabilidad
      const { data: credData, error: credError } = await supabaseAdmin
        .from('exam_credentials')
        .select('*')
        .eq('user_email', userEmail)
        .eq('exam_id', session.exam_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      credentials = credData;
      credentialsError = credError;
    } else if (session.psychometric_test_id) {
      // Para tests psicométricos
      const { data: credData, error: credError } = await supabaseAdmin
        .from('exam_credentials')
        .select('*')
        .eq('user_email', userEmail)
        .eq('psychometric_test_id', session.psychometric_test_id)
        .eq('test_type', 'psychometric')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      credentials = credData;
      credentialsError = credError;
    }

    console.log("🔑 SESSION_AUTH: Credentials lookup result:", { 
      found: !!credentials, 
      error: credentialsError?.message,
      username: credentials?.username,
      hasPassword: !!credentials?.password_hash,
      testType: session.test_type
    })

    // Check exam status
    if (exam.estado !== 'activo') {
      console.log("❌ SESSION_AUTH: Exam not active:", exam.estado)
      return new Response(
        JSON.stringify({ error: 'Exam is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log("🎫 SESSION_AUTH: Generating magic link...")
    // Generate magic link for authentication
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://11af11a0-e840-4eb2-b448-fe270eda54dc.lovableproject.com'
    const redirectTo = `${origin}/exam-session/${sessionId}`
    
    console.log("🎫 SESSION_AUTH: Redirect URL will be:", redirectTo)

    const { data: magicLinkData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: redirectTo
      }
    })

    console.log("🎫 SESSION_AUTH: Magic link generation result:", { 
      success: !!magicLinkData, 
      hasActionLink: !!magicLinkData?.properties?.action_link,
      error: authError?.message
    })

    if (authError || !magicLinkData) {
      console.log("❌ SESSION_AUTH: Failed to generate magic link:", authError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate magic link', details: authError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = { 
      success: true,
      magicLink: magicLinkData.properties?.action_link,
      userEmail: userEmail,
      credentials: credentials,
      user: authUser?.user || { email: userEmail },
      sessionData: session,
      examData: exam
    }

    console.log("✅ SESSION_AUTH: Success! Returning response with magic link")
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('💥 SESSION_AUTH: Unexpected error:', error)
    console.error('💥 SESSION_AUTH: Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
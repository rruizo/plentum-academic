import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('PURGE_ERROR: Missing or invalid authorization header')
      return new Response(
        JSON.stringify({ error: 'No autorizado - Token requerido' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create client for user verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user is authenticated and get their role
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      console.error('PURGE_ERROR: Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'No autorizado - Usuario inválido' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      console.error('PURGE_ERROR: User is not admin:', profileError)
      return new Response(
        JSON.stringify({ error: 'Acceso denegado - Solo administradores' }),
        { status: 403, headers: corsHeaders }
      )
    }

    const { userIdToPurge } = await req.json()

    if (!userIdToPurge) {
      return new Response(
        JSON.stringify({ error: 'ID de usuario requerido' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(`PURGE_DEBUG: Iniciando purga para usuario: ${userIdToPurge}`)

    // Get user info before deletion
    const { data: userToPurge, error: userFetchError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userIdToPurge)
      .single()

    if (userFetchError || !userToPurge) {
      console.error('PURGE_ERROR: Usuario no encontrado:', userFetchError)
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // CRITICAL: Follow dependency order for deletion
    
    // 1. Get all exam sessions for this user (user_id is stored as text in exam_sessions)
    const { data: userSessions, error: sessionsError } = await supabaseAdmin
      .from('exam_sessions')
      .select('id')
      .eq('user_id', userIdToPurge.toString())

    if (sessionsError) {
      console.error('PURGE_ERROR: Error fetching user sessions:', sessionsError)
      throw new Error('Error fetching user sessions.')
    }

    let deletedAnalysisCache = 0
    let deletedSessions = 0

    if (userSessions && userSessions.length > 0) {
      const sessionIds = userSessions.map(s => s.id)
      console.log(`PURGE_DEBUG: Found ${sessionIds.length} sessions for user`)

      // a. Delete from exam_analysis_cache (depends on exam_sessions)
      const { error: analysisDeleteError, count: analysisCount } = await supabaseAdmin
        .from('exam_analysis_cache')
        .delete({ count: 'exact' })
        .in('exam_session_id', sessionIds)

      if (analysisDeleteError) {
        console.error('PURGE_ERROR: Error deleting analysis cache:', analysisDeleteError)
        throw new Error('Error deleting analysis cache.')
      }
      deletedAnalysisCache = analysisCount || 0
      console.log(`PURGE_DEBUG: Deleted ${deletedAnalysisCache} analysis cache records`)

      // b. Delete exam_sessions
      const { error: sessionsDeleteError, count: sessionsCount } = await supabaseAdmin
        .from('exam_sessions')
        .delete({ count: 'exact' })
        .eq('user_id', userIdToPurge.toString())

      if (sessionsDeleteError) {
        console.error('PURGE_ERROR: Error deleting exam sessions:', sessionsDeleteError)
        throw new Error('Error deleting exam sessions.')
      }
      deletedSessions = sessionsCount || 0
      console.log(`PURGE_DEBUG: Deleted ${deletedSessions} exam sessions`)
    } else {
      console.log(`PURGE_DEBUG: No sessions found for user ${userIdToPurge}`)
    }

    // 2. Delete other user-related data
    let deletedAttempts = 0
    let deletedCredentials = 0
    let deletedAssignments = 0
    let deletedNotifications = 0
    let deletedPersonalityResponses = 0
    let deletedPersonalityResults = 0
    let deletedCognitiveResponses = 0
    let deletedCognitiveResults = 0

    // Delete exam_attempts
    const { error: attemptsError, count: attemptsCount } = await supabaseAdmin
      .from('exam_attempts')
      .delete({ count: 'exact' })
      .eq('user_id', userIdToPurge)

    if (attemptsError) {
      console.error('PURGE_ERROR: Error deleting exam attempts:', attemptsError)
    } else {
      deletedAttempts = attemptsCount || 0
      console.log(`PURGE_DEBUG: Deleted ${deletedAttempts} exam attempts`)
    }

    // Delete exam_credentials by email
    const { error: credentialsError, count: credentialsCount } = await supabaseAdmin
      .from('exam_credentials')
      .delete({ count: 'exact' })
      .eq('user_email', userToPurge.email)

    if (credentialsError) {
      console.error('PURGE_ERROR: Error deleting exam credentials:', credentialsError)
    } else {
      deletedCredentials = credentialsCount || 0
      console.log(`PURGE_DEBUG: Deleted ${deletedCredentials} exam credentials`)
    }

    // Delete exam_assignments
    const { error: assignmentsError, count: assignmentsCount } = await supabaseAdmin
      .from('exam_assignments')
      .delete({ count: 'exact' })
      .eq('user_id', userIdToPurge)

    if (assignmentsError) {
      console.error('PURGE_ERROR: Error deleting exam assignments:', assignmentsError)
    } else {
      deletedAssignments = assignmentsCount || 0
      console.log(`PURGE_DEBUG: Deleted ${deletedAssignments} exam assignments`)
    }

    // Delete exam_email_notifications
    const { error: notificationsError, count: notificationsCount } = await supabaseAdmin
      .from('exam_email_notifications')
      .delete({ count: 'exact' })
      .eq('user_email', userToPurge.email)

    if (notificationsError) {
      console.error('PURGE_ERROR: Error deleting email notifications:', notificationsError)
    } else {
      deletedNotifications = notificationsCount || 0
      console.log(`PURGE_DEBUG: Deleted ${deletedNotifications} email notifications`)
    }

    // Delete personality_responses
    const { error: personalityResponsesError, count: personalityResponsesCount } = await supabaseAdmin
      .from('personality_responses')
      .delete({ count: 'exact' })
      .eq('user_id', userIdToPurge)

    if (personalityResponsesError) {
      console.error('PURGE_ERROR: Error deleting personality responses:', personalityResponsesError)
    } else {
      deletedPersonalityResponses = personalityResponsesCount || 0
      console.log(`PURGE_DEBUG: Deleted ${deletedPersonalityResponses} personality responses`)
    }

    // Delete personality_results
    const { error: personalityResultsError, count: personalityResultsCount } = await supabaseAdmin
      .from('personality_results')
      .delete({ count: 'exact' })
      .eq('user_id', userIdToPurge)

    if (personalityResultsError) {
      console.error('PURGE_ERROR: Error deleting personality results:', personalityResultsError)
    } else {
      deletedPersonalityResults = personalityResultsCount || 0
      console.log(`PURGE_DEBUG: Deleted ${deletedPersonalityResults} personality results`)
    }

    // Delete respuestas_cognitivas
    const { error: cognitiveResponsesError, count: cognitiveResponsesCount } = await supabaseAdmin
      .from('respuestas_cognitivas')
      .delete({ count: 'exact' })
      .eq('user_id', userIdToPurge)

    if (cognitiveResponsesError) {
      console.error('PURGE_ERROR: Error deleting cognitive responses:', cognitiveResponsesError)
    } else {
      deletedCognitiveResponses = cognitiveResponsesCount || 0
      console.log(`PURGE_DEBUG: Deleted ${deletedCognitiveResponses} cognitive responses`)
    }

    // Delete resultados_cognitivos
    const { error: cognitiveResultsError, count: cognitiveResultsCount } = await supabaseAdmin
      .from('resultados_cognitivos')
      .delete({ count: 'exact' })
      .eq('user_id', userIdToPurge)

    if (cognitiveResultsError) {
      console.error('PURGE_ERROR: Error deleting cognitive results:', cognitiveResultsError)
    } else {
      deletedCognitiveResults = cognitiveResultsCount || 0
      console.log(`PURGE_DEBUG: Deleted ${deletedCognitiveResults} cognitive results`)
    }

    // 3. Finally, delete the user from auth.users
    const { error: authUserDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToPurge)
    if (authUserDeleteError) {
      console.error('PURGE_ERROR: Error deleting user from auth.users:', authUserDeleteError)
      throw new Error('Error deleting user from authentication system.')
    }
    console.log(`PURGE_DEBUG: Usuario ${userIdToPurge} eliminado de auth.users`)

    const summary = `Usuario ${userToPurge.full_name} (${userToPurge.email}) y todos sus datos asociados han sido purgados exitosamente:
    • ${deletedSessions} sesiones de examen
    • ${deletedAnalysisCache} análisis en cache
    • ${deletedAttempts} intentos de examen
    • ${deletedCredentials} credenciales de examen
    • ${deletedAssignments} asignaciones de examen
    • ${deletedNotifications} notificaciones por email
    • ${deletedPersonalityResponses} respuestas de personalidad
    • ${deletedPersonalityResults} resultados de personalidad
    • ${deletedCognitiveResponses} respuestas cognitivas
    • ${deletedCognitiveResults} resultados cognitivos`

    console.log('PURGE_SUCCESS:', summary)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: summary,
        deletedCounts: {
          sessions: deletedSessions,
          analysisCache: deletedAnalysisCache,
          attempts: deletedAttempts,
          credentials: deletedCredentials,
          assignments: deletedAssignments,
          notifications: deletedNotifications,
          personalityResponses: deletedPersonalityResponses,
          personalityResults: deletedPersonalityResults,
          cognitiveResponses: deletedCognitiveResponses,
          cognitiveResults: deletedCognitiveResults
        }
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('PURGE_ERROR: Error en la función de purga:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno al purgar datos.' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
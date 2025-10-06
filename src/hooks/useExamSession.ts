import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExamSession {
  id: string;
  user_id: string;
  exam_id: string | null;
  psychometric_test_id?: string | null;
  test_type?: 'reliability' | 'psychometric' | 'turnover';
  start_time: string | null;
  end_time: string | null;
  attempts_taken: number;
  max_attempts: number;
  status: 'pending' | 'started' | 'completed' | 'expired' | 'attempt_limit_reached';
  created_at: string;
  updated_at: string;
}

export interface ExamSessionWithDetails extends ExamSession {
  exam?: {
    id: string;
    title: string;
    description: string;
    duracion_minutos: number;
    estado: string;
  } | null;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
}

export const useExamSession = (sessionId?: string) => {
  const [session, setSession] = useState<ExamSessionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log(`[useExamSession] useEffect triggered with sessionId:`, sessionId);
    if (sessionId) {
      fetchSession(sessionId);
    } else {
      console.log(`[useExamSession] No sessionId provided, skipping fetch`);
      setLoading(false);
    }
  }, [sessionId]);

  const fetchSession = async (id: string) => {
    try {
      console.log(`[useExamSession] FETCH_START - Fetching session for id:`, id);
      setLoading(true);
      setError(null);

      console.log(`[useExamSession] FETCH_QUERY - Using RPC get_exam_session_by_id`);

      // Usar RPC con SECURITY DEFINER para evitar problemas de RLS sin auth.uid()
      const { data: sessionDataArray, error: sessionError } = await supabase
        .rpc('get_exam_session_by_id', { p_session_id: id });

      console.log(`[useExamSession] FETCH_RESPONSE - sessionData:`, sessionDataArray, `sessionError:`, sessionError);

      if (sessionError) {
        console.error(`[useExamSession] FETCH_DB_ERROR - Database error:`, sessionError);
        throw sessionError;
      }

      if (!sessionDataArray || sessionDataArray.length === 0) {
        console.error(`[useExamSession] FETCH_NO_DATA - Session not found for id:`, id);
        setError('Sesión de examen no encontrada');
        return;
      }

      const rawData = sessionDataArray[0];
      
      // Transformar data del RPC a estructura ExamSessionWithDetails
      const sessionData = {
        id: rawData.id,
        user_id: rawData.user_id,
        exam_id: rawData.exam_id,
        psychometric_test_id: rawData.psychometric_test_id,
        test_type: rawData.test_type,
        status: rawData.status,
        start_time: rawData.start_time,
        end_time: rawData.end_time,
        attempts_taken: rawData.attempts_taken,
        max_attempts: rawData.max_attempts,
        created_at: rawData.created_at,
        updated_at: rawData.updated_at,
        company_id: rawData.company_id,
        exam: rawData.exam_title ? {
          id: rawData.exam_id,
          title: rawData.exam_title,
          description: rawData.exam_description,
          duracion_minutos: rawData.exam_duracion_minutos,
          estado: 'activo'
        } : null,
        psychometric_test: rawData.psychometric_name ? {
          id: rawData.psychometric_test_id,
          name: rawData.psychometric_name,
          description: rawData.psychometric_description,
          duration_minutes: rawData.exam_duracion_minutos || 60,
          is_active: true
        } : null
      };

      console.log(`[useExamSession] Transformed session data:`, sessionData);

      // Para tests psicométricos, asegurar que exam tenga datos
      if (sessionData.test_type === 'psychometric' && sessionData.psychometric_test && !sessionData.exam) {
        sessionData.exam = {
          id: sessionData.psychometric_test.id,
          title: sessionData.psychometric_test.name,
          description: sessionData.psychometric_test.description,
          duracion_minutos: sessionData.psychometric_test.duration_minutes,
          estado: 'activo'
        };
      }

      console.log(`[useExamSession] FETCH_SESSION_DETAILS - Session details:`, {
        sessionId: sessionData.id,
        examId: sessionData.exam_id,
        psychometricTestId: sessionData.psychometric_test_id,
        testType: sessionData.test_type,
        userId: sessionData.user_id,
        status: sessionData.status,
        attemptsUsed: sessionData.attempts_taken,
        maxAttempts: sessionData.max_attempts,
        examTitle: sessionData.exam?.title,
        examStatus: sessionData.exam?.estado
      });

      // Crear objeto de usuario desde datos del RPC
      const userData = {
        id: rawData.user_id,
        full_name: rawData.user_full_name || (rawData.user_id.includes('@') ? rawData.user_id.split('@')[0] : 'Usuario'),
        email: rawData.user_email || (rawData.user_id.includes('@') ? rawData.user_id : 'No disponible')
      };

      console.log(`[useExamSession] USER_DATA - Created from RPC:`, userData);

      const finalData = {
        ...sessionData,
        user: userData
      };

      console.log(`[useExamSession] FETCH_SUCCESS - Final session data:`, {
        sessionId: finalData.id,
        examTitle: finalData.exam?.title,
        userEmail: finalData.user?.email,
        userName: finalData.user?.full_name,
        status: finalData.status
      });

      setSession(finalData as any);
    } catch (err: any) {
      console.error(`[useExamSession] FETCH_ERROR - Complete error details:`, {
        error: err,
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        sessionId: id
      });
      setError(err.message || 'Error al cargar la sesión del examen');
    } finally {
      console.log(`[useExamSession] FETCH_END - Fetch process completed`);
      setLoading(false);
    }
  };

  const validateSession = (session: ExamSessionWithDetails): { isValid: boolean; message?: string } => {
    // Check if exam/test is active (handle both regular exams and psychometric tests)
    if (session.exam && session.exam.estado !== 'activo') {
      return { isValid: false, message: 'El examen no está activo' };
    }
    
    // For psychometric tests without exam data, check test_type and status
    if (!session.exam && session.test_type === 'psychometric') {
      // Psychometric tests are validated differently - they should always be accessible if session exists
      console.log('[useExamSession] Validating psychometric test session');
    }

    // Check status - permitir reiniciar sesiones 'started' que no tienen intentos reales
    if (session.status === 'completed') {
      return { isValid: false, message: 'Este examen ya ha sido completado' };
    }

    if (session.status === 'expired') {
      return { isValid: false, message: 'Esta sesión de examen ha expirado' };
    }

    if (session.status === 'attempt_limit_reached') {
      return { isValid: false, message: 'Se ha alcanzado el límite de intentos para este examen' };
    }

    // Verificar intentos - nueva lógica sin límites estrictos
    // Solo bloquear si ya se completó exitosamente (pero ya se verifica arriba)
    
    // Permitir múltiples intentos, pero trackear para análisis
    console.log(`[useExamSession] Intentos utilizados: ${session.attempts_taken}/${session.max_attempts}`);
    
    // Solo mostrar advertencia si supera el límite original, pero permitir continuar
    if (session.attempts_taken >= session.max_attempts) {
      console.warn('[useExamSession] Usuario superó el límite original de intentos, pero se permite continuar');
    }

    // Check if session has expired by time - pero permitir reinicio para tests psicométricos sin intentos
    if (session.end_time && new Date(session.end_time) < new Date()) {
      // Para tests psicométricos sin intentos reales, permitir reinicio aunque el tiempo haya expirado
      if (session.test_type === 'psychometric' && session.attempts_taken === 0) {
        console.log('[useExamSession] Allowing psychometric test restart despite expired time');
      } else {
        return { isValid: false, message: 'El tiempo para completar este examen ha expirado' };
      }
    }

    return { isValid: true };
  };

  const startSession = async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[useExamSession] Starting session:', sessionId);
      const now = new Date();
      // For psychometric tests, use default 30 minutes duration; for exams, use their duration
      const durationMinutes = session?.exam?.duracion_minutos || 30;
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

      const updates: any = {
        status: 'started',
        updated_at: now.toISOString()
      };

      // Only set start_time if this is the first attempt or if status was pending
      if (!session?.start_time || session?.status === 'pending') {
        updates.start_time = now.toISOString();
        // Solo incrementar attempts_taken cuando realmente empiece por primera vez
        // IMPORTANTE: Para exámenes psicométricos, no incrementar automáticamente hasta que haya respuestas
        if (session?.test_type !== 'psychometric') {
          updates.attempts_taken = (session?.attempts_taken || 0) + 1;
        }
      }

      // Always update end_time for current attempt
      updates.end_time = endTime.toISOString();

      console.log('[useExamSession] Updating session with:', updates);

      const { error: updateError } = await supabase
        .from('exam_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (updateError) {
        console.error('[useExamSession] Update error:', updateError);
        throw updateError;
      }

      // Refresh session data
      await fetchSession(sessionId);

      console.log('[useExamSession] Session started successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error starting exam session:', err);
      return { success: false, error: err.message || 'Error al iniciar la sesión del examen' };
    }
  };

  const incrementAttempt = async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('exam_sessions')
        .update({
          attempts_taken: (session?.attempts_taken || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        throw updateError;
      }

      // Refresh session data
      await fetchSession(sessionId);

      return { success: true };
    } catch (err: any) {
      console.error('Error incrementing attempt:', err);
      return { success: false, error: err.message || 'Error al contabilizar intento' };
    }
  };

  const completeSession = async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('exam_sessions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Examen completado",
        description: "Has completado el examen exitosamente",
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error completing exam session:', err);
      return { success: false, error: err.message || 'Error al completar la sesión del examen' };
    }
  };

  const createExamSession = async (examId: string, userId: string): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
    try {
      // Obtener company_id del usuario
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single();

      const { data, error: insertError } = await supabase
        .from('exam_sessions')
        .insert({
          exam_id: examId,
          user_id: userId,
          status: 'pending',
          attempts_taken: 0,
          max_attempts: 2,
          company_id: userProfile?.company_id // Incluir company_id en la sesión
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      return { success: true, sessionId: data.id };
    } catch (err: any) {
      console.error('Error creating exam session:', err);
      return { success: false, error: err.message || 'Error al crear la sesión del examen' };
    }
  };

  return {
    session,
    loading,
    error,
    validateSession,
    startSession,
    incrementAttempt,
    completeSession,
    createExamSession,
    refetch: () => sessionId && fetchSession(sessionId)
  };
};
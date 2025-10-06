import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineStorage } from './useOfflineStorage';

export interface PersonalityResponse {
  questionId: string;
  responseValue: number;
}

export interface PsychometricScores {
  apertura: number;
  responsabilidad: number;
  extraversion: number;
  amabilidad: number;
  neuroticismo: number;
}

interface PendingPsychometricSubmission {
  id: string;
  userId: string;
  sessionId: string;
  propSessionId?: string;
  responses: PersonalityResponse[];
  scores: PsychometricScores;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

const PSYCHOMETRIC_STORAGE_KEY = 'psychometric_pending_submissions';

export const usePsychometricOfflineSubmission = (sessionId: string, propSessionId?: string) => {
  const networkStatus = useNetworkStatus();
  const offlineStorage = useOfflineStorage();

  const savePsychometricSubmission = useCallback((
    userId: string,
    responses: PersonalityResponse[],
    scores: PsychometricScores
  ) => {
    try {
      const submission: PendingPsychometricSubmission = {
        id: `psychometric_${userId}_${Date.now()}`,
        userId,
        sessionId,
        propSessionId,
        responses,
        scores,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 5
      };

      const existingSubmissions = JSON.parse(
        localStorage.getItem(PSYCHOMETRIC_STORAGE_KEY) || '[]'
      );
      
      existingSubmissions.push(submission);
      localStorage.setItem(PSYCHOMETRIC_STORAGE_KEY, JSON.stringify(existingSubmissions));
      
      console.log('[PsychometricOffline] Saved pending submission:', submission.id);
      return submission.id;
    } catch (error) {
      console.error('[PsychometricOffline] Error saving submission:', error);
      throw error;
    }
  }, [sessionId, propSessionId]);

  const submitPsychometricTest = useCallback(async (
    responses: PersonalityResponse[],
    scores: PsychometricScores,
    onComplete?: (sessionId: string) => void
  ) => {
    try {
      console.log('[PsychometricOffline] Starting submission process...');
      console.log('[PsychometricOffline] Network status:', networkStatus);

      // Obtener información del usuario y sesión
      const { data: { user } } = await supabase.auth.getUser();
      
      let userId = null;
      
      if (user) {
        userId = user.id;
      } else if (propSessionId) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('exam_sessions')
          .select('user_id')
          .eq('id', propSessionId)
          .single();
          
        if (sessionError) throw sessionError;
        if (!sessionData?.user_id) throw new Error('ID de usuario no encontrado en la sesión');
        
        userId = sessionData.user_id;
      } else {
        throw new Error('No se pudo determinar el usuario');
      }

      // Si no hay conexión, guardar localmente
      if (!networkStatus.isOnline) {
        console.log('[PsychometricOffline] No connection detected, saving locally...');
        savePsychometricSubmission(userId, responses, scores);
        toast.success('Test psicométrico guardado localmente. Se enviará cuando se restablezca la conexión.');
        return true;
      }

      // Intentar envío normal
      await performPsychometricSubmission(userId, responses, scores);
      
      toast.success('¡Evaluación completada exitosamente!');
      
      // Cerrar la ventana automáticamente después de un breve delay
      setTimeout(() => {
        window.close();
      }, 2000);

      if (onComplete) {
        onComplete(sessionId);
      }

      return true;

    } catch (error) {
      console.error('[PsychometricOffline] Error submitting test:', error);
      
      // Si hay error de conexión, intentar guardar localmente
      if (!networkStatus.isOnline || error.message?.includes('fetch')) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          let userId = user?.id;
          
          if (!userId && propSessionId) {
            const { data: sessionData } = await supabase
              .from('exam_sessions')
              .select('user_id')
              .eq('id', propSessionId)
              .single();
            userId = sessionData?.user_id;
          }

          if (userId) {
            savePsychometricSubmission(userId, responses, scores);
            toast.success('Test psicométrico guardado localmente. Se enviará cuando se restablezca la conexión.');
            return true;
          }
        } catch (saveError) {
          console.error('[PsychometricOffline] Error saving offline:', saveError);
        }
      }
      
      toast.error('Error al enviar el test psicométrico');
      return false;
    }
  }, [networkStatus, propSessionId, sessionId, savePsychometricSubmission]);

  const performPsychometricSubmission = async (
    userId: string,
    responses: PersonalityResponse[],
    scores: PsychometricScores
  ) => {
    console.log('[PsychometricOffline] Performing submission for user:', userId);

    // Guardar respuestas individuales
    const responseData = responses.map(response => ({
      user_id: userId,
      question_id: response.questionId,
      response_value: response.responseValue,
      session_id: sessionId
    }));

    const { error: responsesError } = await supabase
      .from('personality_responses')
      .insert(responseData);

    if (responsesError) throw responsesError;

    // Guardar puntuaciones
    const { error: resultsError } = await supabase
      .from('personality_results')
      .insert({
        user_id: userId,
        session_id: sessionId,
        apertura_score: scores.apertura,
        responsabilidad_score: scores.responsabilidad,
        extraversion_score: scores.extraversion,
        amabilidad_score: scores.amabilidad,
        neuroticismo_score: scores.neuroticismo
      });

    if (resultsError) throw resultsError;

    // Completar la sesión si tenemos sessionId
    if (propSessionId) {
      const { data: currentSession, error: fetchError } = await supabase
        .from('exam_sessions')
        .select('attempts_taken')
        .eq('id', propSessionId)
        .single();
        
      if (fetchError) {
        console.warn('[PsychometricOffline] Warning fetching current session:', fetchError);
      } else {
        const { error: incrementError } = await supabase
          .from('exam_sessions')
          .update({ attempts_taken: (currentSession.attempts_taken || 0) + 1 })
          .eq('id', propSessionId);
          
        if (incrementError) {
          console.warn('[PsychometricOffline] Warning incrementing attempts:', incrementError);
        }
      }
      
      const { error: sessionCompleteError } = await supabase
        .from('exam_sessions')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', propSessionId);
        
      if (sessionCompleteError) {
        console.warn('[PsychometricOffline] Warning completing session:', sessionCompleteError);
      }
    }

    console.log('[PsychometricOffline] Submission completed successfully');
  };

  const retryPsychometricSubmission = useCallback(async (submission: PendingPsychometricSubmission) => {
    try {
      console.log('[PsychometricOffline] Retrying submission:', submission.id);
      await performPsychometricSubmission(submission.userId, submission.responses, submission.scores);
      
      // Remover de localStorage
      const existingSubmissions: PendingPsychometricSubmission[] = JSON.parse(
        localStorage.getItem(PSYCHOMETRIC_STORAGE_KEY) || '[]'
      );
      const filteredSubmissions = existingSubmissions.filter(s => s.id !== submission.id);
      localStorage.setItem(PSYCHOMETRIC_STORAGE_KEY, JSON.stringify(filteredSubmissions));
      
      return true;
    } catch (error) {
      console.error('[PsychometricOffline] Error retrying submission:', error);
      
      // Incrementar contador de reintentos
      const existingSubmissions: PendingPsychometricSubmission[] = JSON.parse(
        localStorage.getItem(PSYCHOMETRIC_STORAGE_KEY) || '[]'
      );
      const updatedSubmissions = existingSubmissions.map(s => 
        s.id === submission.id ? { ...s, retryCount: s.retryCount + 1 } : s
      );
      localStorage.setItem(PSYCHOMETRIC_STORAGE_KEY, JSON.stringify(updatedSubmissions));
      
      return false;
    }
  }, []);

  const getPendingPsychometricSubmissions = useCallback(() => {
    try {
      const submissions: PendingPsychometricSubmission[] = JSON.parse(
        localStorage.getItem(PSYCHOMETRIC_STORAGE_KEY) || '[]'
      );
      return submissions.filter(s => s.retryCount < s.maxRetries);
    } catch (error) {
      console.error('[PsychometricOffline] Error getting pending submissions:', error);
      return [];
    }
  }, []);

  return {
    submitPsychometricTest,
    retryPsychometricSubmission,
    getPendingPsychometricSubmissions,
    networkStatus,
    hasPendingSubmissions: getPendingPsychometricSubmissions().length > 0
  };
};
import { useCallback } from 'react';
import { toast } from 'sonner';
import { ExamService, ExamQuestion } from '@/services/examService';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineStorage } from './useOfflineStorage';

interface UseExamSubmissionProps {
  examId: string;
  currentUser: any;
  session: any;
  sessionId?: string;
  currentAttemptId: string;
  isAnonymousSession: boolean;
  kioskMode: boolean;
  assignmentId?: string;
  completeSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  completeAttempt: (attemptId: string) => Promise<boolean>;
}

export const useExamSubmission = ({
  examId,
  currentUser,
  session,
  sessionId,
  currentAttemptId,
  isAnonymousSession,
  kioskMode,
  assignmentId,
  completeSession,
  completeAttempt
}: UseExamSubmissionProps) => {
  const networkStatus = useNetworkStatus();
  const offlineStorage = useOfflineStorage();

  const handleSubmitExam = useCallback(async (questions: ExamQuestion[], answers: any[]) => {
    try {
      console.log('[useExamSubmission] Starting submission process...');
      console.log('[useExamSubmission] Network status:', networkStatus);
      console.log('[useExamSubmission] currentAttemptId:', currentAttemptId);
      console.log('[useExamSubmission] isAnonymousSession:', isAnonymousSession);
      console.log('[useExamSubmission] currentUser:', currentUser);
      console.log('[useExamSubmission] session:', session);
      
      // Para sesiones anónimas no necesitamos currentAttemptId
      if (!isAnonymousSession && !currentAttemptId) {
        console.error('[useExamSubmission] No active attempt ID for registered user');
        toast.error('No hay un intento activo');
        return false;
      }

      // Si no hay conexión, guardar localmente
      if (!networkStatus.isOnline) {
        console.log('[useExamSubmission] No connection detected, saving locally...');
        
        const userId = isAnonymousSession 
          ? (session?.user_id || 'anonymous') 
          : (currentUser?.id || 'unknown');

        const submissionId = offlineStorage.savePendingSubmission(
          examId,
          userId,
          questions,
          answers,
          {
            sessionId,
            currentAttemptId,
            isAnonymousSession,
            kioskMode,
            assignmentId
          }
        );

        console.log('[useExamSubmission] Saved pending submission:', submissionId);
        toast.success('Respuestas guardadas localmente. Se enviarán cuando se restablezca la conexión.');
        return true; // Retornamos true para indicar que se "procesó" correctamente
      }

      if (isAnonymousSession) {
        console.log('[useExamSubmission] Processing anonymous session...');
        
        // Validar que tenemos toda la información necesaria
        if (!sessionId) {
          console.error('[useExamSubmission] Missing sessionId for anonymous session');
          throw new Error('Sesión no válida para usuario anónimo');
        }
        
        if (!session) {
          console.error('[useExamSubmission] Missing session data for anonymous session');
          throw new Error('Datos de sesión no encontrados');
        }
        
        if (!session.user_id) {
          console.error('[useExamSubmission] Missing user_id in session data');
          throw new Error('ID de usuario no encontrado en la sesión');
        }
        
        if (!questions || questions.length === 0) {
          console.error('[useExamSubmission] Missing questions data');
          throw new Error('Preguntas del examen no encontradas');
        }
        
        if (!answers || answers.length === 0) {
          console.error('[useExamSubmission] Missing answers data');
          throw new Error('Respuestas del examen no encontradas');
        }
        
        console.log('[useExamSubmission] Creating attempt for anonymous user...');
        console.log('[useExamSubmission] Using user_id:', session.user_id);
        console.log('[useExamSubmission] Questions count:', questions.length);
        console.log('[useExamSubmission] Answers count:', answers.length);
        
        // El trigger normalize_user_id_for_attempts se encargará de convertir email a UUID si es necesario
        await ExamService.createExamAttempt(examId, session.user_id, questions, answers);

        console.log('[useExamSubmission] Attempt created successfully, completing session...');
        // Completar la sesión
        const sessionResult = await completeSession(sessionId);
        if (!sessionResult.success) {
          console.warn('[useExamSubmission] Failed to complete session:', sessionResult.error);
        }
      } else {
        // Para usuarios registrados, usar la lógica de intentos
        await ExamService.updateExamAttempt(currentAttemptId, questions, answers);

        // Marcar el intento como completado en nuestro hook
        const attemptResult = await completeAttempt(currentAttemptId);
        if (!attemptResult) {
          console.warn('[useExamSubmission] Failed to complete attempt');
        }

        // Si hay sessionId, completar la sesión también
        if (sessionId) {
          const sessionResult = await completeSession(sessionId);
          if (!sessionResult.success) {
            console.warn('[useExamSubmission] Failed to complete session:', sessionResult.error);
          }
        }
      }

      // Si es modo kiosko y hay assignmentId, actualizar el estado
      if (kioskMode && assignmentId) {
        await ExamService.updateAssignmentStatus(assignmentId, 'completed');

        // Actualizar el perfil del usuario para restringir acceso futuro
        if (currentUser) {
          await ExamService.restrictUserAccess(currentUser.id);
        }
      }

      toast.success('Evaluación completada exitosamente');
      return true;
      
    } catch (error) {
      console.error('[useExamSubmission] Error submitting exam:', error);
      
      // Si hay error de conexión, intentar guardar localmente
      if (!networkStatus.isOnline || error.message?.includes('fetch')) {
        console.log('[useExamSubmission] Network error detected, saving locally...');
        
        const userId = isAnonymousSession 
          ? (session?.user_id || 'anonymous') 
          : (currentUser?.id || 'unknown');

        const submissionId = offlineStorage.savePendingSubmission(
          examId,
          userId,
          questions,
          answers,
          {
            sessionId,
            currentAttemptId,
            isAnonymousSession,
            kioskMode,
            assignmentId
          }
        );

        console.log('[useExamSubmission] Saved pending submission after error:', submissionId);
        toast.success('Respuestas guardadas localmente. Se enviarán cuando se restablezca la conexión.');
        return true;
      }
      
      toast.error('Error al enviar el examen');
      return false;
    }
  }, [
    examId,
    currentUser,
    session,
    sessionId,
    currentAttemptId,
    isAnonymousSession,
    kioskMode,
    assignmentId,
    completeSession,
    completeAttempt,
    networkStatus,
    offlineStorage
  ]);

  // Función para reintentar submissions pendientes
  const retryPendingSubmission = useCallback(async (submission: any) => {
    try {
      console.log('[useExamSubmission] Retrying pending submission:', submission.id);
      
      if (submission.isAnonymousSession) {
        // Recrear la lógica para sesiones anónimas
        await ExamService.createExamAttempt(
          submission.examId, 
          submission.userId, 
          submission.questions, 
          submission.answers
        );

        if (submission.sessionId) {
          const sessionResult = await completeSession(submission.sessionId);
          if (!sessionResult.success) {
            console.warn('[useExamSubmission] Failed to complete session on retry:', sessionResult.error);
          }
        }
      } else {
        // Recrear la lógica para usuarios registrados
        if (submission.currentAttemptId) {
          await ExamService.updateExamAttempt(
            submission.currentAttemptId, 
            submission.questions, 
            submission.answers
          );

          const attemptResult = await completeAttempt(submission.currentAttemptId);
          if (!attemptResult) {
            console.warn('[useExamSubmission] Failed to complete attempt on retry');
          }
        }

        if (submission.sessionId) {
          const sessionResult = await completeSession(submission.sessionId);
          if (!sessionResult.success) {
            console.warn('[useExamSubmission] Failed to complete session on retry:', sessionResult.error);
          }
        }
      }

      // Si es modo kiosko, actualizar estado
      if (submission.kioskMode && submission.assignmentId) {
        await ExamService.updateAssignmentStatus(submission.assignmentId, 'completed');

        if (currentUser) {
          await ExamService.restrictUserAccess(currentUser.id);
        }
      }

      console.log('[useExamSubmission] Successfully retried submission:', submission.id);
      return true;
    } catch (error) {
      console.error('[useExamSubmission] Error retrying submission:', error);
      return false;
    }
  }, [completeSession, completeAttempt, currentUser]);

  return {
    handleSubmitExam,
    retryPendingSubmission,
    networkStatus,
    offlineStorage
  };
};
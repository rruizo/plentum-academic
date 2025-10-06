import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { useExamNavigation } from '@/hooks/useExamNavigation';
import { useKioskMode } from '@/hooks/useKioskMode';
import { useExamAttempts } from '@/hooks/useExamAttempts';
import { useExamSession } from '@/hooks/useExamSession';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { useExamQuestionLoader } from '@/hooks/useExamQuestionLoader';
import { useExamSubmission } from '@/hooks/useExamSubmission';
import { ExamProvider, useExamContext } from './ExamProvider';
import ExamTimer from './ExamTimer';
import ExamProgressBar from './ExamProgressBar';
import ExamQuestionCard from './ExamQuestionCard';
import ExamNavigationButtons from './ExamNavigationButtons';
import ExamLoadingState from './ExamLoadingState';
import ExamStartScreen from './ExamStartScreen';
import ExamCompletedScreen from './ExamCompletedScreen';
import OfflineSubmissionManager from './OfflineSubmissionManager';
import { usePersonalFactors } from '@/hooks/usePersonalFactors';
import { useExamAutoSave } from '@/hooks/useExamAutoSave';
import { useExamProgressRecovery } from '@/hooks/useExamProgressRecovery';
import { ProgressRecoveryDialog } from './ProgressRecoveryDialog';
import { ManualSaveButton } from './ManualSaveButton';
import { ImprovedErrorDisplay } from './ImprovedErrorDisplay';

interface RefactoredExamInterfaceProps {
  examId: string;
  onComplete?: () => void;
  sessionId?: string;
}

const RefactoredExamInterfaceContent = ({ examId, onComplete, sessionId }: RefactoredExamInterfaceProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const kioskMode = location.state?.kioskMode || !!sessionId;
  const assignmentId = location.state?.assignmentId;
  
  const [currentAttemptId, setCurrentAttemptId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);

  // Usar el contexto del provider
  const {
    exam,
    questions,
    examStarted,
    examCompleted,
    currentUser,
    sessionData,
    examType,
    setExam,
    setQuestions,
    setExamStarted,
    setExamCompleted,
    setCurrentUser,
    setSessionData,
    setExamType,
  } = useExamContext();

  // Hook para cargar preguntas
  const {
    exam: loaderExam,
    questions: loaderQuestions,
    examType: loaderExamType,
    loading: questionLoading,
    loadFromExamId,
    loadFromSessionId
  } = useExamQuestionLoader();

  // Hooks originales
  const {
    currentQuestionIndex,
    answers,
    handleAnswerChange,
    handleNextQuestion,
    handlePreviousQuestion,
    getCurrentAnswer
  } = useExamNavigation(questions.length);

  const {
    canStartNewAttempt,
    getAttemptsRemaining,
    getCurrentAttempt,
    createNewAttempt,
    completeAttempt
  } = useExamAttempts(examId, currentUser?.id);

  const { session, completeSession, incrementAttempt } = useExamSession(sessionId);

  // Para sesiones anónimas (sessionId), usar la lógica de sesión en lugar de intentos
  const isAnonymousSession = !!sessionId;

  // Hook para envío de exámenes
  const { handleSubmitExam: submitExamHook, retryPendingSubmission, networkStatus, offlineStorage } = useExamSubmission({
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
  });

  const { savePersonalFactors, getPersonalFactors, isLoading: personalFactorsLoading } = usePersonalFactors();

  // Auto-save configuración COMPLETAMENTE DESHABILITADO
  const autoSaveConfig = {
    enabled: false,
    autoSaveInterval: 0, // 0 = completamente deshabilitado
    showSaveIndicator: false
  };

  const { manualSave } = useExamAutoSave({
    examId: examId || sessionId || '',
    sessionId,
    currentUser,
    questions,
    answers,
    currentQuestionIndex,
    examStarted,
    examCompleted,
    enabled: autoSaveConfig.enabled,
    autoSaveInterval: autoSaveConfig.autoSaveInterval,
    showSaveIndicator: autoSaveConfig.showSaveIndicator
  });

  // Hook para recuperar progreso previo
  const {
    showRecoveryDialog,
    savedProgress,
    recoverProgress,
    discardProgress
  } = useExamProgressRecovery({
    examId,
    sessionId,
    currentUser,
    onProgressRecovered: (progress) => {
      console.log('[RefactoredExamInterface] Recovering progress:', progress);
      // Recuperar el estado desde el progreso guardado
      if (progress.questions && progress.questions.length > 0) {
        setQuestions(progress.questions);
      }
      // La navegación y respuestas se recuperarán a través de los hooks correspondientes
      setExamStarted(true);
    }
  });

  const handleSubmitExam = async () => {
    const success = await submitExamHook(questions, answers);
    if (success) {
      // Solo marcar como completado si realmente se envió al servidor
      // o si se guardó localmente (modo offline)
      if (networkStatus.isOnline || !networkStatus.isOnline) {
        setExamCompleted(true);
      }
    }
  };

  // Manejar cuando todas las submissions offline se han completado
  const handleAllSubmissionsComplete = () => {
    console.log('[RefactoredExamInterface] All offline submissions completed');
    // Aquí podríamos mostrar una confirmación adicional si fuera necesario
    toast.success('¡Examen enviado exitosamente!');
  };

  // Usar el temporizador basado en session end_time si está disponible
  const sessionEndTime = session?.end_time;
  const fallbackEndTime = examStarted && exam?.duracion_minutos ? 
    new Date(Date.now() + exam.duracion_minutos * 60 * 1000).toISOString() : null;
  
  const timeRemaining = useSessionTimer({
    endTime: sessionEndTime || fallbackEndTime,
    onTimeUp: handleSubmitExam,
    examStarted,
    examCompleted
  });

  useKioskMode(kioskMode);

  const handleStartExam = async () => {
    if (isAnonymousSession) {
      // Para sesiones anónimas, incrementar el intento cuando efectivamente se inicie el test
      if (sessionId && incrementAttempt) {
        const result = await incrementAttempt(sessionId);
        if (!result.success) {
          toast.error(result.error || 'Error al contabilizar intento');
          return;
        }
      }
      
      setCurrentAttemptId(sessionId || 'anonymous');
      setExamStarted(true);
      toast.success('Evaluación iniciada. ¡Responda con honestidad!');
      return;
    }

    if (!canStartNewAttempt()) {
      toast.error('No puedes iniciar más intentos para este examen');
      return;
    }

    const result = await createNewAttempt();
    if (result.success && result.attempt) {
      setCurrentAttemptId(result.attempt.id);
      setExamStarted(true);
      toast.success('Evaluación iniciada. ¡Responda con honestidad!');
    } else {
      toast.error(result.error || 'Error al iniciar el examen');
    }
  };

  const handleExamFinish = async () => {
    try {
      if (kioskMode) {
        await supabase.auth.signOut();
        toast.success('Gracias por completar la evaluación. Cerrando sesión...');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        if (onComplete) {
          onComplete();
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error finishing exam:', error);
      window.location.href = '/';
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // Sincronizar datos del loader con el contexto
  useEffect(() => {
    if (loaderExam) setExam(loaderExam);
    if (loaderQuestions.length > 0) setQuestions(loaderQuestions);
    if (loaderExamType) setExamType(loaderExamType);
  }, [loaderExam, loaderQuestions, loaderExamType, setExam, setQuestions, setExamType]);

  // Función para cargar datos con manejo de errores mejorado
  const loadData = async () => {
    console.log('[RefactoredExamInterface] Starting loadData - examId:', examId, 'sessionId:', sessionId);
    setLoading(true);
    setHasNetworkError(false);
    
    try {
      if (sessionId && !examId) {
        console.log('[RefactoredExamInterface] Loading from sessionId');
        await loadFromSessionId(sessionId);
      } else if (examId) {
        console.log('[RefactoredExamInterface] Loading from examId');
        await loadFromExamId(examId);
      }
      
      await fetchCurrentUser();
      
      // Verificar que existan factores personales solo si NO es una sesión anónima con sessionId
      // Para sesiones anónimas (kiosk mode), los factores se solicitan antes del examen
      if (!isAnonymousSession) {
        console.log('[RefactoredExamInterface] Checking personal factors - sessionId:', sessionId, 'examId:', examId);
        const existingFactors = await getPersonalFactors(sessionId, examId);
        console.log('[RefactoredExamInterface] Personal factors result:', existingFactors);
        
        if (!existingFactors || !existingFactors.id) {
          console.log('[RefactoredExamInterface] Personal factors NOT found - redirecting to student portal');
          toast.error('Debe completar sus datos personales antes de tomar el examen');
          setTimeout(() => {
            navigate('/estudiante');
          }, 2000);
          return;
        }
      } else {
        console.log('[RefactoredExamInterface] Anonymous session detected - skipping personal factors check');
      }
      
      setConnectionRetryCount(0); // Reset retry count on success
      console.log('[RefactoredExamInterface] Data loaded successfully');
    } catch (error: any) {
      console.error('[RefactoredExamInterface] Error loading data:', error);
      
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'NetworkError') {
        setHasNetworkError(true);
        setConnectionRetryCount(prev => prev + 1);
        
        if (connectionRetryCount < 2) { // Reducir reintentos de 3 a 2
          toast.error(`Error de conexión. Reintentando... (${connectionRetryCount + 1}/2)`);
          setTimeout(() => loadData(), 2000); // Delay fijo de 2 segundos
          return;
        } else {
          toast.error('Error de conexión persistente. Verifique su conexión a internet y recargue la página.', {
            duration: 5000
          });
        }
      } else {
        toast.error('Error al cargar el examen: ' + error.message, {
          duration: 5000
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cuando cambia examId o sessionId ÚNICAMENTE
  useEffect(() => {
    loadData();
  }, [examId, sessionId]); // Solo depender de los IDs, no de las funciones

  if (loading || questionLoading) {
    return <ExamLoadingState />;
  }

  // Mostrar error de conexión mejorado
  if (hasNetworkError) {
    return (
      <ImprovedErrorDisplay
        error="Error de conexión: No se pudo cargar el examen"
        onRetry={loadData}
        onGoHome={() => navigate('/')}
        isRetrying={loading}
        retryCount={connectionRetryCount}
        showRetryButton={connectionRetryCount < 3}
      />
    );
  }

  if (!examStarted) {
    return (
      <ExamStartScreen 
        exam={exam}
        questionCount={questions.length}
        onStart={handleStartExam}
      />
    );
  }

  if (examCompleted) {
    return <ExamCompletedScreen onFinish={handleExamFinish} />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Diálogo de recuperación de progreso */}
      <ProgressRecoveryDialog
        open={showRecoveryDialog}
        savedProgress={savedProgress}
        onRecover={recoverProgress}
        onDiscard={discardProgress}
      />
      
      {/* Manager para manejar estados offline y reintentos */}
      <OfflineSubmissionManager
        onRetrySubmission={retryPendingSubmission}
        onAllSubmissionsComplete={handleAllSubmissionsComplete}
      />
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header con timer, progreso y botón de guardado manual */}
        <div className="flex flex-col lg:flex-row gap-4">
          <ExamTimer timeRemaining={timeRemaining} />
          <div className="flex-1">
            <ExamProgressBar 
              currentQuestionIndex={currentQuestionIndex} 
              totalQuestions={questions.length}
              answeredCount={answers.length}
            />
          </div>
          {examStarted && !examCompleted && (
            <ManualSaveButton 
              onSave={manualSave}
              className="shrink-0"
            />
          )}
        </div>
        
        {/* Indicador de auto-guardado */}
        <div className="text-center">
          <span 
            id="auto-save-indicator" 
            className="text-xs text-muted-foreground opacity-0 transition-opacity duration-300"
          >
            
          </span>
        </div>

        {/* Pregunta actual */}
        {questions[currentQuestionIndex] && (
          <ExamQuestionCard
            question={questions[currentQuestionIndex]}
            currentAnswer={getCurrentAnswer(questions[currentQuestionIndex].id)}
            onAnswerChange={(answer) => handleAnswerChange(questions[currentQuestionIndex].id, answer)}
          />
        )}

        {/* Navegación */}
        <ExamNavigationButtons
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          currentAnswer={getCurrentAnswer(questions[currentQuestionIndex]?.id)}
          onPreviousQuestion={handlePreviousQuestion}
          onNextQuestion={handleNextQuestion}
          onSubmitExam={handleSubmitExam}
        />
      </div>
    </div>
  );
};

export const RefactoredExamInterface = (props: RefactoredExamInterfaceProps) => {
  return (
    <ExamProvider>
      <RefactoredExamInterfaceContent {...props} />
    </ExamProvider>
  );
};

export default RefactoredExamInterface;
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface SavedProgress {
  examId: string;
  sessionId?: string;
  userId?: string;
  questions: any[];
  answers: any[];
  currentQuestionIndex: number;
  lastUpdated: string;
  examStarted: boolean;
  examCompleted: boolean;
}

interface UseExamProgressRecoveryProps {
  examId: string;
  sessionId?: string;
  currentUser: any;
  onProgressRecovered: (progress: SavedProgress) => void;
}

export const useExamProgressRecovery = ({
  examId,
  sessionId,
  currentUser,
  onProgressRecovered
}: UseExamProgressRecoveryProps) => {
  const [hasRecoverableProgress, setHasRecoverableProgress] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(null);

  const getStorageKey = () => {
    const userId = currentUser?.id || sessionId || 'anonymous';
    return `exam_progress_${examId}_${userId}`;
  };

  const checkForSavedProgress = () => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const progress: SavedProgress = JSON.parse(stored);
        
        // Verificar que el progreso sea reciente (menos de 24 horas)
        const lastUpdated = new Date(progress.lastUpdated);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24 && progress.examStarted && !progress.examCompleted) {
          setSavedProgress(progress);
          setHasRecoverableProgress(true);
          setShowRecoveryDialog(true);
          return true;
        } else {
          // Limpiar progreso obsoleto
          localStorage.removeItem(getStorageKey());
        }
      }
    } catch (error) {
      console.error('[ProgressRecovery] Error checking for saved progress:', error);
      localStorage.removeItem(getStorageKey());
    }
    return false;
  };

  const recoverProgress = () => {
    if (savedProgress) {
      console.log('[ProgressRecovery] Recovering saved progress:', savedProgress);
      onProgressRecovered(savedProgress);
      setShowRecoveryDialog(false);
      toast.success(`Progreso recuperado. Continuando desde la pregunta ${savedProgress.currentQuestionIndex + 1}`);
    }
  };

  const discardProgress = () => {
    try {
      localStorage.removeItem(getStorageKey());
      setSavedProgress(null);
      setHasRecoverableProgress(false);
      setShowRecoveryDialog(false);
      toast.info('Progreso anterior descartado. Comenzando examen desde el inicio.');
    } catch (error) {
      console.error('[ProgressRecovery] Error discarding progress:', error);
    }
  };

  useEffect(() => {
    if (examId && (currentUser || sessionId)) {
      checkForSavedProgress();
    }
  }, [examId, currentUser?.id, sessionId]);

  return {
    hasRecoverableProgress,
    showRecoveryDialog,
    savedProgress,
    recoverProgress,
    discardProgress,
    setShowRecoveryDialog
  };
};
import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseExamAutoSaveProps {
  examId: string;
  sessionId?: string;
  currentUser: any;
  questions: any[];
  answers: any[];
  currentQuestionIndex: number;
  examStarted: boolean;
  examCompleted: boolean;
  enabled?: boolean;
  autoSaveInterval?: number; // En segundos, 0 para deshabilitar completamente
  showSaveIndicator?: boolean;
}

const DEFAULT_AUTO_SAVE_INTERVAL = 60000; // 60 segundos por defecto
const STORAGE_KEY_PREFIX = 'exam_progress_';

export const useExamAutoSave = ({
  examId,
  sessionId,
  currentUser,
  questions,
  answers,
  currentQuestionIndex,
  examStarted,
  examCompleted,
  enabled = true,
  autoSaveInterval = 60, // En segundos
  showSaveIndicator = false
}: UseExamAutoSaveProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>('');

  const getStorageKey = useCallback(() => {
    const userId = currentUser?.id || sessionId || 'anonymous';
    return `${STORAGE_KEY_PREFIX}${examId}_${userId}`;
  }, [examId, currentUser?.id, sessionId]);

  const saveProgress = useCallback(async () => {
    if (!enabled || autoSaveInterval === 0 || !examStarted || examCompleted) return;

    try {
      const progressData = {
        examId,
        sessionId,
        userId: currentUser?.id,
        questions,
        answers,
        currentQuestionIndex,
        lastUpdated: new Date().toISOString(),
        examStarted,
        examCompleted
      };

      const dataString = JSON.stringify(progressData);
      
      // Solo guardar si los datos han cambiado
      if (dataString !== lastSaveRef.current) {
        // Usar requestIdleCallback para no bloquear la UI
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => {
            localStorage.setItem(getStorageKey(), dataString);
            lastSaveRef.current = dataString;
            console.log('[AutoSave] Progress saved locally (idle)');
            showSaveIndicatorIfEnabled();
          });
        } else {
          // Fallback para navegadores que no soportan requestIdleCallback
          setTimeout(() => {
            localStorage.setItem(getStorageKey(), dataString);
            lastSaveRef.current = dataString;
            console.log('[AutoSave] Progress saved locally (timeout)');
            showSaveIndicatorIfEnabled();
          }, 0);
        }
      }
    } catch (error) {
      console.error('[AutoSave] Error saving progress:', error);
    }
  }, [
    examId,
    sessionId,
    currentUser?.id,
    questions,
    answers,
    currentQuestionIndex,
    examStarted,
    examCompleted,
    enabled,
    autoSaveInterval,
    getStorageKey
  ]);

  const showSaveIndicatorIfEnabled = () => {
    if (!showSaveIndicator) return;
    
    // Mostrar indicador visual discreto solo si está habilitado
    const indicator = document.getElementById('auto-save-indicator');
    if (indicator) {
      indicator.textContent = '💾 Guardado';
      indicator.style.opacity = '1';
      setTimeout(() => {
        indicator.style.opacity = '0';
      }, 1500);
    }
  };

  const manualSave = useCallback(() => {
    saveProgress();
    toast.success('Progreso guardado manualmente', { duration: 1500 });
  }, [saveProgress]);

  const loadProgress = useCallback(() => {
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        const progressData = JSON.parse(saved);
        console.log('[AutoSave] Found saved progress:', progressData);
        return progressData;
      }
    } catch (error) {
      console.error('[AutoSave] Error loading progress:', error);
    }
    return null;
  }, [getStorageKey]);

  const clearProgress = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey());
      console.log('[AutoSave] Progress cleared');
    } catch (error) {
      console.error('[AutoSave] Error clearing progress:', error);
    }
  }, [getStorageKey]);

  const hasStoredProgress = useCallback(() => {
    const stored = localStorage.getItem(getStorageKey());
    return !!stored;
  }, [getStorageKey]);

  // Auto-save interval - COMPLETAMENTE DESHABILITADO
  useEffect(() => {
    // Limpiar cualquier intervalo existente siempre
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // NUNCA configurar auto-save si está deshabilitado
    if (!enabled || autoSaveInterval === 0) {
      console.log('[AutoSave] Auto-save is DISABLED - no intervals will be created');
      return;
    }

    // Esta sección nunca debería ejecutarse con la configuración actual
    console.warn('[AutoSave] Auto-save was enabled unexpectedly - this should not happen');
    
    // Limpiar al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, autoSaveInterval]); // Reducir dependencias para evitar loops

  // Guardar antes de cerrar la ventana - SOLO si está habilitado
  useEffect(() => {
    if (!enabled || autoSaveInterval === 0) return; // No hacer nada si está deshabilitado

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examStarted && !examCompleted) {
        saveProgress();
        e.preventDefault();
        e.returnValue = '¿Estás seguro de que quieres salir? Tu progreso se guardará automáticamente.';
        return e.returnValue;
      }
    };

    const handleUnload = () => {
      if (examStarted && !examCompleted) {
        saveProgress();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [examStarted, examCompleted, enabled, autoSaveInterval, saveProgress]);

  // Limpiar al completar el examen
  useEffect(() => {
    if (examCompleted) {
      clearProgress();
    }
  }, [examCompleted, clearProgress]);

  return {
    saveProgress,
    loadProgress,
    clearProgress,
    hasStoredProgress,
    manualSave
  };
};
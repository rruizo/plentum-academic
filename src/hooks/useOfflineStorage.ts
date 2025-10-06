import { useState, useEffect, useCallback } from 'react';
import { ExamQuestion } from '@/services/examService';

export interface PendingSubmission {
  id: string;
  examId: string;
  userId: string;
  sessionId?: string;
  currentAttemptId?: string;
  isAnonymousSession: boolean;
  kioskMode: boolean;
  assignmentId?: string;
  questions: ExamQuestion[];
  answers: any[];
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

const STORAGE_KEY = 'exam_pending_submissions';
const MAX_RETRIES = 5;

export const useOfflineStorage = () => {
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);

  // Cargar datos del localStorage al inicializar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const submissions = JSON.parse(stored);
        setPendingSubmissions(submissions);
        console.log(`[OfflineStorage] Loaded ${submissions.length} pending submissions`);
      }
    } catch (error) {
      console.error('[OfflineStorage] Error loading from localStorage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Guardar en localStorage cuando cambien las submissions pendientes
  const saveToStorage = useCallback((submissions: PendingSubmission[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
      console.log(`[OfflineStorage] Saved ${submissions.length} pending submissions`);
    } catch (error) {
      console.error('[OfflineStorage] Error saving to localStorage:', error);
    }
  }, []);

  // Guardar una nueva submission pendiente
  const savePendingSubmission = useCallback((
    examId: string,
    userId: string,
    questions: ExamQuestion[],
    answers: any[],
    options: {
      sessionId?: string;
      currentAttemptId?: string;
      isAnonymousSession: boolean;
      kioskMode: boolean;
      assignmentId?: string;
    }
  ) => {
    const submission: PendingSubmission = {
      id: `${examId}_${userId}_${Date.now()}`,
      examId,
      userId,
      sessionId: options.sessionId,
      currentAttemptId: options.currentAttemptId,
      isAnonymousSession: options.isAnonymousSession,
      kioskMode: options.kioskMode,
      assignmentId: options.assignmentId,
      questions,
      answers,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: MAX_RETRIES
    };

    const newSubmissions = [...pendingSubmissions, submission];
    setPendingSubmissions(newSubmissions);
    saveToStorage(newSubmissions);
    
    console.log('[OfflineStorage] Saved pending submission:', submission.id);
    return submission.id;
  }, [pendingSubmissions, saveToStorage]);

  // Incrementar contador de reintentos
  const incrementRetryCount = useCallback((submissionId: string) => {
    const updatedSubmissions = pendingSubmissions.map(sub => 
      sub.id === submissionId 
        ? { ...sub, retryCount: sub.retryCount + 1 }
        : sub
    );
    setPendingSubmissions(updatedSubmissions);
    saveToStorage(updatedSubmissions);
  }, [pendingSubmissions, saveToStorage]);

  // Remover submission exitosa
  const removePendingSubmission = useCallback((submissionId: string) => {
    const filteredSubmissions = pendingSubmissions.filter(sub => sub.id !== submissionId);
    setPendingSubmissions(filteredSubmissions);
    saveToStorage(filteredSubmissions);
    console.log('[OfflineStorage] Removed successful submission:', submissionId);
  }, [pendingSubmissions, saveToStorage]);

  // Obtener submissions que se pueden reintentar
  const getRetryableSubmissions = useCallback(() => {
    return pendingSubmissions.filter(sub => sub.retryCount < sub.maxRetries);
  }, [pendingSubmissions]);

  // Limpiar submissions fallidas que excedieron reintentos
  const clearFailedSubmissions = useCallback(() => {
    const validSubmissions = pendingSubmissions.filter(sub => sub.retryCount < sub.maxRetries);
    if (validSubmissions.length !== pendingSubmissions.length) {
      setPendingSubmissions(validSubmissions);
      saveToStorage(validSubmissions);
      console.log('[OfflineStorage] Cleared failed submissions');
    }
  }, [pendingSubmissions, saveToStorage]);

  // Limpiar todas las submissions (para casos de emergencia)
  const clearAllSubmissions = useCallback(() => {
    setPendingSubmissions([]);
    localStorage.removeItem(STORAGE_KEY);
    console.log('[OfflineStorage] Cleared all submissions');
  }, []);

  return {
    pendingSubmissions,
    savePendingSubmission,
    removePendingSubmission,
    incrementRetryCount,
    getRetryableSubmissions,
    clearFailedSubmissions,
    clearAllSubmissions,
    hasPendingSubmissions: pendingSubmissions.length > 0
  };
};
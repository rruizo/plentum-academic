import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  attempt_number: number;
  started_at: string;
  completed_at?: string;
  status: 'started' | 'completed' | 'expired';
  assignment_id: string;
}

export const useExamAttempts = (examId?: string, userId?: string) => {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxAttempts] = useState(999); // Sin límite de intentos - usar contador para tracking solamente

  const fetchAttempts = async () => {
    if (!examId || !userId) return;
    
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Mapear los datos a nuestro formato de intento
      const mappedAttempts: ExamAttempt[] = data?.map((attempt, index) => ({
        id: attempt.id,
        exam_id: attempt.exam_id,
        user_id: attempt.user_id,
        attempt_number: data.length - index, // Número de intento en orden cronológico
        started_at: attempt.started_at,
        completed_at: attempt.completed_at,
        status: attempt.completed_at ? 'completed' : 'started',
        assignment_id: '' // Se debe obtener de exam_assignments si es necesario
      })) || [];
      
      setAttempts(mappedAttempts);
    } catch (error) {
      console.error('Error fetching exam attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewAttempt = async (): Promise<{ success: boolean; attempt?: ExamAttempt; error?: string }> => {
    if (!examId || !userId) {
      return { success: false, error: 'Faltan parámetros requeridos' };
    }

    // Verificar si ya existe un intento completado exitosamente
    const completedAttempt = attempts.find(a => a.status === 'completed');
    if (completedAttempt) {
      return { success: false, error: 'Ya has completado este examen exitosamente' };
    }

    // Verificar si ya hay un intento activo
    const activeAttempt = attempts.find(a => a.status === 'started');
    if (activeAttempt) {
      return { success: false, error: 'Ya tienes un intento activo. Complétalo antes de iniciar uno nuevo' };
    }

    const currentAttemptCount = attempts.length;

    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .insert({
          exam_id: examId,
          user_id: userId,
          questions: [],
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      const newAttempt: ExamAttempt = {
        id: data.id,
        exam_id: data.exam_id,
        user_id: data.user_id,
        attempt_number: currentAttemptCount + 1,
        started_at: data.started_at,
        status: 'started',
        assignment_id: ''
      };

      setAttempts(prev => [newAttempt, ...prev]);
      return { success: true, attempt: newAttempt };
    } catch (error) {
      console.error('Error creating exam attempt:', error);
      return { success: false, error: 'Error al crear el intento de examen' };
    }
  };

  const completeAttempt = async (attemptId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('exam_attempts')
        .update({
          completed_at: new Date().toISOString()
        })
        .eq('id', attemptId);

      if (error) throw error;

      // Actualizar el estado local
      setAttempts(prev => prev.map(attempt => 
        attempt.id === attemptId 
          ? { ...attempt, completed_at: new Date().toISOString(), status: 'completed' as const }
          : attempt
      ));

      return true;
    } catch (error) {
      console.error('Error completing exam attempt:', error);
      return false;
    }
  };

  const canStartNewAttempt = (): boolean => {
    // Ya no hay límite de intentos, pero verificar:
    // 1. No hay intentos activos (started)
    // 2. No hay intentos completados exitosamente
    const completedAttempts = attempts.filter(a => a.status === 'completed');
    const activeAttempts = attempts.filter(a => a.status === 'started');
    
    // Si ya completó exitosamente, no puede volver a intentar
    if (completedAttempts.length > 0) {
      return false;
    }
    
    // Si tiene un intento activo, no puede iniciar otro
    return activeAttempts.length === 0;
  };

  const getAttemptsRemaining = (): number => {
    // Si ya completó exitosamente, no quedan intentos
    const completedAttempts = attempts.filter(a => a.status === 'completed').length;
    if (completedAttempts > 0) {
      return 0;
    }
    
    // Sin límite de intentos, pero mostrar contador para tracking
    return 999;
  };

  const getCurrentAttempt = (): ExamAttempt | null => {
    return attempts.find(a => a.status === 'started') || null;
  };

  useEffect(() => {
    fetchAttempts();
  }, [examId, userId]);

  return {
    attempts,
    loading,
    maxAttempts,
    canStartNewAttempt,
    getAttemptsRemaining,
    getCurrentAttempt,
    createNewAttempt,
    completeAttempt,
    fetchAttempts
  };
};
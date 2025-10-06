import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ExamService, ExamQuestion, ExamData } from '@/services/examService';

export interface UseExamQuestionLoaderReturn {
  exam: ExamData | null;
  questions: ExamQuestion[];
  examType: string;
  loading: boolean;
  loadFromExamId: (examId: string) => Promise<void>;
  loadFromSessionId: (sessionId: string) => Promise<void>;
}

export const useExamQuestionLoader = (): UseExamQuestionLoaderReturn => {
  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [examType, setExamType] = useState<string>('confiabilidad');
  const [loading, setLoading] = useState(true);

  const loadFromSessionId = useCallback(async (sessionId: string) => {
    try {
      setLoading(true);
      console.log('[useExamQuestionLoader] Loading data from session:', sessionId);
      
      const sessionData = await ExamService.fetchSessionById(sessionId);
      console.log('[useExamQuestionLoader] Session data:', sessionData);
      
      if (sessionData.test_type === 'psychometric' && sessionData.psychometric_tests) {
        // Para test psicométrico, crear objeto exam compatible
        const psychoExam = {
          id: sessionData.psychometric_test_id!,
          title: sessionData.psychometric_tests.name,
          description: sessionData.psychometric_tests.description,
          type: 'psicometrico',
          psychometric_test_id: sessionData.psychometric_test_id,
          duracion_minutos: sessionData.psychometric_tests.duration_minutes || 30,
          estado: sessionData.psychometric_tests.is_active ? 'activo' : 'inactivo'
        };
        
        setExam(psychoExam);
        setExamType('psicometrico');
        
        // Cargar preguntas psicométricas directamente
        const psychometricQuestions = await ExamService.fetchPsychometricQuestions();
        console.log('[useExamQuestionLoader] Loaded psychometric questions:', psychometricQuestions.length);
        
        const validQuestions = ExamService.validateQuestions(psychometricQuestions);
        if (validQuestions.length === 0) {
          toast.error('No se pudieron cargar las preguntas psicométricas. Contacte al administrador.');
          return;
        }
        
        setQuestions(validQuestions);
        
      } else if (sessionData.test_type === 'turnover') {
        // Para examen de rotación de personal
        console.log('[useExamQuestionLoader] Loading turnover exam questions');
        
        const turnoverExam = {
          id: sessionId,
          title: 'Examen de Rotación de Personal',
          description: 'Evaluación de factores de riesgo de rotación de personal',
          type: 'turnover',
          duracion_minutos: 30,
          estado: 'activo'
        };
        
        setExam(turnoverExam);
        setExamType('turnover');
        
        // Cargar preguntas de rotación desde turnover_risk_questions
        const { data: turnoverQuestions, error: turnoverError } = await supabase
          .from('turnover_risk_questions')
          .select('*')
          .eq('is_active', true)
          .order('order_index');
        
        if (turnoverError) {
          console.error('[useExamQuestionLoader] Error loading turnover questions:', turnoverError);
          throw turnoverError;
        }
        
        const formattedQuestions = (turnoverQuestions || []).map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          category_id: q.category_id || 'turnover',
          category_name: 'Rotación de Personal',
          weight: q.weight || 1
        }));
        
        console.log('[useExamQuestionLoader] Loaded turnover questions:', formattedQuestions.length);
        
        if (formattedQuestions.length === 0) {
          toast.error('No se pudieron cargar las preguntas de rotación. Contacte al administrador.');
          return;
        }
        
        setQuestions(formattedQuestions);
        
      } else if (sessionData.test_type === 'reliability' && sessionData.exams) {
        setExam(sessionData.exams);
        setExamType(sessionData.exams.type || 'confiabilidad');
        
        // Cargar preguntas de confiabilidad usando examId del session
        const reliabilityQuestions = await ExamService.fetchReliabilityQuestions(sessionData.exam_id);
        console.log('[useExamQuestionLoader] Loaded reliability questions:', reliabilityQuestions.length);
        
        if (reliabilityQuestions.length === 0) {
          toast.error('No se pudieron cargar las preguntas del examen. Verifique que las categorías tengan preguntas válidas.');
          return;
        }
        
        const validQuestions = ExamService.validateQuestions(reliabilityQuestions);
        if (validQuestions.length === 0) {
          toast.error('Todas las preguntas del examen están vacías. Contacte al administrador.');
          return;
        }
        
        const shuffledQuestions = ExamService.shuffleQuestions(validQuestions, true);
        setQuestions(shuffledQuestions);
      }
      
    } catch (error) {
      console.error('[useExamQuestionLoader] Error loading from session:', error);
      toast.error('Error al cargar el examen desde la sesión');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFromExamId = useCallback(async (examId: string) => {
    try {
      setLoading(true);
      console.log('[useExamQuestionLoader] Loading data from examId:', examId);
      
      // Primero validar que el examen esté listo con mejor manejo de errores
      const validation = await ExamService.validateExamReadiness(examId);
      
      if (!validation.isReady) {
        console.error('[useExamQuestionLoader] Exam validation failed:', validation.message);
        
        // Manejar errores de red específicamente
        if (validation.details?.type === 'network_error') {
          throw new Error('Error de conexión al cargar el examen');
        }
        
        toast.error(`Examen no válido: ${validation.message}`, {
          description: 'Contacte al administrador para configurar las categorías y preguntas'
        });
        return;
      }
      
      const examData = await ExamService.fetchExamById(examId);
      setExam(examData);
      setExamType(examData.type || 'confiabilidad');

      let selectedQuestions: ExamQuestion[] = [];

      if (examData.type === 'psicometrico') {
        console.log('[useExamQuestionLoader] Loading psychometric questions for test:', examData.psychometric_test_id);
        selectedQuestions = await ExamService.fetchPsychometricQuestions();
        console.log('[useExamQuestionLoader] Loaded psychometric questions:', selectedQuestions.length);
      } else {
        // Para exámenes de confiabilidad, usar la lógica mejorada
        console.log('[useExamQuestionLoader] Loading reliability questions for exam:', examId);
        selectedQuestions = await ExamService.fetchReliabilityQuestions(examId);
        console.log('[useExamQuestionLoader] Loaded reliability questions:', selectedQuestions.length);
      }

      if (selectedQuestions.length === 0) {
        toast.error('No se pudieron cargar las preguntas del examen. Verifique la configuración.');
        return;
      }

      const validQuestions = ExamService.validateQuestions(selectedQuestions);
      if (validQuestions.length === 0) {
        toast.error('Todas las preguntas del examen están vacías. Contacte al administrador.');
        return;
      }

      const shouldShuffle = examData.type !== 'psicometrico'; // No mezclar preguntas psicométricas
      const finalQuestions = ExamService.shuffleQuestions(validQuestions, shouldShuffle);
      
      console.log('[useExamQuestionLoader] Final questions loaded:', finalQuestions.length);
      setQuestions(finalQuestions);
      
    } catch (error: any) {
      console.error('[useExamQuestionLoader] Error loading from examId:', error);
      
      // Manejar errores específicos de red
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'NetworkError') {
        throw new Error('Error de conexión al cargar el examen. Verifique su conexión a internet.');
      }
      
      // Manejar errores específicos de validación
      if (error.message.includes('categorías configuradas') || 
          error.message.includes('preguntas válidas')) {
        toast.error('Configuración de examen incompleta', {
          description: error.message
        });
      } else {
        toast.error('Error al cargar el examen', {
          description: 'Verifique la configuración del examen o contacte al administrador'
        });
      }
      
      throw error; // Re-throw para que el componente padre pueda manejarlo
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    exam,
    questions,
    examType,
    loading,
    loadFromExamId,
    loadFromSessionId
  };
};
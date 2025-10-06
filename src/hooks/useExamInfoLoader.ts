import { useState, useEffect } from 'react';
import { ExamAccessService } from '@/services/examAccessService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isExamAccessExpired } from '@/utils/examUtils';

interface ExamInfoLoaderProps {
  examId?: string;
  testId?: string;
  sessionId?: string;
  testType: string;
  credentials?: { username?: string; password?: string };
}

export const useExamInfoLoader = ({ examId, testId, sessionId, testType, credentials }: ExamInfoLoaderProps) => {
  const [exam, setExam] = useState<any>(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.log('ExamInfoLoader: Params', { examId, testType, sessionId, testId, hasCredentials: !!credentials?.username });
    
    if (sessionId) {
      fetchSessionInfo();
    } else if (examId || testId) {
      fetchExamInfo();
    } else if (credentials?.username && credentials?.password) {
      // Si tenemos credenciales pero no ID de examen, buscar por credenciales
      fetchExamByCredentials();
    } else {
      setError('No se especificó examen o sesión válida');
    }
  }, [examId, sessionId, testId, testType, credentials?.username, credentials?.password]);

  const fetchSessionInfo = async () => {
    try {
      setIsRetrying(true);
      console.log('Fetching session info for:', sessionId);
      
      const { data: sessionData, error: sessionError } = await ExamAccessService.fetchSessionInfo(sessionId!);

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      if (!sessionData) {
        setError('Sesión no encontrada');
        return;
      }

      console.log('Session data:', sessionData);

      // Verificar tipo de test y estado
      let testInfo = null;
      let isActive = false;

      if (sessionData.test_type === 'psychometric' && sessionData.psychometric_tests) {
        testInfo = {
          title: sessionData.psychometric_tests.name,
          description: sessionData.psychometric_tests.description,
          estado: sessionData.psychometric_tests.is_active ? 'activo' : 'inactivo',
          fecha_cierre: null
        };
        isActive = sessionData.psychometric_tests.is_active;
      } else if (sessionData.test_type === 'reliability' && sessionData.exams) {
        testInfo = sessionData.exams;
        isActive = sessionData.exams.estado === 'activo';
      }

      if (!testInfo) {
        setError('Información del test no encontrada');
        return;
      }

      if (!isActive) {
        setError('Este test no está disponible actualmente');
        return;
      }

      // HYBRID EXPIRATION: Check exam expiration (credentials will be validated separately in ExamAccessService)
      // This is a preliminary check, full hybrid validation happens during credential validation
      if (testInfo.fecha_cierre && new Date(testInfo.fecha_cierre) < new Date()) {
        setError('Este test ha expirado por fecha límite del examen');
        return;
      }

      if (sessionData.status === 'completed') {
        setError('Esta sesión ya ha sido completada');
        return;
      }

      setExam(testInfo);
      setRetryCount(0);

    } catch (error: any) {
      console.error('Error fetching session:', error);
      
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          toast.error(`Error de conexión. Reintentando... (${retryCount + 1}/3)`);
          setTimeout(() => fetchSessionInfo(), 2000);
          return;
        } else {
          setError('Error de conexión. Por favor, verifica tu conexión a internet y recarga la página.');
        }
      } else {
        setError('Sesión no encontrada o no disponible');
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const fetchExamInfo = async () => {
    try {
      setIsRetrying(true);
      const currentExamId = examId || testId;
      if (!currentExamId) {
        setError('ID de examen no válido');
        return;
      }

      const { data: examData, error: examError } = await ExamAccessService.fetchExamInfo(currentExamId, testType);

      if (examError) throw examError;
      
      if (testType === 'psychometric') {
        examData.estado = examData.is_active ? 'activo' : 'inactivo';
        examData.fecha_cierre = null;
      }
      
      if (examData.estado !== 'activo') {
        setError(`Este ${testType === 'psychometric' ? 'test psicométrico' : 'examen'} no está disponible actualmente.`);
        return;
      }

      // HYBRID EXPIRATION: Check exam expiration (credentials will be validated separately in ExamAccessService)
      // This is a preliminary check, full hybrid validation happens during credential validation
      if (examData.fecha_cierre && new Date(examData.fecha_cierre) < new Date()) {
        setError(`Este ${testType === 'psychometric' ? 'test psicométrico' : 'examen'} ha expirado por fecha límite.`);
        return;
      }
      
      setExam(examData);
      setRetryCount(0);
    } catch (error: any) {
      console.error('Error fetching exam:', error);
      
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          toast.error(`Error de conexión. Reintentando... (${retryCount + 1}/3)`);
          setTimeout(() => fetchExamInfo(), 2000);
          return;
        } else {
          setError('Error de conexión. Por favor, verifica tu conexión a internet y recarga la página.');
        }
      } else {
        setError(`${testType === 'psychometric' ? 'Test psicométrico' : 'Examen'} no encontrado o no disponible.`);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const fetchExamByCredentials = async () => {
    try {
      setIsRetrying(true);
      console.log('🔍 Searching exam by credentials:', { username: credentials?.username });
      
      if (!credentials?.username || !credentials?.password) {
        setError('Credenciales incompletas');
        return;
      }

      // Buscar credenciales en la base de datos
      const { data: credentialData, error: credError } = await supabase
        .from('exam_credentials')
        .select(`
          exam_id,
          psychometric_test_id,
          test_type,
          user_email,
          expires_at,
          is_used,
          exams(id, title, description, estado, fecha_cierre, type),
          psychometric_tests(id, name, description, is_active)
        `)
        .eq('username', credentials.username)
        .eq('password_hash', credentials.password)
        .maybeSingle();

      if (credError) {
        console.error('Credential lookup error:', credError);
        throw new Error('Error al buscar credenciales');
      }

      if (!credentialData) {
        setError('Credenciales no encontradas o inválidas');
        return;
      }

      console.log('✅ Found credentials:', credentialData);

      // Determinar qué tipo de examen/test es y construir la información
      let examInfo = null;
      
      if (credentialData.test_type === 'psychometric' && credentialData.psychometric_tests) {
        examInfo = {
          id: credentialData.psychometric_tests.id,
          title: credentialData.psychometric_tests.name,
          description: credentialData.psychometric_tests.description,
          estado: credentialData.psychometric_tests.is_active ? 'activo' : 'inactivo',
          fecha_cierre: null,
          type: 'psychometric'
        };
      } else if (credentialData.exams) {
        examInfo = {
          id: credentialData.exams.id,
          title: credentialData.exams.title,
          description: credentialData.exams.description,
          estado: credentialData.exams.estado,
          fecha_cierre: credentialData.exams.fecha_cierre,
          type: credentialData.exams.type
        };
      }

      if (!examInfo) {
        setError('Información del examen no encontrada');
        return;
      }

      if (examInfo.estado !== 'activo') {
        setError('Este examen no está disponible actualmente');
        return;
      }

      // HYBRID EXPIRATION: Check both exam close date AND credential expiration
      const credentialObj = {
        expires_at: credentialData.expires_at,
        is_used: credentialData.is_used
      };
      
      if (isExamAccessExpired(examInfo, credentialObj)) {
        const examExpired = examInfo.fecha_cierre && new Date(examInfo.fecha_cierre) < new Date();
        const credExpired = credentialObj.expires_at && new Date(credentialObj.expires_at) < new Date();
        
        if (examExpired && credExpired) {
          setError('El examen y las credenciales han expirado');
        } else if (examExpired) {
          setError('Este examen ha cerrado por fecha límite');
        } else {
          setError('Las credenciales han expirado');
        }
        return;
      }

      console.log('✅ Exam found by credentials:', examInfo);
      setExam(examInfo);
      setRetryCount(0);

    } catch (error: any) {
      console.error('Error fetching exam by credentials:', error);
      
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          toast.error(`Error de conexión. Reintentando... (${retryCount + 1}/3)`);
          setTimeout(() => fetchExamByCredentials(), 2000);
          return;
        } else {
          setError('Error de conexión. Por favor, verifica tu conexión a internet y recarga la página.');
        }
      } else {
        setError('No se pudo encontrar el examen con estas credenciales');
      }
    } finally {
      setIsRetrying(false);
    }
  };

  return {
    exam,
    error,
    isRetrying,
    retryCount
  };
};
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
}

export const useExamAccessDiagnostics = () => {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addDiagnostic = (diagnostic: DiagnosticResult) => {
    setDiagnostics(prev => [...prev, diagnostic]);
    console.log(`[DIAGNOSTIC] ${diagnostic.step}:`, diagnostic);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);

    try {
      // 1. Verificar parámetros de URL
      const sessionId = searchParams.get('session');
      const testType = searchParams.get('type') || 'reliability';
      const testId = searchParams.get('test');

      addDiagnostic({
        step: 'URL Parameters',
        status: 'info',
        message: 'Parámetros de URL analizados',
        details: { examId, sessionId, testType, testId }
      });

      // 2. Verificar conexión con Supabase
      try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error) throw error;
        
        addDiagnostic({
          step: 'Database Connection',
          status: 'success',
          message: 'Conexión con la base de datos exitosa'
        });
      } catch (error: any) {
        addDiagnostic({
          step: 'Database Connection',
          status: 'error',
          message: 'Error de conexión con la base de datos',
          details: error.message
        });
      }

      // 3. Verificar acceso por sesión
      if (sessionId) {
        try {
          const { data: sessionData, error: sessionError } = await supabase
            .from('exam_sessions')
            .select(`
              *,
              exams (title, description, estado, fecha_cierre),
              psychometric_tests (name, description, is_active)
            `)
            .eq('id', sessionId)
            .single();

          if (sessionError) throw sessionError;

          addDiagnostic({
            step: 'Session Validation',
            status: 'success',
            message: `Sesión encontrada: ${sessionData.test_type}`,
            details: sessionData
          });

          // Verificar estado de la sesión
          if (sessionData.status === 'completed') {
            addDiagnostic({
              step: 'Session Status',
              status: 'warning',
              message: 'La sesión ya ha sido completada'
            });
          } else {
            addDiagnostic({
              step: 'Session Status',
              status: 'success',
              message: `Estado de sesión: ${sessionData.status}`
            });
          }

        } catch (error: any) {
          addDiagnostic({
            step: 'Session Validation',
            status: 'error',
            message: 'Error al validar la sesión',
            details: error.message
          });
        }
      }

      // 4. Verificar acceso directo por examen
      if (examId || testId) {
        const currentExamId = examId || testId;
        
        try {
          let examData;
          if (testType === 'psychometric') {
            const { data, error } = await supabase
              .from('psychometric_tests')
              .select('name, description, is_active')
              .eq('id', currentExamId)
              .single();
            
            if (error) throw error;
            if (data) {
              examData = {
                title: data.name,
                description: data.description,
                is_active: data.is_active
              };
            } else {
              examData = null;
            }
          } else {
            const { data, error } = await supabase
              .from('exams')
              .select('title, description, estado, fecha_cierre')
              .eq('id', currentExamId)
              .single();
              
            if (error) throw error;
            examData = data;
          }

          addDiagnostic({
            step: 'Exam Validation',
            status: 'success',
            message: `${testType === 'psychometric' ? 'Test psicométrico' : 'Examen'} encontrado: ${examData.title}`,
            details: examData
          });

          // Verificar estado del examen
          const isActive = testType === 'psychometric' ? examData.is_active : examData.estado === 'activo';
          
          if (!isActive) {
            addDiagnostic({
              step: 'Exam Status',
              status: 'warning',
              message: `${testType === 'psychometric' ? 'Test psicométrico' : 'Examen'} no está activo`
            });
          } else {
            addDiagnostic({
              step: 'Exam Status',
              status: 'success',
              message: `${testType === 'psychometric' ? 'Test psicométrico' : 'Examen'} está activo`
            });
          }

        } catch (error: any) {
          addDiagnostic({
            step: 'Exam Validation',
            status: 'error',
            message: `Error al validar ${testType === 'psychometric' ? 'el test psicométrico' : 'el examen'}`,
            details: error.message
          });
        }
      }

      // 5. Verificar configuración de credenciales (si no es acceso por sesión)
      if (!sessionId && (examId || testId)) {
        try {
          const currentExamId = examId || testId;
          let credentialQuery = supabase
            .from('exam_credentials')
            .select('count');

          if (testType === 'psychometric') {
            credentialQuery = credentialQuery.eq('psychometric_test_id', currentExamId);
          } else {
            credentialQuery = credentialQuery.eq('exam_id', currentExamId);
          }

          const { data, error } = await credentialQuery;
          if (error) throw error;

          if (data && data.length > 0) {
            addDiagnostic({
              step: 'Credentials Setup',
              status: 'success',
              message: 'Credenciales configuradas para este examen'
            });
          } else {
            addDiagnostic({
              step: 'Credentials Setup',
              status: 'warning',
              message: 'No se encontraron credenciales para este examen'
            });
          }

        } catch (error: any) {
          addDiagnostic({
            step: 'Credentials Setup',
            status: 'error',
            message: 'Error al verificar credenciales',
            details: error.message
          });
        }
      }

      // 6. Verificar estado de componentes React
      addDiagnostic({
        step: 'Component State',
        status: 'info',
        message: 'Verificando estado de componentes React',
        details: {
          hasExamId: !!examId,
          hasSessionId: !!sessionId,
          testType,
          currentUrl: window.location.href
        }
      });

    } catch (error: any) {
      addDiagnostic({
        step: 'General Error',
        status: 'error',
        message: 'Error general durante diagnósticos',
        details: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-ejecutar diagnósticos al cargar
  useEffect(() => {
    if (examId || searchParams.get('session')) {
      runDiagnostics();
    }
  }, [examId, searchParams]);

  const getErrorCount = () => diagnostics.filter(d => d.status === 'error').length;
  const getWarningCount = () => diagnostics.filter(d => d.status === 'warning').length;
  
  const showDiagnosticsToast = () => {
    const errors = getErrorCount();
    const warnings = getWarningCount();
    
    if (errors > 0) {
      toast.error(`Diagnósticos completados: ${errors} errores, ${warnings} advertencias`);
    } else if (warnings > 0) {
      toast.warning(`Diagnósticos completados: ${warnings} advertencias`);
    } else {
      toast.success('Diagnósticos completados: Sin problemas detectados');
    }
  };

  return {
    diagnostics,
    isRunning,
    runDiagnostics,
    getErrorCount,
    getWarningCount,
    showDiagnosticsToast
  };
};
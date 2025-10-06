import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { ExamAccessService } from '@/services/examAccessService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExamAuthenticationProps {
  examId?: string;
  testId?: string;
  testType: string;
  preloadCredentials?: { username?: string | null; password?: string | null };
}

export const useExamAuthentication = ({ examId, testId, testType, preloadCredentials }: ExamAuthenticationProps) => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [credentials, setCredentials] = useState({ 
    username: preloadCredentials?.username || '', 
    password: preloadCredentials?.password || '' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [assignment, setAssignment] = useState<any>(null);

  // Si el usuario ya está logueado, considerarlo autenticado automáticamente
  useEffect(() => {
    if (user) {
      setAuthenticated(true);
    }
  }, [user]);

  // Si tenemos credenciales precargadas de URL, intentar autenticación automática
  useEffect(() => {
    if (preloadCredentials?.username && preloadCredentials?.password && !authenticated && !user) {
      handleAutoLogin();
    }
  }, [preloadCredentials, authenticated, user]);

  const handleAutoLogin = async () => {
    if (!preloadCredentials?.username || !preloadCredentials?.password) return;
    
    setLoading(true);
    
    try {
      console.log('🔄 Attempting auto-login with URL credentials');
      
      // Primero intentar validar credenciales específicas del examen
      const actualExamId = examId || testId;
      if (actualExamId && testType) {
        const result = await ExamAccessService.validateCredentials(
          preloadCredentials.username, 
          actualExamId, 
          testType
        );

        if (result.data && !result.error) {
          console.log('✅ Exam-specific credentials validated');
          setAuthenticated(true);
          if (result.data.id) {
            await ExamAccessService.markCredentialsAsUsed(result.data.id);
          }
          return;
        }
      }

      // Si no funcionan las credenciales de examen, intentar login normal
      const { error } = await signIn(preloadCredentials.username, preloadCredentials.password);
      
      if (!error) {
        console.log('✅ Normal user authentication successful');
        setAuthenticated(true);
        toast.success('Acceso autorizado');
      } else {
        console.log('❌ Auto-login failed, user will need to manually login');
      }
      
    } catch (error: any) {
      console.error('💥 Auto-login error:', error);
      // No mostrar toast de error aquí, dejar que el usuario intente manualmente
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 Manual authentication attempt:', { 
        username: credentials.username,
        password: credentials.password ? '***' : 'empty'
      });

      // Validación básica de credenciales
      if (!credentials.username.trim() || !credentials.password.trim()) {
        toast.error('Por favor ingrese su usuario y contraseña');
        setLoading(false);
        return;
      }

      // Verificar si las credenciales existen pero no tienen exam_id (deben ir al portal de estudiantes)
      // NOTA: Para test_type='turnover', exam_id es NULL por diseño, así que no redirigir
      const { data: credentialCheck } = await supabase
        .from('exam_credentials')
        .select('exam_id, psychometric_test_id, test_type, username, password_hash')
        .eq('username', credentials.username)
        .eq('password_hash', credentials.password)
        .maybeSingle();

      if (credentialCheck && 
          !credentialCheck.exam_id && 
          !credentialCheck.psychometric_test_id && 
          credentialCheck.test_type !== 'turnover') {
        console.log('⚠️ Credentials valid but no exam assigned - redirecting to student portal');
        toast.info('Por favor inicie sesión en el portal de estudiantes');
        setTimeout(() => {
          navigate('/estudiante');
        }, 1500);
        setLoading(false);
        return;
      }

      // Primero intentar validar credenciales específicas del examen
      const actualExamId = examId || testId;
      if (actualExamId && testType) {
        try {
          const result = await ExamAccessService.validateCredentials(
            credentials.username, 
            actualExamId, 
            testType
          );

          if (result.data && !result.error) {
            console.log('✅ Exam-specific credentials validated');
            setAuthenticated(true);
            toast.success('Acceso autorizado al examen');
            
            if (result.data.id) {
              await ExamAccessService.markCredentialsAsUsed(result.data.id);
            }
            
            if (result.data.user_id) {
              const assignmentResult = await ExamAccessService.validateAssignment(
                result.data.user_id, 
                actualExamId, 
                testType
              );
              
              if (assignmentResult.data) {
                setAssignment(assignmentResult.data);
              }
            }
            
            setLoading(false);
            return;
          }
        } catch (examError) {
          console.log('⚠️ Exam credential validation failed, trying normal login');
        }
      }

      // Si las credenciales de examen no funcionan, intentar login normal de usuario
      console.log('🔑 Attempting normal user login...');
      const { error } = await signIn(credentials.username, credentials.password);

      if (error) {
        console.error('❌ Authentication failed:', error);
        toast.error('Credenciales incorrectas');
        setLoading(false);
        return;
      }

      // Si llegamos aquí, la autenticación fue exitosa
      console.log('✅ Normal user authentication successful');
      setAuthenticated(true);
      toast.success('Autenticación exitosa');
      
    } catch (error: any) {
      console.error('💥 Error during login:', error);
      toast.error(error.message || 'Error al validar credenciales');
    } finally {
      setLoading(false);
    }
  };

  const handleExamComplete = async () => {
    try {
      toast.success(`${testType === 'psychometric' ? 'Test psicométrico' : 'Evaluación'} completada exitosamente`);
      
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error) {
      console.error('Error completing exam:', error);
      toast.error(`Error al finalizar ${testType === 'psychometric' ? 'el test psicométrico' : 'la evaluación'}`);
    }
  };

  return {
    credentials,
    setCredentials,
    showPassword,
    setShowPassword,
    loading,
    authenticated,
    assignment,
    handleLogin,
    handleExamComplete
  };
};
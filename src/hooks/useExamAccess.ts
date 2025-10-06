import React from 'react';
import { useParams } from 'react-router-dom';
import { useExamInfoLoader } from './useExamInfoLoader';
import { useExamAuthentication } from './useExamAuthentication';

export const useExamAccess = () => {
  const { examId } = useParams();
  
  // Obtener parámetros de URL para determinar el tipo de test
  const urlParams = new URLSearchParams(window.location.search);
  const testType = urlParams.get('type') || 'reliability'; // Default a reliability
  const sessionId = urlParams.get('session');
  const testId = urlParams.get('test');
  
  // Obtener credenciales de URL parameters para precarga
  const urlUsername = urlParams.get('username')?.trim();
  const urlPassword = urlParams.get('password')?.trim();
  
  // Logging para debugging de URL params
  React.useEffect(() => {
    console.log('🔗 ExamAccess URL Analysis:', { 
      examId,
      sessionId,
      testId,
      testType,
      hasUsername: !!urlUsername,
      hasPassword: !!urlPassword,
      fullUrl: window.location.href 
    });
  }, [examId, sessionId, testId, testType, urlUsername, urlPassword]);

  // Hook para cargar información del examen
  const { exam, error, isRetrying, retryCount } = useExamInfoLoader({
    examId,
    testId,
    sessionId,
    testType,
    credentials: { username: urlUsername, password: urlPassword } // Pasar credenciales para buscar examen
  });

  // Hook para autenticación
  const {
    credentials,
    setCredentials,
    showPassword,
    setShowPassword,
    loading,
    authenticated: authAuthenticated,
    assignment,
    handleLogin,
    handleExamComplete
  } = useExamAuthentication({
    examId,
    testId,
    testType,
    preloadCredentials: { username: urlUsername, password: urlPassword }
  });

  // Para acceso por sesión, consideramos automáticamente autenticado si hay exam
  // Para acceso por credenciales, necesitamos autenticar normalmente
  // PERO si tenemos credenciales en URL y encontramos el examen, también consideramos autenticado
  const authenticated = sessionId ? !!exam : (authAuthenticated || (!!exam && !!urlUsername && !!urlPassword));

  // Si encontramos el examen por credenciales pero no tenemos examId, usarlo
  const finalExamId = examId || testId || (exam?.id);

  return {
    examId: finalExamId,
    testType,
    sessionId,
    credentials,
    setCredentials,
    showPassword,
    setShowPassword,
    loading,
    authenticated,
    exam,
    assignment,
    error,
    handleLogin,
    handleExamComplete,
    isRetrying,
    retryCount
  };
};
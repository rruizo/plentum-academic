
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RefactoredExamInterface from '@/components/exam/RefactoredExamInterface';
import { useExamAccess } from '@/hooks/useExamAccess';
import LoginForm from '@/components/exam-access/LoginForm';
import ErrorDisplay from '@/components/exam-access/ErrorDisplay';
import NetworkStatusIndicator from '@/components/exam-access/NetworkStatusIndicator';
import DetailedErrorDisplay from '@/components/exam-access/DetailedErrorDisplay';
import { DiagnosticsPanel } from '@/components/exam-access/DiagnosticsPanel';
import { examLogger } from '@/utils/examAccessLogger';

const ExamAccess = () => {
  const navigate = useNavigate();
  const {
    examId,
    testType,
    sessionId,
    credentials,
    setCredentials,
    showPassword,
    setShowPassword,
    loading,
    authenticated,
    exam,
    error,
    handleLogin,
    handleExamComplete,
    isRetrying,
    retryCount
  } = useExamAccess();

  // Log inicial para debugging
  React.useEffect(() => {
    console.log('ExamAccess - Initial params:', { 
      examId, 
      sessionId, 
      testType, 
      authenticated, 
      exam: !!exam,
      error,
      loading 
    });
    examLogger.logSessionAccess(sessionId || examId || 'unknown', testType);
  }, [sessionId, examId, testType, authenticated, exam, error, loading]);

  const handleRetry = () => {
    window.location.reload();
  };

  if (error) {
    return (
      <DetailedErrorDisplay 
        error={error} 
        testType={testType}
        retryCount={retryCount}
        isRetrying={isRetrying}
        onNavigateHome={() => navigate('/')}
        onRetry={handleRetry}
      />
    );
  }

  if (authenticated && (examId || sessionId)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <RefactoredExamInterface 
          examId={examId} 
          sessionId={sessionId}
          onComplete={handleExamComplete}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        {/* Panel de diagnósticos */}
        <DiagnosticsPanel />
        
        {/* Formulario principal */}
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              {testType === 'psychometric' ? (
                <>🧠 Acceso a Test Psicométrico</>
              ) : (
                <>🎯 Acceso a Evaluación</>
              )}
            </CardTitle>
            <CardDescription>
              {exam ? `${exam.title}` : `Cargando información del ${testType === 'psychometric' ? 'test psicométrico' : 'examen'}...`}
            </CardDescription>
            {sessionId && (
              <p className="text-xs text-muted-foreground">
                Sesión: {sessionId.substring(0, 8)}...
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <NetworkStatusIndicator 
              isRetrying={isRetrying}
              retryCount={retryCount}
              error={error}
            />
            
            <LoginForm 
              credentials={credentials}
              setCredentials={setCredentials}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              loading={loading}
              error={error}
              onSubmit={handleLogin}
              isRetrying={isRetrying}
              retryCount={retryCount}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExamAccess;

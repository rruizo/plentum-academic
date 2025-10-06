import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useExamSession } from '@/hooks/useExamSession';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import RefactoredExamInterface from '@/components/exam/RefactoredExamInterface';
import PsychometricTestTaking from '@/components/PsychometricTestTaking';

const ExamSession = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  console.log(`[ExamSession] ===== COMPONENT RENDER ===== sessionId:`, sessionId);
  console.log(`[ExamSession] Current URL:`, window.location.href);
  console.log(`[ExamSession] Current pathname:`, window.location.pathname);
  
  const { session, loading, error, validateSession, startSession } = useExamSession(sessionId);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; message?: string } | null>(null);
  const [startingSession, setStartingSession] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  console.log(`[ExamSession] ===== STATE DEBUG =====`);
  console.log(`[ExamSession] sessionId:`, sessionId);
  console.log(`[ExamSession] loading:`, loading);
  console.log(`[ExamSession] error:`, error);
  console.log(`[ExamSession] session:`, session);
  console.log(`[ExamSession] user:`, user?.email || 'NO USER');
  console.log(`[ExamSession] examStarted:`, examStarted);
  console.log(`[ExamSession] validationResult:`, validationResult);

  // Log authentication state but DON'T redirect automatically
  // Student should already be authenticated via StudentPortal
  useEffect(() => {
    if (!loading) {
      if (user) {
        console.log('[ExamSession] User authenticated:', user.email);
      } else {
        console.warn('[ExamSession] No authenticated user - exam may not load correctly');
      }
    }
  }, [user, loading]);

  useEffect(() => {
    console.log(`[ExamSession] Session data updated:`, session);
    if (session) {
      console.log(`[ExamSession] Session exam_id:`, session.exam_id);
      console.log(`[ExamSession] Session psychometric_test_id:`, session.psychometric_test_id);
      console.log(`[ExamSession] Session test_type:`, session.test_type);
      console.log(`[ExamSession] Session exam data:`, session.exam);
      
      const result = validateSession(session);
      console.log(`[ExamSession] Validation result:`, result);
      setValidationResult(result);
      
      // Check if session is already started AND has real attempts taken
      console.log(`[ExamSession] SESSION STATUS CHECK:`, {
        status: session.status,
        attempts_taken: session.attempts_taken,
        condition1: session.status === 'started',
        condition2: session.attempts_taken > 0,
        bothConditions: session.status === 'started' && session.attempts_taken > 0
      });
      
      // Solo setear examStarted = true si hay intentos reales tomados
      if (session.status === 'started' && session.attempts_taken > 0) {
        console.log(`[ExamSession] Session already started with real attempts, setting examStarted to true`);
        setExamStarted(true);
      } else {
        console.log(`[ExamSession] Session not yet started or no attempts taken - keeping examStarted false until user clicks start`);
        // No setear automáticamente examStarted = true hasta que el usuario haga click
      }
    }
  }, [session]);

  const handleStartExam = async () => {
    if (!sessionId) return;
    
    console.log('[ExamSession] Starting exam, sessionId:', sessionId);
    setStartingSession(true);
    
    const result = await startSession(sessionId);
    
    if (result.success) {
      console.log('[ExamSession] Session started successfully, setting examStarted to true');
      setExamStarted(true);
    } else {
      console.error('[ExamSession] Error starting session:', result.error);
      alert('Error al iniciar el examen: ' + result.error);
    }
    setStartingSession(false);
  };

  const handleExamComplete = () => {
    // Para evaluados, mostrar mensaje de completado sin navegación
    alert('¡Examen completado exitosamente! Puedes cerrar esta ventana.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Cargando sesión de examen...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Sesión No Encontrada</CardTitle>
            <CardDescription>
              {error || 'La sesión de examen solicitada no existe o no es válida.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/student-portal')} 
              className="w-full"
            >
              Volver al Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationResult && !validationResult.isValid) {
    const getStatusIcon = () => {
      if (session.status === 'completed') return <CheckCircle className="w-6 h-6 text-green-600" />;
      if (session.status === 'expired' || session.status === 'attempt_limit_reached') return <XCircle className="w-6 h-6 text-destructive" />;
      return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    };

    const getStatusColor = () => {
      if (session.status === 'completed') return 'text-green-600';
      if (session.status === 'expired' || session.status === 'attempt_limit_reached') return 'text-destructive';
      return 'text-yellow-600';
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              {getStatusIcon()}
            </div>
            <CardTitle className={getStatusColor()}>
              {session.status === 'completed' && 'Examen Completado'}
              {session.status === 'expired' && 'Sesión Expirada'}
              {session.status === 'attempt_limit_reached' && 'Intentos Agotados'}
              {!['completed', 'expired', 'attempt_limit_reached'].includes(session.status) && 'Acceso Restringido'}
            </CardTitle>
            <CardDescription>
              {validationResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Información del Examen:</h4>
              <p className="text-sm text-muted-foreground mb-1">
                <strong>Título:</strong> {session.exam?.title || 'Test Psicométrico'}
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                <strong>Intentos utilizados:</strong> {session.attempts_taken} de {session.max_attempts}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Estado:</strong> {session.status}
              </p>
            </div>
            <Button 
              onClick={() => window.close()} 
              className="w-full"
              variant="outline"
            >
              Cerrar Ventana
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Para tests psicométricos válidos
  if (validationResult && validationResult.isValid && session.test_type === 'psychometric') {
    // Para tests psicométricos, exam_id será null y psychometric_test_id tendrá valor
    if (!session.exam_id && !session.psychometric_test_id) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-4" />
                <p className="text-destructive">Faltan parámetros requeridos</p>
                <p className="text-sm text-muted-foreground mt-2">No se pudo cargar la información del examen</p>
                <Button 
                  onClick={() => window.close()} 
                  className="mt-4"
                  variant="outline"
                >
                  Cerrar Ventana
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Si ya está iniciado (examStarted), mostrar directamente el componente psicométrico
    if (examStarted) {
      console.log('[ExamSession] Rendering PsychometricTestTaking for started psychometric test');
      
      return (
        <div className="min-h-screen bg-background p-4">
          <PsychometricTestTaking 
            onComplete={handleExamComplete}
            onBack={() => window.close()}
            sessionId={sessionId}
          />
        </div>
      );
    }

    // Para tests psicométricos no iniciados, mostrar pantalla de bienvenida
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Bienvenido al Test Psicométrico</CardTitle>
            <CardDescription>
              Estás a punto de comenzar: <strong>Test de Personalidad OCEAN (Big Five)</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  <strong>Duración:</strong> 30 minutos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">
                  <strong>Intentos disponibles:</strong> {Math.max(0, session.max_attempts - session.attempts_taken)} de {session.max_attempts}
                </span>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Una vez que inicies el test, el tiempo comenzará a correr. Asegúrate de tener una conexión estable a internet.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button 
                onClick={handleStartExam}
                disabled={startingSession}
                className="w-full"
                size="lg"
              >
                {startingSession ? 'Iniciando...' : 'Comenzar Test Psicométrico'}
              </Button>
              
              <Button 
                onClick={() => window.close()} 
                variant="outline"
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examStarted) {
    console.log('[ExamSession] Exam started, rendering interface');
    
    // Para tests psicométricos, usar el componente específico
    if (session.test_type === 'psychometric') {
      console.log('[ExamSession] Rendering PsychometricTestTaking for psychometric test');
      
      if (!session.psychometric_test_id) {
        console.error('[ExamSession] No psychometric_test_id found');
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-4" />
                  <p className="text-destructive">Error de configuración</p>
                  <p className="text-sm text-muted-foreground mt-2">ID del test psicométrico no encontrado</p>
                  <Button 
                    onClick={() => window.close()} 
                    className="mt-4"
                    variant="outline"
                  >
                    Cerrar Ventana
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-background p-4">
          <PsychometricTestTaking 
            onComplete={handleExamComplete}
            onBack={() => window.close()}
            sessionId={sessionId}
          />
        </div>
      );
    } else if (session.test_type === 'turnover') {
      // Para exámenes de rotación (sin exam_id, solo sessionId)
      console.log('[ExamSession] Rendering interface for turnover exam');
      
      return (
        <div className="min-h-screen bg-background">
          <RefactoredExamInterface 
            examId={sessionId || 'turnover'} // Usar sessionId como fallback
            onComplete={handleExamComplete}
            sessionId={sessionId}
          />
        </div>
      );
    } else {
      // Para exámenes de confiabilidad, usar SimplifiedExamInterface
      console.log('[ExamSession] Rendering SimplifiedExamInterface for reliability exam');
      
      if (!session.exam_id) {
        console.error('[ExamSession] No exam_id found for reliability exam');
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-4" />
                  <p className="text-destructive">Error de configuración</p>
                  <p className="text-sm text-muted-foreground mt-2">ID del examen no encontrado</p>
                  <Button 
                    onClick={() => window.close()} 
                    className="mt-4"
                    variant="outline"
                  >
                    Cerrar Ventana
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
      
      return (
        <div className="min-h-screen bg-background">
          <RefactoredExamInterface 
            examId={session.exam_id} 
            onComplete={handleExamComplete}
            sessionId={sessionId}
          />
        </div>
      );
    }
  }

  // Show exam start screen para exámenes regulares
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bienvenido al Examen</CardTitle>
          <CardDescription>
            Estás a punto de comenzar: <strong>{session.exam?.title || 'Test Psicométrico'}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                <strong>Duración:</strong> {session.exam?.duracion_minutos || 30} minutos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                <strong>Intentos disponibles:</strong> {
                  session.status === 'completed' ? 0 : Math.max(0, session.max_attempts - session.attempts_taken)
                } de {session.max_attempts}
              </span>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Una vez que inicies el examen, el tiempo comenzará a correr. Asegúrate de tener una conexión estable a internet.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button 
              onClick={handleStartExam}
              disabled={startingSession}
              className="w-full"
              size="lg"
            >
              {startingSession ? 'Iniciando...' : 'Comenzar Examen'}
            </Button>
            
            <Button 
              onClick={() => window.close()} 
              variant="outline"
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamSession;
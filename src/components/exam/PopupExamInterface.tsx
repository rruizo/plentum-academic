import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, ArrowLeft, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useExamAttempts } from '@/hooks/useExamAttempts';
import { toast } from 'sonner';

interface PopupExamInterfaceProps {
  examId: string;
  userId: string;
  examTitle: string;
  duration: number; // en minutos
  questions: any[];
  onComplete: (results: any) => void;
  onExit: () => void;
}

interface Answer {
  questionId: string;
  answer: string;
}

const PopupExamInterface = ({ 
  examId, 
  userId, 
  examTitle, 
  duration, 
  questions,
  onComplete,
  onExit 
}: PopupExamInterfaceProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(duration * 60); // convertir a segundos
  const [examStarted, setExamStarted] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string>('');
  
  const {
    canStartNewAttempt,
    getAttemptsRemaining,
    getCurrentAttempt,
    createNewAttempt,
    completeAttempt
  } = useExamAttempts(examId, userId);

  // Timer effect
  useEffect(() => {
    if (!examStarted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitExam(); // Auto-submit cuando se acaba el tiempo
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStarted, timeRemaining]);

  // Formatear tiempo
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartExam = async () => {
    if (!canStartNewAttempt()) {
      toast.error('No puedes iniciar más intentos para este examen');
      return;
    }

    const result = await createNewAttempt();
    if (result.success && result.attempt) {
      setCurrentAttemptId(result.attempt.id);
      setExamStarted(true);
      toast.success('Examen iniciado. ¡Responde con honestidad!');
    } else {
      toast.error(result.error || 'Error al iniciar el examen');
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, answer } : a);
      }
      return [...prev, { questionId, answer }];
    });
  };

  const getCurrentAnswer = (questionId: string): string => {
    return answers.find(a => a.questionId === questionId)?.answer || '';
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitExam = async () => {
    if (!currentAttemptId) return;

    try {
      const success = await completeAttempt(currentAttemptId);
      if (success) {
        const results = {
          attemptId: currentAttemptId,
          answers,
          timeSpent: (duration * 60) - timeRemaining,
          completed: true
        };
        toast.success('Examen completado exitosamente');
        onComplete(results);
      } else {
        toast.error('Error al completar el examen');
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error('Error al enviar el examen');
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = answers.length;
  const attemptsRemaining = getAttemptsRemaining();

  // Pantalla de bienvenida/inicio
  if (!examStarted) {
    const currentAttempt = getCurrentAttempt();
    
    if (currentAttempt) {
      // Continuar examen existente
      return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle className="text-center">Continuar Examen</CardTitle>
              <CardDescription className="text-center">
                Tienes un examen en progreso para: {examTitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Examen en Progreso
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Puedes continuar desde donde lo dejaste
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setExamStarted(true)} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Continuar Examen
                </Button>
                <Button onClick={onExit} variant="outline">
                  Salir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!canStartNewAttempt()) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Intentos Agotados</CardTitle>
              <CardDescription className="text-center">
                Has utilizado todos los intentos disponibles para este examen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
                <Badge variant="destructive">
                  0 intentos restantes
                </Badge>
                <p className="text-sm text-muted-foreground">
                  No puedes realizar más intentos de este examen
                </p>
              </div>
              
              <div className="flex justify-center">
                <Button onClick={onExit} variant="outline">
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader>
            <CardTitle className="text-center">{examTitle}</CardTitle>
            <CardDescription className="text-center">
              Evaluación de Confiabilidad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{questions.length}</div>
                <div className="text-sm text-muted-foreground">Preguntas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{duration}</div>
                <div className="text-sm text-muted-foreground">Minutos</div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {attemptsRemaining} intentos restantes
              </Badge>
              <p className="text-sm text-muted-foreground">
                Una vez iniciado, el examen debe completarse en el tiempo límite
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={handleStartExam} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Iniciar Examen
              </Button>
              <Button onClick={onExit} variant="outline">
                Salir
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla principal del examen
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header con timer y progreso */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h1 className="text-lg font-semibold">{examTitle}</h1>
                <p className="text-sm text-muted-foreground">Evaluación de Confiabilidad</p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-xl font-mono font-bold text-primary">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pregunta {currentQuestionIndex + 1} de {questions.length}</span>
                <span>Respondidas: {answeredCount}/{questions.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {currentQuestion && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    {currentQuestion.question_text || currentQuestion.texto_pregunta}
                  </CardTitle>
                  {currentQuestion.category_name && (
                    <Badge variant="outline" className="w-fit">
                      {currentQuestion.category_name}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={getCurrentAnswer(currentQuestion.id)}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    className="space-y-4"
                  >
                    {currentQuestion.opciones_respuesta_fijas?.map((option: string, index: number) => (
                      <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-base">
                          {option}
                        </Label>
                      </div>
                    )) || (
                      ['Nunca', 'Rara vez', 'A veces', 'Frecuentemente'].map((option, index) => (
                        <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-base">
                            {option}
                          </Label>
                        </div>
                      ))
                    )}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Navegación */}
            <div className="flex justify-between items-center mt-8">
              <Button 
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              <div className="flex gap-2">
                {questions.map((_, index) => (
                  <Button
                    key={index}
                    variant={index === currentQuestionIndex ? "default" : "outline"}
                    size="sm"
                    className={`w-10 h-10 ${answers.find(a => a.questionId === questions[index]?.id) ? 'bg-green-100 hover:bg-green-200' : ''}`}
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button 
                  onClick={handleSubmitExam}
                  disabled={answeredCount !== questions.length}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar Examen
                </Button>
              ) : (
                <Button 
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupExamInterface;
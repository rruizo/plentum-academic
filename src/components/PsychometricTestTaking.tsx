
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePsychometricOfflineSubmission } from '@/hooks/usePsychometricOfflineSubmission';
import OfflineSubmissionManager from './exam/OfflineSubmissionManager';

interface PersonalityQuestion {
  id: string;
  question_text: string;
  ocean_factor: string;
  score_orientation: string;
  likert_scale: any;
  order_index: number;
}

interface PersonalityResponse {
  questionId: string;
  responseValue: number;
}

interface PsychometricTestTakingProps {
  onComplete: (sessionId: string) => void;
  onBack?: () => void;
  sessionId?: string;
}

const PsychometricTestTaking = ({ onComplete, onBack, sessionId: propSessionId }: PsychometricTestTakingProps) => {
  const [questions, setQuestions] = useState<PersonalityQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<PersonalityResponse[]>([]);
  const [sessionId] = useState(() => propSessionId || crypto.randomUUID());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Hook para manejo offline
  const { submitPsychometricTest } = usePsychometricOfflineSubmission(sessionId, propSessionId);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('personality_questions')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      setQuestions((data || []).map(q => ({
        ...q,
        likert_scale: Array.isArray(q.likert_scale) ? q.likert_scale : JSON.parse(q.likert_scale as string)
      })));
    } catch (error) {
      console.error('Error al cargar preguntas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las preguntas. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentResponse = (): number | undefined => {
    const currentQuestion = questions[currentQuestionIndex];
    const response = responses.find(r => r.questionId === currentQuestion?.id);
    return response?.responseValue;
  };

  const handleResponseChange = (value: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    const responseValue = parseInt(value);
    
    setResponses(prev => {
      const filtered = prev.filter(r => r.questionId !== currentQuestion.id);
      return [...filtered, { questionId: currentQuestion.id, responseValue }];
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateScores = () => {
    const scores = {
      apertura: 0,
      responsabilidad: 0,
      extraversion: 0,
      amabilidad: 0,
      neuroticismo: 0
    };

    const counts = {
      apertura: 0,
      responsabilidad: 0,
      extraversion: 0,
      amabilidad: 0,
      neuroticismo: 0
    };

    responses.forEach(response => {
      const question = questions.find(q => q.id === response.questionId);
      if (!question) return;

      const factor = question.ocean_factor as keyof typeof scores;
      if (!scores.hasOwnProperty(factor)) return;

      let score = response.responseValue;
      // Aplicar inversión para ítems con orientación negativa: 1↔5, 2↔4, 3↔3, 4↔2, 5↔1
      if (question.score_orientation === 'negative') {
        score = 6 - score; // Conversión 1-5 a 5-1
      }

      scores[factor] += score;
      counts[factor]++;
    });

    // Calcular promedios y normalizar a escala 0-100
    Object.keys(scores).forEach(factor => {
      const f = factor as keyof typeof scores;
      if (counts[f] > 0) {
        // Promedio: suma total / número de preguntas
        const average = scores[f] / counts[f];
        // Normalizar de escala 1-5 a escala 0-100: ((promedio - 1) / 4) * 100
        scores[f] = ((average - 1) / 4) * 100;
        // Asegurar que esté en rango 0-100
        scores[f] = Math.max(0, Math.min(100, scores[f]));
      }
    });

    console.log('[OCEAN_CALCULATION] Final scores:', scores);
    console.log('[OCEAN_CALCULATION] Item counts per factor:', counts);
    
    return scores;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Calcular puntuaciones
      const scores = calculateScores();
      console.log('[PSYCHOMETRIC_SUBMIT] Calculated scores:', scores);
      
      // Usar el hook de submission offline
      const success = await submitPsychometricTest(responses, scores, onComplete);
      
      if (!success) {
        throw new Error('Submission failed');
      }
      
    } catch (error) {
      console.error('Error al guardar evaluación:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la evaluación. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando evaluación...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>No hay preguntas disponibles en este momento.</p>
          {onBack && (
            <Button onClick={onBack} className="mt-4">
              Volver
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Manager para manejar estados offline y reintentos */}
      <OfflineSubmissionManager
        onRetrySubmission={async (submission) => {
          // For psychometric submissions, we need to get the stored data differently
          const { retryPsychometricSubmission } = usePsychometricOfflineSubmission(sessionId, propSessionId);
          return await retryPsychometricSubmission(submission as any);
        }}
        onAllSubmissionsComplete={() => toast({ title: "Éxito", description: "¡Test enviado exitosamente!" })}
      />
      
      <div className="max-w-4xl mx-auto space-y-6">
      {/* Header con progreso */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Evaluación de Personalidad OCEAN</CardTitle>
            <span className="text-sm text-muted-foreground">
              {currentQuestionIndex + 1} de {questions.length}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
      </Card>

      {/* Pregunta actual */}
      <Card>
        <CardContent className="p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-medium mb-4">
                {currentQuestion.question_text}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Factor: {currentQuestion.ocean_factor.charAt(0).toUpperCase() + currentQuestion.ocean_factor.slice(1)}
              </p>
            </div>

            <RadioGroup
              value={getCurrentResponse()?.toString() || ""}
              onValueChange={handleResponseChange}
              className="space-y-3"
            >
              {currentQuestion.likert_scale.map((option, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={(index + 1).toString()} id={`option-${index}`} />
                  <Label 
                    htmlFor={`option-${index}`}
                    className="text-base cursor-pointer flex-1"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Navegación */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="text-sm text-muted-foreground">
              {responses.length} de {questions.length} respondidas
            </div>

            {isLastQuestion ? (
              <Button
                onClick={handleSubmit}
                disabled={!getCurrentResponse() || submitting}
                className="flex items-center gap-2"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Finalizar
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!getCurrentResponse()}
                className="flex items-center gap-2"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      {currentQuestionIndex === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              <strong>Instrucciones:</strong> Responde cada pregunta de acuerdo a cómo te comportas habitualmente. 
              No hay respuestas correctas o incorrectas. La evaluación toma aproximadamente 20-30 minutos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
    </div>
  );
};

export default PsychometricTestTaking;


import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast"
import { Exam, Question } from '@/hooks/useExamData';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  name: string;
  questionCount: number;
  questions: Question[];
}

const ExamTaking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchExamAndQuestions = async () => {
      setLoading(true);
      try {
        // Fetch exam details
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', id)
          .single();

        if (examError) throw examError;
        setExam(examData);

        // Fetch exam category configurations
        const { data: configData, error: configError } = await supabase
          .from('examen_configuracion_categoria')
          .select('categoria_id, num_preguntas_a_incluir')
          .eq('examen_id', id);

        if (configError) throw configError;

        // Fetch questions for each category
        const categories = await Promise.all(
          configData.map(async (config) => {
            const { data: questionData, error: questionError } = await supabase
              .from('questions')
              .select('*')
              .eq('category_id', config.categoria_id);

            if (questionError) throw questionError;

            return {
              name: config.categoria_id, // You might want to fetch the actual category name
              questionCount: config.num_preguntas_a_incluir,
              questions: questionData || [],
            };
          })
        );

        generateQuestions(categories);

        // Set initial time remaining
        setTimeRemaining(examData?.duracion_minutos || 60 * 60); // Default to 60 minutes
      } catch (error: any) {
        console.error('Error fetching exam data:', error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: error.message,
        })
      } finally {
        setLoading(false);
      }
    };

    fetchExamAndQuestions();
  }, [id, toast]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
      }, 60000); // Update every minute
    } else if (timeRemaining === 0) {
      // Auto-submit exam when time runs out
      handleSubmit();
    }

    return () => clearInterval(intervalId);
  }, [timeRemaining]);

  const formatTime = (timeInMinutes: number): string => {
    const minutes = Math.floor(timeInMinutes);
    return `${minutes}m`;
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const goToNextQuestion = () => {
    setCurrentQuestionIndex((prevIndex) => Math.min(prevIndex + 1, questions.length - 1));
  };

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const generateQuestions = (categories: any[]) => {
    const selectedQuestions: Question[] = [];
    
    categories.forEach((category) => {
      const categoryQuestions = category.questions || [];
      const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, category.questionCount);
      
      const formattedQuestions = selected.map((q: any) => ({
        ...q,
        categoria: category.name,
        media_poblacional_pregunta: q.media_poblacional_pregunta || 'Nunca',
        category_name: category.name
      }));
      
      selectedQuestions.push(...formattedQuestions);
    });
    
    setQuestions(selectedQuestions.sort(() => Math.random() - 0.5));
  };

  const handleSubmit = async () => {
    // Basic validation - check if all questions are answered
    if (Object.keys(answers).length !== questions.length) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Por favor, responda a todas las preguntas antes de finalizar el examen.",
      })
      return;
    }

    // Process and submit answers
    try {
      // Simulate answer processing and scoring
      const score = Object.values(answers).reduce((acc, answer) => {
        // This is a placeholder - replace with actual scoring logic
        return acc + (answer ? 1 : 0);
      }, 0);

      // Save the exam attempt to the database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('exam_attempts')
        .insert([
          {
            exam_id: id,
            user_id: user.id,
            answers: answers,
            score: score,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            questions: questions.map(q => q.id)
          },
        ])
        .select()

      if (error) {
        throw error;
      }

      // Redirect to results page or display results
      navigate(`/exam/${id}/results`);
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message,
      })
    }
  };

  if (loading) {
    return <div>Cargando examen...</div>;
  }

  if (!exam) {
    return <div>Examen no encontrado.</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="container mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>{exam.title}</CardTitle>
          <CardDescription>
            {exam.description} - Tiempo restante: {formatTime(timeRemaining)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion && (
            <div className="space-y-2">
              <Label htmlFor={`question-${currentQuestion.id}`}>
                {currentQuestionIndex + 1}. {currentQuestion.question_text}
              </Label>
              <RadioGroup
                defaultValue={answers[currentQuestion.id]}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Nunca" id="r1" />
                  <Label htmlFor="r1">Nunca</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Rara vez" id="r2" />
                  <Label htmlFor="r2">Rara vez</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="A veces" id="r3" />
                  <Label htmlFor="r3">A veces</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Frecuentemente" id="r4" />
                  <Label htmlFor="r4">Frecuentemente</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="secondary"
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              onClick={goToNextQuestion}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Siguiente
            </Button>
          </div>

          <Button className="w-full" onClick={handleSubmit}>
            Finalizar Examen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamTaking;

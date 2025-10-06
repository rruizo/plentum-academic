import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ExamHeader from './exam/ExamHeader';
import ExamQuestionComponent from './exam/ExamQuestion';
import ExamNavigation from './exam/ExamNavigation';
import QuestionSummary from './exam/QuestionSummary';
import ExamStartScreen from './exam/ExamStartScreen';
import ExamCompletedScreen from './exam/ExamCompletedScreen';

interface ExamTakingInterfaceProps {
  examId: string;
  onComplete: (attemptId: string) => void;
}

interface ExamQuestion {
  id: string;
  question_text: string;
  category_id: string;
  category_name: string;
  weight: number;
}

interface UserAnswer {
  questionId: string;
  answer: 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente';
}

const ExamTakingInterface = ({ examId, onComplete }: ExamTakingInterfaceProps) => {
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExamData();
  }, [examId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (examStarted && timeRemaining > 0 && !examCompleted) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [examStarted, timeRemaining, examCompleted]);

  const fetchExamData = async () => {
    try {
      // Obtener datos del examen
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      setExam(examData);
      setTimeRemaining(examData.duracion_minutos * 60);

      // Obtener configuración de categorías del examen
      const { data: categoryConfigs, error: configError } = await supabase
        .from('examen_configuracion_categoria')
        .select(`
          categoria_id,
          num_preguntas_a_incluir,
          question_categories (
            nombre
          )
        `)
        .eq('examen_id', examId);

      if (configError) throw configError;

      // Seleccionar preguntas aleatoriamente para cada categoría
      const selectedQuestions: ExamQuestion[] = [];
      
      for (const config of categoryConfigs) {
        const { data: categoryQuestions, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('category_id', config.categoria_id);

        if (questionsError) throw questionsError;

        // Seleccionar aleatoriamente las preguntas necesarias
        const shuffled = categoryQuestions.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, config.num_preguntas_a_incluir);
        
        selected.forEach(q => {
          // Asegurar que tenemos el texto de la pregunta
          const questionText = q.question_text || q.texto_pregunta || '';
          
          if (!questionText.trim()) {
            console.warn(`[EXAM_TAKING] Question ${q.id} has empty text, skipping...`);
            return; // Saltar preguntas vacías
          }
          
          selectedQuestions.push({
            id: q.id,
            question_text: questionText,
            category_id: q.category_id,
            category_name: config.question_categories.nombre,
            weight: q.weight || 1
          });
        });
      }

      // Mezclar todas las preguntas seleccionadas
      const shuffledQuestions = selectedQuestions.sort(() => 0.5 - Math.random());
      setQuestions(shuffledQuestions);
      
    } catch (error) {
      console.error('Error fetching exam data:', error);
      toast.error('Error al cargar el examen');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = () => {
    setExamStarted(true);
    toast.success('Examen iniciado. ¡Buena suerte!');
  };

  const handleAnswerChange = (answer: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = [...answers];
    const existingAnswerIndex = newAnswers.findIndex(a => a.questionId === currentQuestion.id);
    
    if (existingAnswerIndex >= 0) {
      newAnswers[existingAnswerIndex].answer = answer as any;
    } else {
      newAnswers.push({
        questionId: currentQuestion.id,
        answer: answer as any
      });
    }
    
    setAnswers(newAnswers);
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Create the exam attempt - fix the type conversion
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .insert({
          exam_id: examId,
          user_id: user.id,
          questions: questions as any,
          answers: answers as any,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      setExamCompleted(true);
      toast.success('Examen completado exitosamente');
      onComplete(attempt.id);
      
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error('Error al enviar el examen');
    }
  };

  const getCurrentAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex];
    return answers.find(a => a.questionId === currentQuestion.id)?.answer || '';
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <ExamStartScreen 
        exam={exam}
        questionCount={questions.length}
        onStart={handleStartExam}
      />
    );
  }

  if (examCompleted) {
    return <ExamCompletedScreen />;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ExamHeader
        timeRemaining={timeRemaining}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        answeredQuestions={answers.length}
      />

      <ExamQuestionComponent
        question={currentQuestion}
        currentAnswer={getCurrentAnswer()}
        onAnswerChange={handleAnswerChange}
      />

      <ExamNavigation
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        currentAnswer={getCurrentAnswer()}
        answeredCount={answers.length}
        onPrevious={handlePreviousQuestion}
        onNext={handleNextQuestion}
        onSubmit={handleSubmitExam}
      />

      <QuestionSummary
        questions={questions}
        answers={answers}
        currentQuestionIndex={currentQuestionIndex}
        onQuestionSelect={setCurrentQuestionIndex}
      />
    </div>
  );
};

export default ExamTakingInterface;

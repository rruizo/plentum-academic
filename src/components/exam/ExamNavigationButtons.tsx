
import { Button } from '@/components/ui/button';

interface ExamNavigationButtonsProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  currentAnswer: string;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
  onSubmitExam: () => void;
}

const ExamNavigationButtons = ({
  currentQuestionIndex,
  totalQuestions,
  currentAnswer,
  onPreviousQuestion,
  onNextQuestion,
  onSubmitExam
}: ExamNavigationButtonsProps) => {
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <div className="flex justify-between pt-6 border-t">
      <Button 
        variant="outline" 
        onClick={onPreviousQuestion}
        disabled={isFirstQuestion}
      >
        Anterior
      </Button>
      
      <div className="flex gap-2">
        {isLastQuestion ? (
          <Button 
            onClick={onSubmitExam}
            disabled={!currentAnswer}
            className="bg-green-600 hover:bg-green-700"
          >
            Finalizar Evaluación
          </Button>
        ) : (
          <Button 
            onClick={onNextQuestion}
            disabled={!currentAnswer}
          >
            Siguiente
          </Button>
        )}
      </div>
    </div>
  );
};

export default ExamNavigationButtons;

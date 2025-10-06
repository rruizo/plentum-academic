
import { Button } from '@/components/ui/button';

interface ExamNavigationProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  currentAnswer: string;
  answeredCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

const ExamNavigation = ({
  currentQuestionIndex,
  totalQuestions,
  currentAnswer,
  answeredCount,
  onPrevious,
  onNext,
  onSubmit
}: ExamNavigationProps) => {
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const allQuestionsAnswered = answeredCount === totalQuestions;

  return (
    <div className="flex justify-between pt-4">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstQuestion}
      >
        Anterior
      </Button>
      
      <div className="flex gap-2">
        {isLastQuestion ? (
          <Button
            onClick={onSubmit}
            disabled={!allQuestionsAnswered}
            className="bg-green-600 hover:bg-green-700"
          >
            Finalizar Examen
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={!currentAnswer}
          >
            Siguiente
          </Button>
        )}
      </div>
    </div>
  );
};

export default ExamNavigation;

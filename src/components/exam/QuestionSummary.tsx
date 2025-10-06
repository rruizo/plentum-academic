
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserAnswer {
  questionId: string;
  answer: 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente';
}

interface ExamQuestion {
  id: string;
  question_text: string;
  category_name: string;
}

interface QuestionSummaryProps {
  questions: ExamQuestion[];
  answers: UserAnswer[];
  currentQuestionIndex: number;
  onQuestionSelect: (index: number) => void;
}

const QuestionSummary = ({ 
  questions, 
  answers, 
  currentQuestionIndex, 
  onQuestionSelect 
}: QuestionSummaryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Resumen de Respuestas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-10 gap-1">
          {questions.map((_, index) => {
            const isAnswered = answers.some(a => a.questionId === questions[index].id);
            const isCurrent = index === currentQuestionIndex;
            
            return (
              <button
                key={index}
                onClick={() => onQuestionSelect(index)}
                className={`
                  w-8 h-8 text-xs rounded border flex items-center justify-center
                  ${isCurrent ? 'border-blue-500 bg-blue-100' : 'border-gray-300'}
                  ${isAnswered ? 'bg-green-100 text-green-700' : 'bg-gray-50'}
                  hover:border-blue-400 transition-colors
                `}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionSummary;

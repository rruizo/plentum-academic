
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ExamQuestionCardProps {
  question: {
    id: string;
    question_text: string;
    category_name: string;
  };
  currentAnswer: string;
  onAnswerChange: (answer: string) => void;
}

const ExamQuestionCard = ({ question, currentAnswer, onAnswerChange }: ExamQuestionCardProps) => {
  const answerOptions = ['Nunca', 'Rara vez', 'A veces', 'Frecuentemente'];

  return (
    <Card>
      <CardContent className="p-8">
        <div className="space-y-6">
          <h2 className="text-xl font-medium text-gray-900 mb-4">
            {question?.question_text}
          </h2>
          
          <RadioGroup 
            value={currentAnswer} 
            onValueChange={onAnswerChange}
            className="space-y-3"
          >
            {answerOptions.map((option) => (
              <div key={option} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <RadioGroupItem value={option} id={option} />
                <Label 
                  htmlFor={option}
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
  );
};

export default ExamQuestionCard;

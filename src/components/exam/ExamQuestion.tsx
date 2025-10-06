
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ExamQuestion {
  id: string;
  question_text: string;
  category_name: string;
}

interface ExamQuestionProps {
  question: ExamQuestion;
  currentAnswer: string;
  onAnswerChange: (answer: string) => void;
}

const ExamQuestion = ({ question, currentAnswer, onAnswerChange }: ExamQuestionProps) => {
  const answerOptions = [
    { value: 'Nunca', label: 'Nunca' },
    { value: 'Rara vez', label: 'Rara vez' },
    { value: 'A veces', label: 'A veces' },
    { value: 'Frecuentemente', label: 'Frecuentemente' }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">
              {question?.question_text}
            </CardTitle>
            <CardDescription>
              Categoría: {question?.category_name}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={currentAnswer}
          onValueChange={onAnswerChange}
          className="space-y-4"
        >
          {answerOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default ExamQuestion;

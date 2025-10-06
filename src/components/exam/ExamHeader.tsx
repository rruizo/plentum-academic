
import { Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ExamHeaderProps {
  timeRemaining: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredQuestions: number;
}

const ExamHeader = ({ 
  timeRemaining, 
  currentQuestionIndex, 
  totalQuestions, 
  answeredQuestions 
}: ExamHeaderProps) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span className="font-mono text-lg">
              {formatTime(timeRemaining)}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Pregunta {currentQuestionIndex + 1} de {totalQuestions}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Progreso: {Math.round(progress)}%</span>
          <span>Respondidas: {answeredQuestions}/{totalQuestions}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExamHeader;

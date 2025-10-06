
import { Progress } from '@/components/ui/progress';

interface ExamProgressBarProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
}

const ExamProgressBar = ({ 
  currentQuestionIndex, 
  totalQuestions, 
  answeredCount 
}: ExamProgressBarProps) => {
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  const progressAnswered = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <div className="bg-card p-4 rounded-lg border space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Pregunta actual:</span>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-primary">{currentQuestionIndex + 1}</span>
            <span className="text-sm text-muted-foreground">de</span>
            <span className="text-lg font-bold text-primary">{totalQuestions}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Respondidas:</span>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-green-600">{answeredCount}</span>
            <span className="text-sm text-muted-foreground">de</span>
            <span className="text-lg font-bold text-primary">{totalQuestions}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progreso de navegación: {Math.round(progress)}%</span>
          <span>Completado: {Math.round(progressAnswered)}%</span>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-3" />
          <Progress 
            value={progressAnswered} 
            className="h-1 absolute top-1 left-0 right-0 opacity-75" 
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-blue-600">● Progreso de navegación</span>
          <span className="text-green-600">● Preguntas respondidas</span>
        </div>
      </div>
    </div>
  );
};

export default ExamProgressBar;

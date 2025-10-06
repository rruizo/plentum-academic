
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useExamData } from '@/hooks/useExamData';
import { useUserAttempts } from '@/hooks/useUserAttempts';
import { canTakeExam } from '@/utils/examUtils';
import ExamResultsDisplay from './ExamResultsDisplay';
import ExamCard from './exam/ExamCard';
import LoadingState from './exam/LoadingState';
import EmptyExamState from './exam/EmptyExamState';

interface ExamListProps {
  onStartExam?: (examId: string) => void;
}

const ExamList = ({ onStartExam }: ExamListProps) => {
  const { exams, loading } = useExamData();
  const { userAttempts, getAttemptForExam } = useUserAttempts();
  const [viewMode, setViewMode] = useState<'list' | 'results'>('list');
  const [activeAttempt, setActiveAttempt] = useState<string | null>(null);

  const handleStartExam = (examId: string) => {
    if (onStartExam) {
      onStartExam(examId);
    } else {
      toast.error('Error al iniciar el examen');
    }
  };

  const handleViewResults = (attemptId: string) => {
    setActiveAttempt(attemptId);
    setViewMode('results');
  };

  const handleBackToList = () => {
    setActiveAttempt(null);
    setViewMode('list');
  };

  if (loading) {
    return <LoadingState />;
  }

  if (viewMode === 'results' && activeAttempt) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackToList}>
          ← Volver a la lista
        </Button>
        <ExamResultsDisplay attemptId={activeAttempt} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Exámenes Disponibles</h2>
        <p className="text-muted-foreground">
          Selecciona un examen para realizar o ver tus resultados
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => {
          const canTake = canTakeExam(exam, userAttempts);
          const attempt = getAttemptForExam(exam.id);

          return (
            <ExamCard
              key={exam.id}
              exam={exam}
              canTake={canTake}
              attempt={attempt}
              onStartExam={handleStartExam}
              onViewResults={handleViewResults}
            />
          );
        })}
      </div>

      {exams.length === 0 && <EmptyExamState />}
    </div>
  );
};

export default ExamList;

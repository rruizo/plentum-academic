
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { useStudentExams } from '@/hooks/useStudentExams';
import ExamCard from './student-exam/ExamCard';
import { useIsMobile } from '@/hooks/use-mobile';

const StudentExamView = () => {
  const { assignedExams, loading, handleStartExam, canStartExam } = useStudentExams();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando exámenes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-bold">Exámenes de Confiabilidad Asignados</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Presenta tu evaluación de confiabilidad
        </p>
      </div>

      <div className={`grid gap-4 sm:gap-6 ${
        isMobile 
          ? 'grid-cols-1' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {assignedExams.map((assignment) => (
          <ExamCard
            key={assignment.id}
            assignment={assignment}
            onStartExam={handleStartExam}
            canStart={canStartExam(assignment)}
          />
        ))}
      </div>

      {assignedExams.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 sm:py-12">
            <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-muted-foreground mb-2">
              No tienes evaluaciones asignadas
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground px-4">
              Las evaluaciones de confiabilidad aparecerán aquí cuando te sean asignadas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentExamView;

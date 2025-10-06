
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock, FileText, Calendar } from 'lucide-react';
import ExamStatusBadge from './ExamStatusBadge';

interface ExamCardProps {
  exam: any;
  canTake: boolean;
  attempt: any;
  onStartExam: (examId: string) => void;
  onViewResults: (attemptId: string) => void;
}

const ExamCard = ({ exam, canTake, attempt, onStartExam, onViewResults }: ExamCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{exam.title}</CardTitle>
          <ExamStatusBadge exam={exam} />
        </div>
        <CardDescription>
          {exam.description || 'Examen de evaluación de confiabilidad'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Duración: {exam.duracion_minutos} minutos</span>
          </div>
          
          {exam.fecha_apertura && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Apertura: {new Date(exam.fecha_apertura).toLocaleDateString()}</span>
            </div>
          )}
          
          {exam.fecha_cierre && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Cierre: {new Date(exam.fecha_cierre).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="pt-2 space-y-2">
          {canTake ? (
            <Button 
              onClick={() => onStartExam(exam.id)}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Examen
            </Button>
          ) : attempt ? (
            <div className="space-y-2">
              <div className="text-sm text-green-600 font-medium">
                ✓ Examen completado
              </div>
              <Button 
                variant="outline"
                onClick={() => onViewResults(attempt.id)}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Ver Resultados
              </Button>
            </div>
          ) : (
            <Button disabled className="w-full">
              No Disponible
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExamCard;

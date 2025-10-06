
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';

interface AssignedExam {
  id: string;
  exam_id: string;
  status: string;
  assigned_at: string;
  access_link: string;
  exams: {
    title: string;
    description: string;
    duracion_minutos: number;
    fecha_cierre: string;
  };
}

interface ExamCardProps {
  assignment: AssignedExam;
  onStartExam: (assignment: AssignedExam) => void;
  canStart: boolean;
}

const getStatusBadge = (status: string, fecha_cierre?: string) => {
  if (fecha_cierre && new Date(fecha_cierre) < new Date()) {
    return <Badge variant="destructive">Expirado</Badge>;
  }

  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pendiente</Badge>;
    case 'started':
      return <Badge variant="secondary">En Progreso</Badge>;
    case 'completed':
      return <Badge variant="default">Completado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const ExamCard = ({ assignment, onStartExam, canStart }: ExamCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{assignment.exams.title}</CardTitle>
          {getStatusBadge(assignment.status, assignment.exams.fecha_cierre)}
        </div>
        <CardDescription>
          {assignment.exams.description || 'Evaluación de perfil de confiabilidad'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{assignment.exams.duracion_minutos} minutos</span>
          </div>
          {assignment.exams.fecha_cierre && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Vence: {new Date(assignment.exams.fecha_cierre).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Asignado: {new Date(assignment.assigned_at).toLocaleString()}
        </div>

        <div className="bg-blue-50 p-3 rounded-lg text-sm">
          <p className="font-medium text-blue-800 mb-1">Recomendaciones:</p>
          <ul className="text-blue-700 space-y-1 text-xs">
            <li>• Busque un lugar tranquilo</li>
            <li>• Asegure conexión estable a internet</li>
            <li>• Responda de manera honesta</li>
            <li>• Complete en una sola sesión</li>
          </ul>
        </div>

        <Button
          onClick={() => onStartExam(assignment)}
          disabled={!canStart}
          className="w-full"
          variant={assignment.status === 'completed' ? 'outline' : 'default'}
        >
          {assignment.status === 'completed' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Completado
            </>
          ) : assignment.status === 'started' ? (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Continuar Evaluación
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar Evaluación
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExamCard;

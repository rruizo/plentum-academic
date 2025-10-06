
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText } from "lucide-react";
import { Exam } from "@/hooks/useInstructorExamManagement";

interface ExamSelectionGridProps {
  exams: Exam[];
  selectedExam: string | null;
  onExamSelect: (examId: string) => void;
  getExamStatusColor: (estado: string) => string;
  isExamValid: (exam: Exam) => boolean;
}

const ExamSelectionGrid = ({ 
  exams, 
  selectedExam, 
  onExamSelect, 
  getExamStatusColor, 
  isExamValid 
}: ExamSelectionGridProps) => {
  const validExams = exams.filter(isExamValid);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {validExams.map((exam) => (
        <Card 
          key={exam.id} 
          className={`cursor-pointer transition-all ${
            selectedExam === exam.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onExamSelect(exam.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{exam.title}</CardTitle>
              <Badge className={getExamStatusColor(exam.estado)}>
                {exam.estado}
              </Badge>
            </div>
            <CardDescription className="text-sm">
              {exam.description || 'Sin descripción'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {exam.duracion_minutos} min
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {new Date(exam.created_at).toLocaleDateString()}
              </div>
            </div>
            {exam.fecha_cierre && (
              <div className="text-xs text-muted-foreground mt-2">
                Válido hasta: {new Date(exam.fecha_cierre).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExamSelectionGrid;

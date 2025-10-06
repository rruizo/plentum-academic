
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Plus } from "lucide-react";
import { Exam } from "@/hooks/useInstructorExamManagement";
import ExamSelectionGrid from "./ExamSelectionGrid";
import ExamAssignmentManager from "../ExamAssignmentManager";

interface ExamAssignmentTabProps {
  exams: Exam[];
  selectedExam: string | null;
  onExamSelect: (examId: string) => void;
  getExamStatusColor: (estado: string) => string;
  isExamValid: (exam: Exam) => boolean;
  onCreateTab: () => void;
}

const ExamAssignmentTab = ({ 
  exams, 
  selectedExam, 
  onExamSelect, 
  getExamStatusColor, 
  isExamValid, 
  onCreateTab 
}: ExamAssignmentTabProps) => {
  const validExams = exams.filter(isExamValid);
  const selectedExamData = exams.find(e => e.id === selectedExam);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seleccionar Examen para Asignar</CardTitle>
        <CardDescription>
          Elige el examen que deseas asignar a los usuarios evaluados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ExamSelectionGrid 
          exams={exams}
          selectedExam={selectedExam}
          onExamSelect={onExamSelect}
          getExamStatusColor={getExamStatusColor}
          isExamValid={isExamValid}
        />

        {selectedExam && selectedExamData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                Examen seleccionado: {selectedExamData.title}
              </span>
            </div>
            
            <ExamAssignmentManager 
              selectedExamId={selectedExam}
              examTitle={selectedExamData.title}
            />
          </div>
        )}

        {validExams.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No hay exámenes válidos disponibles
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea un examen activo primero para poder asignarlo
            </p>
            <Button onClick={onCreateTab}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Examen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExamAssignmentTab;

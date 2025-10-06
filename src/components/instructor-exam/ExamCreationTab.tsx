
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ExamCreationForm from "../exam/ExamCreationForm";

interface ExamCreationTabProps {
  onExamCreated: (examId: string) => void;
}

const ExamCreationTab = ({ onExamCreated }: ExamCreationTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Nuevo Examen</CardTitle>
        <CardDescription>
          Selecciona las categorías y configura los parámetros del examen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ExamCreationForm onSave={onExamCreated} />
      </CardContent>
    </Card>
  );
};

export default ExamCreationTab;

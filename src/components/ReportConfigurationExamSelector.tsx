
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Exam {
  id: string;
  title: string;
  description?: string;
}

interface ExamSelectorProps {
  selectedExamId: string;
  availableExams: Exam[];
  onExamChange: (examId: string) => void;
}

const ReportConfigurationExamSelector = ({ selectedExamId, availableExams, onExamChange }: ExamSelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seleccionar Examen</CardTitle>
        <CardDescription>
          Elige el examen para el cual deseas configurar el reporte
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="exam-select">Examen</Label>
            <Select value={selectedExamId} onValueChange={onExamChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un examen" />
              </SelectTrigger>
              <SelectContent>
                {availableExams.map(exam => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {!selectedExamId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <strong>Nota:</strong> Selecciona un examen para cargar o crear una configuración de reporte.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportConfigurationExamSelector;

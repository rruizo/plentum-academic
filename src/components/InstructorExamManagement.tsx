
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useInstructorExamManagement } from '@/hooks/useInstructorExamManagement';
import ExamCreationTab from './instructor-exam/ExamCreationTab';
import ExamAssignmentTab from './instructor-exam/ExamAssignmentTab';

const InstructorExamManagement = () => {
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('create');

  const { 
    exams, 
    loading, 
    fetchExams, 
    isExamValid, 
    getExamStatusColor 
  } = useInstructorExamManagement();

  const handleExamCreated = (examId: string) => {
    toast.success('Examen creado exitosamente');
    fetchExams();
    setActiveTab('assign');
    setSelectedExam(examId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando información...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Exámenes - Usuario Instructor</h2>
          <p className="text-muted-foreground">
            Configura y distribuye exámenes de confiabilidad
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Crear Examen
          </TabsTrigger>
          <TabsTrigger value="assign">
            <Send className="h-4 w-4 mr-2" />
            Asignar Examen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <ExamCreationTab onExamCreated={handleExamCreated} />
        </TabsContent>

        <TabsContent value="assign" className="space-y-6">
          <ExamAssignmentTab 
            exams={exams}
            selectedExam={selectedExam}
            onExamSelect={setSelectedExam}
            getExamStatusColor={getExamStatusColor}
            isExamValid={isExamValid}
            onCreateTab={() => setActiveTab('create')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstructorExamManagement;

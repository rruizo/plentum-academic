
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, FileText, Edit, Trash2 } from 'lucide-react';
import { useExamData } from '@/hooks/useExamData';
import { toast } from 'sonner';
import QuestionEditor from './QuestionEditor';
import AdvancedImportDialog from './AdvancedImportDialog';

const QuestionManagement = () => {
  const { 
    categories, 
    questions, 
    loading, 
    createQuestion, 
    updateQuestion, 
    deleteQuestion,
    importQuestions
  } = useExamData();

  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');

  const handleCreateQuestion = () => {
    setSelectedQuestion(null);
    setEditorMode('create');
    setShowQuestionEditor(true);
  };

  const handleEditQuestion = (question: any) => {
    setSelectedQuestion(question);
    setEditorMode('edit');
    setShowQuestionEditor(true);
  };

  const handleSaveQuestion = async (questionData: any) => {
    if (editorMode === 'create') {
      await createQuestion(questionData);
    } else {
      await updateQuestion(selectedQuestion?.id, questionData);
    }
  };

  const handleImport = async (questionsData: any[]) => {
    try {
      await importQuestions(questionsData);
      toast.success(`${questionsData.length} preguntas importadas exitosamente`);
    } catch (error) {
      toast.error('Error al importar preguntas');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Preguntas</h2>
          <p className="text-muted-foreground">
            Administra el banco de preguntas para exámenes de confiabilidad
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Preguntas
          </Button>
          <Button onClick={handleCreateQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Pregunta
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Preguntas Registradas ({questions.length})
          </CardTitle>
          <CardDescription>
            Lista de preguntas con opciones de respuesta: Nunca (0), Rara vez (1), A veces (2), Frecuentemente (3)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando preguntas...</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {questions.map((question) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">
                      {categories.find(c => c.id === question.category_id)?.name || 'Sin categoría'}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditQuestion(question)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm mb-2">{question.question_text || question.texto_pregunta}</p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Media: {question.media_poblacional_pregunta || 'Nunca'}</span>
                    <span>Código Categoría: {categories.find(c => c.id === question.category_id)?.codigo_categoria || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <QuestionEditor
        open={showQuestionEditor}
        onOpenChange={setShowQuestionEditor}
        question={selectedQuestion}
        categories={categories}
        onSave={handleSaveQuestion}
        onDelete={deleteQuestion}
        mode={editorMode}
      />

      <AdvancedImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        categories={categories}
        onImport={handleImport}
      />
    </div>
  );
};

export default QuestionManagement;

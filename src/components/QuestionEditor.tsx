
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Category, Question } from '@/hooks/useExamData';

interface QuestionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: Question | null;
  categories: Category[];
  onSave: (questionData: Partial<Question>) => Promise<void>;
  onDelete?: (questionId: string) => Promise<void>;
  mode: 'create' | 'edit';
}

const RESPONSE_OPTIONS = ['Nunca', 'Rara vez', 'A veces', 'Frecuentemente'] as const;

const QuestionEditor = ({
  open,
  onOpenChange,
  question,
  categories,
  onSave,
  onDelete,
  mode
}: QuestionEditorProps) => {
  const [formData, setFormData] = useState<Partial<Question>>({
    category_id: '',
    texto_pregunta: '',
    media_poblacional_pregunta: 'Nunca',
    difficulty_level: 1,
    weight: 1,
    is_control_question: false,
    national_average: 'Nunca'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (question && mode === 'edit') {
      setFormData({
        category_id: question.category_id,
        texto_pregunta: question.texto_pregunta || question.question_text,
        media_poblacional_pregunta: question.media_poblacional_pregunta || 'Nunca',
        difficulty_level: question.difficulty_level || 1,
        weight: question.weight || 1,
        is_control_question: question.is_control_question || false,
        national_average: question.national_average || 'Nunca'
      });
    } else if (mode === 'create') {
      setFormData({
        category_id: '',
        texto_pregunta: '',
        media_poblacional_pregunta: 'Nunca',
        difficulty_level: 1,
        weight: 1,
        is_control_question: false,
        national_average: 'Nunca'
      });
    }
  }, [question, mode, open]);

  const handleSave = async () => {
    if (!formData.category_id || !formData.texto_pregunta) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      toast.success(mode === 'create' ? 'Pregunta creada exitosamente' : 'Pregunta actualizada exitosamente');
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al guardar la pregunta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!question?.id || !onDelete) return;

    if (confirm('¿Estás seguro de que deseas eliminar esta pregunta?')) {
      setLoading(true);
      try {
        await onDelete(question.id);
        toast.success('Pregunta eliminada exitosamente');
        onOpenChange(false);
      } catch (error) {
        toast.error('Error al eliminar la pregunta');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nueva Pregunta' : 'Editar Pregunta'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Crea una nueva pregunta para el banco de preguntas' 
              : 'Modifica los datos de la pregunta'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="category">Categoría *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.nombre || category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question-text">Texto de la Pregunta *</Label>
            <Textarea
              id="question-text"
              value={formData.texto_pregunta || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, texto_pregunta: e.target.value }))}
              placeholder="Escribe el texto de la pregunta..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="population-average">Media Poblacional</Label>
            <Select
              value={formData.media_poblacional_pregunta || 'Nunca'}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                media_poblacional_pregunta: value as typeof RESPONSE_OPTIONS[number]
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="national-average">Promedio Nacional</Label>
            <Select
              value={formData.national_average || 'Nunca'}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                national_average: value as typeof RESPONSE_OPTIONS[number]
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Nivel de Dificultad</Label>
              <Input
                id="difficulty"
                type="number"
                min="1"
                max="5"
                value={formData.difficulty_level || 1}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty_level: parseInt(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso</Label>
              <Input
                id="weight"
                type="number"
                min="0.1"
                step="0.1"
                value={formData.weight || 1}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="control-question"
              checked={formData.is_control_question || false}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_control_question: checked as boolean }))}
            />
            <Label htmlFor="control-question">Pregunta de Control</Label>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {mode === 'edit' && onDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Guardando...' : (mode === 'create' ? 'Crear' : 'Actualizar')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionEditor;

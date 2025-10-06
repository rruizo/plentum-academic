
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, Clock, Shuffle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ExamQuestionCounter from '../ExamQuestionCounter';

interface Category {
  id: string;
  name: string;
  nombre: string;
}

interface ExamCreationFormProps {
  onSave?: (examId: string) => void;
  initialData?: any;
}

const ExamCreationForm = ({ onSave, initialData }: ExamCreationFormProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duracion_minutos: 60,
    is_randomized: true,
    simulation_threshold: 5.0,
    fecha_apertura: '',
    fecha_cierre: '',
    estado: 'borrador',
    type: 'confiabilidad',
    psychometric_test_id: null
  });
  const [questionsPerCategory, setQuestionsPerCategory] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    fetchCategories();
    if (initialData) {
      setFormData(initialData);
      setQuestionsPerCategory(initialData.questions_per_category || {});
    }
  }, [initialData]);

  useEffect(() => {
    const total = Object.values(questionsPerCategory).reduce((sum, count) => sum + count, 0);
    setTotalQuestions(total);
  }, [questionsPerCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('question_categories')
        .select('id, name, nombre')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error al cargar las categorías');
    }
  };

  const handleCategoryQuestionChange = (categoryId: string, count: number) => {
    setQuestionsPerCategory(prev => ({
      ...prev,
      [categoryId]: count
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('El título del examen es requerido');
      return;
    }

    if (formData.type === 'confiabilidad' && totalQuestions === 0) {
      toast.error('Debe incluir al menos una pregunta en el examen');
      return;
    }

    try {
      setSaving(true);
      
      // Obtener company_id del usuario actual
      const { data: user } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.user?.id)
        .single();

      const examData = {
        ...formData,
        questions_per_category: questionsPerCategory,
        created_by: user.user?.id,
        company_id: userProfile?.company_id // Asignar company_id del usuario creador
      };

      const { data, error } = await supabase
        .from('exams')
        .insert(examData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Examen creado exitosamente');
      
      if (onSave) {
        onSave(data.id);
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error('Error al crear el examen');
    } finally {
      setSaving(false);
    }
  };

  const getEstimatedDuration = () => {
    // Estimar 1.5 minutos por pregunta
    return Math.ceil(totalQuestions * 1.5);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información General del Examen</CardTitle>
          <CardDescription>
            Configure los datos básicos del examen de confiabilidad
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Título del Examen</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Ej: Evaluación de Confiabilidad - Analistas"
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descripción detallada del propósito y alcance del examen"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo de Examen</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confiabilidad">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Confiabilidad</Badge>
                    <span>Evaluación de integridad y honestidad</span>
                  </div>
                </SelectItem>
                <SelectItem value="psicometrico">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Psicométrico</Badge>
                    <span>Evaluación de personalidad y aptitudes</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fecha_apertura">Fecha de Apertura</Label>
              <Input
                id="fecha_apertura"
                type="datetime-local"
                value={formData.fecha_apertura}
                onChange={(e) => setFormData({...formData, fecha_apertura: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="fecha_cierre">Fecha de Cierre</Label>
              <Input
                id="fecha_cierre"
                type="datetime-local"
                value={formData.fecha_cierre}
                onChange={(e) => setFormData({...formData, fecha_cierre: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Configuración de Tiempo y Estructura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duracion_minutos">Duración (minutos)</Label>
              <Input
                id="duracion_minutos"
                type="number"
                min="15"
                max="180"
                value={formData.duracion_minutos}
                onChange={(e) => setFormData({...formData, duracion_minutos: parseInt(e.target.value)})}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Duración sugerida: {getEstimatedDuration()} minutos ({totalQuestions} preguntas)
              </p>
            </div>

            <div>
              <Label htmlFor="simulation_threshold">Umbral de Simulación</Label>
              <Input
                id="simulation_threshold"
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={formData.simulation_threshold}
                onChange={(e) => setFormData({...formData, simulation_threshold: parseFloat(e.target.value)})}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Diferencia máxima para detectar simulación (puntos)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_randomized" className="flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Aleatorizar Preguntas
              </Label>
              <p className="text-sm text-muted-foreground">
                Las preguntas aparecerán en orden aleatorio para cada candidato
              </p>
            </div>
            <Switch
              id="is_randomized"
              checked={formData.is_randomized}
              onCheckedChange={(checked) => setFormData({...formData, is_randomized: checked})}
            />
          </div>
        </CardContent>
      </Card>

      {formData.type === 'confiabilidad' && (
        <ExamQuestionCounter
          categories={categories}
          questionsPerCategory={questionsPerCategory}
          onCategoryChange={handleCategoryQuestionChange}
        />
      )}
      
      {formData.type === 'psicometrico' && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración Psicométrica</CardTitle>
            <CardDescription>
              Los exámenes psicométricos utilizan preguntas específicas de personalidad pre-configuradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Este tipo de examen incluye automáticamente las preguntas psicométricas OCEAN configuradas en el sistema.
              </p>
              <Badge variant="outline" className="mt-2">
                Preguntas automáticas incluidas
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Estado del Examen</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="estado">Estado Actual</Label>
            <Select value={formData.estado} onValueChange={(value) => setFormData({...formData, estado: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="borrador">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Borrador</Badge>
                    <span>En desarrollo</span>
                  </div>
                </SelectItem>
                <SelectItem value="activo">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Activo</Badge>
                    <span>Disponible para candidatos</span>
                  </div>
                </SelectItem>
                <SelectItem value="pausado">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Pausado</Badge>
                    <span>Temporalmente suspendido</span>
                  </div>
                </SelectItem>
                <SelectItem value="finalizado">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Finalizado</Badge>
                    <span>No acepta más respuestas</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving || (formData.type === 'confiabilidad' && totalQuestions === 0)}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Crear Examen'}
        </Button>
      </div>
    </div>
  );
};

export default ExamCreationForm;

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Question {
  id: string;
  category_id: string;
  question_text: string;
  question_order: number;
  response_options: any;
  is_active: boolean;
}

interface Category {
  id: string;
  nombre: string;
  codigo_categoria: string;
}

interface ResponseOption {
  id: string;
  texto: string;
  riesgo_rotacion: 'bajo' | 'medio' | 'alto';
  puntos: number;
}

const TurnoverRiskQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    category_id: '',
    question_text: '',
    response_options: [] as ResponseOption[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [questionsRes, categoriesRes] = await Promise.all([
        supabase.from('turnover_risk_questions').select('*').order('question_order'),
        supabase.from('turnover_risk_categories').select('id, nombre, codigo_categoria').eq('is_active', true)
      ]);

      if (questionsRes.error) throw questionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setQuestions(questionsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const addResponseOption = () => {
    setNewQuestion({
      ...newQuestion,
      response_options: [
        ...newQuestion.response_options,
        { id: `opt-${Date.now()}`, texto: '', riesgo_rotacion: 'medio', puntos: 0 }
      ]
    });
  };

  const removeResponseOption = (index: number) => {
    setNewQuestion({
      ...newQuestion,
      response_options: newQuestion.response_options.filter((_, i) => i !== index)
    });
  };

  const updateResponseOption = (index: number, field: keyof ResponseOption, value: any) => {
    setNewQuestion({
      ...newQuestion,
      response_options: newQuestion.response_options.map((opt, i) =>
        i === index ? { ...opt, [field]: value } : opt
      )
    });
  };

  const handleCreate = async () => {
    if (!newQuestion.category_id || !newQuestion.question_text.trim()) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    if (newQuestion.response_options.length === 0) {
      toast.error('Agregue al menos una opción de respuesta');
      return;
    }

    try {
      const maxOrder = questions.reduce((max, q) => Math.max(max, q.question_order), 0);
      
      const { error } = await supabase
        .from('turnover_risk_questions')
        .insert({
          question_text: newQuestion.question_text,
          question_order: maxOrder + 1,
          response_options: newQuestion.response_options as any,
          category_id: newQuestion.category_id
        } as any);

      if (error) throw error;
      
      toast.success('Pregunta creada exitosamente');
      setNewQuestion({ category_id: '', question_text: '', response_options: [] });
      loadData();
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error('Error al crear pregunta');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta pregunta?')) return;

    try {
      const { error } = await supabase
        .from('turnover_risk_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Pregunta eliminada');
      loadData();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Error al eliminar pregunta');
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'bajo': return 'bg-green-100 text-green-800';
      case 'medio': return 'bg-yellow-100 text-yellow-800';
      case 'alto': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva Pregunta</CardTitle>
          <CardDescription>
            Cree una nueva pregunta con opciones de respuesta evaluadas por nivel de riesgo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={newQuestion.category_id}
                onValueChange={(value) => setNewQuestion({ ...newQuestion, category_id: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nombre} {cat.codigo_categoria && `(${cat.codigo_categoria})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="question-text">Texto de la Pregunta</Label>
            <Textarea
              id="question-text"
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
              placeholder="Ej: ¿Cuánto tiempo planea permanecer en esta empresa?"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Opciones de Respuesta</Label>
              <Button onClick={addResponseOption} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Opción
              </Button>
            </div>

            {newQuestion.response_options.map((option, index) => (
              <Card key={option.id} className="bg-muted/50">
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <Label>Texto de la Opción</Label>
                      <Input
                        value={option.texto}
                        onChange={(e) => updateResponseOption(index, 'texto', e.target.value)}
                        placeholder="Ej: Más de 5 años"
                      />
                    </div>
                    <div>
                      <Label>Riesgo</Label>
                      <Select
                        value={option.riesgo_rotacion}
                        onValueChange={(value) => updateResponseOption(index, 'riesgo_rotacion', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bajo">Bajo</SelectItem>
                          <SelectItem value="medio">Medio</SelectItem>
                          <SelectItem value="alto">Alto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <Label>Puntos</Label>
                      <Input
                        type="number"
                        value={option.puntos}
                        onChange={(e) => updateResponseOption(index, 'puntos', parseInt(e.target.value) || 0)}
                        className="w-32"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeResponseOption(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button onClick={handleCreate} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Crear Pregunta
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preguntas Existentes ({questions.length})</CardTitle>
          <CardDescription>
            Preguntas del examen de evaluación de riesgo de rotación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.map((question) => {
              const category = categories.find(c => c.id === question.category_id);
              return (
                <Card key={question.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              Orden: {question.question_order}
                            </Badge>
                            {category && (
                              <Badge variant="secondary">
                                {category.nombre}
                              </Badge>
                            )}
                            <Badge variant={question.is_active ? 'default' : 'secondary'}>
                              {question.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </div>
                          <p className="font-medium mb-3">{question.question_text}</p>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Opciones:</p>
                            {question.response_options.map((opt: ResponseOption, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <Badge className={getRiskBadgeColor(opt.riesgo_rotacion)}>
                                  {opt.riesgo_rotacion.toUpperCase()}
                                </Badge>
                                <span>{opt.texto}</span>
                                <span className="text-muted-foreground">({opt.puntos} pts)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TurnoverRiskQuestions;

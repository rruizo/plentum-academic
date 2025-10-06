import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CalendarIcon, Plus, Settings, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useExamData } from '@/hooks/useExamData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ExamQuestionCounter from './ExamQuestionCounter';

interface CategoryConfig {
  category_id: string;
  num_preguntas: number;
  available_questions: number;
  category_name?: string;
}

const ConfiabilityExamCreation = () => {
  const { categories } = useExamData();
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    duracion_minutos: 60,
    estado: 'borrador'
  });
  const [fechaApertura, setFechaApertura] = useState<Date>();
  const [fechaCierre, setFechaCierre] = useState<Date>();
  const [categoryConfigs, setCategoryConfigs] = useState<CategoryConfig[]>([]);
  const [questionsPerCategory, setQuestionsPerCategory] = useState<{[key: string]: number}>({});
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Obtener cantidad de preguntas por categoría
    const fetchQuestionCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('category_id')
          .not('category_id', 'is', null);

        if (error) throw error;

        const counts: {[key: string]: number} = {};
        data.forEach(q => {
          counts[q.category_id] = (counts[q.category_id] || 0) + 1;
        });
        setQuestionsPerCategory(counts);
      } catch (error) {
        console.error('Error fetching question counts:', error);
      }
    };

    fetchQuestionCounts();
  }, []);

  const addCategoryConfig = () => {
    setCategoryConfigs(prev => [...prev, { 
      category_id: '', 
      num_preguntas: 1,
      available_questions: 0,
      category_name: ''
    }]);
  };

  const updateCategoryConfig = (index: number, field: keyof CategoryConfig, value: any) => {
    setCategoryConfigs(prev => prev.map((config, i) => {
      if (i === index) {
        const updatedConfig = { ...config, [field]: value };
        if (field === 'category_id') {
          const selectedCategory = categories.find(cat => cat.id === value);
          updatedConfig.available_questions = questionsPerCategory[value] || 0;
          updatedConfig.category_name = selectedCategory?.nombre || '';
          // Reset num_preguntas if it exceeds available questions
          if (updatedConfig.num_preguntas > updatedConfig.available_questions) {
            updatedConfig.num_preguntas = Math.min(1, updatedConfig.available_questions);
          }
        }
        return updatedConfig;
      }
      return config;
    }));
  };

  const removeCategoryConfig = (index: number) => {
    setCategoryConfigs(prev => prev.filter((_, i) => i !== index));
  };

  // Get already selected category IDs
  const getSelectedCategoryIds = (): string[] => {
    return categoryConfigs
      .map(config => config.category_id)
      .filter(id => id !== '');
  };

  // Check if a category is already selected
  const isCategorySelected = (categoryId: string): boolean => {
    return getSelectedCategoryIds().includes(categoryId);
  };

  const validateExamData = (): boolean => {
    if (!examData.title.trim()) {
      toast.error('El título del examen es requerido');
      return false;
    }

    if (categoryConfigs.length === 0) {
      toast.error('Debe configurar al menos una categoría');
      return false;
    }

    // Validar que todas las configuraciones de categoría estén completas
    for (let i = 0; i < categoryConfigs.length; i++) {
      const config = categoryConfigs[i];
      
      if (!config.category_id) {
        toast.error(`Seleccione una categoría para la configuración ${i + 1}`);
        return false;
      }

      if (config.num_preguntas <= 0) {
        toast.error(`El número de preguntas debe ser mayor a 0 para la configuración ${i + 1}`);
        return false;
      }

      if (config.num_preguntas > config.available_questions) {
        const category = categories.find(c => c.id === config.category_id);
        toast.error(`La categoría "${category?.nombre}" solo tiene ${config.available_questions} preguntas disponibles`);
        return false;
      }
    }

    // Validar fechas
    if (fechaApertura && fechaCierre && fechaApertura >= fechaCierre) {
      toast.error('La fecha de cierre debe ser posterior a la fecha de apertura');
      return false;
    }

    return true;
  };

  const handleCreateExam = async () => {
    if (!validateExamData()) return;

    setIsCreating(true);
    
    try {
      console.log('Starting exam creation...');
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User error:', userError);
        throw new Error('Usuario no autenticado');
      }

      console.log('User authenticated:', user.id);

      // Create exam
      const examPayload = {
        title: examData.title,
        description: examData.description,
        created_by: user.id,
        fecha_apertura: fechaApertura?.toISOString(),
        fecha_cierre: fechaCierre?.toISOString(),
        duracion_minutos: examData.duracion_minutos,
        estado: examData.estado
      };

      console.log('Creating exam with payload:', examPayload);

      const { data: examResult, error: examError } = await supabase
        .from('exams')
        .insert(examPayload)
        .select()
        .single();

      if (examError) {
        console.error('Exam creation error:', examError);
        throw examError;
      }

      console.log('Exam created successfully:', examResult);

      // Create category configurations
      const configPromises = categoryConfigs.map(config => {
        console.log('Creating category config:', {
          examen_id: examResult.id,
          categoria_id: config.category_id,
          num_preguntas_a_incluir: config.num_preguntas
        });
        
        return supabase
          .from('examen_configuracion_categoria')
          .insert({
            examen_id: examResult.id,
            categoria_id: config.category_id,
            num_preguntas_a_incluir: config.num_preguntas
          });
      });

      await Promise.all(configPromises);

      console.log('Category configurations created successfully');
      toast.success('Examen de confiabilidad creado exitosamente');
      
      // Limpiar formulario
      setExamData({ title: '', description: '', duracion_minutos: 60, estado: 'borrador' });
      setFechaApertura(undefined);
      setFechaCierre(undefined);
      setCategoryConfigs([]);
      
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error(`Error al crear el examen: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const getTotalQuestions = (): number => {
    return categoryConfigs.reduce((total, config) => total + config.num_preguntas, 0);
  };

  const getEstimatedDuration = (): number => {
    const totalQuestions = getTotalQuestions();
    // Estimación: 1 minuto por pregunta + 10 minutos de buffer
    return Math.max(totalQuestions + 10, 30);
  };

  // Convert categoryConfigs to the format expected by ExamQuestionCounter
  const getCurrentQuestionsPerCategory = (): Record<string, number> => {
    const result: Record<string, number> = {};
    categoryConfigs.forEach(config => {
      if (config.category_id) {
        result[config.category_id] = config.num_preguntas;
      }
    });
    return result;
  };

  const handleCategoryChange = (categoryId: string, count: number) => {
    const configIndex = categoryConfigs.findIndex(config => config.category_id === categoryId);
    if (configIndex >= 0) {
      updateCategoryConfig(configIndex, 'num_preguntas', count);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Crear Examen de Confiabilidad</h2>
        <p className="text-muted-foreground">
          Configure un nuevo examen con preguntas por categoría usando la escala estándar: Nunca, Rara vez, A veces, Frecuentemente
        </p>
      </div>

      {/* Contador de preguntas integrado */}
      {categoryConfigs.length > 0 && (
        <ExamQuestionCounter 
          categories={categories}
          questionsPerCategory={getCurrentQuestionsPerCategory()}
          onCategoryChange={handleCategoryChange}
          estimatedDuration={examData.duracion_minutos}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General del Examen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Nombre del Examen</Label>
              <Input
                id="title"
                value={examData.title}
                onChange={(e) => setExamData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Evaluación de Confiabilidad 2024"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={examData.description}
                onChange={(e) => setExamData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe el propósito y contexto del examen..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="duration">Duración (minutos)</Label>
              <Input
                id="duration"
                type="number"
                min="10"
                value={examData.duracion_minutos}
                onChange={(e) => setExamData(prev => ({ 
                  ...prev, 
                  duracion_minutos: parseInt(e.target.value) || 60 
                }))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Duración estimada recomendada: {getEstimatedDuration()} minutos
              </p>
            </div>

            <div>
              <Label htmlFor="estado">Estado del Examen</Label>
              <Select value={examData.estado} onValueChange={(value) => 
                setExamData(prev => ({ ...prev, estado: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="archivado">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programación del Examen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Fecha de Apertura</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fechaApertura && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaApertura ? format(fechaApertura, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={fechaApertura}
                    onSelect={setFechaApertura}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Fecha de Cierre</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fechaCierre && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaCierre ? format(fechaCierre, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={fechaCierre}
                    onSelect={setFechaCierre}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {getTotalQuestions() > 0 && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <div><strong>Total de preguntas:</strong> {getTotalQuestions()}</div>
                    <div><strong>Tiempo estimado:</strong> {getEstimatedDuration()} minutos</div>
                    <div><strong>Opciones de respuesta:</strong> Nunca (0), Rara vez (1), A veces (2), Frecuentemente (3)</div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Configuración de Categorías</CardTitle>
              <CardDescription>
                Especifica cuántas preguntas incluir de cada categoría de confiabilidad
              </CardDescription>
            </div>
            <Button onClick={addCategoryConfig} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Categoría
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryConfigs.map((config, index) => (
              <div key={index} className="flex gap-4 items-end p-4 border rounded-lg">
                <div className="flex-1">
                  <Label>Categoría</Label>
                  <Select 
                    value={config.category_id} 
                    onValueChange={(value) => updateCategoryConfig(index, 'category_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => {
                        const isSelected = isCategorySelected(category.id);
                        const isCurrentSelection = config.category_id === category.id;
                        const shouldDisable = isSelected && !isCurrentSelection;
                        
                        return (
                          <SelectItem 
                            key={category.id} 
                            value={category.id}
                            disabled={shouldDisable}
                            className={shouldDisable ? "opacity-50" : ""}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {category.nombre}
                                {category.codigo_categoria && ` (${category.codigo_categoria})`}
                              </span>
                              {isSelected && !isCurrentSelection && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Ya seleccionada
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-32">
                  <Label>Preguntas Disponibles</Label>
                  <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
                    <Badge variant="secondary">
                      {config.available_questions || questionsPerCategory[config.category_id] || 0}
                    </Badge>
                  </div>
                </div>
                
                <div className="w-32">
                  <Label>Cantidad a Incluir</Label>
                  <Input
                    type="number"
                    min="1"
                    max={config.available_questions || questionsPerCategory[config.category_id] || 1}
                    value={config.num_preguntas}
                    onChange={(e) => updateCategoryConfig(index, 'num_preguntas', parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeCategoryConfig(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {categoryConfigs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay categorías configuradas.</p>
                <p>Haga clic en "Agregar Categoría" para comenzar.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleCreateExam} 
          size="lg" 
          disabled={categoryConfigs.length === 0 || isCreating}
        >
          <Settings className="h-4 w-4 mr-2" />
          {isCreating ? 'Creando Examen...' : 'Crear Examen de Confiabilidad'}
        </Button>
      </div>
    </div>
  );
};

export default ConfiabilityExamCreation;

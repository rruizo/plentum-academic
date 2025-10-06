import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, User, Target, Activity, CheckCircle, Clock, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type PsychometricTest = Tables<'psychometric_tests'>;

interface PsychometricTestsProps {
  onStartTest?: (testId: string) => void;
}

const PsychometricTests = ({ onStartTest }: PsychometricTestsProps) => {
  const [tests, setTests] = useState<PsychometricTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

  const defaultTests: Omit<PsychometricTest, 'id' | 'created_at' | 'updated_at'>[] = [
    {
      name: 'Test de Personalidad OCEAN (Big Five)',
      description: 'Evaluación de los cinco grandes factores de personalidad: Apertura, Consciencia, Extraversión, Amabilidad y Neuroticismo',
      type: 'personality',
      duration_minutes: 30,
      is_active: false,
      questions_count: 50,
      max_attempts: 2,
      interpretation_template: 'ocean_template'
    },
    {
      name: 'Evaluación Cognitiva Integral',
      description: 'Análisis completo de capacidades cognitivas incluyendo razonamiento lógico, memoria de trabajo, atención y procesamiento',
      type: 'cognitive',
      duration_minutes: 45,
      is_active: false,
      questions_count: 40,
      max_attempts: 2,
      interpretation_template: 'cognitive_template'
    },
    {
      name: 'Test de Competencias de Liderazgo',
      description: 'Evaluación de habilidades de liderazgo, toma de decisiones, comunicación y gestión de equipos',
      type: 'leadership',
      duration_minutes: 35,
      is_active: false,
      questions_count: 45,
      max_attempts: 2,
      interpretation_template: 'leadership_template'
    },
    {
      name: 'Análisis de Resistencia al Estrés',
      description: 'Medición de la capacidad para manejar situaciones de presión y adaptabilidad a cambios',
      type: 'stress',
      duration_minutes: 25,
      is_active: false,
      questions_count: 35,
      max_attempts: 2,
      interpretation_template: 'stress_template'
    },
    {
      name: 'Perfil Motivacional Laboral',
      description: 'Identificación de factores motivacionales, valores laborales y preferencias de trabajo',
      type: 'motivation',
      duration_minutes: 20,
      is_active: false,
      questions_count: 30,
      max_attempts: 2,
      interpretation_template: 'motivation_template'
    }
  ];

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from('psychometric_tests')
        .select('*')
        .order('name');

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data || data.length === 0) {
        // Create default tests
        await createDefaultTests();
      } else {
        setTests(data);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast.error('Error al cargar los tests psicométricos');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTests = async () => {
    try {
      const { data, error } = await supabase
        .from('psychometric_tests')
        .insert(defaultTests)
        .select();

      if (error) throw error;
      setTests(data);
    } catch (error) {
      console.error('Error creating default tests:', error);
    }
  };

  const toggleTestStatus = async (testId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('psychometric_tests')
        .update({ is_active: newStatus })
        .eq('id', testId);

      if (error) throw error;

      setTests(prev => prev.map(test => 
        test.id === testId ? { ...test, is_active: newStatus } : test
      ));

      toast.success(`Test ${newStatus ? 'activado' : 'desactivado'} correctamente`);
    } catch (error) {
      console.error('Error updating test status:', error);
      toast.error('Error al actualizar el estado del test');
    }
  };

  const handleStartTest = (testId: string) => {
    console.log('Starting psychometric test:', testId);
    if (onStartTest) {
      onStartTest(testId);
    } else {
      // Create a simple test interface
      toast.success('Iniciando test psicométrico...');
      // Here you would navigate to the test interface
    }
  };

  const getTestIcon = (type: string) => {
    switch (type) {
      case 'personality': return <User className="h-6 w-6" />;
      case 'cognitive': return <Brain className="h-6 w-6" />;
      case 'leadership': return <Target className="h-6 w-6" />;
      case 'stress': return <Activity className="h-6 w-6" />;
      case 'motivation': return <CheckCircle className="h-6 w-6" />;
      default: return <Brain className="h-6 w-6" />;
    }
  };

  const getTestTypeLabel = (type: string) => {
    switch (type) {
      case 'personality': return 'Personalidad';
      case 'cognitive': return 'Cognitivo';
      case 'leadership': return 'Liderazgo';
      case 'stress': return 'Estrés';
      case 'motivation': return 'Motivacional';
      default: return 'General';
    }
  };

  const getTestTypeColor = (type: string) => {
    switch (type) {
      case 'personality': return 'bg-blue-100 text-blue-800';
      case 'cognitive': return 'bg-green-100 text-green-800';
      case 'leadership': return 'bg-purple-100 text-purple-800';
      case 'stress': return 'bg-orange-100 text-orange-800';
      case 'motivation': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando tests psicométricos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tests Psicométricos</h2>
          <p className="text-muted-foreground">
            Gestiona y activa los tests de evaluación para procesos de selección
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Tests Disponibles</TabsTrigger>
          <TabsTrigger value="management">Gestión</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.filter(test => test.is_active).map((test) => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-blue-600">
                        {getTestIcon(test.type)}
                      </div>
                      <Badge className={getTestTypeColor(test.type)}>
                        {getTestTypeLabel(test.type)}
                      </Badge>
                    </div>
                    <Badge variant="default">Activo</Badge>
                  </div>
                  <CardTitle className="text-lg">{test.name}</CardTitle>
                  <CardDescription>{test.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{test.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Settings className="h-4 w-4" />
                      <span>{test.questions_count} preguntas</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => handleStartTest(test.id)}
                  >
                    Aplicar Test
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {tests.filter(test => test.is_active).length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No hay tests activos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Active los tests necesarios desde la sección de Gestión
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="management">
          <div className="space-y-4">
            {tests.map((test) => (
              <Card key={test.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-blue-600">
                        {getTestIcon(test.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">{test.name}</h3>
                          <Badge className={getTestTypeColor(test.type)}>
                            {getTestTypeLabel(test.type)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">{test.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {test.duration_minutes} minutos
                          </span>
                          <span className="flex items-center gap-1">
                            <Settings className="h-4 w-4" />
                            {test.questions_count} preguntas
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            {test.max_attempts} intentos máx.
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`test-${test.id}`}
                        checked={test.is_active}
                        onCheckedChange={(checked) => toggleTestStatus(test.id, checked)}
                      />
                      <Label htmlFor={`test-${test.id}`}>
                        {test.is_active ? 'Activo' : 'Inactivo'}
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PsychometricTests;

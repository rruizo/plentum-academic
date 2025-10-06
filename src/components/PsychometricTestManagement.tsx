import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Users, Send, Settings, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import PsychometricTests from './PsychometricTests';
import PsychometricAssignmentManager from './PsychometricAssignmentManager';
import MassPsychometricAssignment from './MassPsychometricAssignment';
import PsychometricResultsViewer from './PsychometricResultsViewer';
import PsychometricResultsTab from './PsychometricResultsTab';
import { usePsychometricTestManagement } from '@/hooks/usePsychometricTestManagement';

const PsychometricTestManagement = () => {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tests');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { 
    tests, 
    loading, 
    fetchTests,
    isTestValid,
    getTestTypeColor 
  } = usePsychometricTestManagement();

  const handleTestActivated = (testId: string) => {
    toast.success('Test psicométrico activado exitosamente');
    fetchTests();
    setActiveTab('assign');
    setSelectedTest(testId);
  };

  const handleStartTest = (testId: string) => {
    console.log('Starting test assignment for:', testId);
    setSelectedTest(testId);
    setActiveTab('assign');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando información de tests psicométricos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Gestión de Tests Psicométricos
          </h2>
          <p className="text-muted-foreground">
            Administra y asigna evaluaciones psicométricas para procesos de selección
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tests">
            <Settings className="h-4 w-4 mr-2" />
            Tests Disponibles
          </TabsTrigger>
          <TabsTrigger value="assign">
            <Send className="h-4 w-4 mr-2" />
            Asignar Individual
          </TabsTrigger>
          <TabsTrigger value="mass-assign">
            <Users className="h-4 w-4 mr-2" />
            Asignación Masiva
          </TabsTrigger>
          <TabsTrigger value="results">
            <BarChart3 className="h-4 w-4 mr-2" />
            Resultados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-6">
          <PsychometricTests onStartTest={handleStartTest} />
        </TabsContent>

        <TabsContent value="assign" className="space-y-6">
          <PsychometricAssignmentTab 
            tests={tests}
            selectedTest={selectedTest}
            onTestSelect={setSelectedTest}
            getTestTypeColor={getTestTypeColor}
            isTestValid={isTestValid}
            onTestsTab={() => setActiveTab('tests')}
          />
        </TabsContent>

        <TabsContent value="mass-assign" className="space-y-6">
          <MassPsychometricAssignment />
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <PsychometricResultsTab 
            selectedSessionId={selectedSessionId}
            onSessionSelect={setSelectedSessionId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente para la pestaña de asignación individual
interface PsychometricAssignmentTabProps {
  tests: any[];
  selectedTest: string | null;
  onTestSelect: (testId: string) => void;
  getTestTypeColor: (type: string) => string;
  isTestValid: (test: any) => boolean;
  onTestsTab: () => void;
}

const PsychometricAssignmentTab = ({ 
  tests, 
  selectedTest, 
  onTestSelect, 
  getTestTypeColor, 
  isTestValid, 
  onTestsTab 
}: PsychometricAssignmentTabProps) => {
  const validTests = tests.filter(test => isTestValid(test));
  const selectedTestData = tests.find(test => test.id === selectedTest);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Seleccionar Test Psicométrico</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Elige un test activo para asignar a usuarios específicos
              </p>
            </div>

            {validTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {validTests.map((test) => (
                  <Card 
                    key={test.id} 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedTest === test.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onTestSelect(test.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Brain className="h-5 w-5 text-primary" />
                          <span 
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getTestTypeColor(test.type)}`}
                          >
                            {test.type}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm leading-tight">{test.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {test.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{test.duration_minutes} min</span>
                          <span>{test.questions_count} preguntas</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No hay tests activos disponibles
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Activa tests desde la pestaña "Tests Disponibles" para poder asignarlos
                </p>
                <button 
                  onClick={onTestsTab}
                  className="text-primary hover:text-primary/80 text-sm font-medium"
                >
                  Ir a Tests Disponibles →
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTest && selectedTestData && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <Brain className="h-5 w-5" />
            <span className="font-medium">
              Test seleccionado: {selectedTestData.name}
            </span>
          </div>
          
          <PsychometricAssignmentManager 
            selectedTestId={selectedTest}
            testTitle={selectedTestData.name}
          />
        </div>
      )}
    </div>
  );
};

export default PsychometricTestManagement;
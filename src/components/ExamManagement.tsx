
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Play, Pause, Calendar, Users, BarChart3, Brain, ArrowLeft, Info } from 'lucide-react';
import { useExamData } from '@/hooks/useExamData';
import { toast } from 'sonner';
import ConfiabilityExamCreation from './ConfiabilityExamCreation';
import AdminExamList from './AdminExamList';
import PsychometricTests from './PsychometricTests';
import PsychometricTestTaking from './PsychometricTestTaking';
import ExamList from './ExamList';
import ExamTakingInterface from './ExamTakingInterface';
import EvaluacionCognitivaIntegral from './EvaluacionCognitivaIntegral';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExamManagementProps {
  userRole?: string;
}

const ExamManagement = ({ userRole = 'student' }: ExamManagementProps) => {
  const { exams, loading } = useExamData();
  const [activeTab, setActiveTab] = useState('available');
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [showTestTaking, setShowTestTaking] = useState(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [showExamTaking, setShowExamTaking] = useState(false);
  const [showCognitiveEvaluation, setShowCognitiveEvaluation] = useState(false);

  const handleStartPsychometricTest = (testId: string) => {
    setCurrentTestId(testId);
    setShowTestTaking(true);
  };

  const handleCompleteTest = () => {
    setShowTestTaking(false);
    setCurrentTestId(null);
    toast.success('Test completado exitosamente');
  };

  const handleBackFromTest = () => {
    setShowTestTaking(false);
    setCurrentTestId(null);
  };

  const handleStartExam = (examId: string) => {
    setActiveExamId(examId);
    setShowExamTaking(true);
  };

  const handleExamComplete = (attemptId: string) => {
    setShowExamTaking(false);
    setActiveExamId(null);
    toast.success('Examen completado exitosamente');
  };

  const handleBackFromExam = () => {
    setShowExamTaking(false);
    setActiveExamId(null);
  };

  const handleStartCognitiveEvaluation = () => {
    setShowCognitiveEvaluation(true);
  };

  const handleCompleteCognitiveEvaluation = () => {
    setShowCognitiveEvaluation(false);
    toast.success('Evaluación Cognitiva Integral completada exitosamente');
  };

  const handleBackFromCognitiveEvaluation = () => {
    setShowCognitiveEvaluation(false);
  };

  if (showExamTaking && activeExamId) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackFromExam}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la gestión de exámenes
        </Button>
        <ExamTakingInterface 
          examId={activeExamId} 
          onComplete={handleExamComplete}
        />
      </div>
    );
  }

  if (showTestTaking && currentTestId) {
    return (
      <div className="space-y-4">
        <PsychometricTestTaking
          onComplete={handleCompleteTest}
          onBack={handleBackFromTest}
        />
      </div>
    );
  }

  if (showCognitiveEvaluation) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackFromCognitiveEvaluation}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la gestión de exámenes
        </Button>
        <EvaluacionCognitivaIntegral 
          userRole={userRole}
          onComplete={handleCompleteCognitiveEvaluation}
        />
      </div>
    );
  }

  if (showCreateExam) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setShowCreateExam(false)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la gestión de exámenes
        </Button>
        <ConfiabilityExamCreation />
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando exámenes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Exámenes</h2>
          <p className="text-muted-foreground">
            Administra exámenes de confiabilidad y tests psicométricos
          </p>
        </div>
        {userRole === 'admin' && (
          <Button onClick={() => setShowCreateExam(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Examen
          </Button>
        )}
      </div>

      {/* Sistema unificado notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Sistema Unificado:</strong> Todos los exámenes se gestionan desde esta interfaz principal. 
          {userRole === 'admin' && ' Como administrador, tienes acceso completo a todas las funcionalidades de gestión.'}
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tabs responsivos con scroll horizontal en móvil */}
        <div className="w-full overflow-x-auto">
          <TabsList className={`grid w-full min-w-max ${userRole === 'admin' ? 'grid-cols-5' : 'grid-cols-4'} lg:min-w-full`}>
            <TabsTrigger value="available" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">
              <span className="hidden sm:inline">Exámenes </span>Disponibles
            </TabsTrigger>
            <TabsTrigger value="taking" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">
              <span className="hidden sm:inline">Tomar </span>Exámenes
            </TabsTrigger>
            <TabsTrigger value="cognitive" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">
              <Brain className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Evaluación </span>Cognitiva
            </TabsTrigger>
            <TabsTrigger value="psychometric" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">
              <span className="hidden sm:inline">Tests </span>Psicométricos
            </TabsTrigger>
            {userRole === 'admin' && (
              <TabsTrigger value="admin" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">
                Admin
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="available">
          <AdminExamList userRole={userRole} />
        </TabsContent>

        <TabsContent value="taking">
          <ExamList onStartExam={handleStartExam} />
        </TabsContent>

        <TabsContent value="cognitive">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Brain className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Evaluación Cognitiva Integral</CardTitle>
              <CardDescription>
                Evaluación completa de habilidades cognitivas según especificación LMS
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Esta evaluación incluye 100-150 preguntas distribuidas en 7 áreas cognitivas principales, 
                similar a los sistemas de gestión de aprendizaje (LMS) como Moodle.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-6">
                <div className="p-3 bg-muted rounded text-center">
                  <div className="font-semibold text-sm">Razonamiento</div>
                  <div className="text-xs text-muted-foreground break-words">Verbal, Numérico, Abstracto</div>
                </div>
                <div className="p-3 bg-muted rounded text-center">
                  <div className="font-semibold text-sm">Memoria</div>
                  <div className="text-xs text-muted-foreground break-words">Trabajo y Retención</div>
                </div>
                <div className="p-3 bg-muted rounded text-center">
                  <div className="font-semibold text-sm">Velocidad</div>
                  <div className="text-xs text-muted-foreground break-words">Procesamiento</div>
                </div>
                <div className="p-3 bg-muted rounded text-center">
                  <div className="font-semibold text-sm">Atención</div>
                  <div className="text-xs text-muted-foreground break-words">Sostenida</div>
                </div>
              </div>
              
              <Button 
                onClick={handleStartCognitiveEvaluation} 
                size="lg"
                className="px-8"
              >
                <Brain className="h-5 w-5 mr-2" />
                Iniciar Evaluación Cognitiva Integral
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="psychometric">
          <PsychometricTests onStartTest={handleStartPsychometricTest} />
        </TabsContent>

        {userRole === 'admin' && (
          <TabsContent value="admin">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <Card key={exam.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{exam.title}</span>
                      <Badge variant={exam.estado === 'activo' ? 'default' : 'secondary'}>
                        {exam.estado}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {exam.description || 'Sin descripción'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Duración:</span>
                        <span>{exam.duracion_minutos} min</span>
                      </div>
                      {exam.fecha_apertura && (
                        <div className="flex justify-between">
                          <span>Apertura:</span>
                          <span>{new Date(exam.fecha_apertura).toLocaleDateString()}</span>
                        </div>
                      )}
                      {exam.fecha_cierre && (
                        <div className="flex justify-between">
                          <span>Cierre:</span>
                          <span>{new Date(exam.fecha_cierre).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ExamManagement;

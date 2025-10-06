import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Brain, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Calendar,
  Shield,
  UserCheck
} from "lucide-react";
import { useAuth } from "./auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssignedExam {
  id: string;
  exam_id?: string;
  psychometric_test_id?: string;
  test_type: string;
  status: string;
  access_link?: string;
  assigned_at: string;
  exam?: {
    title: string;
    description?: string;
    duracion_minutos?: number;
  };
  psychometric_test?: {
    name: string;
    description?: string;
    duration_minutes?: number;
  };
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [assignedExams, setAssignedExams] = useState<AssignedExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssignedExams();
    }
  }, [user]);

  const fetchAssignedExams = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Combinar todas las asignaciones
      const allExams: AssignedExam[] = [];

      // 1. OCEAN TEST - Siempre disponible por defecto
      allExams.push({
        id: `ocean-default-${user.id}`,
        psychometric_test_id: '2689a979-118c-47a2-8fef-f968a87d4d00', // ID del test OCEAN
        test_type: 'psychometric',
        status: 'notified', // Status correcto para mostrar como disponible
        access_link: `/exam-access?type=psychometric&test=2689a979-118c-47a2-8fef-f968a87d4d00&user=${user.id}`,
        assigned_at: new Date().toISOString(),
        psychometric_test: {
          name: 'Test de Personalidad OCEAN (Big Five)',
          description: 'Evaluación de los cinco grandes factores de personalidad',
          duration_minutes: 30
        }
      });

      // 2. HTP TEST - Siempre disponible por defecto  
      allExams.push({
        id: `htp-default-${user.id}`,
        test_type: 'htp',
        status: 'notified', // Status correcto para mostrar como disponible
        access_link: `/htp-exam/${user.id}`,
        assigned_at: new Date().toISOString(),
        exam: {
          title: 'Test HTP (Casa-Árbol-Persona)',
          description: 'Test proyectivo de personalidad',
          duracion_minutos: 60
        }
      });

      // 3. Obtener solo exámenes de CONFIABILIDAD asignados específicamente
      const { data: reliabilityExams, error: reliabilityError } = await supabase
        .from('exam_assignments')
        .select(`
          id,
          exam_id,
          test_type,
          status,
          access_link,
          assigned_at,
          exams (
            title,
            description,
            duracion_minutos
          )
        `)
        .eq('user_id', user.id)
        .eq('test_type', 'reliability')
        .in('status', ['notified', 'assigned', 'started']) // Solo mostrar exámenes activos
        .order('assigned_at', { ascending: false });

      if (reliabilityError) {
        console.error('Error fetching reliability exams:', reliabilityError);
      } else {
        // Agregar exámenes de confiabilidad asignados
        if (reliabilityExams) {
          reliabilityExams.forEach(exam => {
            allExams.push({
              id: exam.id,
              exam_id: exam.exam_id,
              test_type: exam.test_type,
              status: exam.status,
              access_link: exam.access_link,
              assigned_at: exam.assigned_at,
              exam: exam.exams
            });
          });
        }
      }

      // Ordenar: más recientes primero
      allExams.sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());
      
      setAssignedExams(allExams);
    } catch (error) {
      console.error('Error fetching assigned exams:', error);
      toast.error('Error al cargar los exámenes asignados');
    } finally {
      setLoading(false);
    }
  };

  const getExamTitle = (exam: AssignedExam) => {
    if (exam.exam) return exam.exam.title;
    if (exam.psychometric_test) return exam.psychometric_test.name;
    return 'Examen';
  };

  const getExamDescription = (exam: AssignedExam) => {
    if (exam.exam) return exam.exam.description;
    if (exam.psychometric_test) return exam.psychometric_test.description;
    return 'Sin descripción disponible';
  };

  const getDuration = (exam: AssignedExam) => {
    if (exam.exam) return exam.exam.duracion_minutos;
    if (exam.psychometric_test) return exam.psychometric_test.duration_minutes;
    return 60; // Default
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'started': return 'bg-yellow-100 text-yellow-800';
      case 'notified': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'started': return 'En progreso';
      case 'notified': return 'Disponible';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  const getTestTypeIcon = (testType: string) => {
    switch (testType) {
      case 'psychometric': return Brain;
      case 'htp': return FileText;
      default: return FileText;
    }
  };

  const handleStartExam = (exam: AssignedExam) => {
    if (exam.access_link) {
      // Si el enlace ya es una URL completa, usarla directamente
      // Si es una ruta relativa, navegar usando React Router
      if (exam.access_link.startsWith('http')) {
        window.location.href = exam.access_link;
      } else {
        window.location.href = exam.access_link;
      }
    } else {
      toast.error('Enlace de acceso no disponible');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Mis Exámenes</h1>
          <p className="text-muted-foreground">
            Aquí puedes ver y acceder a todos los exámenes que te han sido asignados.
          </p>
        </div>

        {/* Important Notice about Results */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Información importante:</strong> Los resultados de tus exámenes serán revisados por profesionales calificados. 
            No podrás consultar los resultados directamente, pero recibirás retroalimentación a través de los canales apropiados 
            de tu organización.
          </AlertDescription>
        </Alert>
      </div>

      {/* Sin exámenes asignados */}
      {assignedExams.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes exámenes asignados en este momento. Los exámenes aparecerán aquí cuando te sean asignados por un administrador o instructor.
          </AlertDescription>
        </Alert>
      )}

      {/* Information about completed exams */}
      {assignedExams.some(exam => exam.status === 'completed') && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Exámenes completados:</strong> Tus exámenes completados están siendo evaluados por profesionales calificados. 
            Los resultados y retroalimentación se proporcionarán a través de los canales oficiales de tu organización.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de exámenes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignedExams.map((exam) => {
          const Icon = getTestTypeIcon(exam.test_type);
          
          return (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(exam.status)}
                    >
                      {getStatusText(exam.status)}
                    </Badge>
                  </div>
                  {exam.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <CardTitle className="text-lg leading-tight">
                  {getExamTitle(exam)}
                </CardTitle>
                <CardDescription className="text-sm">
                  {getExamDescription(exam)}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{getDuration(exam)} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(exam.assigned_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {exam.status !== 'completed' && exam.access_link && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleStartExam(exam)}
                    disabled={exam.status === 'pending'}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {exam.status === 'started' ? 'Continuar Examen' : 'Iniciar Examen'}
                  </Button>
                )}

                {exam.status === 'completed' && (
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" disabled>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Examen Completado
                    </Button>
                    <div className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      <span>En revisión por profesionales</span>
                    </div>
                  </div>
                )}

                {exam.status === 'pending' && (
                  <Button variant="outline" className="w-full" disabled>
                    <Clock className="h-4 w-4 mr-2" />
                    Pendiente de Activación
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StudentDashboard;
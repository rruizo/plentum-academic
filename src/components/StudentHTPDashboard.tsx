import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Calendar,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from './auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HTPAssignment {
  id: string;
  user_id: string;
  assigned_by: string;
  access_link: string;
  status: string;
  expires_at: string | null;
  email_sent: boolean;
  created_at: string;
  updated_at: string;
  submission?: {
    id: string;
    submitted_at: string;
    analysis_generated: boolean;
  };
}

const StudentHTPDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<HTPAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHTPAssignments();
    }
  }, [user]);

  const fetchHTPAssignments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Obtener asignaciones HTP del usuario
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('htp_assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Para cada asignación, verificar si ya hay una submission
      const enrichedAssignments = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { data: submissionData } = await supabase
            .from('htp_submissions')
            .select('id, submitted_at, analysis_generated')
            .eq('assignment_id', assignment.id)
            .eq('user_id', user.id)
            .single();

          return {
            ...assignment,
            submission: submissionData || undefined
          };
        })
      );

      setAssignments(enrichedAssignments);

    } catch (error: any) {
      console.error('Error fetching HTP assignments:', error);
      toast.error('Error al cargar las asignaciones HTP: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (assignment: HTPAssignment) => {
    if (assignment.submission) {
      return assignment.submission.analysis_generated ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
    }
    
    if (assignment.expires_at && new Date(assignment.expires_at) < new Date()) {
      return 'bg-red-100 text-red-800';
    }
    
    switch (assignment.status) {
      case 'notified':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (assignment: HTPAssignment) => {
    if (assignment.submission) {
      return assignment.submission.analysis_generated ? 'Completado y Analizado' : 'Completado';
    }
    
    if (assignment.expires_at && new Date(assignment.expires_at) < new Date()) {
      return 'Expirado';
    }
    
    switch (assignment.status) {
      case 'notified':
        return 'Disponible';
      case 'completed':
        return 'Completado';
      default:
        return 'Pendiente';
    }
  };

  const canStartExam = (assignment: HTPAssignment) => {
    if (assignment.submission) return false; // Ya completado
    if (assignment.expires_at && new Date(assignment.expires_at) < new Date()) return false; // Expirado
    return assignment.status === 'notified';
  };

  const handleStartExam = (assignment: HTPAssignment) => {
    // Navegar usando el user_id directamente como access_link
    window.location.href = `/htp-exam/${user?.id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Cargando exámenes HTP...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Exámenes HTP Asignados</h2>
          <p className="text-muted-foreground">
            Gestiona tus evaluaciones proyectivas House-Tree-Person
          </p>
        </div>
      </div>

      {/* Información importante */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Los exámenes HTP son evaluaciones psicológicas proyectivas. 
          Sigue las instrucciones cuidadosamente y asegúrate de completar el examen en un ambiente tranquilo.
        </AlertDescription>
      </Alert>

      {/* Lista de asignaciones */}
      <div className="grid gap-4">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tienes exámenes HTP asignados</h3>
                <p className="text-muted-foreground">
                  Cuando te asignen un examen HTP, aparecerá aquí.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Test HTP (Casa-Árbol-Persona)
                    </CardTitle>
                    <CardDescription>
                      Evaluación proyectiva de personalidad
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(assignment)}>
                    {getStatusText(assignment)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Asignado: {new Date(assignment.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Duración estimada: 60 minutos</span>
                  </div>
                  {assignment.expires_at && (
                    <div className="flex items-center gap-2 col-span-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Válido hasta: {new Date(assignment.expires_at).toLocaleDateString()}
                        {new Date(assignment.expires_at) < new Date() && (
                          <span className="text-red-600 ml-1">(Expirado)</span>
                        )}
                      </span>
                    </div>
                  )}
                  {assignment.submission && (
                    <div className="flex items-center gap-2 col-span-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>
                        Completado el: {new Date(assignment.submission.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {assignment.submission ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Examen completado exitosamente.</strong> 
                      {assignment.submission.analysis_generated 
                        ? ' Tu análisis psicológico ha sido generado y será revisado por el área de Recursos Humanos.'
                        : ' Tu evaluación está siendo procesada por nuestro equipo.'
                      }
                    </AlertDescription>
                  </Alert>
                ) : canStartExam(assignment) ? (
                  <Button 
                    onClick={() => handleStartExam(assignment)}
                    className="w-full"
                    size="lg"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Iniciar Examen HTP
                  </Button>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {assignment.expires_at && new Date(assignment.expires_at) < new Date()
                        ? 'Este examen ha expirado. Contacta a Recursos Humanos para obtener una nueva asignación.'
                        : 'Este examen no está disponible en este momento.'
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>¿Qué es el Test HTP?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            El Test HTP (Casa-Árbol-Persona) es una técnica proyectiva que permite evaluar aspectos 
            de la personalidad, emociones y relaciones interpersonales a través del dibujo.
          </p>
          <p className="text-sm text-muted-foreground">
            Durante el examen, se te pedirá que dibujes una persona bajo la lluvia y proporciones 
            una explicación de tu dibujo. Es importante que sigas las instrucciones cuidadosamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentHTPDashboard;
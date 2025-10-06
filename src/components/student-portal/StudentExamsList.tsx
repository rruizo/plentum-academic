import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ExamStatusBadge from '@/components/exam/ExamStatusBadge';
import { isExamAccessExpired } from '@/utils/examUtils';

interface ExamAssignment {
  id: string;
  exam_id: string;
  psychometric_test_id: string | null;
  test_type: string;
  status: string;
  assigned_at: string;
  credentials?: {
    expires_at: string;
    is_used: boolean;
  };
  exam?: {
    title: string;
    description: string;
    duracion_minutos: number;
    fecha_cierre?: string;
    fecha_apertura?: string;
    estado: string;
  };
  psychometric_test?: {
    name: string;
    description: string;
  };
}

interface StudentExamsListProps {
  userId: string;
  userEmail: string;
}

const StudentExamsList: React.FC<StudentExamsListProps> = ({ userId, userEmail }) => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<ExamAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, [userId]);

  const fetchAssignments = async () => {
    console.log('[StudentExamsList] Fetching assignments for user:', userId);
    try {
      // Usar función RPC segura que no requiere sesión Auth
      const { data, error } = await supabase
        .rpc('get_user_exam_assignments', {
          p_user_id: userId
        });

      if (error) {
        console.error('[StudentExamsList] Error fetching assignments:', error);
        throw error;
      }

      console.log('[StudentExamsList] Raw data from RPC:', data);
      console.log('[StudentExamsList] Number of assignments found:', data?.length || 0);

      // Transformar datos para coincidir con la estructura esperada
      const assignmentsWithCredentials = await Promise.all(
        (data || []).map(async (row: any) => {
          // Obtener credenciales usando función RPC segura
          const { data: credentialsData } = await supabase
            .rpc('get_exam_credentials_for_user', {
              p_user_email: userEmail,
              p_test_type: row.test_type,
              p_exam_id: row.exam_id,
              p_psychometric_test_id: row.psychometric_test_id
            });

          const credentials = credentialsData?.[0];
          
          return {
            id: row.id,
            exam_id: row.exam_id,
            psychometric_test_id: row.psychometric_test_id,
            test_type: row.test_type,
            status: row.status,
            assigned_at: row.assigned_at,
            credentials: credentials,
            exam: row.exam_title ? {
              title: row.exam_title,
              description: row.exam_description,
              duracion_minutos: row.exam_duracion_minutos,
              fecha_cierre: row.exam_fecha_cierre,
              fecha_apertura: row.exam_fecha_apertura,
              estado: row.exam_estado
            } : null,
            psychometric_test: row.psychometric_name ? {
              name: row.psychometric_name,
              description: row.psychometric_description
            } : null
          };
        })
      );

      console.log('[StudentExamsList] Assignments with credentials:', assignmentsWithCredentials);

      // HYBRID EXPIRATION FILTER: Check both exam close date AND credential expiration
      const validAssignments = assignmentsWithCredentials.filter((assignment: any) => {
        console.log('[StudentExamsList] Filtering assignment:', assignment.id, 'type:', assignment.test_type);
        
        if (assignment.test_type === 'reliability' && assignment.exam) {
          const exam = assignment.exam;
          const isActive = exam.estado === 'activo';
          const isNotExpired = !isExamAccessExpired(exam, assignment.credentials);
          console.log('[StudentExamsList] Reliability exam:', exam.title, 'isActive:', isActive, 'isNotExpired:', isNotExpired);
          return isActive && isNotExpired;
        }
        
        if (assignment.test_type === 'psychometric' && assignment.psychometric_test) {
          const isNotExpired = !assignment.credentials || !isExamAccessExpired({}, assignment.credentials);
          console.log('[StudentExamsList] Psychometric test:', assignment.psychometric_test.name, 'isNotExpired:', isNotExpired);
          return isNotExpired;
        }
        
        if (assignment.test_type === 'htp') {
          console.log('[StudentExamsList] HTP assignment:', assignment.id, 'allowing');
          return true;
        }
        
        // Handle turnover and other types
        console.log('[StudentExamsList] Other type assignment:', assignment.test_type, 'allowing by default');
        return true;
      });

      console.log('[StudentExamsList] Valid assignments after filtering:', validAssignments);

      setAssignments(validAssignments);
    } catch (error) {
      console.error('Error cargando exámenes:', error);
      toast.error('Error al cargar los exámenes');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (assignment: ExamAssignment) => {
    try {
      console.log('[StudentExamsList] Starting exam:', assignment.test_type, assignment.id);

      // Manejar HTP de forma especial
      if (assignment.test_type === 'htp') {
        navigate(`/htp-exam?userId=${userId}`);
        return;
      }

      // Usar función RPC segura para crear/obtener sesión
      const { data, error } = await supabase.rpc('start_exam_session', {
        p_user_id: userId,
        p_exam_id: assignment.exam_id || null,
        p_psychometric_test_id: assignment.psychometric_test_id || null,
        p_test_type: assignment.test_type,
        p_assignment_id: assignment.id
      });

      if (error) {
        console.error('[StudentExamsList] Error starting exam:', error);
        throw error;
      }

      const result = data as { success: boolean; session_id?: string; error?: string };

      if (!result?.success) {
        console.error('[StudentExamsList] Failed to start exam:', result?.error);
        throw new Error(result?.error || 'Error desconocido');
      }

      console.log('[StudentExamsList] Exam session created:', result.session_id);

      // Navegar a la sesión de examen (maneja todos los tipos automáticamente)
      navigate(`/exam-session/${result.session_id}`);
      
    } catch (error) {
      console.error('[StudentExamsList] Error iniciando examen:', error);
      toast.error('Error al iniciar el examen');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Cargando exámenes...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent className="space-y-4">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-semibold">No hay exámenes pendientes</h3>
          <p className="text-muted-foreground">
            No tienes exámenes asignados en este momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Exámenes Asignados</h2>
        <p className="text-muted-foreground mt-2">
          Seleccione un examen para comenzar
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => {
          const isReliability = assignment.test_type === 'reliability';
          const exam = isReliability ? assignment.exam : null;
          const psychTest = !isReliability ? assignment.psychometric_test : null;
          
          // Determinar título y descripción según tipo
          let title = 'Sin título';
          let description = '';
          let duration = 60;
          
          if (assignment.test_type === 'reliability' && exam) {
            // Para exámenes de confiabilidad regulares
            title = exam.title || 'Examen de Confiabilidad';
            description = exam.description || '';
            duration = exam.duracion_minutos || 60;
          } else if (assignment.test_type === 'turnover') {
            // Para examen de rotación de personal (no tiene exam asociado)
            title = 'Examen de Rotación de Personal';
            description = 'Evaluación de factores de riesgo de rotación de personal';
            duration = 30;
          } else if (assignment.test_type === 'psychometric' && psychTest) {
            title = psychTest.name || 'Test Psicométrico';
            description = psychTest.description || '';
            duration = 60;
          } else if (assignment.test_type === 'htp') {
            title = 'Test HTP (Casa-Árbol-Persona)';
            description = 'Test proyectivo psicológico Casa-Árbol-Persona';
            duration = 60;
          } else {
            // Fallback para tipos desconocidos
            title = 'Examen Sin Título';
            description = '';
            duration = 60;
          }

          return (
            <Card key={assignment.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant={assignment.status === 'started' ? 'default' : 'secondary'}>
                      {assignment.status === 'started' ? 'En progreso' : 'Pendiente'}
                    </Badge>
                    {exam && <ExamStatusBadge exam={exam} credentials={assignment.credentials} showExpirationDate />}
                  </div>
                </div>
                <CardTitle className="mt-4">{title}</CardTitle>
                {description && (
                  <CardDescription className="line-clamp-2">
                    {description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{duration} minutos</span>
                </div>
                
                <Button 
                  onClick={() => handleStartExam(assignment)}
                  className="w-full"
                >
                  {assignment.status === 'started' ? 'Continuar Examen' : 'Iniciar Examen'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StudentExamsList;

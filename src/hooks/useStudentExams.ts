
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AssignedExam {
  id: string;
  exam_id: string;
  status: string;
  assigned_at: string;
  access_link: string;
  exams: {
    title: string;
    description: string;
    duracion_minutos: number;
    fecha_cierre: string;
  };
}

export const useStudentExams = () => {
  const [assignedExams, setAssignedExams] = useState<AssignedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignedExams();
  }, []);

  const fetchAssignedExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuario no autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('exam_assignments')
        .select(`
          *,
          exams (
            title,
            description,
            duracion_minutos,
            fecha_cierre
          )
        `)
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setAssignedExams(data || []);
    } catch (error) {
      console.error('Error fetching assigned exams:', error);
      toast.error('Error al cargar exámenes asignados');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (assignment: AssignedExam) => {
    try {
      // Verificar si el examen está vigente
      if (assignment.exams.fecha_cierre && new Date(assignment.exams.fecha_cierre) < new Date()) {
        toast.error('Este examen ha expirado');
        return;
      }

      if (assignment.status === 'completed') {
        toast.error('Ya has completado este examen');
        return;
      }

      // Actualizar estado a 'started'
      const { error } = await supabase
        .from('exam_assignments')
        .update({ status: 'started' })
        .eq('id', assignment.id);

      if (error) throw error;

      // Navegar directamente a la interfaz del examen en modo kiosko
      navigate(`/exam-access/${assignment.exam_id}`, { 
        state: { 
          kioskMode: true,
          assignmentId: assignment.id 
        } 
      });
      
    } catch (error) {
      console.error('Error starting exam:', error);
      toast.error('Error al iniciar el examen');
    }
  };

  const canStartExam = (assignment: AssignedExam) => {
    if (assignment.status === 'completed') return false;
    if (assignment.exams.fecha_cierre && new Date(assignment.exams.fecha_cierre) < new Date()) return false;
    return true;
  };

  return {
    assignedExams,
    loading,
    handleStartExam,
    canStartExam
  };
};

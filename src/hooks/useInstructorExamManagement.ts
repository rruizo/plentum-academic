
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Exam {
  id: string;
  title: string;
  description: string;
  estado: string;
  created_at: string;
  fecha_cierre: string;
  duracion_minutos: number;
}

export const useInstructorExamManagement = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .in('estado', ['activo', 'borrador'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Error al cargar los exámenes');
    } finally {
      setLoading(false);
    }
  };

  const isExamValid = (exam: Exam) => {
    if (exam.estado !== 'activo') return false;
    if (exam.fecha_cierre && new Date(exam.fecha_cierre) < new Date()) return false;
    return true;
  };

  const getExamStatusColor = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800';
      case 'borrador':
        return 'bg-gray-100 text-gray-800';
      case 'pausado':
        return 'bg-yellow-100 text-yellow-800';
      case 'finalizado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  return {
    exams,
    loading,
    fetchExams,
    isExamValid,
    getExamStatusColor
  };
};

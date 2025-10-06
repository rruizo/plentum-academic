import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  nombre: string;
  description?: string;
  codigo_categoria?: string;
  explicacion?: string;
}

export interface Question {
  id: string;
  category_id: string;
  question_text?: string;
  texto_pregunta?: string;
  media_poblacional_pregunta?: 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente';
  opciones_respuesta_fijas?: any;
  question_categories?: { name: string; nombre: string };
  difficulty_level?: number;
  weight?: number;
  is_control_question?: boolean;
  national_average?: 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente';
  category_name?: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  fecha_apertura?: string;
  fecha_cierre?: string;
  duracion_minutos?: number;
  estado?: string;
  created_by: string;
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  fecha_inicio?: string;
  fecha_finalizacion?: string;
  tiempo_restante_minutos?: number;
  estado: string;
  puntaje_total?: number;
}

export interface ExamCategoryConfig {
  id: string;
  examen_id: string;
  categoria_id: string;
  num_preguntas_a_incluir: number;
}

export interface ExamAnswer {
  id: string;
  exam_attempt_id: string;
  question_id: string;
  answer_text: 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente';
  score_obtained: number;
  timestamp_answer?: string;
}

// Función para convertir número a texto desde Supabase
const convertNumberToText = (value: number | string | null): 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente' => {
  if (typeof value === 'string') {
    // Si ya es string, verificar que sea un valor válido
    if (['Nunca', 'Rara vez', 'A veces', 'Frecuentemente'].includes(value)) {
      return value as 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente';
    }
  }
  
  if (typeof value === 'number') {
    switch (value) {
      case 0: return 'Nunca';
      case 1: return 'Rara vez';
      case 2: return 'A veces';
      case 3: return 'Frecuentemente';
      default: return 'Nunca';
    }
  }
  
  return 'Nunca';
};

export const useExamData = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_categories')
        .select('*')
        .order('nombre');
      
      if (error) throw error;
      
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          question_categories (
            name,
            nombre
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Mapear los datos para asegurar compatibilidad de tipos
      const mappedQuestions = (data || []).map(q => ({
        ...q,
        media_poblacional_pregunta: convertNumberToText(q.media_poblacional_pregunta) as 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente',
        national_average: convertNumberToText(q.national_average) as 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente',
        category_name: q.question_categories?.nombre || q.question_categories?.name
      }));
      
      setQuestions(mappedQuestions as Question[]);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async (questionData: Partial<Question>) => {
    try {
      if (!questionData.category_id || (!questionData.question_text && !questionData.texto_pregunta)) {
        throw new Error('Campos requeridos faltantes');
      }

      const insertData = {
        category_id: questionData.category_id,
        question_text: questionData.question_text || questionData.texto_pregunta,
        texto_pregunta: questionData.texto_pregunta || questionData.question_text,
        question_type: 'scale',
        options: JSON.stringify(['Nunca', 'Rara vez', 'A veces', 'Frecuentemente']),
        opciones_respuesta_fijas: JSON.stringify(['Nunca', 'Rara vez', 'A veces', 'Frecuentemente']),
        media_poblacional_pregunta: questionData.media_poblacional_pregunta || 'Nunca',
        difficulty_level: questionData.difficulty_level || 1,
        weight: questionData.weight || 1,
        is_control_question: questionData.is_control_question || false,
        national_average: 0 // Almacenar como número en la base de datos
      };

      const { data, error } = await supabase
        .from('questions')
        .insert(insertData)
        .select();
      
      if (error) throw error;
      await fetchQuestions();
      return data;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  };

  const updateQuestion = async (questionId: string, questionData: Partial<Question>) => {
    try {
      const updateData = {
        category_id: questionData.category_id,
        question_text: questionData.question_text || questionData.texto_pregunta,
        texto_pregunta: questionData.texto_pregunta || questionData.question_text,
        media_poblacional_pregunta: questionData.media_poblacional_pregunta,
        difficulty_level: questionData.difficulty_level,
        weight: questionData.weight,
        is_control_question: questionData.is_control_question,
        national_average: 0 // Almacenar como número en la base de datos
      };

      const { data, error } = await supabase
        .from('questions')
        .update(updateData)
        .eq('id', questionId)
        .select();
      
      if (error) throw error;
      await fetchQuestions();
      return data;
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      await fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  };

  const createExam = async (examData: Partial<Exam>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      if (!examData.title) {
        throw new Error('El título del examen es requerido');
      }

      const { data, error } = await supabase
        .from('exams')
        .insert({
          title: examData.title,
          description: examData.description,
          created_by: user.id,
          fecha_apertura: examData.fecha_apertura,
          fecha_cierre: examData.fecha_cierre,
          duracion_minutos: examData.duracion_minutos || 60,
          estado: examData.estado || 'borrador'
        })
        .select();
      
      if (error) throw error;
      await fetchExams();
      return data;
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  };

  const createCategory = async (categoryData: Partial<Category>) => {
    try {
      if (!categoryData.name && !categoryData.nombre) {
        throw new Error('El nombre de la categoría es requerido');
      }

      const name = categoryData.name || categoryData.nombre;
      const { data, error } = await supabase
        .from('question_categories')
        .insert({
          name: name,
          nombre: name,
          description: categoryData.description,
          codigo_categoria: categoryData.codigo_categoria,
          explicacion: categoryData.explicacion
        })
        .select();
      
      if (error) throw error;
      await fetchCategories();
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const updateCategory = async (categoryId: string, categoryData: Partial<Category>) => {
    try {
      const name = categoryData.name || categoryData.nombre;
      const { data, error } = await supabase
        .from('question_categories')
        .update({
          name: name,
          nombre: name,
          description: categoryData.description,
          codigo_categoria: categoryData.codigo_categoria,
          explicacion: categoryData.explicacion
        })
        .eq('id', categoryId)
        .select();
      
      if (error) throw error;
      await fetchCategories();
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('question_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  const importCategories = async (categoriesData: Partial<Category>[]) => {
    try {
      console.log('Iniciando importación de categorías:', categoriesData.length);
      
      const validCategories = categoriesData.filter(c => {
        const hasName = c.name || c.nombre;
        if (!hasName) {
          console.error('Categoría inválida:', c);
          return false;
        }
        return true;
      });
      
      if (validCategories.length === 0) {
        throw new Error('No hay categorías válidas para importar');
      }
      
      console.log(`Insertando ${validCategories.length} categorías válidas`);
      
      const categoriesToInsert = validCategories.map(c => {
        const name = c.name || c.nombre!;
        return {
          name: name,
          nombre: name,
          description: c.description || '',
          codigo_categoria: c.codigo_categoria || '',
          explicacion: c.explicacion || ''
        };
      });

      const { data, error } = await supabase
        .from('question_categories')
        .insert(categoriesToInsert)
        .select();
      
      if (error) {
        console.error('Error en Supabase:', error);
        throw error;
      }
      
      console.log(`Categorías insertadas exitosamente:`, data?.length);
      
      await fetchCategories();
      return data;
    } catch (error) {
      console.error('Error importing categories:', error);
      throw error;
    }
  };

  const importQuestions = async (questionsData: Partial<Question>[]) => {
    try {
      console.log('Iniciando importación de preguntas:', questionsData.length);
      
      // Validar datos antes de insertar
      const validQuestions = questionsData.filter(q => {
        const hasText = q.question_text || q.texto_pregunta;
        if (!q.category_id || !hasText) {
          console.error('Pregunta inválida:', q);
          return false;
        }
        return true;
      });
      
      if (validQuestions.length === 0) {
        throw new Error('No hay preguntas válidas para importar');
      }
      
      console.log(`Insertando ${validQuestions.length} preguntas válidas`);
      
      const questionsToInsert = validQuestions.map(q => ({
        category_id: q.category_id!,
        question_text: q.question_text || q.texto_pregunta!,
        texto_pregunta: q.texto_pregunta || q.question_text!,
        question_type: 'scale',
        options: JSON.stringify(['Nunca', 'Rara vez', 'A veces', 'Frecuentemente']),
        opciones_respuesta_fijas: JSON.stringify(['Nunca', 'Rara vez', 'A veces', 'Frecuentemente']),
        media_poblacional_pregunta: q.media_poblacional_pregunta || 'Nunca',
        difficulty_level: q.difficulty_level || 1,
        weight: q.weight || 1,
        is_control_question: q.is_control_question || false,
        national_average: 0 // Almacenar como número en la base de datos
      }));

      const { data, error } = await supabase
        .from('questions')
        .insert(questionsToInsert)
        .select();
      
      if (error) {
        console.error('Error en Supabase:', error);
        throw error;
      }
      
      console.log(`Preguntas insertadas exitosamente:`, data?.length);
      
      // Refrescar la lista de preguntas
      await fetchQuestions();
      
      return data;
    } catch (error) {
      console.error('Error importing questions:', error);
      throw error;
    }
  };

  // Función para calcular puntaje de respuesta (traducción de lógica VBA)
  const calcularPuntajeRespuesta = (respuesta: string): number => {
    switch (respuesta) {
      case 'Nunca': return 0;
      case 'Rara vez': return 1;
      case 'A veces': return 2;
      case 'Frecuentemente': return 3;
      default: return 0;
    }
  };

  // Función para evaluar riesgo (traducción de lógica VBA)
  const evaluarRiesgo = (puntajeTotal: number, totalPreguntas: number): string => {
    if (puntajeTotal >= totalPreguntas * 2) {
      return 'RIESGO ALTO';
    } else if (puntajeTotal >= totalPreguntas * 1) {
      return 'RIESGO MEDIO';
    } else {
      return 'RIESGO BAJO';
    }
  };

  // Función para detectar posible simulación
  const detectarSimulacion = (diferencia: number): boolean => {
    return Math.abs(diferencia) > 5;
  };

  useEffect(() => {
    fetchCategories();
    fetchQuestions();
    fetchExams();
  }, []);

  return {
    categories,
    questions,
    exams,
    loading,
    fetchCategories,
    fetchQuestions,
    fetchExams,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createExam,
    createCategory,
    updateCategory,
    deleteCategory,
    importCategories,
    importQuestions,
    calcularPuntajeRespuesta,
    evaluarRiesgo,
    detectarSimulacion
  };
};

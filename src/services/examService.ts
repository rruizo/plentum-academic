import { supabase } from '@/integrations/supabase/client';
import { NetworkRetryService } from './networkRetryService';

export interface ExamQuestion {
  id: string;
  question_text: string;
  category_id: string;
  category_name: string;
  weight: number;
}

export interface ExamData {
  id: string;
  title: string;
  description?: string;
  type: string;
  psychometric_test_id?: string;
  duracion_minutos?: number;
  estado: string;
}

export interface SessionData {
  id: string;
  user_id: string;
  exam_id: string;
  psychometric_test_id?: string;
  test_type: string;
  status: string;
  end_time?: string;
  max_attempts: number;
  attempts_taken: number;
  exams?: any;
  psychometric_tests?: any;
}

export class ExamService {
  
  static async fetchExamById(examId: string): Promise<ExamData> {
    return await NetworkRetryService.retryWithBackoff(async () => {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*, type, psychometric_test_id')
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      return examData;
    });
  }

  static async fetchSessionById(sessionId: string): Promise<SessionData> {
    return await NetworkRetryService.retryWithBackoff(async () => {
      const { data: sessionData, error: sessionError } = await supabase
        .from('exam_sessions')
        .select(`
          *,
          exams (*, type, psychometric_test_id),
          psychometric_tests (id, name, description, is_active, duration_minutes)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      return sessionData;
    });
  }

  static async fetchPsychometricQuestions(): Promise<ExamQuestion[]> {
    const { data: psychometricQuestions, error: psychoError } = await supabase
      .from('personality_questions')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (psychoError) throw psychoError;

    return psychometricQuestions?.map(q => ({
      id: q.id,
      question_text: q.question_text,
      category_id: q.ocean_factor || 'personality',
      category_name: q.ocean_factor || 'Personalidad',
      weight: 1
    })) || [];
  }

  static async fetchReliabilityQuestions(examId: string): Promise<ExamQuestion[]> {
    const { data: categoryConfigs, error: configError } = await supabase
      .from('examen_configuracion_categoria')
      .select(`
        categoria_id,
        num_preguntas_a_incluir,
        question_categories (
          nombre
        )
      `)
      .eq('examen_id', examId);

    if (configError) throw configError;

    // Validar que el examen tenga configuración de categorías
    if (!categoryConfigs || categoryConfigs.length === 0) {
      throw new Error(`El examen ${examId} no tiene categorías configuradas. Configure al menos una categoría con preguntas válidas.`);
    }

    const selectedQuestions: ExamQuestion[] = [];
    let totalQuestionsNeeded = 0;
    let categoriesWithoutQuestions = [];
    
    for (const config of categoryConfigs) {
      totalQuestionsNeeded += config.num_preguntas_a_incluir;
      console.log(`[ExamService] Loading questions for category: ${config.categoria_id}, need: ${config.num_preguntas_a_incluir}`);
      
      // Solo buscar preguntas con texto válido
      const { data: categoryQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('category_id', config.categoria_id)
        .not('question_text', 'is', null)
        .neq('question_text', '');

      if (questionsError) throw questionsError;

      // Filtrar preguntas con texto vacío o solo espacios
      const validQuestions = categoryQuestions?.filter(q => {
        const questionText = q.question_text || q.texto_pregunta || '';
        return questionText.trim().length > 0;
      }) || [];

      console.log(`[ExamService] Found ${validQuestions.length} valid questions for category ${config.categoria_id} (total: ${categoryQuestions?.length || 0})`);

      if (validQuestions.length === 0) {
        console.warn(`[ExamService] No valid questions found for category: ${config.categoria_id}`);
        categoriesWithoutQuestions.push(config.question_categories.nombre);
        continue;
      }

      // Validar que hay suficientes preguntas para la configuración
      if (validQuestions.length < config.num_preguntas_a_incluir) {
        console.warn(`[ExamService] Category ${config.categoria_id} needs ${config.num_preguntas_a_incluir} questions but only has ${validQuestions.length} valid questions`);
      }

      const shuffled = validQuestions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, config.num_preguntas_a_incluir);
      
      selected.forEach(q => {
        // Doble validación del texto de la pregunta
        const questionText = q.question_text || q.texto_pregunta || '';
        
        if (!questionText.trim()) {
          console.warn(`[ExamService] Question ${q.id} has empty text, skipping...`);
          return; // Saltar preguntas vacías
        }
        
        selectedQuestions.push({
          id: q.id,
          question_text: questionText,
          category_id: q.category_id,
          category_name: config.question_categories.nombre,
          weight: q.weight || 1
        });
      });
    }

    // Validaciones finales antes de retornar las preguntas
    if (selectedQuestions.length === 0) {
      const errorMsg = categoriesWithoutQuestions.length > 0 
        ? `Las siguientes categorías no tienen preguntas válidas: ${categoriesWithoutQuestions.join(', ')}. Agregue preguntas con texto válido a estas categorías.`
        : `No se pudieron cargar preguntas válidas para el examen. Verifique la configuración de categorías.`;
      throw new Error(errorMsg);
    }

    if (selectedQuestions.length < totalQuestionsNeeded) {
      console.warn(`[ExamService] Expected ${totalQuestionsNeeded} questions but only loaded ${selectedQuestions.length} valid questions`);
    }

    console.log(`[ExamService] Successfully loaded ${selectedQuestions.length} valid questions for exam ${examId}`);
    return selectedQuestions;
  }

  static async createExamAttempt(examId: string, userId: string, questions: ExamQuestion[], answers: any[]) {
    const { error: attemptError } = await supabase
      .from('exam_attempts')
      .insert({
        exam_id: examId,
        user_id: userId,
        questions: questions as any,
        answers: answers as any,
        completed_at: new Date().toISOString(),
        started_at: new Date().toISOString()
      });

    if (attemptError) throw attemptError;
  }

  static async updateExamAttempt(attemptId: string, questions: ExamQuestion[], answers: any[]) {
    const { error: updateError } = await supabase
      .from('exam_attempts')
      .update({
        questions: questions as any,
        answers: answers as any,
        completed_at: new Date().toISOString()
      })
      .eq('id', attemptId);

    if (updateError) throw updateError;
  }

  static async updateAssignmentStatus(assignmentId: string, status: string) {
    await supabase
      .from('exam_assignments')
      .update({ status })
      .eq('id', assignmentId);
  }

  static async restrictUserAccess(userId: string) {
    await supabase
      .from('profiles')
      .update({ 
        last_exam_completed_at: new Date().toISOString(),
        access_restricted: true,
        can_login: false
      })
      .eq('id', userId);
  }

  static validateQuestions(questions: ExamQuestion[]): ExamQuestion[] {
    const validQuestions = questions.filter(q => q.question_text && q.question_text.trim());
    
    if (validQuestions.length !== questions.length) {
      console.warn(`[ExamService] Filtered out ${questions.length - validQuestions.length} questions with empty text`);
    }
    
    return validQuestions;
  }

  static shuffleQuestions(questions: ExamQuestion[], shouldShuffle: boolean = true): ExamQuestion[] {
    if (!shouldShuffle) return questions;
    return [...questions].sort(() => 0.5 - Math.random());
  }

  /**
   * Valida que un examen tenga preguntas válidas antes de permitir su uso
   */
  static async validateExamReadiness(examId: string): Promise<{ isReady: boolean; message: string; details?: any }> {
    try {
      console.log(`[ExamService] Validating exam readiness: ${examId}`);
      
      // Usar NetworkRetryService para manejar errores de red
      return await NetworkRetryService.retryWithBackoff(async () => {
        // Primero verificar si es un examen psicométrico
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('id, type, psychometric_test_id')
          .eq('id', examId)
          .maybeSingle();

        if (examError) throw examError;
        
        // Si no hay registro, el examen no existe
        if (!examData) {
          return {
            isReady: false,
            message: 'El examen especificado no existe',
            details: { examId }
          };
        }

        // Si es un examen psicométrico (OCEAN), validar preguntas psicométricas
        if (examData.type === 'psicometrico' || examData.psychometric_test_id) {
          console.log(`[ExamService] Validating psychometric test: ${examId}`);
          
          const { data: psychometricQuestions, error: psychError } = await supabase
            .from('personality_questions')
            .select('id, question_text')
            .eq('is_active', true);

          if (psychError) throw psychError;

          if (!psychometricQuestions || psychometricQuestions.length === 0) {
            return {
              isReady: false,
              message: 'No hay preguntas psicométricas disponibles',
              details: { questionsCount: 0 }
            };
          }

          return {
            isReady: true,
            message: 'Examen psicométrico listo',
            details: { questionsCount: psychometricQuestions.length, type: 'psychometric' }
          };
        }

        // Para exámenes de confiabilidad, verificar configuración de categorías
        const { data: categoryConfigs, error: configError } = await supabase
          .from('examen_configuracion_categoria')
          .select(`
            categoria_id,
            num_preguntas_a_incluir,
            question_categories (
              nombre
            )
          `)
          .eq('examen_id', examId);

        if (configError) throw configError;

        if (!categoryConfigs || categoryConfigs.length === 0) {
          return {
            isReady: false,
            message: 'El examen no tiene categorías configuradas',
            details: { categoriesCount: 0 }
          };
        }

        let totalQuestionsNeeded = 0;
        let totalQuestionsAvailable = 0;
        const categoryValidation = [];

        // Validar cada categoría
        for (const config of categoryConfigs) {
          totalQuestionsNeeded += config.num_preguntas_a_incluir;
          
          const { data: validQuestions, error: questionsError } = await supabase
            .from('questions')
            .select('id, question_text, texto_pregunta')
            .eq('category_id', config.categoria_id)
            .not('question_text', 'is', null)
            .neq('question_text', '');

          if (questionsError) throw questionsError;

          // Contar solo preguntas con texto válido
          const actualValidQuestions = validQuestions?.filter(q => {
            const questionText = q.question_text || q.texto_pregunta || '';
            return questionText.trim().length > 0;
          }) || [];

          totalQuestionsAvailable += actualValidQuestions.length;
          
          categoryValidation.push({
            categoryId: config.categoria_id,
            categoryName: config.question_categories.nombre,
            questionsNeeded: config.num_preguntas_a_incluir,
            questionsAvailable: actualValidQuestions.length,
            hasEnough: actualValidQuestions.length >= config.num_preguntas_a_incluir
          });
        }

        // Verificar si todas las categorías tienen suficientes preguntas
        const categoriesWithoutEnoughQuestions = categoryValidation.filter(c => !c.hasEnough);
        
        if (categoriesWithoutEnoughQuestions.length > 0) {
          const problemCategories = categoriesWithoutEnoughQuestions.map(c => 
            `${c.categoryName}: necesita ${c.questionsNeeded}, tiene ${c.questionsAvailable}`
          ).join('; ');
          
          return {
            isReady: false,
            message: `Categorías sin suficientes preguntas válidas: ${problemCategories}`,
            details: {
              totalNeeded: totalQuestionsNeeded,
              totalAvailable: totalQuestionsAvailable,
              categoryValidation
            }
          };
        }

        if (totalQuestionsAvailable === 0) {
          return {
            isReady: false,
            message: 'El examen no tiene preguntas válidas en ninguna categoría',
            details: {
              totalNeeded: totalQuestionsNeeded,
              totalAvailable: 0,
              categoryValidation
            }
          };
        }

        return {
          isReady: true,
          message: `Examen válido con ${totalQuestionsAvailable} preguntas disponibles`,
          details: {
            totalNeeded: totalQuestionsNeeded,
            totalAvailable: totalQuestionsAvailable,
            categoryValidation
          }
        };
      });

    } catch (error: any) {
      console.error(`[ExamService] Error validating exam ${examId}:`, error);
      
      // Manejar errores específicos de red
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'NetworkError') {
        return {
          isReady: false,
          message: 'Error de conexión al validar el examen. Verifique su conexión a internet.',
          details: { error: error.message, type: 'network_error' }
        };
      }
      
      return {
        isReady: false,
        message: `Error al validar el examen: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
}
import { supabase } from '@/integrations/supabase/client';
import { isExamAccessExpired } from '@/utils/examUtils';

export class ExamAccessService {
  static async retryWithBackoff(operation: () => Promise<any>, maxRetries = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries || (!error.message?.includes('fetch') && !error.message?.includes('network'))) {
          throw error;
        }
        
        // Backoff exponencial: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  static async fetchSessionInfo(sessionId: string) {
    return await this.retryWithBackoff(async () => {
      const response = await supabase
        .from('exam_sessions')
        .select(`
          *,
          exams (title, description, estado, fecha_cierre),
          psychometric_tests (name, description, is_active)
        `)
        .eq('id', sessionId)
        .single();
      return response;
    });
  }

  static async fetchExamInfo(examId: string, testType: string) {
    return await this.retryWithBackoff(async () => {
      if (testType === 'psychometric') {
        const response = await supabase
          .from('psychometric_tests')
          .select('name, description, is_active')
          .eq('id', examId)
          .single();
        
        // Transform data to match expected format
        if (response.data) {
          const transformedData = {
            title: response.data.name,
            description: response.data.description,
            is_active: response.data.is_active
          };
          response.data = transformedData as any;
        }
        return response;
      } else {
        const response = await supabase
          .from('exams')
          .select('title, description, estado, fecha_cierre')
          .eq('id', examId)
          .single();
        return response;
      }
    });
  }

  static async validateCredentials(username: string, examId: string, testType: string) {
    return await this.retryWithBackoff(async () => {
      console.log('🔍 ExamAccessService.validateCredentials called with:', { username, examId, testType });
      
      // Intentar primero por username exacto
      let credentialQuery = supabase
        .from('exam_credentials')
        .select('*')
        .eq('username', username)
        .eq('is_used', false)
        .eq('test_type', testType);

      // Solo filtrar por exam_id o psychometric_test_id si NO es turnover
      if (testType === 'psychometric') {
        credentialQuery = credentialQuery.eq('psychometric_test_id', examId);
      } else if (testType === 'reliability' && examId) {
        credentialQuery = credentialQuery.eq('exam_id', examId);
      }
      // Para 'turnover' no filtramos por exam_id porque es NULL

      console.log('🔍 First query (by username + specific ID)...');
      let response = await credentialQuery.maybeSingle();
      console.log('📝 First query result:', response);
      
      // Si no se encuentra por username, intentar por email (para compatibilidad)
      if (!response.data && username.includes('@')) {
        console.log('🔍 Second query (by email + specific ID)...');
        let emailQuery = supabase
          .from('exam_credentials')
          .select('*')
          .eq('user_email', username)
          .eq('is_used', false)
          .eq('test_type', testType);

        // Solo filtrar por exam_id o psychometric_test_id si NO es turnover
        if (testType === 'psychometric') {
          emailQuery = emailQuery.eq('psychometric_test_id', examId);
        } else if (testType === 'reliability' && examId) {
          emailQuery = emailQuery.eq('exam_id', examId);
        }

        response = await emailQuery.maybeSingle();
        console.log('📝 Second query result:', response);
      }

      // Si aún no se encuentra, buscar sin filtrar por exam_id (para compatibilidad con credenciales sin exam_id)
      if (!response.data) {
        console.log('🔍 Third query (fallback without exam filter)...');
        const fallbackQuery = supabase
          .from('exam_credentials')
          .select('*')
          .or(`username.eq.${username.trim()},user_email.eq.${username.trim()}`)
          .eq('is_used', false)
          .eq('test_type', testType)
          .order('created_at', { ascending: false })
          .limit(1);

        response = await fallbackQuery.maybeSingle();
        console.log('📝 Third query result:', response);
      }
      
      // Último intento: buscar cualquier credencial válida con este username
      if (!response.data) {
        console.log('🔍 Fourth query (any valid credential for username)...');
        const anyValidQuery = supabase
          .from('exam_credentials')
          .select('*')
          .or(`username.eq.${username.trim()},user_email.eq.${username.trim()}`)
          .eq('is_used', false)
          .order('created_at', { ascending: false })
          .limit(1);

        response = await anyValidQuery.maybeSingle();
        console.log('📝 Fourth query result:', response);
      }

      if (!response.data) {
        console.error('❌ No credentials found for user:', username);
        throw new Error('No se encontraron credenciales válidas');
      }

      // HYBRID EXPIRATION: Check credential expiration
      const credential = response.data;
      if (credential.expires_at && new Date(credential.expires_at) < new Date()) {
        throw new Error('Las credenciales han expirado');
      }

      // If exam_id exists, check exam expiration too (hybrid check)
      if (credential.exam_id) {
        const { data: exam } = await supabase
          .from('exams')
          .select('fecha_cierre, estado')
          .eq('id', credential.exam_id)
          .maybeSingle();
        
        if (exam && isExamAccessExpired(exam, credential)) {
          throw new Error('El acceso al examen ha expirado');
        }
      }

      console.log('✅ Credentials found and valid:', response.data);
      return response;
    });
  }

  static async fetchUserByEmail(email: string) {
    return await this.retryWithBackoff(async () => {
      return await supabase
        .from('profiles')
        .select('id, access_restricted, can_login')
        .eq('email', email)
        .single();
    });
  }

  static async validateAssignment(userId: string, examId: string, testType: string) {
    return await this.retryWithBackoff(async () => {
      console.log('📋 ExamAccessService.validateAssignment called with:', { userId, examId, testType });
      
      let assignmentQueryBuilder = supabase
        .from('exam_assignments')
        .select('*')
        .eq('user_id', userId);

      if (testType === 'psychometric') {
        assignmentQueryBuilder = assignmentQueryBuilder.eq('psychometric_test_id', examId);
      } else {
        assignmentQueryBuilder = assignmentQueryBuilder.eq('exam_id', examId);
      }

      console.log('📋 Assignment query built, executing...');
      const response = await assignmentQueryBuilder.maybeSingle();
      console.log('📋 Assignment query result:', response);

      // Si no se encuentra asignación específica, buscar cualquier asignación activa del usuario del mismo tipo
      if (!response.data) {
        console.log('📋 Trying fallback assignment query...');
        const fallbackQuery = supabase
          .from('exam_assignments')
          .select('*')
          .eq('user_id', userId)
          .eq('test_type', testType)
          .neq('status', 'completed')
          .order('assigned_at', { ascending: false })
          .limit(1);

        const fallbackResponse = await fallbackQuery.maybeSingle();
        console.log('📋 Fallback assignment query result:', fallbackResponse);
        return fallbackResponse;
      }

      return response;
    });
  }

  static async markCredentialsAsUsed(credentialId: string) {
    return await this.retryWithBackoff(async () => {
      return await supabase
        .from('exam_credentials')
        .update({ 
          is_used: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', credentialId);
    });
  }

  static async updateAssignmentStatus(assignmentId: string, status: string) {
    return await this.retryWithBackoff(async () => {
      return await supabase
        .from('exam_assignments')
        .update({ status })
        .eq('id', assignmentId);
    });
  }

  static async completeExamAssignment(assignmentId: string, userId: string) {
    // Marcar examen como completado
    await supabase
      .from('exam_assignments')
      .update({ status: 'completed' })
      .eq('id', assignmentId);

    // Restringir acceso futuro del usuario
    await supabase
      .from('profiles')
      .update({ 
        last_exam_completed_at: new Date().toISOString(),
        access_restricted: true,
        can_login: false 
      })
      .eq('id', userId);
  }
}
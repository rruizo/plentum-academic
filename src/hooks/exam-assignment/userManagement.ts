
import { supabase } from '@/integrations/supabase/client';
import type { User, ValidationResult } from './types';

export const fetchEvaluatedUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .eq('can_login', true)
    .eq('access_restricted', false)
    .order('full_name');

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return data || [];
};

export const generateAccessLink = (examId: string): string => {
  // Use the production URL for exam access, not the admin dashboard URL
  return `https://preview--confianza-lms-analytica.lovable.app/exam-access/${examId}`;
};

export const validateAssignment = async (userId: string, examId: string): Promise<ValidationResult> => {
  console.log(`[Validation] Checking assignment for user ${userId} and exam ${examId}`);
  
  try {
    // Verificar si ya existe una asignación activa
    const { data: existingAssignments, error: checkError } = await supabase
      .from('exam_assignments')
      .select('id, status, assigned_at')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (checkError) {
      console.error('[Validation] Database error:', checkError);
      return { isValid: false, error: `Error de validación en base de datos: ${checkError.message}` };
    }

    if (existingAssignments && existingAssignments.length > 0) {
      console.log(`[Validation] Found ${existingAssignments.length} existing assignments:`, existingAssignments);
      return { isValid: false, error: 'Ya existe una asignación para este usuario y examen' };
    }

    console.log(`[Validation] Validation passed - no existing assignments found`);
    return { isValid: true };

  } catch (error) {
    console.error('[Validation] Unexpected error:', error);
    return { 
      isValid: false, 
      error: `Error inesperado en validación: ${error instanceof Error ? error.message : 'Error desconocido'}` 
    };
  }
};

export const forceCleanupAssignments = async (userId: string, examId: string): Promise<boolean> => {
  try {
    console.log(`[Cleanup] Force cleaning all assignments for user ${userId} and exam ${examId}`);
    
    // Obtener TODAS las asignaciones para este usuario y examen
    const { data: allAssignments, error: searchError } = await supabase
      .from('exam_assignments')
      .select('id, status, assigned_at')
      .eq('exam_id', examId)
      .eq('user_id', userId);

    if (searchError) {
      console.error('[Cleanup] Error searching for assignments:', searchError);
      return false;
    }

    if (allAssignments && allAssignments.length > 0) {
      console.log(`[Cleanup] Found ${allAssignments.length} assignments to clean up`);
      
      const assignmentIds = allAssignments.map(a => a.id);
      
      // Eliminar notificaciones relacionadas
      const { error: notifError } = await supabase
        .from('exam_email_notifications')
        .delete()
        .in('exam_assignment_id', assignmentIds);
      
      if (notifError) {
        console.warn('[Cleanup] Error cleaning notifications:', notifError);
      }
      
      // Eliminar las asignaciones
      const { error: deleteError } = await supabase
        .from('exam_assignments')
        .delete()
        .in('id', assignmentIds);
      
      if (deleteError) {
        console.error('[Cleanup] Error deleting assignments:', deleteError);
        return false;
      }
      
      console.log(`[Cleanup] Successfully cleaned up ${allAssignments.length} assignments`);
    } else {
      console.log(`[Cleanup] No assignments found to clean up`);
    }
    
    return true;
  } catch (error) {
    console.error('[Cleanup] Unexpected error during cleanup:', error);
    return false;
  }
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchEvaluatedUsers } from './exam-assignment/userManagement';
import type { User, ManualDeliveryUser, AssignmentResult } from './exam-assignment/types';

export const usePsychometricAssignment = (selectedTestId: string, testTitle: string) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [manualDeliveryPending, setManualDeliveryPending] = useState(false);
  const [manualDeliveryUsers, setManualDeliveryUsers] = useState<ManualDeliveryUser[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const userData = await fetchEvaluatedUsers();
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios evaluados');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const processPsychometricAssignment = async (
    testId: string,
    testTitle: string,
    userIds: string[],
    allUsers: User[],
    assignedById: string
  ): Promise<AssignmentResult[]> => {
    const results: AssignmentResult[] = [];

    for (const userId of userIds) {
      try {
        const user = allUsers.find(u => u.id === userId);
        if (!user) {
          results.push({
            success: false,
            userId,
            userName: 'Usuario no encontrado',
            userEmail: '',
            error: 'Usuario no encontrado en la lista'
          });
          continue;
        }

        // 1. Reiniciar intentos y registrar en logs antes de limpiar
        await resetPsychometricAttemptsAndLog(userId, testId, assignedById, user.full_name, testTitle, user.email);

        // 2. Limpiar asignaciones y sesiones existentes para este test y usuario (igual que fiabilidad)
        console.log(`[PsychometricAssignment] Force cleaning existing assignments for ${user.email} (ID: ${userId})`);
        
        // Limpiar asignaciones existentes
        await supabase
          .from('exam_assignments')
          .delete()
          .eq('psychometric_test_id', testId)
          .eq('user_id', userId)
          .eq('test_type', 'psychometric');

        // Limpiar sesiones existentes tanto por UUID como por email (compatibilidad)
        await supabase
          .from('exam_sessions')
          .delete()
          .eq('psychometric_test_id', testId)
          .eq('user_id', userId)
          .eq('test_type', 'psychometric');
          
        await supabase
          .from('exam_sessions')
          .delete()
          .eq('psychometric_test_id', testId)
          .eq('user_id', user.email)
          .eq('test_type', 'psychometric');

        // 2. Crear nueva asignación psicométrica
        const assignmentData = {
          exam_id: null, // Nullable para tests psicométricos
          psychometric_test_id: testId,
          user_id: userId,
          assigned_by: assignedById,
          test_type: 'psychometric',
          status: 'pending',
          access_link: `/exam-access?type=psychometric&test=${testId}&user=${userId}`
        };

        console.log('🔍 Assignment data being inserted:', assignmentData);

        const { data: assignment, error: assignmentError } = await supabase
          .from('exam_assignments')
          .insert(assignmentData)
          .select()
          .single();

        if (assignmentError) {
          console.error('❌ Assignment error details:', assignmentError);
          throw assignmentError;
        }

        console.log('✅ Assignment created successfully:', assignment);

        // 3. Obtener la configuración del test psicométrico para max_attempts
        const { data: psychometricTest, error: testError } = await supabase
          .from('psychometric_tests')
          .select('max_attempts')
          .eq('id', testId)
          .single();

        if (testError) {
          throw new Error(`Error obteniendo configuración del test: ${testError.message}`);
        }

        // 4. Crear NUEVA sesión de examen psicométrico (igual que fiabilidad)
        console.log(`[PsychometricAssignment] Creating NEW psychometric session for ${user.email}`);
        const { data: session, error: sessionError } = await supabase
          .from('exam_sessions')
          .insert({
            exam_id: null, // Nullable para tests psicométricos
            psychometric_test_id: testId,
            user_id: userId, // Usar UUID del usuario como en fiabilidad
            test_type: 'psychometric',
            status: 'pending',
            attempts_taken: 0, // Explícitamente inicializar en 0
            max_attempts: psychometricTest.max_attempts || 2 // Usar valor configurado o default 2
          })
          .select()
          .single();

        if (sessionError) {
          throw sessionError;
        }

        // 4. Las credenciales se generan automáticamente por el trigger
        // Esperar un poco para que el trigger se ejecute
        await new Promise(resolve => setTimeout(resolve, 100));

        // 5. Obtener credenciales generadas
        const { data: credentials, error: credentialsError } = await supabase
          .from('exam_credentials')
          .select('username, password_hash')
          .eq('psychometric_test_id', testId)
          .eq('user_email', user.email)
          .eq('test_type', 'psychometric')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (credentialsError) {
          console.warn('No se pudieron obtener credenciales:', credentialsError);
        }

        // 6. Enviar invitación por correo
        try {
          const { error: emailError } = await supabase.functions.invoke('send-exam-notifications', {
            body: {
              emails: [user.email],
              subject: `Invitación para test psicométrico: ${testTitle}`,
              message: `Ha sido invitado a realizar el test psicométrico: ${testTitle}`,
              examDetails: {
                title: testTitle,
                testType: 'psychometric',
                testId: testId
              },
              credentials: credentials ? [{
                email: user.email,
                username: credentials.username,
                password: credentials.password_hash,
                full_name: user.full_name
              }] : undefined,
              sessionLinks: session ? [{
                email: user.email,
                sessionId: session.id,
                full_name: user.full_name
              }] : undefined
            }
          });

          if (emailError) {
            throw new Error(`Error enviando email: ${emailError.message}`);
          }

          // 7. Marcar como notificado
          console.log('🔄 Updating assignment status to notified for ID:', assignment.id);
          const { error: updateError } = await supabase
            .from('exam_assignments')
            .update({ 
              status: 'notified',
              notified_at: new Date().toISOString()
            })
            .eq('id', assignment.id);

          if (updateError) {
            console.error('❌ Update assignment error:', updateError);
            throw new Error(`Error actualizando estado: ${updateError.message}`);
          }
          
          console.log('✅ Assignment status updated successfully');

          results.push({
            success: true,
            userId,
            userName: user.full_name,
            userEmail: user.email,
            assignmentId: assignment.id
          });

        } catch (emailError) {
          console.error('Error enviando email:', emailError);
          
          // Marcar para entrega manual
          results.push({
            success: true,
            userId,
            userName: user.full_name,
            userEmail: user.email,
            assignmentId: assignment.id,
            requiresManualDelivery: true,
            manualDeliveryInstructions: `
              Error en envío automático. Entregue manualmente:
              
              Test: ${testTitle}
              Usuario: ${credentials?.username || 'Ver en sistema'}
              Contraseña: ${credentials?.password_hash || 'Ver en sistema'}
              Enlace: ${session ? `${window.location.origin}/exam-access?session=${session.id}&type=psychometric` : 'Ver en sistema'}
              
              Motivo: ${emailError instanceof Error ? emailError.message : 'Error desconocido'}
            `
          });
        }

      } catch (error) {
        console.error('Error processing assignment for user:', userId, error);
        const user = allUsers.find(u => u.id === userId);
        results.push({
          success: false,
          userId,
          userName: user?.full_name || 'Desconocido',
          userEmail: user?.email || '',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return results;
  };

  // Nueva función para reiniciar intentos psicométricos y registrar en logs
  const resetPsychometricAttemptsAndLog = async (
    userId: string, 
    testId: string, 
    adminId: string, 
    userName: string, 
    testTitle: string,
    userEmail: string
  ) => {
    try {
      // 1. Buscar sesión existente para este usuario y test psicométrico (por UUID y email)
      const { data: existingSession } = await supabase
        .from('exam_sessions')
        .select('id, attempts_taken, max_attempts')
        .eq('psychometric_test_id', testId)
        .or(`user_id.eq.${userId},user_id.eq.${userEmail}`)
        .eq('test_type', 'psychometric')
        .maybeSingle();

      let previousAttempts = 0;
      let sessionId = null;

      if (existingSession) {
        previousAttempts = existingSession.attempts_taken;
        sessionId = existingSession.id;
        
        console.log(`[PsychometricAssignment] Found existing session ${sessionId} with ${previousAttempts} attempts for ${userName}`);
      }

      // 2. Registrar en logs de actividad del usuario
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: userId,
          admin_id: adminId,
          activity_type: 'psychometric_assignment_attempts_reset',
          activity_description: `Asignación masiva de test psicométrico con reinicio de intentos`,
          previous_value: { 
            attempts_taken: previousAttempts,
            session_id: sessionId,
            test_type: 'psychometric'
          },
          new_value: { 
            attempts_taken: 0,
            test_title: testTitle,
            reset_reason: 'mass_assignment',
            test_type: 'psychometric'
          },
          metadata: {
            psychometric_test_id: testId,
            test_title: testTitle,
            assignment_type: 'mass_psychometric_assignment',
            previous_attempts: previousAttempts,
            user_email: userEmail
          }
        });

      console.log(`[PsychometricAssignment] Logged attempts reset for user ${userName}: ${previousAttempts} -> 0`);
      
    } catch (error) {
      console.error(`[PsychometricAssignment] Error resetting attempts for user ${userName}:`, error);
      // No lanzar error para no interrumpir el proceso de asignación
    }
  };

  const handleAssignmentResults = (results: AssignmentResult[]) => {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const manualDelivery = results.filter(r => r.requiresManualDelivery);

    if (successful.length > 0) {
      toast.success(`${successful.length} test(s) psicométrico(s) asignado(s) exitosamente`);
    }

    if (manualDelivery.length > 0) {
      toast.warning(`${manualDelivery.length} asignación(es) requieren entrega manual`);
    }

    if (failed.length > 0) {
      toast.error(`${failed.length} asignación(es) fallaron`);
      failed.forEach(result => {
        if (result.error) {
          console.error(`Error para ${result.userName}:`, result.error);
        }
      });
    }
  };

  const handleAssignTest = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecciona al menos un usuario para asignar el test');
      return;
    }

    setSending(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('Usuario no autenticado');
        return;
      }

      const results = await processPsychometricAssignment(
        selectedTestId,
        testTitle,
        selectedUsers,
        users,
        currentUser.id
      );

      handleAssignmentResults(results);

      // Verificar si hay entregas manuales pendientes
      const manualDeliveryResults = results.filter(r => r.requiresManualDelivery);
      if (manualDeliveryResults.length > 0) {
        const manualUsers = manualDeliveryResults.map(result => ({
          instructions: result.manualDeliveryInstructions || '',
          userName: result.userName,
          userEmail: result.userEmail,
          assignmentId: result.assignmentId || ''
        }));
        setManualDeliveryUsers(manualUsers);
        setManualDeliveryPending(true);
      }

      // Limpiar selecciones solo si hubo al menos un éxito
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        setSelectedUsers([]);
        // Refrescar la lista de usuarios para mostrar cambios
        await loadUsers();
      }

    } catch (error) {
      console.error('Error in psychometric test assignment:', error);
      toast.error('Error crítico en la asignación de tests psicométricos');
    } finally {
      setSending(false);
    }
  };

  const confirmManualDelivery = async (assignmentId: string) => {
    try {
      // Marcar la asignación como entregada manualmente
      const { error } = await supabase
        .from('exam_assignments')
        .update({ 
          status: 'notified',
          manual_delivery: true,
          notified_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('Error updating manual delivery status:', error);
        toast.error('Error al confirmar entrega manual');
      } else {
        // Remover el usuario confirmado de la lista
        setManualDeliveryUsers(prev => prev.filter(user => user.assignmentId !== assignmentId));
        
        // Si no quedan más usuarios, cerrar el modal
        if (manualDeliveryUsers.length <= 1) {
          setManualDeliveryPending(false);
          setManualDeliveryUsers([]);
        }
        
        await loadUsers(); // Refrescar la lista
      }
    } catch (error) {
      console.error('Error in confirmManualDelivery:', error);
      toast.error('Error al confirmar entrega manual');
    }
  };

  return {
    users,
    selectedUsers,
    loading,
    sending,
    handleUserSelection,
    handleSelectAll,
    handleAssignTest,
    manualDeliveryPending,
    setManualDeliveryPending,
    manualDeliveryUsers,
    confirmManualDelivery
  };
};
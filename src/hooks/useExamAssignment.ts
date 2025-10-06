
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchEvaluatedUsers } from './exam-assignment/userManagement';
import { processExamAssignment, handleAssignmentResults } from './exam-assignment/assignmentProcessor';
import type { User, ManualDeliveryUser } from './exam-assignment/types';

export const useExamAssignment = (selectedExamId: string, examTitle: string) => {
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

  const handleAssignExam = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecciona al menos un usuario para asignar el examen');
      return;
    }

    setSending(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('Usuario no autenticado');
        return;
      }

      const results = await processExamAssignment(
        selectedExamId,
        examTitle,
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
      console.error('Error in exam assignment:', error);
      toast.error('Error crítico en la asignación de exámenes');
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
    handleAssignExam,
    manualDeliveryPending,
    setManualDeliveryPending,
    manualDeliveryUsers,
    confirmManualDelivery
  };
};

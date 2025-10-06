
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company: string;
  area: string;
  section: string;
  report_contact: string;
  created_at: string;
  exam_completed: boolean;
  can_login: boolean;
  temp_password: boolean;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Error al cargar usuarios');
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    // Generate stronger 12-character password
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const createUser = async (userData: {
    email: string;
    password?: string;
    full_name: string;
    role: string;
    company: string;
    area: string;
    section: string;
    report_contact: string;
  }) => {
    try {
      // Input validation on client side
      if (!userData.email || !userData.full_name) {
        toast.error('Email y nombre completo son requeridos');
        return null;
      }

      // Basic email validation
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(userData.email)) {
        toast.error('Formato de email inválido');
        return null;
      }

      // Validate name length
      if (userData.full_name.trim().length === 0 || userData.full_name.length > 100) {
        toast.error('Nombre debe tener entre 1 y 100 caracteres');
        return null;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No estás autenticado');
        return null;
      }

      // Obtener company_id del usuario actual
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .single();

      const response = await fetch('https://popufimnleaubvlwyusb.supabase.co/functions/v1/admin-user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'createUser',
          ...userData,
          password: userData.password || generateTempPassword(),
          company_id: userProfile?.company_id // Incluir company_id del usuario creador
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario');
      }

      toast.success('Usuario creado exitosamente');
      fetchUsers();
      return result;
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear usuario');
      return null;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No estás autenticado');
        return;
      }

      const response = await fetch('https://popufimnleaubvlwyusb.supabase.co/functions/v1/admin-user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'deleteUser',
          userId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar usuario');
      }

      toast.success(result.message || 'Usuario eliminado exitosamente');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar usuario');
    }
  };

  const purgeUserData = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No estás autenticado');
        return;
      }

      const response = await fetch('https://popufimnleaubvlwyusb.supabase.co/functions/v1/admin-data-purge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userIdToPurge: userId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al purgar datos del usuario');
      }

      toast.success('Datos del usuario purgados exitosamente', {
        description: 'Usuario y todos sus datos asociados eliminados'
      });
      fetchUsers();
      return result;
    } catch (error) {
      console.error('Error purging user data:', error);
      toast.error(error instanceof Error ? error.message : 'Error al purgar datos del usuario');
      return null;
    }
  };

  const resetSystemToAdminOnly = async (adminEmail: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No estás autenticado');
        return null;
      }

      const response = await fetch('https://popufimnleaubvlwyusb.supabase.co/functions/v1/admin-user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'resetSystem',
          adminEmail
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al resetear sistema');
      }

      toast.success(result.message || 'Sistema reseteado exitosamente');
      fetchUsers();
      return result;
    } catch (error) {
      console.error('Error resetting system:', error);
      toast.error(error instanceof Error ? error.message : 'Error al resetear sistema');
      return null;
    }
  };

  const sendInvitation = async (user: User) => {
    try {
      // Primero verificar si el usuario ya tiene un perfil
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', user.email)
        .maybeSingle();

      if (!existingProfile) {
        toast.error('Usuario no encontrado en el sistema');
        return;
      }

      // Enviar invitación de reset de contraseña
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) {
        console.error('Error sending invitation:', error);
        // Si es un error conocido, mostrar mensaje específico
        if (error.message.includes('rate limit')) {
          toast.error('Se ha enviado demasiadas invitaciones. Intenta en unos minutos.');
        } else if (error.message.includes('email not found')) {
          toast.error('El correo electrónico no está registrado en el sistema de autenticación');
        } else {
          toast.error(`Error al enviar invitación: ${error.message}`);
        }
        return;
      }

      toast.success('Invitación de acceso enviada exitosamente al correo electrónico');
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Error al enviar invitación');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    generateTempPassword,
    createUser,
    deleteUser,
    purgeUserData,
    sendInvitation,
    resetSystemToAdminOnly
  };
};

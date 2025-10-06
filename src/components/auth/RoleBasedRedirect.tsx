import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { supabase } from '@/integrations/supabase/client';

const RoleBasedRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user, role, roleLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingPendingSessions, setCheckingPendingSessions] = useState(false);

  useEffect(() => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const redirectTo = searchParams.get('redirect_to') || searchParams.get('redirectTo');
    
    // Only log important redirect decisions, not every render
    if (redirectTo || currentPath.startsWith('/exam-session/')) {
      console.log('[RoleBasedRedirect] Handling redirect:', { currentPath, redirectTo, role });
    }
    
    // Allow public access to HTP exam routes without authentication
    if (currentPath.startsWith('/htp-exam/')) {
      return;
    }
    
    if (!roleLoading && user) {
      
      // Si hay un redirectTo y es una ruta de examen, redirigir ahí directamente
      if (redirectTo && (redirectTo.includes('/exam-session/') || redirectTo.includes('/examen/'))) {
        console.log('[RoleBasedRedirect] Redirecting to exam session:', redirectTo);
        const targetPath = redirectTo.startsWith('http') ? new URL(redirectTo).pathname : redirectTo;
        navigate(targetPath);
        return;
      }
      
      // Si el usuario está accediendo a una sesión de examen, permitir el acceso sin restricciones
      if (currentPath.startsWith('/exam-session/') || currentPath.startsWith('/examen/')) {
        return;
      }
      
      // Para estudiantes, verificar si tienen sesiones de examen pendientes
      if (role === 'student') {
        // Si están en /auth y no hay redirectTo, verificar si tienen exámenes pendientes
        if (currentPath === '/auth' && !checkingPendingSessions) {
          setCheckingPendingSessions(true);
          
          // Buscar sesiones de examen pendientes para este usuario
          const checkPendingSessions = async () => {
            try {
              const { data: sessions, error } = await supabase
                .from('exam_sessions')
                .select('id, status')
                .eq('user_id', user.id)
                .in('status', ['pending', 'started'])
                .order('created_at', { ascending: false })
                .limit(1);
              
              if (error) {
                console.error('[RoleBasedRedirect] Error querying sessions:', error);
                navigate('/profile');
                return;
              }
              
              if (sessions && sessions.length > 0) {
                const session = sessions[0];
                navigate(`/examen/${session.id}`);
              } else {
                navigate('/profile');
              }
            } catch (error) {
              console.error('[RoleBasedRedirect] Exception checking sessions:', error);
              navigate('/profile');
            } finally {
              setCheckingPendingSessions(false);
            }
          };
          
          checkPendingSessions();
          return;
        }
        
        // Los usuarios evaluados pueden acceder a:
        // - Su dashboard (página principal)
        // - Su perfil
        // - Exámenes asignados  
        // - La página de examen
        const allowedPaths = ['/', '/profile', '/examen/', '/exam-session/', '/exam-access/'];
        
        // Si están en una ruta no permitida, redirigir al dashboard principal
        if (!allowedPaths.some(path => currentPath.startsWith(path))) {
          navigate('/');
        }
      } else if (['admin', 'teacher', 'supervisor'].includes(role)) {
        // Los usuarios administrativos y supervisores NO pueden acceder a rutas de examen de evaluados
        if (currentPath.startsWith('/examen/') || currentPath.startsWith('/exam-access/')) {
          navigate('/');
        }
        // Permitir acceso libre a rutas administrativas como test-data-management
      }
    }
  }, [user, role, roleLoading, navigate, location.pathname, location.search]);

  // Mientras carga el rol, mostrar cargando
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleBasedRedirect;
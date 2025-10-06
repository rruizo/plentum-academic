
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { User, Lock, Save, LogOut, Database, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const Profile = () => {
  const { user: authUser, signOut, role } = useAuth();
  const { config } = useSystemConfig();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!authUser) {
      navigate('/auth');
    }
  }, [authUser, navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      toast.success('Contraseña actualizada exitosamente');
      setPasswordData({
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      toast.error('Error al actualizar contraseña: ' + error.message);
    }
    
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Sesión cerrada exitosamente');
    navigate('/auth');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const systemName = config?.system_name || 'EduPsych LMS';

  if (!authUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar 
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
        />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Hamburger menu for mobile */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    className="lg:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                  
                  <div className="flex items-center space-x-3">
                    {config?.logo_url && (
                      <img 
                        src={config.logo_url} 
                        alt={systemName}
                        className="h-6 w-auto sm:h-8"
                      />
                    )}
                    <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">Mi Perfil</h1>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                    Bienvenido, {authUser.email}
                  </span>
                  
                  {/* Mobile user icon */}
                  <div className="sm:hidden">
                    <Button
                      onClick={() => navigate('/')}
                      variant="outline"
                      size="sm"
                    >
                      <Database className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Desktop actions */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden md:inline">Salir</span>
                    </Button>
                    
                    <Button 
                      onClick={() => navigate('/')} 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Database className="h-4 w-4" />
                      <span className="hidden lg:inline">Volver al {systemName}</span>
                    </Button>
                  </div>
                  
                  {/* Mobile sign out */}
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="sm:hidden"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6">
              <div>
                <p className="text-muted-foreground">Gestiona tu cuenta y configuraciones</p>
              </div>

              <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Información Personal</span>
                    <span className="sm:hidden">Perfil</span>
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span className="hidden sm:inline">Seguridad</span>
                    <span className="sm:hidden">Seguridad</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Información Personal</CardTitle>
                      <CardDescription>
                        Tu información básica de perfil
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <AlertDescription>
                          La información del perfil se actualiza automáticamente desde Supabase.
                          Para cambios importantes, contacta al administrador.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Correo Electrónico</Label>
                          <Input value={authUser?.email || ''} disabled />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>ID de Usuario</Label>
                          <Input value={authUser?.id || ''} disabled />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Creado</Label>
                          <Input 
                            value={authUser?.created_at ? new Date(authUser.created_at).toLocaleDateString() : ''} 
                            disabled 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Última Conexión</Label>
                          <Input 
                            value={authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleDateString() : ''} 
                            disabled 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cambiar Contraseña</CardTitle>
                      <CardDescription>
                        Actualiza tu contraseña para mantener tu cuenta segura
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">Nueva Contraseña</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Mínimo 6 caracteres"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Repite tu nueva contraseña"
                            required
                          />
                        </div>
                        
                        <Button type="submit" disabled={loading} className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;

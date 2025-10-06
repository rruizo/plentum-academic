import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, AlertTriangle, RefreshCw, ShieldX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User } from '@/hooks/useUserManagement';
import { useAuth } from '@/components/auth/AuthProvider';

interface BulkPasswordGenerationProps {
  users: User[];
  selectedUsers: string[];
  onSelectionChange: (userIds: string[]) => void;
  onPasswordsGenerated: () => void;
}

const BulkPasswordGeneration = ({ 
  users, 
  selectedUsers, 
  onSelectionChange, 
  onPasswordsGenerated 
}: BulkPasswordGenerationProps) => {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { role, roleLoading } = useAuth();

  // Verificar si el usuario tiene permisos para esta acción
  const hasPermission = !roleLoading && (role === 'admin' || role === 'teacher');

  // Removed excessive logging

  // Solo incluir estudiantes (evaluados)
  const eligibleUsers = users.filter(user => user.role === 'student');

  const handleSelectAll = () => {
    if (selectedUsers.length === eligibleUsers.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(eligibleUsers.map(user => user.id));
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUsers, userId]);
    } else {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePasswords = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecciona al menos un usuario');
      return;
    }

    if (!hasPermission) {
      toast.error('No tienes permisos para generar contraseñas');
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No estás autenticado');
        return;
      }

      const results = [];
      
      for (const userId of selectedUsers) {
        const user = eligibleUsers.find(u => u.id === userId);
        if (!user || user.role !== 'student') continue;

        const newPassword = generateTempPassword();
        
        try {
          // Llamar al edge function para actualizar la contraseña
          const response = await fetch('https://popufimnleaubvlwyusb.supabase.co/functions/v1/admin-user-management', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              action: 'updatePassword',
              userId: userId,
              newPassword: newPassword
            }),
          });

          const result = await response.json();

          if (response.ok) {
            results.push({
              user: user.full_name,
              email: user.email,
              password: newPassword,
              success: true
            });
          } else {
            results.push({
              user: user.full_name,
              email: user.email,
              success: false,
              error: result.error
            });
          }
        } catch (error) {
          results.push({
            user: user.full_name,
            email: user.email,
            success: false,
            error: 'Error de conexión'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`Contraseñas generadas exitosamente para ${successCount} usuario(s)`);
        
        // Mostrar las contraseñas generadas (opcional, para que el admin las vea)
        console.log('Contraseñas generadas:', results.filter(r => r.success));
      }

      if (failureCount > 0) {
        toast.error(`Error al generar contraseñas para ${failureCount} usuario(s)`);
      }

      setOpen(false);
      onSelectionChange([]);
      onPasswordsGenerated();

    } catch (error: any) {
      console.error('Error generating passwords:', error);
      toast.error('Error al generar contraseñas: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // No mostrar el botón si no tiene permisos o está cargando
  if (roleLoading) {
    return (
      <Button variant="outline" className="gap-2" disabled>
        <RefreshCw className="h-4 w-4 animate-spin" />
        Cargando permisos...
      </Button>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2" disabled title={`Rol actual: ${role}. Se requiere rol 'admin' o 'teacher'`}>
          <ShieldX className="h-4 w-4" />
          Sin Permisos ({role})
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => window.location.reload()} 
          title="Refrescar permisos si hubo cambios recientes"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Key className="h-4 w-4" />
          Generar Nuevas Contraseñas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Generar Nuevas Contraseñas
          </DialogTitle>
          <DialogDescription>
            Genera nuevas contraseñas temporales para usuarios con rol de evaluado/estudiante
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">¡Atención!</p>
                <p>Esta función solo está disponible para usuarios con rol de <strong>Evaluado/Estudiante</strong>.</p>
                <p>Los administradores, supervisores y maestros no pueden cambiar su contraseña por este método.</p>
                <p>Las contraseñas anteriores dejarán de funcionar inmediatamente para los evaluados seleccionados.</p>
                <p>Asegúrate de comunicar las nuevas credenciales a los usuarios.</p>
              </div>
            </AlertDescription>
          </Alert>

          {eligibleUsers.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">No hay usuarios elegibles</p>
                <p>No se encontraron usuarios con rol de evaluado/estudiante para generar contraseñas.</p>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Selección de Usuarios ({selectedUsers.length} seleccionados)
              </CardTitle>
              <CardDescription>
                Selecciona los usuarios para los cuales generar nuevas contraseñas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eligibleUsers.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedUsers.length === eligibleUsers.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="font-medium">Seleccionar todos los evaluados ({eligibleUsers.length})</span>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {eligibleUsers.map(user => (
                      <div key={user.id} className="flex items-center gap-3 p-2 border rounded">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email} • {user.company} • {user.area} • Evaluado
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay usuarios evaluados disponibles para generar contraseñas.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGeneratePasswords} 
              disabled={selectedUsers.length === 0 || generating || eligibleUsers.length === 0}
              className="gap-2"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Generar Contraseñas ({selectedUsers.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkPasswordGeneration;
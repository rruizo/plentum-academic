// src/components/BulkWelcomeEmail.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User } from '@/hooks/useUserManagement';

interface BulkWelcomeEmailProps {
  users: User[];
  selectedUsers: string[];
  onSelectionChange: (userIds: string[]) => void;
}

const BulkWelcomeEmail = ({ users, selectedUsers, onSelectionChange }: BulkWelcomeEmailProps) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(users.map(user => user.id));
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUsers, userId]);
    } else {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleSendWelcomeEmails = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecciona al menos un usuario');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No estás autenticado');
        return;
      }

      // Llamar al edge function para enviar correos de bienvenida
      const { data, error } = await supabase.functions.invoke('send-welcome-emails', {
        body: { 
          userIds: selectedUsers
        }
      });

      if (error) throw error;

      toast.success(`EMAILS de bienvenida enviados exitosamente a ${selectedUsers.length} usuario(s)`);
      setOpen(false);
      onSelectionChange([]);

    } catch (error: any) {
      console.error('Error sending welcome emails:', error);
      toast.error('Error al enviar correos de bienvenida: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Mail className="h-4 w-4" />
          Enviar Correos de Bienvenida
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar Correos de Bienvenida
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Contenido del correo de bienvenida:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Mensaje de bienvenida profesional al proceso de selección</li>
                  <li>Link de acceso al sistema: https://plentum-academic.com.mx/</li>
                  <li>Credenciales de acceso (usuario y contraseña)</li>
                  <li>Aviso legal completo para conocimiento del evaluado</li>
                  <li>Precarga automática de credenciales al hacer clic en el enlace</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Nota: NO se informa sobre los tipos específicos de evaluaciones que se realizarán.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Selección de Usuarios ({selectedUsers.length} seleccionados)
              </CardTitle>
              <CardDescription>
                Selecciona los usuarios que recibirán el correo de bienvenida al proceso de selección
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedUsers.length === users.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="font-medium">Seleccionar todos</span>
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-2 border rounded">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email} • {user.company} • {user.area}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vista Previa del Correo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/20 p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">Asunto: Bienvenido al Proceso de Selección - Plentum Verify</p>
                <div className="space-y-2">
                  <p>Estimado(a) [Nombre del Usuario],</p>
                  <p>Es un gusto que participes con nosotros en este proceso de selección...</p>
                  <p><strong>Enlace de acceso:</strong> https://plentum-academic.com.mx/</p>
                  <p><strong>Usuario:</strong> [Usuario generado]</p>
                  <p><strong>Contraseña:</strong> [Contraseña generada]</p>
                  <p className="text-xs text-muted-foreground">+ Aviso legal completo incluido</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSendWelcomeEmails} 
              disabled={selectedUsers.length === 0 || sending}
              className="gap-2"
            >
              {sending ? (
                <>Enviando...</>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Correos ({selectedUsers.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkWelcomeEmail;
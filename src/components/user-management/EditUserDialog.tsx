
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@/hooks/useUserManagement";

interface EditUserDialogProps {
  user: User | null;
  onClose: () => void;
  onUserUpdated: () => void;
}

const EditUserDialog = ({ user, onClose, onUserUpdated }: EditUserDialogProps) => {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'student',
    company: '',
    area: '',
    section: '',
    report_contact: '',
    newPassword: ''
  });

  const roleOptions = [
    { value: 'student', label: 'Usuario Evaluado' },
    { value: 'teacher', label: 'Usuario Instructor' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'admin', label: 'Administrador' }
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        company: user.company,
        area: user.area,
        section: user.section,
        report_contact: user.report_contact,
        newPassword: ''
      });
    }
  }, [user]);

  const handleUpdateUser = async () => {
    if (!user) return;

    try {
      // Actualizar perfil del usuario
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          company: formData.company,
          area: formData.area,
          section: formData.section,
          report_contact: formData.report_contact
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating user:', profileError);
        toast.error('Error al actualizar usuario');
        return;
      }

      // Si se proporcionó una nueva contraseña, actualizar las credenciales
      if (formData.newPassword.trim()) {
        const { error: credentialsError } = await supabase
          .from('exam_credentials')
          .update({
            password_hash: formData.newPassword,
            is_used: false, // Permitir reutilizar la credencial
            sent_at: null   // Resetear fecha de envío
          })
          .eq('user_email', user.email);

        if (credentialsError) {
          console.error('Error updating credentials:', credentialsError);
          toast.error('Error al actualizar contraseña. Usuario actualizado pero contraseña sin cambios.');
        } else {
          toast.success('Usuario y contraseña actualizados exitosamente');
        }
      } else {
        toast.success('Usuario actualizado exitosamente');
      }

      onClose();
      onUserUpdated();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error al actualizar usuario');
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifica la información del usuario
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_full_name">Nombre Completo</Label>
              <Input 
                id="edit_full_name" 
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Juan Pérez García" 
              />
            </div>
            <div>
              <Label htmlFor="edit_email">Correo electrónico</Label>
              <Input 
                id="edit_email" 
                type="email" 
                value={formData.email}
                disabled
                placeholder="usuario@ejemplo.com" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_company">Empresa</Label>
              <Input 
                id="edit_company" 
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Nombre de la empresa" 
              />
            </div>
            <div>
              <Label htmlFor="edit_area">Área</Label>
              <Input 
                id="edit_area" 
                value={formData.area}
                onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                placeholder="Área de trabajo" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_section">Sección</Label>
              <Input 
                id="edit_section" 
                value={formData.section}
                onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                placeholder="Sección específica" 
              />
            </div>
            <div>
              <Label htmlFor="edit_report_contact">Contacto de Reporte</Label>
              <Input 
                id="edit_report_contact" 
                value={formData.report_contact}
                onChange={(e) => setFormData(prev => ({ ...prev, report_contact: e.target.value }))}
                placeholder="Jefe directo" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_role">Rol</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_password">Nueva Contraseña (opcional)</Label>
              <Input 
                id="edit_password" 
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Dejar vacío para mantener actual" 
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpdateUser} className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              Actualizar Usuario
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;

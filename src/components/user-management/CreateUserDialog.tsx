
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateUserDialogProps {
  onUserCreated: () => void;
  createUser: (userData: any) => Promise<any>;
  generateTempPassword: () => string;
}

const CreateUserDialog = ({ onUserCreated, createUser, generateTempPassword }: CreateUserDialogProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'student',
    company: '',
    area: '',
    section: '',
    report_contact: '',
    password: ''
  });

  const roleOptions = [
    { value: 'student', label: 'Usuario Evaluado' },
    { value: 'teacher', label: 'Usuario Instructor' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'admin', label: 'Administrador' }
  ];

  const handleCreateUser = async () => {
    try {
      if (!formData.email || !formData.full_name) {
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Por favor ingresa un correo electrónico válido');
        return;
      }

      const password = formData.password || generateTempPassword();
      
      if (password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      const result = await createUser({
        email: formData.email,
        password: password,
        full_name: formData.full_name,
        role: formData.role,
        company: formData.company,
        area: formData.area,
        section: formData.section,
        report_contact: formData.report_contact
      });

      if (result) {
        if (!formData.password && result.temp_password) {
          toast.success(`Usuario creado exitosamente. Contraseña temporal: ${result.temp_password}`);
        }
        setShowCreateDialog(false);
        resetForm();
        onUserCreated();
      }

    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Error inesperado al crear usuario. Por favor intenta de nuevo.');
    }
  };


  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      role: 'student',
      company: '',
      area: '',
      section: '',
      report_contact: '',
      password: ''
    });
  };

  return (
    <>
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button onClick={resetForm}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Completa la información del usuario y asigna un rol
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <Input 
                  id="full_name" 
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Juan Pérez García" 
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Correo electrónico *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@ejemplo.com" 
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Empresa</Label>
                <Input 
                  id="company" 
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Nombre de la empresa" 
                />
              </div>
              <div>
                <Label htmlFor="area">Área</Label>
                <Input 
                  id="area" 
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                  placeholder="Área de trabajo" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="section">Sección</Label>
                <Input 
                  id="section" 
                  value={formData.section}
                  onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                  placeholder="Sección específica" 
                />
              </div>
              <div>
                <Label htmlFor="report_contact">Contacto de Reporte</Label>
                <Input 
                  id="report_contact" 
                  value={formData.report_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, report_contact: e.target.value }))}
                  placeholder="Jefe directo" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Rol *</Label>
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
                <Label htmlFor="password">Contraseña (opcional)</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Dejar vacío para generar automáticamente" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Si se deja vacío, se generará una contraseña temporal automáticamente
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateUser} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateUserDialog;

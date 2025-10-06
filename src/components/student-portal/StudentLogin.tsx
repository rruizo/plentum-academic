import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, BookOpen, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudentLoginProps {
  onLoginSuccess: (userId: string, userName: string, userEmail: string) => void;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLegalNotice, setShowLegalNotice] = useState(false);
  const [legalNoticeAccepted, setLegalNoticeAccepted] = useState(false);
  const [legalNotice, setLegalNotice] = useState<{title: string, content: string} | null>(null);
  const [loadingLegalNotice, setLoadingLegalNotice] = useState(false);

  useEffect(() => {
    fetchLegalNotice();
  }, []);

  const fetchLegalNotice = async () => {
    setLoadingLegalNotice(true);
    try {
      const { data, error } = await supabase
        .from('legal_notice')
        .select('title, content')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setLegalNotice(data);
      }
    } catch (error: any) {
      console.error('Error fetching legal notice:', error);
    } finally {
      setLoadingLegalNotice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!legalNoticeAccepted) {
      toast.error('Debe leer y aceptar el aviso legal para continuar');
      return;
    }
    
    if (!username || !password) {
      toast.error('Por favor ingrese usuario y contraseña');
      return;
    }

    setLoading(true);

    try {
      // 1. Validar credenciales usando la función de validación con expiración
      const { data: validation, error: validationError } = await supabase
        .rpc('validate_exam_credentials', {
          p_username: username.trim(),
          p_password: password.trim(),
          p_check_expiration: true
        });

      if (validationError) {
        console.error('Error validating credentials:', validationError);
        toast.error('Error al validar credenciales');
        setLoading(false);
        return;
      }

      // La función retorna un array con un solo elemento
      const result = validation?.[0];

      if (!result || !result.valid) {
        if (result?.is_expired) {
          toast.error('Sus credenciales han expirado. Contacte al administrador para obtener nuevas credenciales.');
        } else {
          toast.error('Usuario o contraseña incorrectos');
        }
        setLoading(false);
        return;
      }

      // 2. Buscar el perfil del usuario por email usando función segura
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_profile_by_email', { p_email: result.user_email });

      const profile = profileData?.[0];

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        toast.error('No se encontró el usuario en el sistema');
        setLoading(false);
        return;
      }

      // 3. Marcar credencial como usada (buscar por username)
      const { error: updateError } = await supabase
        .from('exam_credentials')
        .update({ is_used: true })
        .eq('username', username.trim())
        .eq('is_used', false);

      if (updateError) {
        console.error('Error marking credential as used:', updateError);
        // No detenemos el flujo, solo logueamos el error
      }

      // 4. Guardar consentimiento legal usando función segura
      try {
        await supabase.rpc('insert_legal_consent_log', {
          p_user_id: profile.id,
          p_user_email: profile.email,
          p_consent_type: 'student_login',
          p_ip_address: null,
          p_user_agent: navigator.userAgent
        });
      } catch (consentError) {
        console.error('Error guardando consentimiento:', consentError);
      }

      // 5. Login exitoso
      toast.success(`Bienvenido ${profile.full_name}`);
      onLoginSuccess(profile.id, profile.full_name, profile.email);
      
    } catch (error) {
      console.error('Error en login:', error);
      toast.error('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <BookOpen className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Portal de Estudiantes</CardTitle>
          <CardDescription>
            Ingrese con sus credenciales de acceso para ver sus exámenes asignados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Legal Notice Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLegalNotice(true)}
                  disabled={loadingLegalNotice || !legalNotice}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Aviso Legal
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="legal-accept-student"
                  checked={legalNoticeAccepted}
                  onCheckedChange={(checked) => setLegalNoticeAccepted(checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="legal-accept-student" className="text-sm">
                  He leído y acepto el aviso legal
                </Label>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !legalNoticeAccepted}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Legal Notice Dialog */}
      <Dialog open={showLegalNotice} onOpenChange={setShowLegalNotice}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{legalNotice?.title || 'Aviso Legal'}</DialogTitle>
            <DialogDescription>
              Por favor lea cuidadosamente el siguiente aviso legal
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-gray-50 p-6 rounded-lg border max-h-96 overflow-y-auto">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {legalNotice?.content || 'No hay contenido de aviso legal disponible.'}
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowLegalNotice(false)}>
                Cerrar
              </Button>
              <Button 
                onClick={() => {
                  setLegalNoticeAccepted(true);
                  setShowLegalNotice(false);
                }}
              >
                Acepto el Aviso Legal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentLogin;

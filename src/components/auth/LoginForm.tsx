
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from './AuthProvider';
import { Eye, EyeOff, User, Lock, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

export const LoginForm = ({ onSwitchToRegister, onSwitchToForgotPassword }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLegalNotice, setShowLegalNotice] = useState(false);
  const [legalNoticeAccepted, setLegalNoticeAccepted] = useState(false);
  const [legalNotice, setLegalNotice] = useState<{title: string, content: string} | null>(null);
  const [loadingLegalNotice, setLoadingLegalNotice] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

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
      setError('Debe leer y aceptar el aviso legal para continuar');
      return;
    }

    setLoading(true);
    setError('');

    console.log('LoginForm: Attempting login for:', email);

    // Verificar si es una credencial de examen (formato de usuario corto sin @)
    const isExamCredential = !email.includes('@') && email.length <= 12;
    
    if (isExamCredential) {
      setError('Las credenciales de examen no pueden usarse aquí. Por favor use el Portal de Estudiantes.');
      setLoading(false);
      return;
    }

    const { error } = await signIn(email, password);
    
    if (error) {
      console.log('LoginForm: Login error:', error.message);
      setError(error.message);
      setLoading(false);
    } else {
      console.log('LoginForm: Login successful, redirecting to dashboard');
      // Don't set loading to false here, let the auth state change handle it
      navigate('/');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="emailOrUsername">Correo electrónico o Usuario</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="emailOrUsername"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com o nombre de usuario"
                className="pl-10"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="pl-10 pr-10"
                required
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 px-0"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
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
                id="legal-accept"
                checked={legalNoticeAccepted}
                onCheckedChange={(checked) => setLegalNoticeAccepted(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="legal-accept" className="text-sm">
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
          
          <div className="text-center space-y-2">
            <Button
              type="button"
              variant="link"
              onClick={onSwitchToForgotPassword}
              className="text-sm"
              disabled={loading}
            >
              ¿Olvidaste tu contraseña?
            </Button>
            
            <div className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Button
                type="button"
                variant="link"
                onClick={onSwitchToRegister}
                className="p-0 h-auto font-medium"
                disabled={loading}
              >
                Regístrate aquí
              </Button>
            </div>
          </div>
        </form>
      </CardContent>

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
    </Card>
  );
};

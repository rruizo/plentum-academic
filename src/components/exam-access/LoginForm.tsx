
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, User } from "lucide-react";

interface LoginFormProps {
  credentials: { username: string; password: string };
  setCredentials: (credentials: { username: string; password: string } | ((prev: { username: string; password: string }) => { username: string; password: string })) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  loading: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  isRetrying?: boolean;
  retryCount?: number;
}

const LoginForm = ({ 
  credentials, 
  setCredentials, 
  showPassword, 
  setShowPassword, 
  loading, 
  error, 
  onSubmit,
  isRetrying = false,
  retryCount = 0 
}: LoginFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="username">Nombre de Usuario</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="username"
            type="text"
            value={credentials.username}
            onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
            placeholder="Ingresa tu usuario"
            className="pl-10"
            required
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
            value={credentials.password}
            onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Ingresa tu contraseña"
            className="pl-10 pr-10"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-8 w-8 px-0"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <Button type="submit" className="w-full" disabled={loading || isRetrying}>
        {loading ? 'Verificando...' : 
         isRetrying ? `Reintentando... (${retryCount}/3)` : 
         'Acceder a Evaluación'}
      </Button>
      
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>Utiliza las credenciales enviadas a tu correo electrónico</p>
        {isRetrying && (
          <p className="text-orange-600 animate-pulse">
            Reintentando conexión... ({retryCount}/3)
          </p>
        )}
        {error?.includes('conexión') && (
          <p className="text-blue-600">
            💡 Tip: Verifica tu conexión a internet
          </p>
        )}
      </div>
    </form>
  );
};

export default LoginForm;

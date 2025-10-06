import { AlertTriangle, Wifi, RefreshCw, Home, Clock, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ImprovedErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  showRetryButton?: boolean;
}

export const ImprovedErrorDisplay = ({
  error,
  onRetry,
  onGoHome,
  isRetrying = false,
  retryCount = 0,
  showRetryButton = true
}: ImprovedErrorDisplayProps) => {
  
  const getErrorDetails = (errorMessage: string) => {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('failed to fetch') || lowerError.includes('network') || lowerError.includes('conexión')) {
      return {
        icon: Wifi,
        title: 'Problema de Conexión',
        description: 'No se pudo establecer conexión con el servidor.',
        suggestions: [
          'Verifica tu conexión a internet',
          'Intenta refrescar la página',
          'Si el problema persiste, espera unos minutos y vuelve a intentar'
        ],
        variant: 'destructive' as const,
        canRetry: true
      };
    }
    
    if (lowerError.includes('expired') || lowerError.includes('expirado') || lowerError.includes('tiempo')) {
      return {
        icon: Clock,
        title: 'Sesión Expirada',
        description: 'El tiempo para completar este examen ha terminado.',
        suggestions: [
          'Contacta al administrador si necesitas una nueva oportunidad',
          'Asegúrate de completar el examen dentro del tiempo límite'
        ],
        variant: 'destructive' as const,
        canRetry: false
      };
    }
    
    if (lowerError.includes('credentials') || lowerError.includes('credenciales') || lowerError.includes('authentication')) {
      return {
        icon: Shield,
        title: 'Problema de Autenticación',
        description: 'Las credenciales no son válidas o han expirado.',
        suggestions: [
          'Verifica que estés usando el enlace correcto del examen',
          'Asegúrate de que el enlace no haya expirado',
          'Contacta al administrador para obtener nuevas credenciales'
        ],
        variant: 'destructive' as const,
        canRetry: true
      };
    }
    
    if (lowerError.includes('not found') || lowerError.includes('no encontrado') || lowerError.includes('404')) {
      return {
        icon: AlertTriangle,
        title: 'Examen No Encontrado',
        description: 'El examen solicitado no existe o no está disponible.',
        suggestions: [
          'Verifica que el enlace del examen sea correcto',
          'El examen puede haber sido eliminado o desactivado',
          'Contacta al administrador para confirmar la disponibilidad'
        ],
        variant: 'destructive' as const,
        canRetry: true
      };
    }
    
    if (lowerError.includes('attempts') || lowerError.includes('intentos') || lowerError.includes('limit')) {
      return {
        icon: AlertTriangle,
        title: 'Límite de Intentos Alcanzado',
        description: 'Ya no puedes realizar más intentos en este examen.',
        suggestions: [
          'Has agotado el número máximo de intentos permitidos',
          'Contacta al administrador si necesitas intentos adicionales'
        ],
        variant: 'destructive' as const,
        canRetry: false
      };
    }
    
    // Error genérico
    return {
      icon: AlertTriangle,
      title: 'Error Inesperado',
      description: 'Se produjo un error al cargar el examen.',
      suggestions: [
        'Intenta refrescar la página',
        'Verifica tu conexión a internet',
        'Si el problema persiste, contacta al soporte técnico'
      ],
      variant: 'destructive' as const,
      canRetry: true
    };
  };

  const errorDetails = getErrorDetails(error);
  const Icon = errorDetails.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${
              errorDetails.variant === 'destructive' 
                ? 'bg-red-100 text-red-600' 
                : 'bg-yellow-100 text-yellow-600'
            }`}>
              <Icon className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-xl font-semibold">
            {errorDetails.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant={errorDetails.variant}>
            <AlertDescription>
              {errorDetails.description}
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Qué puedes hacer:
            </h4>
            <ul className="space-y-1 text-sm">
              {errorDetails.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {retryCount > 0 && (
            <div className="text-sm text-muted-foreground text-center p-2 bg-muted/50 rounded">
              Intento {retryCount} de 3
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onGoHome}
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Volver al Inicio
            </Button>
            
            {showRetryButton && errorDetails.canRetry && onRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                className="flex-1"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Reintentando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reintentar
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Error técnico: {error}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
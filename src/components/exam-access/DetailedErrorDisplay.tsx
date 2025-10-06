import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Home, AlertTriangle, Info, Clock, CheckCircle } from "lucide-react";

interface DetailedErrorDisplayProps {
  error: string;
  testType?: string;
  retryCount?: number;
  isRetrying?: boolean;
  onNavigateHome: () => void;
  onRetry?: () => void;
}

const DetailedErrorDisplay = ({ 
  error, 
  testType = 'examen',
  retryCount = 0,
  isRetrying = false,
  onNavigateHome,
  onRetry
}: DetailedErrorDisplayProps) => {
  
  const getErrorDetails = (errorMessage: string) => {
    // Errores de conexión
    if (errorMessage.includes('conexión') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return {
        icon: RefreshCw,
        title: 'Error de Conexión',
        description: 'No se pudo establecer conexión con el servidor.',
        suggestions: [
          'Verifica tu conexión a internet',
          'Intenta recargar la página',
          'Si el problema persiste, contacta soporte técnico'
        ],
        canRetry: true,
        severity: 'warning'
      };
    }

    // Error de sesión expirada  
    if (errorMessage.includes('expirada') || errorMessage.includes('token_not_found')) {
      return {
        icon: Clock,
        title: 'Sesión Expirada',
        description: 'El enlace de acceso ha expirado.',
        suggestions: [
          'Solicita un nuevo enlace de acceso',
          'Verifica que estés usando el enlace más reciente',
          'Contacta al administrador si necesitas ayuda'
        ],
        canRetry: false,
        severity: 'error'
      };
    }

    // Errores de credenciales
    if (errorMessage.includes('credenciales') || errorMessage.includes('inválidas') || errorMessage.includes('utilizadas')) {
      return {
        icon: AlertTriangle,
        title: 'Credenciales Inválidas',
        description: 'Las credenciales proporcionadas no son correctas.',
        suggestions: [
          'Verifica tu usuario y contraseña',
          'Asegúrate de no haber utilizado estas credenciales antes',
          'Revisa el correo electrónico para confirmar los datos'
        ],
        canRetry: true,
        severity: 'error'
      };
    }

    // Error de examen no encontrado
    if (errorMessage.includes('no encontrado') || errorMessage.includes('no disponible')) {
      return {
        icon: Info,
        title: 'Examen No Disponible',
        description: `El ${testType} solicitado no está disponible.`,
        suggestions: [
          'Verifica que el enlace sea correcto',
          'Confirma que el examen esté activo',
          'Contacta al administrador'
        ],
        canRetry: false,
        severity: 'error'
      };
    }

    // Error de acceso restringido
    if (errorMessage.includes('restringido') || errorMessage.includes('completado')) {
      return {
        icon: CheckCircle,
        title: 'Evaluación Completada',
        description: 'Ya has completado esta evaluación exitosamente.',
        suggestions: [
          'Tu evaluación fue procesada correctamente',
          'Los resultados serán enviados al administrador',
          'No necesitas realizar acciones adicionales'
        ],
        canRetry: false,
        severity: 'info'
      };
    }

    // Error genérico
    return {
      icon: AlertTriangle,
      title: 'Error Desconocido',
      description: errorMessage,
      suggestions: [
        'Intenta recargar la página',
        'Verifica tu conexión a internet',
        'Contacta soporte técnico si el problema persiste'
      ],
      canRetry: true,
      severity: 'error'
    };
  };

  const errorDetails = getErrorDetails(error);
  const IconComponent = errorDetails.icon;
  
  const getAlertVariant = () => {
    switch (errorDetails.severity) {
      case 'warning': return 'default';
      case 'info': return 'default';
      case 'error': return 'destructive';
      default: return 'destructive';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <IconComponent className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{errorDetails.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={getAlertVariant()}>
            <AlertDescription>{errorDetails.description}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">¿Qué puedes hacer?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {errorDetails.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {retryCount > 0 && (
            <div className="text-xs text-center text-muted-foreground p-2 bg-muted rounded">
              Intentos realizados: {retryCount}/3
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={onNavigateHome}
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Volver al inicio
            </Button>
            
            {errorDetails.canRetry && onRetry && (
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
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailedErrorDisplay;
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wifi, WifiOff, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineStorage, PendingSubmission } from '@/hooks/useOfflineStorage';
import { toast } from 'sonner';

interface OfflineSubmissionManagerProps {
  onRetrySubmission?: (submission: PendingSubmission) => Promise<boolean>;
  onAllSubmissionsComplete?: () => void;
  className?: string;
}

export const OfflineSubmissionManager: React.FC<OfflineSubmissionManagerProps> = ({
  onRetrySubmission,
  onAllSubmissionsComplete,
  className = ''
}) => {
  const networkStatus = useNetworkStatus();
  const offlineStorage = useOfflineStorage();
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);

  // Auto-retry cuando se restaura la conexión
  useEffect(() => {
    if (networkStatus.isOnline && networkStatus.wasOffline && autoRetryEnabled && onRetrySubmission) {
      handleAutoRetry();
    }
  }, [networkStatus.isOnline, networkStatus.wasOffline, autoRetryEnabled]);

  const handleAutoRetry = async () => {
    if (isRetrying || !onRetrySubmission) return;

    const retryableSubmissions = offlineStorage.getRetryableSubmissions();
    if (retryableSubmissions.length === 0) return;

    setIsRetrying(true);
    console.log(`[OfflineSubmissionManager] Starting auto-retry for ${retryableSubmissions.length} submissions`);

    let successCount = 0;
    let failureCount = 0;

    for (const submission of retryableSubmissions) {
      try {
        console.log(`[OfflineSubmissionManager] Retrying submission: ${submission.id}`);
        const success = await onRetrySubmission(submission);
        
        if (success) {
          offlineStorage.removePendingSubmission(submission.id);
          successCount++;
        } else {
          offlineStorage.incrementRetryCount(submission.id);
          failureCount++;
        }
      } catch (error) {
        console.error(`[OfflineSubmissionManager] Error retrying submission ${submission.id}:`, error);
        offlineStorage.incrementRetryCount(submission.id);
        failureCount++;
      }

      // Pequeña pausa entre reintentos para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsRetrying(false);

    // Limpiar submissions que fallaron demasiadas veces
    offlineStorage.clearFailedSubmissions();

    // Mostrar resultados
    if (successCount > 0) {
      toast.success(`${successCount} examen(es) enviado(s) exitosamente`);
    }
    
    if (failureCount > 0) {
      toast.error(`${failureCount} examen(es) no pudieron ser enviados`);
    }

    // Si todas las submissions fueron exitosas, notificar
    if (successCount > 0 && offlineStorage.pendingSubmissions.length === 0 && onAllSubmissionsComplete) {
      onAllSubmissionsComplete();
    }
  };

  const handleManualRetry = () => {
    if (!networkStatus.isOnline) {
      toast.error('No hay conexión a internet disponible');
      return;
    }
    handleAutoRetry();
  };

  // Si no hay submissions pendientes y estamos online, no mostrar nada
  if (!offlineStorage.hasPendingSubmissions && networkStatus.isOnline) {
    return null;
  }

  // Estado: Sin conexión con submissions pendientes
  if (!networkStatus.isOnline && offlineStorage.hasPendingSubmissions) {
    return (
      <Card className={`fixed top-4 left-4 right-4 z-50 mx-auto max-w-md ${className}`}>
        <CardContent className="p-4">
          <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Sin conexión a internet</p>
                <p className="text-sm">
                  {offlineStorage.pendingSubmissions.length === 1 
                    ? 'Tu examen está guardado localmente.' 
                    : `${offlineStorage.pendingSubmissions.length} exámenes guardados localmente.`
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Se enviará automáticamente cuando se restaure la conexión.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Estado: Reintentando envío
  if (isRetrying) {
    return (
      <Card className={`fixed top-4 left-4 right-4 z-50 mx-auto max-w-md ${className}`}>
        <CardContent className="p-4">
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Enviando examen...</p>
                <p className="text-sm">
                  Por favor espera mientras se procesan tus respuestas.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Estado: Online con submissions pendientes (falló el auto-retry)
  if (networkStatus.isOnline && offlineStorage.hasPendingSubmissions) {
    const retryableSubmissions = offlineStorage.getRetryableSubmissions();
    const failedSubmissions = offlineStorage.pendingSubmissions.filter(sub => sub.retryCount >= sub.maxRetries);

    return (
      <Card className={`fixed top-4 left-4 right-4 z-50 mx-auto max-w-md ${className}`}>
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <p className="font-medium">Error al enviar examen</p>
                  <p className="text-sm">
                    Hubo un problema al enviar tu examen al servidor.
                  </p>
                </div>

                {retryableSubmissions.length > 0 && (
                  <Button 
                    onClick={handleManualRetry} 
                    size="sm" 
                    className="w-full"
                    disabled={isRetrying}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reintentar envío
                  </Button>
                )}

                {failedSubmissions.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {failedSubmissions.length} examen(es) fallaron después de varios intentos.
                    Contacte al soporte técnico si el problema persiste.
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default OfflineSubmissionManager;
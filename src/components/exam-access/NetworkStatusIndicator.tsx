import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';

interface NetworkStatusIndicatorProps {
  isRetrying?: boolean;
  retryCount?: number;
  error?: string;
}

const NetworkStatusIndicator = ({ isRetrying, retryCount, error }: NetworkStatusIndicatorProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionQuality('good');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
    };

    // Verificar calidad de conexión cada 30 segundos
    const checkConnectionQuality = async () => {
      if (!isOnline) return;
      
      try {
        const start = Date.now();
        const response = await fetch('/favicon.ico?' + Date.now(), { 
          method: 'HEAD',
          cache: 'no-cache' 
        });
        const duration = Date.now() - start;
        
        if (response.ok) {
          setConnectionQuality(duration > 2000 ? 'poor' : 'good');
        } else {
          setConnectionQuality('poor');
        }
      } catch {
        setConnectionQuality('poor');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const qualityInterval = setInterval(checkConnectionQuality, 30000);
    checkConnectionQuality(); // Check initially

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityInterval);
    };
  }, [isOnline]);

  // No mostrar si todo está bien
  if (isOnline && connectionQuality === 'good' && !isRetrying && !error?.includes('conexión')) {
    return null;
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        variant: 'destructive' as const,
        message: 'Sin conexión a internet. Verifica tu conexión.',
        className: 'border-red-200 bg-red-50'
      };
    }

    if (isRetrying) {
      return {
        icon: AlertTriangle,
        variant: 'default' as const,
        message: `Reintentando conexión... (${retryCount}/3)`,
        className: 'border-orange-200 bg-orange-50 animate-pulse'
      };
    }

    if (connectionQuality === 'poor') {
      return {
        icon: Wifi,
        variant: 'default' as const,
        message: 'Conexión lenta detectada. Los datos pueden tardar en cargar.',
        className: 'border-yellow-200 bg-yellow-50'
      };
    }

    if (error?.includes('conexión')) {
      return {
        icon: AlertTriangle,
        variant: 'destructive' as const,
        message: 'Problemas de conectividad. Intentando reconectar...',
        className: 'border-red-200 bg-red-50'
      };
    }

    return {
      icon: CheckCircle,
      variant: 'default' as const,
      message: 'Conexión restaurada',
      className: 'border-green-200 bg-green-50'
    };
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <Alert variant={config.variant} className={`mb-4 ${config.className}`}>
      <IconComponent className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{config.message}</span>
        {isRetrying && (
          <div className="flex items-center gap-2 text-xs">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
            <span>Reintentando...</span>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default NetworkStatusIndicator;
import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  reconnectedAt: Date | null;
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    wasOffline: false,
    reconnectedAt: null
  });

  useEffect(() => {
    const handleOnline = () => {
      console.log('[NetworkStatus] Connection restored');
      setNetworkStatus(prev => ({
        isOnline: true,
        wasOffline: prev.wasOffline || !prev.isOnline,
        reconnectedAt: new Date()
      }));
    };

    const handleOffline = () => {
      console.log('[NetworkStatus] Connection lost');
      setNetworkStatus(prev => ({
        isOnline: false,
        wasOffline: true,
        reconnectedAt: null
      }));
    };

    // Detectar eventos nativos de conexión
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // También detectar mediante fetch para mayor precisión
    const checkConnection = async () => {
      try {
        const response = await fetch('/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache'
        });
        if (!response.ok) throw new Error('No connection');
        
        if (!networkStatus.isOnline) {
          handleOnline();
        }
      } catch {
        if (networkStatus.isOnline) {
          handleOffline();
        }
      }
    };

    // Verificar conexión cada 30 segundos cuando está offline
    const intervalId = setInterval(() => {
      if (!networkStatus.isOnline) {
        checkConnection();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [networkStatus.isOnline]);

  return networkStatus;
};
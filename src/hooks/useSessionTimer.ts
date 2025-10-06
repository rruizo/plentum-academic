import { useState, useEffect, useRef } from 'react';

interface UseSessionTimerProps {
  endTime: string | null;
  onTimeUp: () => void;
  examStarted: boolean;
  examCompleted: boolean;
}

export const useSessionTimer = ({ 
  endTime, 
  onTimeUp, 
  examStarted, 
  examCompleted 
}: UseSessionTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasTimeExpired = useRef(false);

  useEffect(() => {
    if (!examStarted || examCompleted || !endTime) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      
      setTimeRemaining(remaining);
      
      // Si el tiempo se agotó y no ha expirado antes
      if (remaining <= 0 && !hasTimeExpired.current) {
        hasTimeExpired.current = true;
        onTimeUp();
      }
      
      return remaining;
    };

    // Calcular tiempo inicial
    calculateTimeRemaining();

    // Configurar interval para actualizar cada segundo
    intervalRef.current = setInterval(calculateTimeRemaining, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [endTime, examStarted, examCompleted, onTimeUp]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return timeRemaining;
};
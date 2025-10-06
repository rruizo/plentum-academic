
import { useState, useEffect } from 'react';

interface UseExamTimerProps {
  initialTime: number;
  onTimeUp: () => void;
  examStarted: boolean;
  examCompleted: boolean;
}

export const useExamTimer = ({ initialTime, onTimeUp, examStarted, examCompleted }: UseExamTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (examStarted && timeRemaining > 0 && !examCompleted) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [examStarted, timeRemaining, examCompleted, onTimeUp]);

  return timeRemaining;
};

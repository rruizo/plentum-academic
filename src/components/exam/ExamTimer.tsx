
import { Clock } from 'lucide-react';

interface ExamTimerProps {
  timeRemaining: number;
}

const ExamTimer = ({ timeRemaining }: ExamTimerProps) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining <= 300; // 5 minutos
  const isCriticalTime = timeRemaining <= 60; // 1 minuto

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
      isCriticalTime 
        ? 'bg-red-50 border-red-200 text-red-700 animate-pulse' 
        : isLowTime 
        ? 'bg-orange-50 border-orange-200 text-orange-700' 
        : 'bg-blue-50 border-blue-200 text-blue-700'
    }`}>
      <Clock className={`h-5 w-5 ${isCriticalTime ? 'animate-pulse' : ''}`} />
      <div className="flex flex-col">
        <span className="text-xs font-medium opacity-75">Tiempo restante</span>
        <span className="text-lg font-mono font-bold tracking-wider">
          {formatTime(timeRemaining)}
        </span>
      </div>
      {isLowTime && (
        <div className="flex items-center gap-1 text-xs">
          <div className={`w-2 h-2 rounded-full ${isCriticalTime ? 'bg-red-500' : 'bg-orange-500'} animate-pulse`} />
          <span className="font-medium">
            {isCriticalTime ? '¡Tiempo crítico!' : '¡Poco tiempo!'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ExamTimer;


import { useEffect } from 'react';

export const useKioskMode = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;

    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5' || 
          (event.ctrlKey && event.key === 'r') ||
          (event.ctrlKey && event.shiftKey && event.key === 'R') ||
          event.key === 'F12' ||
          (event.ctrlKey && event.shiftKey && event.key === 'I')) {
        event.preventDefault();
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
};

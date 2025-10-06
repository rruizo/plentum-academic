export class NetworkRetryService {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 1000; // 1 segundo

  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.MAX_RETRIES,
    baseDelay: number = this.BASE_DELAY
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[NetworkRetryService] Attempt ${attempt}/${maxRetries}`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`[NetworkRetryService] Success on attempt ${attempt}`);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`[NetworkRetryService] Attempt ${attempt} failed:`, error);
        
        // No reintentar si no es un error de red
        if (!this.isNetworkError(error)) {
          console.log(`[NetworkRetryService] Not a network error, stopping retries`);
          throw error;
        }
        
        // Si es el último intento, lanzar el error
        if (attempt === maxRetries) {
          console.error(`[NetworkRetryService] All ${maxRetries} attempts failed`);
          break;
        }
        
        // Calcular delay con backoff exponencial
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * delay; // Añadir jitter
        const totalDelay = delay + jitter;
        
        console.log(`[NetworkRetryService] Waiting ${Math.round(totalDelay)}ms before retry...`);
        await this.delay(totalDelay);
      }
    }

    throw lastError;
  }

  private static isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';
    
    // Detectar errores de red comunes
    const networkErrorPatterns = [
      'failed to fetch',
      'network error',
      'connection failed',
      'timeout',
      'connection refused',
      'network request failed',
      'fetch error',
      'typeerror: failed to fetch',
      'networkerror'
    ];
    
    return networkErrorPatterns.some(pattern => 
      errorMessage.includes(pattern) || errorName.includes(pattern)
    ) || error.code === 'NETWORK_ERROR' || !navigator.onLine;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async withNetworkCheck<T>(operation: () => Promise<T>): Promise<T> {
    // Verificar conexión básica
    if (!navigator.onLine) {
      throw new Error('Sin conexión a internet');
    }

    try {
      // Intentar un ping básico antes de la operación principal
      await fetch('/favicon.ico', { 
        method: 'HEAD', 
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      });
    } catch (error) {
      console.warn('[NetworkRetryService] Basic connectivity check failed:', error);
      // No lanzar error aquí, permitir que la operación principal lo maneje
    }

    return await operation();
  }

  static createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }
}
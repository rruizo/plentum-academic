// Utilidad para logs detallados del sistema de acceso a exámenes
export class ExamAccessLogger {
  private static instance: ExamAccessLogger;
  private logs: Array<{ timestamp: string; level: string; event: string; data: any; sessionId?: string }> = [];

  public static getInstance(): ExamAccessLogger {
    if (!ExamAccessLogger.instance) {
      ExamAccessLogger.instance = new ExamAccessLogger();
    }
    return ExamAccessLogger.instance;
  }

  private log(level: 'info' | 'warn' | 'error', event: string, data: any, sessionId?: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      data,
      sessionId
    };
    
    this.logs.push(entry);
    
    // Mantener solo los últimos 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }
    
    // Log en consola con formato claro
    console.log(`[ExamAccess:${level.toUpperCase()}] ${event}`, data);
  }

  // Logs específicos para acceso a exámenes
  public logSessionAccess(sessionId: string, testType: string, userEmail?: string) {
    this.log('info', 'session_access_attempt', {
      sessionId,
      testType,
      userEmail: userEmail || 'anonymous',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }, sessionId);
  }

  public logCredentialValidation(username: string, success: boolean, reason?: string) {
    this.log(success ? 'info' : 'warn', 'credential_validation', {
      username,
      success,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  public logConnectionError(error: any, retryCount: number) {
    this.log('error', 'connection_error', {
      error: error.message,
      retryCount,
      networkStatus: navigator.onLine,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
  }

  public logExamStart(examId: string, userId: string, attemptId?: string, sessionId?: string) {
    this.log('info', 'exam_start', {
      examId,
      userId,
      attemptId,
      sessionId,
      timestamp: new Date().toISOString()
    }, sessionId);
  }

  public logExamComplete(examId: string, userId: string, success: boolean, error?: any) {
    this.log(success ? 'info' : 'error', 'exam_completion', {
      examId,
      userId,
      success,
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  }

  public logFetchAttempt(resource: string, attempt: number, success: boolean, error?: any) {
    this.log(success ? 'info' : 'warn', 'fetch_attempt', {
      resource,
      attempt,
      success,
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  }

  // Obtener logs para debugging
  public getLogs(): Array<any> {
    return [...this.logs];
  }

  public getRecentLogs(minutes: number = 30): Array<any> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(log => new Date(log.timestamp) > cutoff);
  }

  public clearLogs() {
    this.logs = [];
    console.log('[ExamAccess:INFO] Logs cleared');
  }

  // Exportar logs para soporte técnico
  public exportLogs(): string {
    const logsData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      online: navigator.onLine,
      logs: this.logs
    };
    
    return JSON.stringify(logsData, null, 2);
  }
}

export const examLogger = ExamAccessLogger.getInstance();
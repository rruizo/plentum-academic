// Check if exam is expired based on fecha_cierre
export const isExamExpiredByDate = (exam: any): boolean => {
  if (!exam.fecha_cierre) return false;
  const now = new Date();
  const closeDate = new Date(exam.fecha_cierre);
  return now > closeDate;
};

// Check if credentials are expired
export const areCredentialsExpired = (credentials: any): boolean => {
  if (!credentials?.expires_at) return false;
  const now = new Date();
  const expiresAt = new Date(credentials.expires_at);
  return now > expiresAt;
};

// Hybrid expiration check: returns true if EITHER exam OR credentials are expired
export const isExamAccessExpired = (exam: any, credentials?: any): boolean => {
  const examExpired = isExamExpiredByDate(exam);
  const credentialsExpired = credentials ? areCredentialsExpired(credentials) : false;
  return examExpired || credentialsExpired;
};

// Get the earliest expiration date between exam and credentials
export const getEffectiveExpirationDate = (exam: any, credentials?: any): Date | null => {
  const examCloseDate = exam.fecha_cierre ? new Date(exam.fecha_cierre) : null;
  const credentialExpiry = credentials?.expires_at ? new Date(credentials.expires_at) : null;
  
  if (!examCloseDate && !credentialExpiry) return null;
  if (!examCloseDate) return credentialExpiry;
  if (!credentialExpiry) return examCloseDate;
  
  return examCloseDate < credentialExpiry ? examCloseDate : credentialExpiry;
};

export const canTakeExam = (exam: any, userAttempts: any[], credentials?: any) => {
  const now = new Date();
  const openDate = exam.fecha_apertura ? new Date(exam.fecha_apertura) : null;
  
  if (exam.estado !== 'activo') return false;
  if (openDate && now < openDate) return false;
  
  // HYBRID EXPIRATION: Check both exam close date AND credential expiration
  if (isExamAccessExpired(exam, credentials)) return false;
  
  // Verificar si ya tomó el examen
  const hasAttempt = userAttempts.some(attempt => attempt.exam_id === exam.id);
  return !hasAttempt;
};

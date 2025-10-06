
import { Badge } from '@/components/ui/badge';
import { isExamExpiredByDate, areCredentialsExpired, getEffectiveExpirationDate } from '@/utils/examUtils';

interface ExamStatusBadgeProps {
  exam: any;
  credentials?: any;
  showExpirationDate?: boolean;
}

const ExamStatusBadge = ({ exam, credentials, showExpirationDate = false }: ExamStatusBadgeProps) => {
  const getExamStatus = (exam: any, credentials?: any) => {
    const now = new Date();
    const openDate = exam.fecha_apertura ? new Date(exam.fecha_apertura) : null;
    
    if (exam.estado === 'borrador') return { status: 'Borrador', color: 'bg-gray-100 text-gray-800' };
    if (exam.estado === 'archivado') return { status: 'Archivado', color: 'bg-gray-100 text-gray-800' };
    
    if (openDate && now < openDate) return { status: 'Próximamente', color: 'bg-blue-100 text-blue-800' };
    
    // HYBRID EXPIRATION CHECK: Check both exam and credentials
    const examExpired = isExamExpiredByDate(exam);
    const credentialsExpired = credentials ? areCredentialsExpired(credentials) : false;
    
    if (examExpired || credentialsExpired) {
      const reason = examExpired && credentialsExpired ? 'Examen y credenciales expirados' :
                     examExpired ? 'Examen cerrado' : 'Credenciales expiradas';
      return { status: reason, color: 'bg-red-100 text-red-800' };
    }
    
    return { status: 'Disponible', color: 'bg-green-100 text-green-800' };
  };

  const status = getExamStatus(exam, credentials);
  const effectiveExpiration = getEffectiveExpirationDate(exam, credentials);

  return (
    <div className="flex flex-col gap-1">
      <Badge className={status.color}>
        {status.status}
      </Badge>
      {showExpirationDate && effectiveExpiration && (
        <span className="text-xs text-muted-foreground">
          Expira: {effectiveExpiration.toLocaleDateString('es-MX', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      )}
    </div>
  );
};

export default ExamStatusBadge;

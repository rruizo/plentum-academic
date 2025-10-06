
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3, Shield, ExternalLink, Users } from 'lucide-react';
import ReportConfiguration from './ReportConfiguration';
import RoleBasedAnalytics from './RoleBasedAnalytics';
import ConfiabilityExamCreation from './ConfiabilityExamCreation';
import CandidateReportViewer from './CandidateReportViewer';

interface QuickActionsProps {
  userRole: string;
}

const QuickActions = ({ userRole }: QuickActionsProps) => {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleCreateExam = () => {
    setActiveAction('create-exam');
  };

  const handleGenerateReport = () => {
    setActiveAction('generate-report');
  };

  const handleAnalytics = () => {
    setActiveAction('analytics');
  };

  const handleCandidateReports = () => {
    setActiveAction('candidate-reports');
  };

  const handleBackToActions = () => {
    setActiveAction(null);
  };

  if (activeAction === 'create-exam') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackToActions}>
          ← Volver a Acciones Rápidas
        </Button>
        <ConfiabilityExamCreation />
      </div>
    );
  }

  if (activeAction === 'generate-report') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackToActions}>
          ← Volver a Acciones Rápidas
        </Button>
        <ReportConfiguration />
      </div>
    );
  }

  if (activeAction === 'analytics') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackToActions}>
          ← Volver a Acciones Rápidas
        </Button>
        <RoleBasedAnalytics userRole={userRole} />
      </div>
    );
  }

  if (activeAction === 'candidate-reports') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackToActions}>
          ← Volver a Acciones Rápidas
        </Button>
        <CandidateReportViewer userRole={userRole} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
        <CardDescription>
          Herramientas más utilizadas para análisis psicométrico
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button
            onClick={handleCreateExam}
            className="h-16 sm:h-20 lg:h-24 flex flex-col items-center justify-center gap-1 sm:gap-2 bg-primary hover:bg-primary/90 text-primary-foreground p-3 min-w-0"
            size="lg"
          >
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-center leading-tight break-text">
              Crear Examen de Confianza
            </span>
          </Button>

          <Button
            onClick={handleGenerateReport}
            variant="outline"
            className="h-16 sm:h-20 lg:h-24 flex flex-col items-center justify-center gap-1 sm:gap-2 p-3 min-w-0"
            size="lg"
          >
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-center leading-tight break-text">
              Generar Reporte PDF
            </span>
          </Button>

          <Button
            onClick={handleAnalytics}
            variant="outline"
            className="h-16 sm:h-20 lg:h-24 flex flex-col items-center justify-center gap-1 sm:gap-2 p-3 min-w-0"
            size="lg"
          >
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-center leading-tight break-text">
              Análisis Alfa de Cronbach
            </span>
          </Button>

          {(userRole === 'admin' || userRole === 'supervisor' || userRole === 'teacher') && (
            <Button
              onClick={handleCandidateReports}
              variant="outline"
              className="h-16 sm:h-20 lg:h-24 flex flex-col items-center justify-center gap-1 sm:gap-2 p-3 min-w-0"
              size="lg"
            >
              <Users className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-center leading-tight break-text">
                Análisis Psicométrico
              </span>
            </Button>
          )}
        </div>
        
        <div className="mt-4 p-3 bg-muted rounded-lg border">
          <p className="text-responsive-base text-muted-foreground break-text">
            <strong>Nota:</strong> Accede directamente a la creación de exámenes desde aquí o 
            navega a la sección de Exámenes para una gestión más completa.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;


import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  GraduationCap, 
  BarChart3, 
  FileText, 
  Settings,
  TrendingUp,
  Clock,
  Shield,
  Building2,
  Mail
} from "lucide-react";
import QuickActions from "./QuickActions";
import SupervisorAnalyticsDashboard from "./analytics/SupervisorAnalyticsDashboard";
import CompanyConfigurationInterface from "./CompanyConfigurationInterface";
import OptimizedCategoryManagement from "./OptimizedCategoryManagement";
import { DiagnosticoResend } from "./DiagnosticoResend";
import DiagnosticoEmail from './DiagnosticoEmail';
import CandidateReportViewer from "./CandidateReportViewer";
import { useAuth } from "./auth/AuthProvider";

interface DashboardProps {
  userRole: string;
}

const Dashboard = ({ userRole }: DashboardProps) => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const statsCards = [
    {
      title: "Exámenes Activos",
      value: "12",
      description: "Disponibles para candidatos",
      icon: GraduationCap,
      color: "text-blue-600",
      change: "+2 desde ayer"
    },
    {
      title: "Candidatos Evaluados",
      value: "347",
      description: "Este mes",
      icon: Users,
      color: "text-green-600",
      change: "+18% vs mes anterior"
    },
    {
      title: "Puntuación Promedio",
      value: "78.5%",
      description: "Confiabilidad general",
      icon: BarChart3,
      color: "text-purple-600",
      change: "+2.3% mejora"
    },
    {
      title: "Reportes Generados",
      value: "89",
      description: "Últimos 7 días",
      icon: FileText,
      color: "text-orange-600",
      change: "+12 nuevos"
    }
  ];

  const recentActivity = [
    {
      title: "Examen 'Evaluación Gerencial' completado",
      description: "Juan Pérez - Puntuación: 85%",
      time: "Hace 2 horas",
      type: "exam"
    },
    {
      title: "Nuevo candidato registrado",
      description: "María González - Área de Ventas",
      time: "Hace 4 horas",
      type: "user"
    },
    {
      title: "Reporte PDF generado",
      description: "Evaluación de Confiabilidad - Q4 2024",
      time: "Hace 6 horas",
      type: "report"
    },
    {
      title: "Configuración actualizada",
      description: "Umbrales de simulación modificados",
      time: "Ayer",
      type: "config"
    }
  ];

  if (activeSection === 'company-config') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setActiveSection(null)}>
          ← Volver al Dashboard
        </Button>
        <CompanyConfigurationInterface />
      </div>
    );
  }

  if (activeSection === 'category-management') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setActiveSection(null)}>
          ← Volver al Dashboard
        </Button>
        <OptimizedCategoryManagement />
      </div>
    );
  }

  if (activeSection === 'supervisor-analytics' && user) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setActiveSection(null)}>
          ← Volver al Dashboard
        </Button>
        <SupervisorAnalyticsDashboard supervisorId={user.id} />
      </div>
    );
  }

  if (activeSection === 'resend-diagnostico') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setActiveSection(null)}>
          ← Volver al Dashboard
        </Button>
        <DiagnosticoResend />
      </div>
    );
  }

  if (activeSection === 'email-diagnostico') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setActiveSection(null)}>
          ← Volver al Dashboard
        </Button>
        <DiagnosticoEmail />
      </div>
    );
  }

  if (activeSection === 'candidate-reports') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setActiveSection(null)}>
          ← Volver al Dashboard
        </Button>
        <CandidateReportViewer userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="space-responsive">
      <div className="flex-responsive">
        <div className="min-w-0">
          <h1 className="text-responsive-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-responsive-base text-muted-foreground mt-1">
            Resumen general del sistema de evaluación psicométrica
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Última actualización:</span>
            <span className="sm:hidden">Act:</span>
            <span>{new Date().toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid-responsive gap-3 sm:gap-4 lg:gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="card-mobile sm:p-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 ${stat.color} shrink-0 mt-1`} />
                  <div className="min-w-0 flex-1 space-y-1 sm:space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                      {stat.title}
                    </p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold">
                      {stat.value}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                      {stat.description}
                    </p>
                    <p className="text-xs text-green-600">
                      {stat.change}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Acciones Rápidas */}
        <div className="lg:col-span-2">
          <QuickActions userRole={userRole} />
        </div>

        {/* Actividad Reciente */}
        <div>
          <Card className="card-mobile sm:p-0">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-responsive-lg">Actividad Reciente</CardTitle>
              <CardDescription className="text-responsive-base">
                Últimas acciones en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <div className="space-y-3 sm:space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="shrink-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'exam' ? 'bg-blue-500' :
                        activity.type === 'user' ? 'bg-green-500' :
                        activity.type === 'report' ? 'bg-orange-500' : 'bg-purple-500'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium">
                        {activity.title}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sección de configuraciones rápidas para admin */}
      {userRole === 'admin' && (
        <Card className="card-mobile sm:p-0">
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <CardTitle className="text-responsive-lg flex items-center gap-2">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              Configuración del Sistema
            </CardTitle>
            <CardDescription className="text-responsive-base">
              Acceso rápido a las configuraciones principales
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Button
                variant="outline"
                className="h-14 sm:h-16 lg:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3"
                onClick={() => setActiveSection('company-config')}
              >
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                <span className="text-xs sm:text-sm text-center leading-tight">
                  Configurar Empresa
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-14 sm:h-16 lg:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3"
                onClick={() => setActiveSection('category-management')}
              >
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                <span className="text-xs sm:text-sm text-center leading-tight">
                  Gestionar Categorías
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-14 sm:h-16 lg:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3"
                onClick={() => setActiveSection('supervisor-analytics')}
              >
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                <span className="text-xs sm:text-sm text-center leading-tight">
                  Análisis de Supervisión
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-14 sm:h-16 lg:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3"
                onClick={() => setActiveSection('resend-diagnostico')}
              >
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                <span className="text-xs sm:text-sm text-center leading-tight">
                  Diagnóstico Resend
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-14 sm:h-16 lg:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3"
                onClick={() => setActiveSection('email-diagnostico')}
              >
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
                <span className="text-xs sm:text-sm text-center leading-tight">
                  Test de Entrega
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supervisor specific analytics */}
      {userRole === 'supervisor' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Herramientas de Supervisión
            </CardTitle>
            <CardDescription>
              Análisis y seguimiento de candidatos asignados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="default"
              className="w-full"
              onClick={() => setActiveSection('supervisor-analytics')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Ver Dashboard de Supervisión Completo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

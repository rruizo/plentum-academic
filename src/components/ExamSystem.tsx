
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  Brain,
  Shield,
  Award,
  AlertCircle,
  Settings
} from "lucide-react";
import Dashboard from './Dashboard';
import Analytics from './Analytics';
import ConfiabilityQuestionManagement from './ConfiabilityQuestionManagement';
import ExamManagement from './ExamManagement';
import AdminExamList from './AdminExamList';
import { useIsMobile } from "@/hooks/use-mobile";

const ExamSystem = ({ userRole }: { userRole: string }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const isMobile = useIsMobile();

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Resumen general del sistema',
      icon: Users,
      component: <Dashboard userRole={userRole} />,
      roles: ['admin', 'teacher', 'student']
    },
    {
      id: 'questions',
      title: 'Preguntas',
      description: 'Gestión de preguntas de confiabilidad',
      icon: BookOpen,
      component: <ConfiabilityQuestionManagement />,
      roles: ['admin', 'teacher']
    },
    {
      id: 'exams',
      title: 'Exámenes',
      description: 'Gestión de exámenes de confiabilidad',
      icon: FileText,
      component: <ExamManagement userRole={userRole} />,
      roles: ['admin', 'teacher']
    },
    {
      id: 'analytics',
      title: 'Analíticas',
      description: 'Análisis psicométrico avanzado',
      icon: TrendingUp,
      component: <Analytics userRole={userRole} />,
      roles: ['admin', 'teacher']
    },
    {
      id: 'results',
      title: 'Resultados',
      description: 'Ver resultados de exámenes',
      icon: TrendingUp,
      component: <AdminExamList userRole={userRole} />,
      roles: ['teacher', 'admin']
    }
  ];

  const selectedMenuItem = menuItems.find(item => item.id === activeSection);
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="bg-white border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Sistema de Confianza
          </h2>
          <p className="text-sm text-gray-500">
            Panel de control
          </p>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="bg-white border-b overflow-x-auto">
          <div className="flex space-x-1 p-2 min-w-max">
            {filteredMenuItems.map(item => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveSection(item.id)}
                className="whitespace-nowrap"
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.title}
              </Button>
            ))}
          </div>
        </div>

        {/* Mobile Content */}
        <div className="p-4">
          {selectedMenuItem ? (
            selectedMenuItem.component
          ) : (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-700">
                Selecciona una opción
              </h2>
              <p className="text-gray-500 text-sm">
                Utiliza las pestañas superiores para navegar.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white">
        <div className="h-full px-3 py-4 overflow-y-auto bg-white">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Sistema de Confianza
            </h2>
            <p className="text-sm text-gray-500">
              Panel de control
            </p>
          </div>
          <ul className="mt-6 space-y-1">
            {filteredMenuItems.map(item => (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${activeSection === item.id ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.title}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Desktop Main Content */}
      <div className="flex-1 p-4 overflow-auto">
        {selectedMenuItem ? (
          selectedMenuItem.component
        ) : (
          <div className="text-center py-24">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700">
              Selecciona una opción del menú
            </h2>
            <p className="text-gray-500">
              Utiliza el menú lateral para navegar por las diferentes secciones del sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamSystem;

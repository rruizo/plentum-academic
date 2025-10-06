import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/layout/Header";
import PsychometricTestManagement from "@/components/PsychometricTestManagement";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { Brain, ArrowLeft } from "lucide-react";
import { useLocation } from "react-router-dom";

const PsychometricTests = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { user, loading, role, roleLoading } = useAuth();
  const { config } = useSystemConfig();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (!roleLoading && !['admin', 'teacher'].includes(role)) {
        // Solo admin y teacher pueden acceder a tests psicométricos
        navigate('/');
      }
    }
  }, [user, loading, role, roleLoading, navigate]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tests psicométricos...</p>
        </div>
      </div>
    );
  }

  if (!user || !['admin', 'teacher'].includes(role)) {
    return null;
  }

  const systemName = config?.system_name || 'Plentum Verify';
  const logoUrl = config?.logo_url || '/lovable-uploads/688ca52e-d5b7-4cab-b25f-e7f916766599.png';

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar 
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
        />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <Header
              pageTitle="Tests Psicométricos"
              logoUrl={logoUrl}
              systemName={systemName}
              onToggleSidebar={toggleSidebar}
              onShowSupabaseTest={() => {}}
            />
            
            <div className="prevent-overflow padding-responsive">
              {/* Botón de regreso */}
              <div className="mb-6">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al Dashboard Principal
                </Button>
              </div>

              {/* Componente principal de gestión psicométrica */}
              <PsychometricTestManagement />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PsychometricTests;
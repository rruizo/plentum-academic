//Prueba
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/layout/Header";
import MainContent from "@/components/layout/MainContent";
import SupabaseTest from "@/components/SupabaseTest";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { getPageTitle } from "@/utils/pageUtils";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showSupabaseTest, setShowSupabaseTest] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { user, loading, role, roleLoading } = useAuth();
  const { config } = useSystemConfig();
  const navigate = useNavigate();

  // Set initial tab based on user role
  useEffect(() => {
    if (!roleLoading && role) {
      console.log('🎯 Index: Setting initial tab based on role:', role);
      if (role === 'student') {
        if (activeTab !== 'student-dashboard') {
          console.log('👤 Index: Setting student dashboard');
          setActiveTab('student-dashboard');
        }
      } else {
        if (activeTab === 'student-dashboard' || activeTab === 'dashboard') {
          console.log('👨‍💼 Index: Setting admin/teacher dashboard');
          setActiveTab('dashboard');
        }
      }
    }
  }, [role, roleLoading, activeTab]);

  useEffect(() => {
    console.log('Index: Auth state check', { 
      user: user?.email || 'no user', 
      loading,
      currentPath: window.location.pathname 
    });
    
    if (!loading) {
      if (!user) {
        console.log('No user found, redirecting to auth');
        navigate('/auth');
      } else {
        console.log('User authenticated:', user.email);
      }
    }
  }, [user, loading, navigate]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading || roleLoading) {
    console.log('Index: Still loading auth state or user role');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('Index: No user, should redirect');
    return null;
  }

  const systemName = config?.system_name || 'AVSEC Trust';
  const logoUrl = config?.logo_url || '/lovable-uploads/688ca52e-d5b7-4cab-b25f-e7f916766599.png';

  if (showSupabaseTest) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4">
          <Button 
            onClick={() => setShowSupabaseTest(false)} 
            variant="outline" 
            className="mb-4"
          >
            ← Volver al {systemName}
          </Button>
          <SupabaseTest />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
        />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <Header
              pageTitle={getPageTitle(activeTab)}
              logoUrl={logoUrl}
              systemName={systemName}
              onToggleSidebar={toggleSidebar}
              onShowSupabaseTest={() => setShowSupabaseTest(true)}
            />
            
            <MainContent 
              activeTab={activeTab} 
              userRole={role}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
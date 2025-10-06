//Prueba
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import Sidebar from "@/components/Sidebar";
import SecurityConfigGuide from "@/components/SecurityConfigGuide";

const Security = () => {
  const [activeTab, setActiveTab] = useState("security");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, role } = useAuth();
  const { config } = useSystemConfig();
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    if (tab === 'security') return; // Stay on security page
    // Handle navigation to other tabs/pages here if needed
    navigate('/');
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Only allow admin access
  useEffect(() => {
    if (user && role && role !== 'admin') {
      navigate('/');
    }
  }, [user, role, navigate]);

  if (!user || !config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        activeTab="security"
        setActiveTab={() => {}}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-6">
              Configuración de Seguridad
            </h1>
            <SecurityConfigGuide />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Security;
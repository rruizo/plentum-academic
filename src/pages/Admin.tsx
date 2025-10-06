import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/layout/Header";
import AdminPanel from "@/components/AdminPanel";

const AdminPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, role, loading: authLoading } = useAuth();
  const { config } = useSystemConfig();
  const navigate = useNavigate();

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role !== 'admin') {
    navigate('/');
    return null;
  }

  const systemName = config?.system_name || 'AVSEC Trust';
  const logoUrl = config?.logo_url || '/lovable-uploads/688ca52e-d5b7-4cab-b25f-e7f916766599.png';

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar 
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <Header
              pageTitle="Administración"
              logoUrl={logoUrl}
              systemName={systemName}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onShowSupabaseTest={() => {}}
            />
            
            <div className="p-6">
              <AdminPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPage;

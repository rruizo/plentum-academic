import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TestDataManager from "@/components/TestDataManager";
import { TestFunctionalitySystem } from "@/components/testing/TestFunctionalitySystem";
import { AutomatedTestRunner } from "@/components/testing/AutomatedTestRunner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

const TestDataManagement = () => {
  const navigate = useNavigate();
  const { role, roleLoading } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      // Solo admins pueden acceder
      if (!roleLoading && role !== 'admin') {
        navigate('/');
        return;
      }
    };

    checkAuth();
  }, [navigate, role, roleLoading]);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gestión de Datos de Prueba</h1>
          <p className="text-muted-foreground">
            Herramientas de administración para desarrollo y pruebas
          </p>
        </div>
        
        <div className="w-full space-y-8">
          {/* Sistema de Pruebas Automáticas */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Pruebas Automáticas End-to-End</h2>
            <AutomatedTestRunner />
          </div>
          
          {/* Grid de componentes existentes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Testing por Componentes</h2>
              <TestFunctionalitySystem />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">Gestión de Datos</h2>
              <TestDataManager />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDataManagement;
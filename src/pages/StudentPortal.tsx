import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLogin from '@/components/student-portal/StudentLogin';
import StudentExamsList from '@/components/student-portal/StudentExamsList';
import { PersonalFactorsForm } from '@/components/exam/PersonalFactorsForm';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PortalStep = 'login' | 'personal-data' | 'exams';

const StudentPortal = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<PortalStep>('login');
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  const handleLoginSuccess = async (authUserId: string, name: string, email: string) => {
    setUserId(authUserId);
    setUserName(name);
    setUserEmail(email);
    
    // Verificar si ya tiene factores personales guardados
    const { data: existingFactors } = await supabase
      .from('personal_factors')
      .select('id')
      .eq('user_id', authUserId)
      .maybeSingle();
    
    if (existingFactors) {
      // Ya tiene datos, ir directo a exámenes
      setCurrentStep('exams');
    } else {
      // Necesita completar datos personales
      setCurrentStep('personal-data');
    }
  };

  const handlePersonalDataSubmit = async (data: {
    estado_civil: string;
    tiene_hijos: boolean;
    situacion_habitacional: string;
    edad: number;
  }) => {
    if (!userId) return;

    // Usar función RPC para insertar sin autenticación Auth
    const { data: resultData, error } = await supabase.rpc('insert_personal_factors', {
      p_user_id: userId,
      p_edad: data.edad,
      p_estado_civil: data.estado_civil,
      p_tiene_hijos: data.tiene_hijos,
      p_situacion_habitacional: data.situacion_habitacional,
      p_exam_id: null,
      p_session_id: null
    });

    if (error) {
      console.error('Error guardando factores personales:', error);
      toast.error('Error al guardar sus datos');
      return;
    }

    toast.success('Datos guardados correctamente');
    setCurrentStep('exams');
  };

  const handleLogout = () => {
    setUserId(null);
    setUserName('');
    setCurrentStep('login');
    toast.success('Sesión cerrada');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header con logout si está autenticado */}
      {currentStep !== 'login' && (
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold">Portal de Estudiantes</h1>
              {userName && (
                <p className="text-sm text-muted-foreground">
                  Bienvenido, {userName}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        {currentStep === 'login' && (
          <StudentLogin onLoginSuccess={handleLoginSuccess} />
        )}

        {currentStep === 'personal-data' && (
          <div className="max-w-2xl mx-auto">
            <PersonalFactorsForm 
              onSubmit={handlePersonalDataSubmit}
            />
          </div>
        )}

        {currentStep === 'exams' && userId && (
          <StudentExamsList userId={userId} userEmail={userEmail} />
        )}
      </div>
    </div>
  );
};

export default StudentPortal;

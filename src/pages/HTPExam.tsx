import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LegalConsentForm from '@/components/LegalConsentForm';
import HTPSubmissionForm from '@/components/HTPSubmissionForm';
import { toast } from 'sonner';

const HTPExam = () => {
  const { accessLink } = useParams();
  console.log('AccessLink recibido:', accessLink);
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'consent' | 'submission' | 'completed' | 'error'>('consent');
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    validateAccess();
  }, [accessLink]);

  const validateAccess = async () => {
    if (!accessLink) {
      setCurrentStep('error');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Primero intentar validar usando el accessLink como user_id directamente
      let assignmentData = null;
      let assignmentError = null;

      // Si el accessLink parece ser un UUID de usuario, buscar la asignación HTP
      if (accessLink && accessLink.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.log('Searching HTP assignment by user_id:', accessLink);
        
        const { data: directAssignment, error: directError } = await supabase
          .from('htp_assignments')
          .select('*')
          .eq('user_id', accessLink)
          .eq('status', 'notified')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (directAssignment) {
          // Obtener datos del perfil por separado
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, email, company')
            .eq('id', accessLink)
            .single();

          // Convertir al formato esperado
          assignmentData = [{
            id: directAssignment.id,
            user_id: directAssignment.user_id,
            assigned_by: directAssignment.assigned_by,
            access_link: directAssignment.access_link,
            status: directAssignment.status,
            expires_at: directAssignment.expires_at,
            email_sent: directAssignment.email_sent,
            created_at: directAssignment.created_at,
            updated_at: directAssignment.updated_at,
            user_full_name: profileData?.full_name || 'Usuario',
            user_email: profileData?.email || '',
            user_company: profileData?.company || ''
          }];
        } else {
          assignmentError = directError;
        }
      } else {
        // Usar el RPC original para otros casos
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('validate_htp_assignment_access', { p_access_link: accessLink });
        
        assignmentData = rpcData;
        assignmentError = rpcError;
      }

      console.log('HTP Assignment validation result:', { assignmentData, assignmentError, accessLink });

      if (assignmentError) {
        console.error('Assignment validation error:', assignmentError);
        setCurrentStep('error');
        return;
      }

      if (!assignmentData || assignmentData.length === 0) {
        console.error('Assignment not found for access link:', accessLink);
        setCurrentStep('error');
        return;
      }

      // Get the first result (RPC returns an array)
      const assignment = Array.isArray(assignmentData) ? assignmentData[0] : assignmentData;

      // Check if assignment has expired (only if expiration date is set)
      if (assignment.expires_at && assignment.expires_at !== null && new Date(assignment.expires_at) < new Date()) {
        console.log('Assignment expired:', assignment.expires_at);
        toast.error('El enlace ha expirado');
        setCurrentStep('error');
        return;
      }

      // Check if already completed
      const { data: submissionData } = await supabase
        .from('htp_submissions')
        .select('id')
        .eq('assignment_id', assignment.id)
        .limit(1)
        .maybeSingle();

      if (submissionData) {
        setCurrentStep('completed');
      }

      setAssignment(assignment);

    } catch (error: any) {
      console.error('Error validating access:', error);
      setCurrentStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentGiven = (consent: boolean) => {
    setConsentGiven(consent);
  };

  const handleConsentComplete = () => {
    if (consentGiven) {
      setCurrentStep('submission');
    } else {
      setCurrentStep('error');
      // Here you could notify administrators about the rejection
    }
  };

  const handleSubmissionComplete = () => {
    setCurrentStep('completed');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Validando acceso...</span>
        </div>
      </div>
    );
  }

  if (currentStep === 'error' || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <div>
                <h2 className="text-xl font-semibold">Acceso no válido</h2>
                <p className="text-muted-foreground mt-2">
                  {!accessLink 
                    ? 'Enlace de acceso no encontrado'
                    : 'El enlace ha expirado o no es válido'
                  }
                </p>
              </div>
              <Alert>
                <AlertDescription>
                  Por favor contacte al área de Recursos Humanos para obtener un nuevo enlace de acceso.
                </AlertDescription>
              </Alert>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-semibold">¡Examen Completado!</h2>
                <p className="text-muted-foreground mt-2">
                  Hola {assignment.user_full_name}, has completado exitosamente el examen HTP.
                </p>
              </div>
              <Alert>
                <AlertDescription>
                  Tu evaluación ha sido enviada y será procesada por nuestro equipo. 
                  Te contactaremos con los siguientes pasos del proceso de selección.
                </AlertDescription>
              </Alert>
              <Button 
                variant="default" 
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Examen HTP</h1>
          <p className="text-muted-foreground mt-2">
            Evaluación Proyectiva House-Tree-Person para {assignment.user_full_name}
          </p>
        </div>

        {/* Content based on current step */}
        {currentStep === 'consent' && (
          <LegalConsentForm
            examType="htp"
            onConsentGiven={handleConsentGiven}
            onConsentComplete={handleConsentComplete}
          />
        )}

        {currentStep === 'submission' && (
          <HTPSubmissionForm
            assignmentId={assignment.id}
            onSubmissionComplete={handleSubmissionComplete}
          />
        )}
      </div>
    </div>
  );
};

export default HTPExam;
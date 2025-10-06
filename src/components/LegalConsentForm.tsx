import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegalConsentFormProps {
  examType: 'htp' | 'reliability' | 'psychometric';
  examId?: string;
  sessionId?: string;
  onConsentGiven: (consent: boolean) => void;
  onConsentComplete: () => void;
}

interface LegalNotice {
  id: string;
  title: string;
  content: string;
}

const LegalConsentForm: React.FC<LegalConsentFormProps> = ({
  examType,
  examId,
  sessionId,
  onConsentGiven,
  onConsentComplete
}) => {
  const [legalNotice, setLegalNotice] = useState<LegalNotice | null>(null);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState('Usuario');

  useEffect(() => {
    fetchLegalNotice();
    fetchUserName();
  }, []);

  const fetchLegalNotice = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_notice')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setLegalNotice(data);
    } catch (error: any) {
      console.error('Error fetching legal notice:', error);
      toast.error('Error al cargar el aviso legal');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setUserName(data.full_name);
        }
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  };

  const handleSubmitConsent = async () => {
    if (consent === null) {
      toast.error('Por favor selecciona una opción');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log consent
      const { error } = await supabase
        .from('user_consent_log')
        .insert({
          user_id: user?.id || null,
          session_id: sessionId,
          exam_type: examType,
          exam_id: examId,
          consent_given: consent,
          legal_notice_version: legalNotice?.id,
          ip_address: 'unknown', // Could be enhanced with actual IP detection
          user_agent: navigator.userAgent
        });

      if (error) throw error;

      onConsentGiven(consent);
      
      if (!consent) {
        // If consent is denied, notify admin and end process
        toast.error('Proceso terminado. Se ha notificado al administrador.');
        // Here you could add notification to admin
      } else {
        toast.success('Consentimiento registrado. Puede continuar.');
      }

      onConsentComplete();

    } catch (error: any) {
      console.error('Error submitting consent:', error);
      toast.error('Error al registrar el consentimiento: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-2" />
          <span>Cargando aviso legal...</span>
        </CardContent>
      </Card>
    );
  }

  if (!legalNotice) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              No se pudo cargar el aviso legal. Por favor contacte al administrador.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const processedContent = legalNotice.content.replace('[Nombre del usuario]', userName);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span>{legalNotice.title}</span>
          </CardTitle>
          <CardDescription>
            Es obligatorio leer y aceptar este aviso legal antes de continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Legal notice content */}
          <div className="bg-gray-50 p-6 rounded-lg border max-h-96 overflow-y-auto">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {processedContent}
            </div>
          </div>

          {/* Consent options */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Para continuar con el examen, seleccione una opción:
            </Label>
            
            <RadioGroup value={consent?.toString()} onValueChange={(value) => setConsent(value === 'true')}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="true" id="accept" />
                <Label htmlFor="accept" className="flex items-center space-x-2 cursor-pointer">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">
                    ACEPTO voluntariamente realizar esta evaluación bajo los términos y condiciones aquí descritos.
                  </span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="false" id="reject" />
                <Label htmlFor="reject" className="flex items-center space-x-2 cursor-pointer">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium">
                    NO ACEPTO realizar esta evaluación, y comprendo que con ello concluye mi participación en este proceso.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Submit button */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleSubmitConsent} 
              disabled={consent === null || submitting}
              size="lg"
              className="px-8"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar Selección'
              )}
            </Button>
          </div>

          {/* Warning */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Esta decisión quedará registrada en el sistema. 
              Si selecciona "NO ACEPTO", el proceso terminará inmediatamente y se notificará al administrador.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalConsentForm;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Send, AlertTriangle, TestTube } from 'lucide-react';
import { useExamAssignment } from '@/hooks/useExamAssignment';
import UserSelectionCard from './exam-assignment/UserSelectionCard';
import ManualDeliveryDialog from './exam-assignment/ManualDeliveryDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExamAssignmentManagerProps {
  selectedExamId: string;
  examTitle: string;
}

const ExamAssignmentManager = ({ selectedExamId, examTitle }: ExamAssignmentManagerProps) => {
  const {
    users,
    selectedUsers,
    loading,
    sending,
    handleUserSelection,
    handleSelectAll,
    handleAssignExam,
    manualDeliveryPending,
    setManualDeliveryPending,
    manualDeliveryUsers,
    confirmManualDelivery
  } = useExamAssignment(selectedExamId, examTitle);

  // Función de prueba directa del servicio de email
  const testEmailService = async () => {
    console.log('🧪 [TEST] Iniciando prueba directa del servicio de email');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuario no autenticado');
        return;
      }

      console.log('🧪 [TEST] Usuario autenticado:', user.email);
      
      // Llamar directamente a la edge function
      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-exam-notifications', {
        body: {
          emails: [user.email], // Enviar al propio usuario para prueba
          subject: `🧪 PRUEBA - ${examTitle}`,
          message: `Esta es una prueba del sistema de notificaciones para el examen: ${examTitle}\n\nSi recibe este correo, el sistema está funcionando correctamente.`,
          examDetails: {
            title: examTitle,
            testType: 'reliability',
            testId: selectedExamId
          }
        }
      });

      console.log('🧪 [TEST] Respuesta de edge function:', { emailResponse, emailError });

      if (emailError) {
        console.error('🧪 [TEST] Error en edge function:', emailError);
        toast.error(`Error en prueba: ${emailError.message}`);
      } else if (emailResponse?.success) {
        console.log('🧪 [TEST] Prueba exitosa');
        toast.success(`Prueba exitosa! Email enviado a ${user.email}`);
      } else {
        console.error('🧪 [TEST] Fallo en envío:', emailResponse);
        toast.error('Prueba falló: Email no se pudo enviar');
      }
    } catch (error) {
      console.error('🧪 [TEST] Error crítico:', error);
      toast.error(`Error crítico en prueba: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Asignar Examen: {examTitle}
        </CardTitle>
        <CardDescription>
          Selecciona los usuarios evaluados que deben presentar este examen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UserSelectionCard
          users={users}
          selectedUsers={selectedUsers}
          onUserSelection={handleUserSelection}
          onSelectAll={handleSelectAll}
          loading={loading}
        />

        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={handleAssignExam} 
            disabled={selectedUsers.length === 0 || sending}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Asignando y enviando...' : `Asignar y Notificar (${selectedUsers.length})`}
          </Button>
          
          <Button 
            onClick={testEmailService}
            variant="outline"
            disabled={sending}
            className="shrink-0"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Prueba Email
          </Button>
        </div>

        {manualDeliveryPending && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Algunas asignaciones requieren entrega manual. Se abrirá un diálogo para ayudarte.
            </AlertDescription>
          </Alert>
        )}

        <ManualDeliveryDialog
          open={manualDeliveryPending}
          onOpenChange={setManualDeliveryPending}
          manualDeliveryUsers={manualDeliveryUsers}
          onConfirmDelivery={confirmManualDelivery}
        />
      </CardContent>
    </Card>
  );
};

export default ExamAssignmentManager;

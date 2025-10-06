import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Send, AlertTriangle, Brain } from 'lucide-react';
import { usePsychometricAssignment } from '@/hooks/usePsychometricAssignment';
import UserSelectionCard from './exam-assignment/UserSelectionCard';
import ManualDeliveryDialog from './exam-assignment/ManualDeliveryDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PsychometricAssignmentManagerProps {
  selectedTestId: string;
  testTitle: string;
}

const PsychometricAssignmentManager = ({ selectedTestId, testTitle }: PsychometricAssignmentManagerProps) => {
  const {
    users,
    selectedUsers,
    loading,
    sending,
    handleUserSelection,
    handleSelectAll,
    handleAssignTest,
    manualDeliveryPending,
    setManualDeliveryPending,
    manualDeliveryUsers,
    confirmManualDelivery
  } = usePsychometricAssignment(selectedTestId, testTitle);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Asignar Test Psicométrico: {testTitle}
        </CardTitle>
        <CardDescription>
          Selecciona los usuarios evaluados que deben realizar este test psicométrico
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
            onClick={handleAssignTest} 
            disabled={selectedUsers.length === 0 || sending}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Asignando y enviando...' : `Asignar y Notificar (${selectedUsers.length})`}
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

export default PsychometricAssignmentManager;
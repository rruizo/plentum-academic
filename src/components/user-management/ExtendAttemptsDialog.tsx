import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExtendAttemptsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail: string;
  onExtended: () => void;
}

const ExtendAttemptsDialog = ({ 
  isOpen, 
  onClose, 
  userId, 
  userName, 
  userEmail, 
  onExtended 
}: ExtendAttemptsDialogProps) => {
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [additionalAttempts, setAdditionalAttempts] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);

  // Cargar exámenes disponibles cuando se abre el diálogo
  useEffect(() => {
    if (isOpen) {
      loadExams();
    }
  }, [isOpen]);

  const loadExams = async () => {
    try {
      // Cargar exámenes de confiabilidad
      const { data: reliabilityExams, error: reliabilityError } = await supabase
        .from('exams')
        .select('id, title, type')
        .eq('estado', 'activo')
        .order('title');

      if (reliabilityError) throw reliabilityError;

      // Cargar tests psicométricos
      const { data: psychometricTests, error: psychometricError } = await supabase
        .from('psychometric_tests')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name');

      if (psychometricError) throw psychometricError;

      // Combinar ambos tipos de exámenes
      const allExams = [
        ...(reliabilityExams || []).map(exam => ({
          ...exam,
          testType: 'reliability',
          displayName: `${exam.title} (Confiabilidad)`
        })),
        ...(psychometricTests || []).map(test => ({
          id: test.id,
          title: test.name,
          type: test.type,
          testType: 'psychometric',
          displayName: `${test.name} (OCEAN)`
        }))
      ];

      setExams(allExams);
    } catch (error) {
      console.error('Error loading exams:', error);
      toast.error('Error al cargar exámenes');
    }
  };

  const handleExtendAttempts = async () => {
    if (!selectedExam || additionalAttempts < 1 || !reason.trim()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsLoading(true);
    try {
      const selectedExamData = exams.find(exam => exam.id === selectedExam);
      
      if (selectedExamData?.testType === 'psychometric') {
        // Para exámenes psicométricos, trabajar con exam_sessions
        await extendPsychometricAttempts();
      } else {
        // Para exámenes de confiabilidad, usar la función existente
        const { data, error } = await supabase.rpc('extend_user_exam_attempts', {
          target_user_id: userId,
          exam_id: selectedExam,
          additional_attempts: additionalAttempts,
          admin_reason: reason
        });

        if (error) throw error;

        const result = data as any;
        if (result?.success) {
          toast.success(`Intentos extendidos exitosamente. Intentos restantes: ${result.remaining_attempts}`);
          onExtended();
          handleClose();
        } else {
          toast.error(result?.error || 'Error al extender intentos');
        }
      }
    } catch (error) {
      console.error('Error extending attempts:', error);
      toast.error(error instanceof Error ? error.message : 'Error al extender intentos');
    } finally {
      setIsLoading(false);
    }
  };

  const extendPsychometricAttempts = async () => {
    try {
      // Buscar sesión existente del usuario para el test psicométrico
      const { data: existingSession, error: sessionError } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('psychometric_test_id', selectedExam)
        .eq('test_type', 'psychometric')
        .or(`user_id.eq.${userId},user_id.eq.${userEmail}`)
        .maybeSingle();

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError;
      }

      if (existingSession) {
        // Actualizar sesión existente
        const { error: updateError } = await supabase
          .from('exam_sessions')
          .update({ 
            max_attempts: existingSession.max_attempts + additionalAttempts,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSession.id);

        if (updateError) throw updateError;
      } else {
        // Crear nueva sesión con intentos extendidos
        const { error: insertError } = await supabase
          .from('exam_sessions')
          .insert({
            psychometric_test_id: selectedExam,
            user_id: userEmail,
            test_type: 'psychometric',
            max_attempts: 2 + additionalAttempts,
            attempts_taken: 0,
            status: 'pending'
          });

        if (insertError) throw insertError;
      }

      // Registrar en el log de actividades
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: userId,
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          activity_type: 'extend_psychometric_attempts',
          activity_description: 'Extensión de intentos de test psicométrico',
          previous_value: { previous_max_attempts: existingSession?.max_attempts || 2 },
          new_value: { new_max_attempts: (existingSession?.max_attempts || 2) + additionalAttempts },
          metadata: {
            psychometric_test_id: selectedExam,
            additional_attempts: additionalAttempts,
            admin_reason: reason
          }
        });

      toast.success(`Intentos de test psicométrico extendidos exitosamente`);
      onExtended();
      handleClose();
    } catch (error) {
      console.error('Error extending psychometric attempts:', error);
      throw error;
    }
  };

  const handleClose = () => {
    setSelectedExam("");
    setAdditionalAttempts(1);
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Extender Intentos de Examen
          </DialogTitle>
          <DialogDescription>
            Extiende el número de intentos disponibles para <strong>{userName}</strong> ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta acción se registrará en el log de actividades del sistema para auditoría.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="exam">Examen</Label>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un examen" />
              </SelectTrigger>
              <SelectContent>
                 {exams.map((exam) => (
                   <SelectItem key={exam.id} value={exam.id}>
                     {exam.displayName}
                   </SelectItem>
                 ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attempts">Intentos Adicionales</Label>
            <Input
              id="attempts"
              type="number"
              min="1"
              max="10"
              value={additionalAttempts}
              onChange={(e) => setAdditionalAttempts(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo de la Extensión</Label>
            <Textarea
              id="reason"
              placeholder="Describe el motivo por el cual se extienden los intentos..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleExtendAttempts} disabled={isLoading}>
            {isLoading ? 'Procesando...' : 'Extender Intentos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendAttemptsDialog;
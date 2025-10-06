import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock, BookOpen, CheckCircle } from 'lucide-react';

interface ProgressRecoveryDialogProps {
  open: boolean;
  savedProgress: any;
  onRecover: () => void;
  onDiscard: () => void;
}

export const ProgressRecoveryDialog = ({
  open,
  savedProgress,
  onRecover,
  onDiscard
}: ProgressRecoveryDialogProps) => {
  if (!savedProgress) return null;

  const lastUpdatedDate = new Date(savedProgress.lastUpdated);
  const hoursAgo = Math.floor((Date.now() - lastUpdatedDate.getTime()) / (1000 * 60 * 60));
  const minutesAgo = Math.floor((Date.now() - lastUpdatedDate.getTime()) / (1000 * 60));

  const timeAgoText = hoursAgo > 0 
    ? `hace ${hoursAgo} hora${hoursAgo > 1 ? 's' : ''}`
    : `hace ${minutesAgo} minuto${minutesAgo > 1 ? 's' : ''}`;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Progreso Anterior Encontrado
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Se encontró un progreso guardado de este examen. Puedes continuar donde lo dejaste o empezar de nuevo.
            </p>
            
            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Pregunta:</span>
                <span>{savedProgress.currentQuestionIndex + 1} de {savedProgress.questions?.length || 0}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Respondidas:</span>
                <span>{savedProgress.answers?.length || 0} preguntas</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Última actualización:</span>
                <span>{timeAgoText}</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600">
              <strong>Nota:</strong> Si eliges "Empezar de nuevo", se perderá todo el progreso anterior.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onDiscard}>
            Empezar de Nuevo
          </Button>
          <Button onClick={onRecover} className="bg-blue-600 hover:bg-blue-700">
            Continuar Progreso
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
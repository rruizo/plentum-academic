
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Phone, MessageCircle, Mail, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ManualDeliveryUser {
  instructions: string;
  userName: string;
  userEmail: string;
  assignmentId: string;
}

interface ManualDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manualDeliveryUsers: ManualDeliveryUser[];
  onConfirmDelivery: (assignmentId: string) => void;
}

const ManualDeliveryDialog = ({
  open,
  onOpenChange,
  manualDeliveryUsers,
  onConfirmDelivery
}: ManualDeliveryDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentUser = manualDeliveryUsers[currentIndex];
  const hasMultipleUsers = manualDeliveryUsers.length > 1;

  const handleNext = () => {
    if (currentIndex < manualDeliveryUsers.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCopied(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setCopied(false);
    }
  };

  const copyToClipboard = async () => {
    if (!currentUser) return;
    try {
      await navigator.clipboard.writeText(currentUser.instructions);
      setCopied(true);
      toast.success('Información copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar al portapapeles');
    }
  };

  const openWhatsApp = () => {
    if (!currentUser) return;
    const message = encodeURIComponent(currentUser.instructions);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const openEmail = () => {
    if (!currentUser) return;
    const subject = encodeURIComponent('Acceso a Evaluación de Confiabilidad');
    const body = encodeURIComponent(currentUser.instructions);
    window.open(`mailto:${currentUser.userEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  // Reset index when dialog opens with new users
  React.useEffect(() => {
    if (open && manualDeliveryUsers.length > 0) {
      setCurrentIndex(0);
      setCopied(false);
    }
  }, [open, manualDeliveryUsers]);

  if (!currentUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-500" />
            Entrega Manual Requerida
          </DialogTitle>
          <DialogDescription>
            El correo automático no pudo ser enviado debido a limitaciones del tier gratuito de Resend. 
            Use uno de los métodos alternativos para entregar la información del examen a <strong>{currentUser.userName}</strong>.
            {hasMultipleUsers && (
              <div className="mt-2 text-sm text-muted-foreground">
                Usuario {currentIndex + 1} de {manualDeliveryUsers.length}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              Requiere Acción Manual
            </Badge>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Información a entregar:</h4>
            <Textarea
              value={currentUser.instructions}
              readOnly
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={copyToClipboard} variant="outline" className="w-full">
              {copied ? <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copiado!' : 'Copiar Información'}
            </Button>

            <Button onClick={openWhatsApp} variant="outline" className="w-full">
              <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
              Enviar por WhatsApp
            </Button>

            <Button onClick={openEmail} variant="outline" className="w-full">
              <Mail className="h-4 w-4 mr-2 text-blue-600" />
              Abrir Cliente Email
            </Button>

            <Button onClick={() => window.open(`tel:${currentUser.userEmail}`, '_self')} variant="outline" className="w-full">
              <Phone className="h-4 w-4 mr-2 text-purple-600" />
              Llamar al Evaluado
            </Button>
          </div>

          {hasMultipleUsers && (
            <div className="flex justify-between items-center border-t pt-4">
              <Button 
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{currentIndex + 1} de {manualDeliveryUsers.length}</span>
              </div>
              
              <Button 
                onClick={handleNext}
                disabled={currentIndex === manualDeliveryUsers.length - 1}
                variant="outline"
                size="sm"
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          <div className="border-t pt-4">
            <Button 
              onClick={() => {
                onConfirmDelivery(currentUser.assignmentId);
                toast.success(`Información marcada como entregada manualmente a ${currentUser.userName}`);
                
                // Si hay más usuarios, ir al siguiente; si no, cerrar
                if (currentIndex < manualDeliveryUsers.length - 1) {
                  handleNext();
                } else {
                  onOpenChange(false);
                }
              }} 
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar que la Información fue Entregada a {currentUser.userName}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p><strong>Sugerencia:</strong> Para futuras entregas automáticas, considere verificar un dominio propio en resend.com/domains</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualDeliveryDialog;

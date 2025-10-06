import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface ManualSaveButtonProps {
  onSave: () => void;
  className?: string;
}

export const ManualSaveButton = ({ onSave, className }: ManualSaveButtonProps) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onSave}
      className={`flex items-center gap-2 ${className}`}
    >
      <Save className="h-4 w-4" />
      Guardar Progreso
    </Button>
  );
};
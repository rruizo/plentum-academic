import { Button } from '@/components/ui/button';
import { Save, Eye } from 'lucide-react';
import type { ReportConfig } from '@/types/reportTypes';

interface ReportConfigurationHeaderProps {
  config: ReportConfig;
  saving: boolean;
  selectedExamId: string;
  onSave: () => void;
  onPreview: () => void;
}

const ReportConfigurationHeader = ({
  config,
  saving,
  selectedExamId,
  onSave,
  onPreview
}: ReportConfigurationHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold">Configuración de Reportes</h2>
        <p className="text-muted-foreground">
          Personaliza el formato y contenido de los reportes de evaluación
        </p>
        {config.id && (
          <p className="text-xs text-green-600 mt-1">
            ✓ Configuración cargada (ID: {config.id})
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onPreview} disabled={!selectedExamId}>
          <Eye className="h-4 w-4 mr-2" />
          Vista Previa
        </Button>
        <Button onClick={onSave} disabled={saving || !selectedExamId}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
};

export default ReportConfigurationHeader;
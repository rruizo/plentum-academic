import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Download, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ReportConfig } from '@/types/reportTypes';

interface ReportPreviewContentProps {
  config: ReportConfig;
  previewHtml: string;
  loading: boolean;
  onGeneratePreview: () => void;
}

const ReportPreviewContent = ({
  config,
  previewHtml,
  loading,
  onGeneratePreview
}: ReportPreviewContentProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Vista Previa del Reporte
        </CardTitle>
        <CardDescription>
          Visualiza cómo se verá el reporte con la configuración actual. 
          La configuración aplicada incluye: fuente {config.font_family} de {config.font_size}pt
          {config.company_name && `, empresa: ${config.company_name}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button onClick={onGeneratePreview} disabled={loading}>
                <Eye className="h-4 w-4 mr-2" />
                {loading ? 'Generando...' : 'Vista Previa'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Vista Previa del Reporte - {config.font_family} {config.font_size}pt</DialogTitle>
                <DialogDescription>
                  Esta es una simulación de cómo se verá el reporte final con la configuración guardada
                </DialogDescription>
              </DialogHeader>
              <div 
                className="border rounded-lg p-4 bg-white shadow-inner"
                style={{ fontFamily: config.font_family, fontSize: `${config.font_size}pt` }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          
          <Button variant="outline" disabled>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
        
        {Object.keys(config.include_sections).some(key => 
          config.include_sections[key as keyof typeof config.include_sections]
        ) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Secciones incluidas:</strong> {' '}
              {Object.entries(config.include_sections)
                .filter(([_, included]) => included)
                .map(([section, _]) => {
                   const sectionNames: Record<string, string> = {
                     personal_info: 'Información Personal',
                     category_scores: 'Puntuaciones',
                     risk_analysis: 'Análisis de Riesgo',
                     recommendations: 'Recomendaciones',
                     charts: 'Gráficos',
                     detailed_breakdown: 'Análisis específico de las respuestas más sensibles del candidato',
                     conclusion: 'Conclusión'
                   };
                  return sectionNames[section] || section;
                })
                .join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportPreviewContent;
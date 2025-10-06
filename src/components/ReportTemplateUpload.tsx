import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportConfig } from '@/types/reportTypes';

interface ReportTemplateUploadProps {
  config: ReportConfig;
  onConfigChange: (field: keyof ReportConfig, value: any) => void;
}

const ReportTemplateUpload = ({ config, onConfigChange }: ReportTemplateUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handleTemplateUpload = async (file: File) => {
    if (!file) return;

    if (!file.name.endsWith('.html')) {
      toast.error('Solo se permiten archivos HTML');
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const templateContent = e.target?.result as string;
        onConfigChange('custom_template', templateContent);
        onConfigChange('template_name', file.name);
        toast.success('Template subido exitosamente');
      };
      
      reader.onerror = () => {
        toast.error('Error al leer el archivo');
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error uploading template:', error);
      toast.error('Error al subir el template');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleTemplateUpload(file);
    }
  };

  const removeTemplate = () => {
    onConfigChange('custom_template', null);
    onConfigChange('template_name', null);
    toast.success('Template removido');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Template Personalizado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Subir Template HTML</Label>
          <p className="text-sm text-muted-foreground">
            Sube un archivo HTML personalizado para generar reportes alternativos
          </p>
        </div>

        {config.custom_template ? (
          <div className="border border-dashed border-green-300 bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {config.template_name || 'template.html'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeTemplate}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-green-600 mt-2">
              Template cargado correctamente. Se usará para generar reportes alternativos.
            </p>
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 p-6 rounded-lg text-center">
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              Arrastra tu archivo HTML aquí o haz clic para seleccionar
            </p>
            <Input
              type="file"
              accept=".html"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              id="template-upload"
            />
            <Label htmlFor="template-upload">
              <Button
                variant="outline"
                disabled={uploading}
                className="cursor-pointer"
                asChild
              >
                <span>
                  {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                </span>
              </Button>
            </Label>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Instrucciones para el Template
          </h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Usa placeholders como {'{{CANDIDATE_NAME}}'}, {'{{OVERALL_SCORE}}'}</li>
            <li>• Incluye {'{{CATEGORY_ROWS}}'} para la tabla de categorías dinámicas</li>
            <li>• Agrega {'{{COMPARISON_CHART}}'} para gráficos dinámicos</li>
            <li>• Consulta la documentación en templates/README_TEMPLATES.md</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportTemplateUpload;
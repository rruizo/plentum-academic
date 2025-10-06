
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FileUpload from '@/components/ui/file-upload';

interface ReportFormatProps {
  config: {
    font_family: string;
    font_size: number;
    header_logo_url?: string;
    footer_logo_url?: string;
  };
  onConfigChange: (field: string, value: any) => void;
  onFileUpload: (type: 'header' | 'footer') => (file: File) => void;
}

const fontOptions = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Calibri', label: 'Calibri' },
  { value: 'Tahoma', label: 'Tahoma' }
];

const fontSizeOptions = [
  { value: 8, label: '8pt' },
  { value: 9, label: '9pt' },
  { value: 10, label: '10pt' },
  { value: 11, label: '11pt' },
  { value: 12, label: '12pt' },
  { value: 14, label: '14pt' },
  { value: 16, label: '16pt' },
  { value: 18, label: '18pt' },
  { value: 20, label: '20pt' }
];

const ReportConfigurationFormat = ({ config, onConfigChange, onFileUpload }: ReportFormatProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Opciones de Formato</CardTitle>
        <CardDescription>
          Personaliza la apariencia del reporte
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="font_family">Tipo de Letra</Label>
            <Select 
              value={config.font_family} 
              onValueChange={(value) => onConfigChange('font_family', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map(font => (
                  <SelectItem key={font.value} value={font.value}>
                    <span style={{ fontFamily: font.value }}>{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="font_size">Tamaño de Letra</Label>
            <Select 
              value={config.font_size.toString()} 
              onValueChange={(value) => onConfigChange('font_size', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontSizeOptions.map(size => (
                  <SelectItem key={size.value} value={size.value.toString()}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium">Logos del Reporte</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Logo del Encabezado</Label>
              <FileUpload
                accept="image/*"
                maxSize={2}
                onFileSelect={onFileUpload('header')}
                onUrlChange={(url) => onConfigChange('header_logo_url', url)}
                currentUrl={config.header_logo_url}
                placeholder="URL del logo para el encabezado"
              />
            </div>

            <div>
              <Label>Logo del Pie de Página</Label>
              <FileUpload
                accept="image/*"
                maxSize={2}
                onFileSelect={onFileUpload('footer')}
                onUrlChange={(url) => onConfigChange('footer_logo_url', url)}
                currentUrl={config.footer_logo_url}
                placeholder="URL del logo para el pie de página"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportConfigurationFormat;

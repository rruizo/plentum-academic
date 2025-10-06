
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportCompanyProps {
  config: {
    company_name?: string;
    company_email?: string;
    company_phone?: string;
    company_address?: string;
  };
  onConfigChange: (field: string, value: string) => void;
}

const ReportConfigurationCompany = ({ config, onConfigChange }: ReportCompanyProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la Empresa</CardTitle>
        <CardDescription>
          Información que aparecerá en el encabezado y pie de página
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_name">Nombre de la Empresa</Label>
            <Input
              id="company_name"
              value={config.company_name || ''}
              onChange={(e) => onConfigChange('company_name', e.target.value)}
              placeholder="Ej: Plentum Verify Corp."
            />
          </div>

          <div>
            <Label htmlFor="company_email">Email de Contacto</Label>
            <Input
              id="company_email"
              type="email"
              value={config.company_email || ''}
              onChange={(e) => onConfigChange('company_email', e.target.value)}
              placeholder="contacto@empresa.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_phone">Teléfono</Label>
            <Input
              id="company_phone"
              value={config.company_phone || ''}
              onChange={(e) => onConfigChange('company_phone', e.target.value)}
              placeholder="+52 (55) 1234-5678"
            />
          </div>

          <div className="md:col-span-1">
            <Label htmlFor="company_address">Dirección</Label>
            <Textarea
              id="company_address"
              value={config.company_address || ''}
              onChange={(e) => onConfigChange('company_address', e.target.value)}
              placeholder="Dirección completa de la empresa"
              rows={3}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportConfigurationCompany;

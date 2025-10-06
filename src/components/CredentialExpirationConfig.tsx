import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CredentialConfig {
  id: string;
  test_type: string;
  expiration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CredentialExpirationConfig: React.FC = () => {
  const [configs, setConfigs] = useState<CredentialConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('credential_expiration_config')
        .select('*')
        .order('test_type', { ascending: true });

      if (error) throw error;

      setConfigs(data || []);
      // Initialize editing values
      const values: Record<string, number> = {};
      data?.forEach(config => {
        values[config.id] = config.expiration_days;
      });
      setEditingValues(values);
    } catch (error: any) {
      console.error('Error fetching configs:', error);
      toast.error('Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (configId: string) => {
    const newValue = editingValues[configId];
    if (!newValue || newValue < 1 || newValue > 365) {
      toast.error('El valor debe estar entre 1 y 365 días');
      return;
    }

    setSaving(configId);
    try {
      const { error } = await supabase
        .from('credential_expiration_config')
        .update({ expiration_days: newValue })
        .eq('id', configId);

      if (error) throw error;

      toast.success('Configuración actualizada correctamente');
      fetchConfigs();
    } catch (error: any) {
      console.error('Error updating config:', error);
      toast.error('Error al actualizar configuración');
    } finally {
      setSaving(null);
    }
  };

  const getTestTypeLabel = (testType: string) => {
    switch (testType) {
      case 'reliability':
        return 'Confiabilidad';
      case 'psychometric':
        return 'Psicométrico';
      case 'cognitive':
        return 'Cognitivo';
      case 'turnover':
        return 'Rotación de Personal';
      default:
        return testType;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Configuración de Expiración de Credenciales</CardTitle>
              <CardDescription>
                Configura el tiempo de validez de las credenciales para cada tipo de examen
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Una vez que las credenciales expiren, los estudiantes no podrán usarlas para acceder a los exámenes.
              Los días de expiración se cuentan desde la fecha de creación de la credencial.
            </AlertDescription>
          </Alert>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Examen</TableHead>
                <TableHead>Días de Validez</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">
                    {getTestTypeLabel(config.test_type)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={editingValues[config.id] || config.expiration_days}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setEditingValues(prev => ({
                            ...prev,
                            [config.id]: value
                          }));
                        }}
                        className="w-24"
                        disabled={saving === config.id}
                      />
                      <span className="text-sm text-muted-foreground">días</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.is_active ? 'default' : 'secondary'}>
                      {config.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(config.updated_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleSave(config.id)}
                      disabled={
                        saving === config.id || 
                        editingValues[config.id] === config.expiration_days
                      }
                    >
                      {saving === config.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CredentialExpirationConfig;
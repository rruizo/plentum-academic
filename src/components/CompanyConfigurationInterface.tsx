
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Building2, Save, Upload, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { toast } from 'sonner';

const CompanyConfigurationInterface = () => {
  const { config, loading, updateConfig } = useSystemConfig();
  const [formData, setFormData] = useState({
    system_name: '',
    logo_url: '',
    favicon_url: '',
    contact_email: '',
    support_email: '',
    primary_color: '#1e40af',
    secondary_color: '#3b82f6',
    footer_text: '',
    social_facebook: '',
    social_instagram: '',
    social_linkedin: '',
    social_twitter: '',
    social_youtube: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        system_name: config.system_name || '',
        logo_url: config.logo_url || '',
        favicon_url: config.favicon_url || '',
        contact_email: config.contact_email || '',
        support_email: config.support_email || '',
        primary_color: config.primary_color || '#1e40af',
        secondary_color: config.secondary_color || '#3b82f6',
        footer_text: config.footer_text || '',
        social_facebook: config.social_facebook || '',
        social_instagram: config.social_instagram || '',
        social_linkedin: config.social_linkedin || '',
        social_twitter: config.social_twitter || '',
        social_youtube: config.social_youtube || ''
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateConfig(formData);
      toast.success('Configuración de empresa guardada exitosamente');
    } catch (error) {
      console.error('Error saving company config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Configuración de Empresa
          </h2>
          <p className="text-muted-foreground">
            Administra la información y marca de tu organización
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="branding">Marca e Identidad</TabsTrigger>
          <TabsTrigger value="contact">Datos de Contacto</TabsTrigger>
          <TabsTrigger value="social">Redes Sociales</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>
                Configuración básica del sistema y la empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="system_name">Nombre del Sistema</Label>
                <Input
                  id="system_name"
                  value={formData.system_name}
                  onChange={(e) => handleInputChange('system_name', e.target.value)}
                  placeholder="Ej: Plentum Verify"
                />
              </div>

              <div>
                <Label htmlFor="footer_text">Texto del Pie de Página</Label>
                <Textarea
                  id="footer_text"
                  value={formData.footer_text}
                  onChange={(e) => handleInputChange('footer_text', e.target.value)}
                  placeholder="© 2024 Tu Empresa. Todos los derechos reservados."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Marca e Identidad Visual</CardTitle>
              <CardDescription>
                Personaliza los colores, logos y favicon de tu sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="logo_url">URL del Logo Principal</Label>
                <div className="flex gap-2">
                  <Input
                    id="logo_url"
                    value={formData.logo_url}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                  />
                  <Button variant="outline" size="sm" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir
                  </Button>
                </div>
                {formData.logo_url && (
                  <div className="mt-2">
                    <img 
                      src={formData.logo_url} 
                      alt="Logo preview" 
                      className="h-12 w-auto border rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="favicon_url">URL del Favicon</Label>
                <div className="flex gap-2">
                  <Input
                    id="favicon_url"
                    value={formData.favicon_url}
                    onChange={(e) => handleInputChange('favicon_url', e.target.value)}
                    placeholder="https://ejemplo.com/favicon.png"
                  />
                  <Button variant="outline" size="sm" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Formato recomendado: PNG de 32x32 o 16x16 píxeles
                </p>
                {formData.favicon_url && (
                  <div className="mt-2 flex items-center gap-2">
                    <img 
                      src={formData.favicon_url} 
                      alt="Favicon preview" 
                      className="h-4 w-4 border rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-sm text-muted-foreground">Vista previa del favicon</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Color Primario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      placeholder="#1e40af"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondary_color">Color Secundario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Datos de Contacto</CardTitle>
              <CardDescription>
                Información de contacto que aparecerá en reportes y comunicaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email de Contacto
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    placeholder="contacto@empresa.com"
                  />
                </div>

                <div>
                  <Label htmlFor="support_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email de Soporte
                  </Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={formData.support_email}
                    onChange={(e) => handleInputChange('support_email', e.target.value)}
                    placeholder="soporte@empresa.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Redes Sociales</CardTitle>
              <CardDescription>
                Enlaces a las redes sociales de tu empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="social_facebook">Facebook</Label>
                  <Input
                    id="social_facebook"
                    value={formData.social_facebook}
                    onChange={(e) => handleInputChange('social_facebook', e.target.value)}
                    placeholder="https://facebook.com/tu-empresa"
                  />
                </div>

                <div>
                  <Label htmlFor="social_instagram">Instagram</Label>
                  <Input
                    id="social_instagram"
                    value={formData.social_instagram}
                    onChange={(e) => handleInputChange('social_instagram', e.target.value)}
                    placeholder="https://instagram.com/tu-empresa"
                  />
                </div>

                <div>
                  <Label htmlFor="social_linkedin">LinkedIn</Label>
                  <Input
                    id="social_linkedin"
                    value={formData.social_linkedin}
                    onChange={(e) => handleInputChange('social_linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/tu-empresa"
                  />
                </div>

                <div>
                  <Label htmlFor="social_twitter">Twitter</Label>
                  <Input
                    id="social_twitter"
                    value={formData.social_twitter}
                    onChange={(e) => handleInputChange('social_twitter', e.target.value)}
                    placeholder="https://twitter.com/tu-empresa"
                  />
                </div>

                <div>
                  <Label htmlFor="social_youtube">YouTube</Label>
                  <Input
                    id="social_youtube"
                    value={formData.social_youtube}
                    onChange={(e) => handleInputChange('social_youtube', e.target.value)}
                    placeholder="https://youtube.com/tu-empresa"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyConfigurationInterface;

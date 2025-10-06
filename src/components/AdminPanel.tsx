import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Save,
  Upload,
  Building,
  Globe,
  Mail,
  Users,
  BrainCircuit,
  KeyRound,
  Shield,
  CheckCircle,
  Settings,
  RefreshCw,
  HelpCircle,
  Palette,
  AlertTriangle,
  X,
  BarChart3
} from 'lucide-react';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DiagnosticoResend } from '@/components/DiagnosticoResend';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const AdminPanel = () => {
  const { config, loading, updateConfig, error } = useSystemConfig();
  const [formData, setFormData] = useState({
    system_name: '',
    contact_email: '',
    support_email: '',
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    logo_url: '',
    footer_text: '',
    social_facebook: '',
    social_instagram: '',
    social_linkedin: '',
    social_twitter: '',
    social_youtube: '',
    resend_from_email: '',
    resend_from_name: '',
    openai_model: 'gpt-4.1-nano',
    // Configuración granular de OpenAI - Modelos y parámetros
    ocean_modelo: 'gpt-4.1-2025-04-14',
    ocean_temperatura: 0.7,
    ocean_max_tokens: 2000,
    confiabilidad_analisis_modelo: 'gpt-4.1-2025-04-14',
    confiabilidad_analisis_temperatura: 0.7,
    confiabilidad_analisis_max_tokens: 1500,
    confiabilidad_conclusiones_modelo: 'gpt-4.1-2025-04-14',
    confiabilidad_conclusiones_temperatura: 0.7,
    confiabilidad_conclusiones_max_tokens: 1000,
    // Prompts
    ocean_system_prompt: '',
    ocean_user_prompt: '',
    confiabilidad_analisis_system_prompt: '',
    confiabilidad_analisis_user_prompt: '',
    confiabilidad_conclusiones_system_prompt: '',
    confiabilidad_conclusiones_user_prompt: ''
  });
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [aiValid, setAiValid] = useState<boolean | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [usageInfo, setUsageInfo] = useState<any>(null);

  React.useEffect(() => {
    if (config) {
      const newFormData = {
        system_name: config.system_name || '',
        contact_email: config.contact_email || '',
        support_email: config.support_email || '',
        primary_color: config.primary_color || '#3b82f6',
        secondary_color: config.secondary_color || '#1e40af',
        logo_url: config.logo_url || '',
        footer_text: config.footer_text || '',
        social_facebook: config.social_facebook || '',
        social_instagram: config.social_instagram || '',
        social_linkedin: config.social_linkedin || '',
        social_twitter: config.social_twitter || '',
        social_youtube: config.social_youtube || '',
        resend_from_email: config.resend_from_email || 'onboarding@resend.dev',
        resend_from_name: config.resend_from_name || 'Plentum Verify',
        openai_model: config.openai_model || 'gpt-4.1-nano',
        // Configuración granular de OpenAI
        ocean_modelo: config.ocean_modelo || 'gpt-4.1-2025-04-14',
        ocean_temperatura: config.ocean_temperatura || 0.7,
        ocean_max_tokens: config.ocean_max_tokens || 2000,
        confiabilidad_analisis_modelo: config.confiabilidad_analisis_modelo || 'gpt-4.1-2025-04-14',
        confiabilidad_analisis_temperatura: config.confiabilidad_analisis_temperatura || 0.7,
        confiabilidad_analisis_max_tokens: config.confiabilidad_analisis_max_tokens || 1500,
        confiabilidad_conclusiones_modelo: config.confiabilidad_conclusiones_modelo || 'gpt-4.1-2025-04-14',
        confiabilidad_conclusiones_temperatura: config.confiabilidad_conclusiones_temperatura || 0.7,
        confiabilidad_conclusiones_max_tokens: config.confiabilidad_conclusiones_max_tokens || 1000,
        // Prompts
        ocean_system_prompt: config.ocean_system_prompt || '',
        ocean_user_prompt: config.ocean_user_prompt || '',
        confiabilidad_analisis_system_prompt: config.confiabilidad_analisis_system_prompt || '',
        confiabilidad_analisis_user_prompt: config.confiabilidad_analisis_user_prompt || '',
        confiabilidad_conclusiones_system_prompt: config.confiabilidad_conclusiones_system_prompt || '',
        confiabilidad_conclusiones_user_prompt: config.confiabilidad_conclusiones_user_prompt || ''
      };
      setFormData(newFormData);
      setLogoPreview(config.logo_url || '');
    }
  }, [config]);

  // Función de validación para parámetros OpenAI
  const validateOpenAIParams = () => {
    const errors = [];
    
    // Validar temperaturas (0.0 - 1.0)
    if (formData.ocean_temperatura < 0 || formData.ocean_temperatura > 1) {
      errors.push('Temperatura OCEAN debe estar entre 0.0 y 1.0');
    }
    if (formData.confiabilidad_analisis_temperatura < 0 || formData.confiabilidad_analisis_temperatura > 1) {
      errors.push('Temperatura Análisis de Confiabilidad debe estar entre 0.0 y 1.0');
    }
    if (formData.confiabilidad_conclusiones_temperatura < 0 || formData.confiabilidad_conclusiones_temperatura > 1) {
      errors.push('Temperatura Conclusiones de Confiabilidad debe estar entre 0.0 y 1.0');
    }
    
    // Validar max_tokens (100 - 32768)
    if (formData.ocean_max_tokens < 100 || formData.ocean_max_tokens > 32768) {
      errors.push('Max Tokens OCEAN debe estar entre 100 y 32768');
    }
    if (formData.confiabilidad_analisis_max_tokens < 100 || formData.confiabilidad_analisis_max_tokens > 32768) {
      errors.push('Max Tokens Análisis debe estar entre 100 y 32768');
    }
    if (formData.confiabilidad_conclusiones_max_tokens < 100 || formData.confiabilidad_conclusiones_max_tokens > 32768) {
      errors.push('Max Tokens Conclusiones debe estar entre 100 y 32768');
    }
    
    return errors;
  };

  const handleSave = async () => {
    // Validar parámetros antes de guardar
    const validationErrors = validateOpenAIParams();
    if (validationErrors.length > 0) {
      toast(
        "Error de Validación: " + validationErrors.join('\n')
      );
      return;
    }
    setSaving(true);
    try {
      let logoUrl = formData.logo_url;
      
      // Si hay un nuevo archivo de logo, crear una URL local
      if (logoFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          logoUrl = e.target?.result as string;
          
          const updateData = {
            ...formData,
            logo_url: logoUrl
          };
          
          console.log('Saving with data:', updateData);
          await updateConfig(updateData);
          toast.success('Configuración actualizada exitosamente');
          setSaving(false);
        };
        reader.readAsDataURL(logoFile);
        return;
      }

      console.log('Saving data:', formData);
      await updateConfig(formData);
      toast.success('Configuración actualizada exitosamente');
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error('Error al actualizar la configuración: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        setFormData(prev => ({ ...prev, logo_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setFormData(prev => ({ ...prev, logo_url: '' }));
  };

  const validateOpenAI = async () => {
    try {
      setAiChecking(true);
      const { data, error } = await supabase.functions.invoke('openai-admin', {
        body: { action: 'validate' }
      });
      if (error) throw error;
      const ok = (data as any)?.ok === true;
      setAiValid(ok);
      if (ok) toast.success('API Key válida');
      else toast.error('API Key no configurada o inválida');
    } catch (e: any) {
      setAiValid(false);
      toast.error('Error validando la API Key');
      console.error(e);
    } finally {
      setAiChecking(false);
    }
  };

  const refreshModels = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('openai-admin', {
        body: { action: 'models' }
      });
      if (error) throw error;
      if ((data as any)?.ok) {
        setAvailableModels((data as any).models || []);
        toast.success('Modelos actualizados');
      } else {
        toast.error('No se pudieron obtener modelos');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error al obtener modelos');
    }
  };

  const checkUsage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('openai-admin', {
        body: { action: 'usage' }
      });
      if (error) throw error;
      setUsageInfo(data);
      if ((data as any)?.ok) toast.success('Uso obtenido');
      else toast.message?.('Información de uso no disponible');
    } catch (e) {
      console.error(e);
      toast.error('Error al consultar uso');
    }
  };

  const userRoles = [
    { 
      role: 'admin', 
      name: 'Administrador', 
      description: 'Acceso completo al sistema, configuración y gestión de usuarios',
      color: 'destructive'
    },
    { 
      role: 'teacher', 
      name: 'Profesor/Instructor', 
      description: 'Puede crear y gestionar exámenes, ver resultados y análisis',
      color: 'default'
    },
    { 
      role: 'student', 
      name: 'Estudiante/Evaluado', 
      description: 'Puede tomar exámenes asignados y ver sus propios resultados',
      color: 'secondary'
    },
    { 
      role: 'supervisor', 
      name: 'Supervisor', 
      description: 'Puede supervisar procesos de evaluación y generar reportes',
      color: 'outline'
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-2" />
          <span>Cargando configuración...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error al cargar la configuración: {error}</p>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Panel de Administración</h2>
          <p className="text-muted-foreground">
            Configura el sistema, roles de usuario y preferencias generales
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Apariencia
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Mail className="h-4 w-4 mr-2" />
            Contacto
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="social">
            <Globe className="h-4 w-4 mr-2" />
            Social/Footer
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Users className="h-4 w-4 mr-2" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="ai">
            <BrainCircuit className="h-4 w-4 mr-2" />
            OpenAI
          </TabsTrigger>
          <TabsTrigger value="diagnostico">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Diagnóstico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General del Sistema</CardTitle>
              <CardDescription>
                Configure el nombre y las opciones básicas del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system-name">Nombre del Sistema</Label>
                <Input
                  id="system-name"
                  value={formData.system_name}
                  onChange={(e) => handleInputChange('system_name', e.target.value)}
                  placeholder="Plentum Verify"
                />
                <p className="text-sm text-muted-foreground">
                  Este nombre aparecerá en toda la aplicación, documentos generados y páginas de inicio de sesión
                </p>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Sistema de Confiabilidad Psicométrica:</strong> Esta plataforma está diseñada 
                  para evaluar la confiabilidad en procesos de selección y evaluación psicológica, 
                  proporcionando análisis avanzados y detección de patrones de simulación.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalización Visual</CardTitle>
              <CardDescription>
                Configure los colores, logo y la apariencia del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Configuration */}
              <div className="space-y-4">
                <Label>Logo del Sistema</Label>
                <div className="space-y-4">
                  {logoPreview && (
                    <div className="relative inline-block">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="h-20 w-auto border rounded-lg shadow-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearLogo}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">
                        Arrastra tu logo aquí o haz clic para seleccionar
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload">
                        <Button variant="outline" size="sm" asChild>
                          <span className="cursor-pointer">Seleccionar archivo</span>
                        </Button>
                      </label>
                      <p className="text-xs text-gray-400">
                        Formatos soportados: PNG, JPG, SVG (máx. 2MB)
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="logo-url">O ingresa URL del logo</Label>
                    <Input
                      id="logo-url"
                      value={formData.logo_url}
                      onChange={(e) => handleInputChange('logo_url', e.target.value)}
                      placeholder="https://ejemplo.com/logo.png"
                    />
                  </div>
                </div>
              </div>

              {/* Color Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Color Primario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Color Secundario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      placeholder="#1e40af"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
              <CardDescription>
                Configure los emails de contacto y soporte técnico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email de Contacto General</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  placeholder="contacto@plentumverify.com"
                />
                <p className="text-sm text-muted-foreground">
                  Email principal para consultas generales
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-email">Email de Soporte Técnico</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={formData.support_email}
                  onChange={(e) => handleInputChange('support_email', e.target.value)}
                  placeholder="soporte@plentumverify.com"
                />
                <p className="text-sm text-muted-foreground">
                  Email para reportar errores y solicitar ayuda técnica
                </p>
              </div>

              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  Estos emails aparecerán en las opciones de "Contactar Soporte" y "Reportar Error" 
                  disponibles en el sistema para todos los usuarios.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Correo (Resend)</CardTitle>
              <CardDescription>
                Configure el remitente de los emails automáticos del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resend-from-email">Email de Remitente</Label>
                <Input
                  id="resend-from-email"
                  type="email"
                  value={formData.resend_from_email}
                  onChange={(e) => handleInputChange('resend_from_email', e.target.value)}
                  placeholder="onboarding@resend.dev"
                />
                <p className="text-sm text-muted-foreground">
                  Email que aparecerá como remitente en las invitaciones de examen
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resend-from-name">Nombre del Remitente</Label>
                <Input
                  id="resend-from-name"
                  value={formData.resend_from_name}
                  onChange={(e) => handleInputChange('resend_from_name', e.target.value)}
                  placeholder="Plentum Verify"
                />
                <p className="text-sm text-muted-foreground">
                  Nombre que aparecerá como remitente en las invitaciones de examen
                </p>
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Para usar un email personalizado, debe verificar su dominio en{' '}
                  <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    resend.com/domains
                  </a>
                  . El email por defecto "onboarding@resend.dev" funciona sin verificación pero tiene limitaciones.
                </AlertDescription>
              </Alert>

              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Estado actual:</strong> La API Key de Resend ya está configurada. 
                  Solo necesita verificar su dominio personalizado si desea usar un email propio.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Redes Sociales y Footer</CardTitle>
              <CardDescription>
                Configure las redes sociales y el texto del footer que aparecerán en la aplicación y documentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footer-text">Texto del Footer</Label>
                <Textarea
                  id="footer-text"
                  value={formData.footer_text}
                  onChange={(e) => handleInputChange('footer_text', e.target.value)}
                  placeholder="© 2024 Tu Empresa. Todos los derechos reservados."
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Este texto aparecerá en el footer de la aplicación y en los documentos generados
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="social-facebook">Facebook URL</Label>
                  <Input
                    id="social-facebook"
                    value={formData.social_facebook}
                    onChange={(e) => handleInputChange('social_facebook', e.target.value)}
                    placeholder="https://facebook.com/tu-empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social-instagram">Instagram URL</Label>
                  <Input
                    id="social-instagram"
                    value={formData.social_instagram}
                    onChange={(e) => handleInputChange('social_instagram', e.target.value)}
                    placeholder="https://instagram.com/tu-empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social-linkedin">LinkedIn URL</Label>
                  <Input
                    id="social-linkedin"
                    value={formData.social_linkedin}
                    onChange={(e) => handleInputChange('social_linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/tu-empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social-twitter">Twitter URL</Label>
                  <Input
                    id="social-twitter"
                    value={formData.social_twitter}
                    onChange={(e) => handleInputChange('social_twitter', e.target.value)}
                    placeholder="https://twitter.com/tu-empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social-youtube">YouTube URL</Label>
                  <Input
                    id="social-youtube"
                    value={formData.social_youtube}
                    onChange={(e) => handleInputChange('social_youtube', e.target.value)}
                    placeholder="https://youtube.com/tu-empresa"
                  />
                </div>
              </div>

              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  Las redes sociales configuradas aparecerán como enlaces en el footer de la aplicación 
                  y se incluirán en los documentos generados (PDFs, informes).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles del Sistema</CardTitle>
              <CardDescription>
                Información sobre los diferentes roles de usuario disponibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userRoles.map((roleInfo) => (
                  <div key={roleInfo.role} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={roleInfo.color as any}>
                          {roleInfo.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ({roleInfo.role})
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {roleInfo.description}
                    </p>
                  </div>
                ))}
              </div>

              <Alert className="mt-4">
                <Users className="h-4 w-4" />
                <AlertDescription>
                  Los roles se asignan automáticamente durante el registro o pueden ser 
                  modificados por administradores en la sección de Gestión de Usuarios.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5" />
                Configuración de OpenAI
              </CardTitle>
              <CardDescription>
                Configure la integración con OpenAI y los modelos disponibles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-model">Modelo General</Label>
                  <Select
                    value={formData.openai_model}
                    onValueChange={(value) => handleInputChange('openai_model', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
                      <SelectItem value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini</SelectItem>
                      <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                      <SelectItem value="gpt-5-nano-2025-08-07">GPT-5 Nano</SelectItem>
                      <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini</SelectItem>
                      <SelectItem value="gpt-5-2025-08-07">GPT-5</SelectItem>
                      <SelectItem value="o3-2025-04-16">O3</SelectItem>
                      <SelectItem value="o4-mini-2025-04-16">O4 Mini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <Button onClick={validateOpenAI} disabled={aiChecking} variant="outline">
                    {aiChecking ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Validar API Key
                  </Button>
                  {aiValid === true && <span className="text-green-600">✓ Válida</span>}
                  {aiValid === false && <span className="text-red-600">✗ Inválida</span>}
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <Button onClick={refreshModels} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Obtener Modelos
                  </Button>
                  <Button onClick={checkUsage} variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Ver Uso
                  </Button>
                </div>
              </div>
              
              {availableModels.length > 0 && (
                <div className="mt-4">
                  <Label>Modelos Disponibles:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                    {availableModels.map((model: string) => (
                      <Badge key={model} variant="secondary" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {usageInfo && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Información de Uso:</h4>
                  <pre className="text-xs text-muted-foreground overflow-auto">
                    {JSON.stringify(usageInfo, null, 2)}
                  </pre>
                </div>
              )}

              {/* Configuración específica por tipo de examen */}
              <Tabs defaultValue="ocean" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ocean">Test OCEAN</TabsTrigger>
                  <TabsTrigger value="reliability_analysis">Confiabilidad - Análisis</TabsTrigger>
                  <TabsTrigger value="reliability_conclusions">Confiabilidad - Conclusiones</TabsTrigger>
                </TabsList>

                <TabsContent value="ocean" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configuración Test OCEAN</CardTitle>
                      <CardDescription>
                        Configuración específica para análisis de personalidad OCEAN
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Modelo</Label>
                          <Select
                            value={formData.ocean_modelo}
                            onValueChange={(value) => handleInputChange('ocean_modelo', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar modelo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini</SelectItem>
                              <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                              <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini</SelectItem>
                              <SelectItem value="gpt-5-2025-08-07">GPT-5</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Temperatura</Label>
                          <Input
                            type="number"
                            min="0"
                            max="2"
                            step="0.1"
                            value={formData.ocean_temperatura || 0.7}
                            onChange={(e) => handleInputChange('ocean_temperatura', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Tokens</Label>
                          <Input
                            type="number"
                            min="100"
                            max="4000"
                            value={formData.ocean_max_tokens || 2000}
                            onChange={(e) => handleInputChange('ocean_max_tokens', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>System Message</Label>
                        <Textarea
                          value={formData.ocean_system_prompt || ''}
                          onChange={(e) => handleInputChange('ocean_system_prompt', e.target.value)}
                          placeholder="Prompt del sistema para análisis OCEAN..."
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>User Prompt</Label>
                        <Textarea
                          value={formData.ocean_user_prompt || ''}
                          onChange={(e) => handleInputChange('ocean_user_prompt', e.target.value)}
                          placeholder="Prompt del usuario para análisis OCEAN (use variables como ${userInfo.name}, ${factorAnalysis})..."
                          rows={6}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reliability_analysis" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configuración Confiabilidad - Análisis</CardTitle>
                      <CardDescription>
                        Configuración para la fase de análisis de exámenes de confiabilidad
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Modelo</Label>
                          <Select
                            value={formData.confiabilidad_analisis_modelo}
                            onValueChange={(value) => handleInputChange('confiabilidad_analisis_modelo', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar modelo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini</SelectItem>
                              <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                              <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini</SelectItem>
                              <SelectItem value="gpt-5-2025-08-07">GPT-5</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Temperatura</Label>
                          <Input
                            type="number"
                            min="0"
                            max="2"
                            step="0.1"
                            value={formData.confiabilidad_analisis_temperatura || 0.7}
                            onChange={(e) => handleInputChange('confiabilidad_analisis_temperatura', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Tokens</Label>
                          <Input
                            type="number"
                            min="100"
                            max="4000"
                            value={formData.confiabilidad_analisis_max_tokens || 1500}
                            onChange={(e) => handleInputChange('confiabilidad_analisis_max_tokens', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>System Message</Label>
                        <Textarea
                          value={formData.confiabilidad_analisis_system_prompt || ''}
                          onChange={(e) => handleInputChange('confiabilidad_analisis_system_prompt', e.target.value)}
                          placeholder="Prompt del sistema para análisis de confiabilidad..."
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>User Prompt</Label>
                        <Textarea
                          value={formData.confiabilidad_analisis_user_prompt || ''}
                          onChange={(e) => handleInputChange('confiabilidad_analisis_user_prompt', e.target.value)}
                          placeholder="Prompt del usuario para análisis (use variables como ${examAttempt.profiles?.full_name}, ${categoryData.categoryResults})..."
                          rows={6}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reliability_conclusions" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configuración Confiabilidad - Conclusiones</CardTitle>
                      <CardDescription>
                        Configuración para la fase de conclusiones de exámenes de confiabilidad
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Modelo</Label>
                          <Select
                            value={formData.confiabilidad_conclusiones_modelo}
                            onValueChange={(value) => handleInputChange('confiabilidad_conclusiones_modelo', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar modelo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini</SelectItem>
                              <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                              <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini</SelectItem>
                              <SelectItem value="gpt-5-2025-08-07">GPT-5</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Temperatura</Label>
                          <Input
                            type="number"
                            min="0"
                            max="2"
                            step="0.1"
                            value={formData.confiabilidad_conclusiones_temperatura || 0.7}
                            onChange={(e) => handleInputChange('confiabilidad_conclusiones_temperatura', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Tokens</Label>
                          <Input
                            type="number"
                            min="100"
                            max="4000"
                            value={formData.confiabilidad_conclusiones_max_tokens || 1000}
                            onChange={(e) => handleInputChange('confiabilidad_conclusiones_max_tokens', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>System Message</Label>
                        <Textarea
                          value={formData.confiabilidad_conclusiones_system_prompt || ''}
                          onChange={(e) => handleInputChange('confiabilidad_conclusiones_system_prompt', e.target.value)}
                          placeholder="Prompt del sistema para conclusiones de confiabilidad..."
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>User Prompt</Label>
                        <Textarea
                          value={formData.confiabilidad_conclusiones_user_prompt || ''}
                          onChange={(e) => handleInputChange('confiabilidad_conclusiones_user_prompt', e.target.value)}
                          placeholder="Prompt del usuario para conclusiones (use variables como ${analysisResult}, ${categoryData.overallRisk})..."
                          rows={6}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Diagnóstico del Sistema de Correo</CardTitle>
              <CardDescription>
                Herramientas para diagnosticar y resolver problemas con el envío de emails via RESEND
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DiagnosticoResend />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  Mail, 
  Users, 
  FileText, 
  Settings, 
  Eye, 
  Download,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Upload,
  Image,
  Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import HTPAnalysisViewer from '@/components/HTPAnalysisViewer';

interface HTPConfig {
  id: string;
  min_words: number;
  max_words: number;
  openai_model: string;
  temperature: number;
  system_prompt: string;
}

interface LegalNotice {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  company: string;
  area: string;
  section: string;
}

interface HTPSubmission {
  id: string;
  user_id: string;
  image_url: string;
  image_filename: string;
  explanation_text: string;
  legal_consent: boolean;
  submitted_at: string;
  analysis_generated: boolean;
  profiles?: {
    full_name: string;
    email: string;
    company: string;
  };
}

const HTPManagement = () => {
  const [config, setConfig] = useState<HTPConfig | null>(null);
  const [legalNotice, setLegalNotice] = useState<LegalNotice | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<HTPSubmission[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [submissionSearchTerm, setSubmissionSearchTerm] = useState('');
  const [submissionCompanyFilter, setSubmissionCompanyFilter] = useState('all');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('all');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedUploadUser, setSelectedUploadUser] = useState('');
  const [viewingAnalysis, setViewingAnalysis] = useState<string | null>(null);

  const openAIModels = [
    'gpt-4.1-mini-2025-04-14',
    'gpt-4.1-2025-04-14',
    'gpt-5-2025-08-07'
  ];

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = companyFilter === 'all' || user.company === companyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [users, searchTerm, companyFilter]);

  // Get unique companies for filter
  const companies = useMemo(() => {
    const uniqueCompanies = [...new Set(users.map(user => user.company))];
    return uniqueCompanies.filter(company => company && company.trim() !== '');
  }, [users]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(submission => {
      const profile = submission.profiles;
      const matchesSearch = submissionSearchTerm === '' || 
        (profile?.full_name?.toLowerCase().includes(submissionSearchTerm.toLowerCase()) ||
         profile?.email?.toLowerCase().includes(submissionSearchTerm.toLowerCase()));
      
      const matchesCompany = submissionCompanyFilter === 'all' || 
        profile?.company === submissionCompanyFilter;
      
      const matchesStatus = submissionStatusFilter === 'all' ||
        (submissionStatusFilter === 'analyzed' && submission.analysis_generated) ||
        (submissionStatusFilter === 'pending' && !submission.analysis_generated) ||
        (submissionStatusFilter === 'with_consent' && submission.legal_consent) ||
        (submissionStatusFilter === 'without_consent' && !submission.legal_consent);
      
      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [submissions, submissionSearchTerm, submissionCompanyFilter, submissionStatusFilter]);

  // Get companies from submissions
  const submissionCompanies = useMemo(() => {
    const uniqueCompanies = [...new Set(submissions.map(s => s.profiles?.company).filter(Boolean))];
    return uniqueCompanies.filter(company => company && company.trim() !== '');
  }, [submissions]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch HTP config
      const { data: configData, error: configError } = await supabase
        .from('htp_config')
        .select('*')
        .limit(1)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      if (configData) {
        setConfig(configData);
      }

      // Fetch legal notice
      const { data: legalData, error: legalError } = await supabase
        .from('legal_notice')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (legalError && legalError.code !== 'PGRST116') {
        throw legalError;
      }

      if (legalData) {
        setLegalNotice(legalData);
      }

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, company, area, section')
        .eq('role', 'student');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('htp_submissions')
        .select('*');

      if (submissionsError) throw submissionsError;
      
      // Get user profiles separately to avoid join issues
      if (submissionsData && submissionsData.length > 0) {
        const userIds = submissionsData.map(s => s.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, company')
          .in('id', userIds);

        // Merge profile data with submissions
        const enrichedSubmissions = submissionsData.map(submission => ({
          ...submission,
          profiles: profilesData?.find(p => p.id === submission.user_id) || null
        }));
        
        setSubmissions(enrichedSubmissions);
      } else {
        setSubmissions([]);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('htp_config')
        .upsert([config]);

      if (error) throw error;
      toast.success('Configuración guardada exitosamente');
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar configuración: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLegalNotice = async () => {
    if (!legalNotice) return;

    setSaving(true);
    try {
      // Deactivate old notices
      await supabase
        .from('legal_notice')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new notice
      const { error } = await supabase
        .from('legal_notice')
        .upsert([{ ...legalNotice, is_active: true }]);

      if (error) throw error;
      toast.success('Aviso legal actualizado exitosamente');
    } catch (error: any) {
      console.error('Error saving legal notice:', error);
      toast.error('Error al guardar aviso legal: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmails = async (type: 'individual' | 'massive') => {
    const userIds = type === 'individual' ? selectedUsers : filteredUsers.map(u => u.id);
    
    if (userIds.length === 0) {
      toast.error('Por favor selecciona al menos un usuario');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('send-htp-invitations', {
        body: { 
          userIds,
          type 
        }
      });

      if (error) throw error;
      toast.success(`Correos enviados exitosamente a ${userIds.length} usuario(s)`);
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error sending emails:', error);
      toast.error('Error al enviar correos: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAnalysis = async (submissionId: string, forceRegenerate = false) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-htp-analysis', {
        body: { submissionId, forceRegenerate }
      });

      if (error) throw error;
      toast.success('Análisis generado exitosamente');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error generating analysis:', error);
      toast.error('Error al generar análisis: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateReport = async (submissionId: string) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-htp-report', {
        body: { submissionId }
      });

      if (error) throw error;
      
      // Download the generated PDF
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-htp-${submissionId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte generado exitosamente');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error('Error al generar reporte: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async () => {
    if (!uploadFile || !selectedUploadUser || !uploadDescription.trim()) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    setSaving(true);
    try {
      // Create file name
      const timestamp = new Date().getTime();
      const fileName = `htp_${selectedUploadUser}_${timestamp}_${uploadFile.name}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('candidate-photos')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('candidate-photos')
        .getPublicUrl(fileName);

      // Create HTP assignment first
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('htp_assignments')
        .insert({
          user_id: selectedUploadUser,
          assigned_by: (await supabase.auth.getUser()).data.user?.id,
          access_link: `${window.location.origin}/htp-exam/${crypto.randomUUID()}`,
          status: 'notified',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      // Create submission record
      const { error: submissionError } = await supabase
        .from('htp_submissions')
        .insert({
          user_id: selectedUploadUser,
          assignment_id: assignmentData.id,
          image_url: publicUrl,
          image_filename: fileName,
          explanation_text: uploadDescription,
          legal_consent: true,
          analysis_generated: false
        });

      if (submissionError) throw submissionError;

      toast.success('Imagen cargada exitosamente');
      setUploadFile(null);
      setUploadDescription('');
      setSelectedUploadUser('');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Error al cargar imagen: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin mr-2" />
        <span>Cargando configuración HTP...</span>
      </div>
    );
  }

  console.log('🎨 HTPManagement renderizado - Usuarios:', users.length, 'Submissions:', submissions.length);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Exámenes HTP</h2>
          <p className="text-muted-foreground">
            Gestión de pruebas proyectivas House-Tree-Person
          </p>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="legal">
            <FileText className="h-4 w-4 mr-2" />
            Aviso Legal
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Cargar Imagen
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            Envío de Correos
          </TabsTrigger>
          <TabsTrigger value="submissions">
            <Eye className="h-4 w-4 mr-2" />
            Entregas
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <Brain className="h-4 w-4 mr-2" />
            Análisis
          </TabsTrigger>
          <TabsTrigger value="reports">
            <Download className="h-4 w-4 mr-2" />
            Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Análisis OpenAI</CardTitle>
              <CardDescription>
                Configure los parámetros para la generación de análisis psicológicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-words">Palabras mínimas</Label>
                  <Input
                    id="min-words"
                    type="number"
                    value={config?.min_words || 200}
                    onChange={(e) => setConfig(prev => prev ? {...prev, min_words: parseInt(e.target.value)} : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-words">Palabras máximas</Label>
                  <Input
                    id="max-words"
                    type="number"
                    value={config?.max_words || 2000}
                    onChange={(e) => setConfig(prev => prev ? {...prev, max_words: parseInt(e.target.value)} : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo OpenAI</Label>
                  <Select
                    value={config?.openai_model || 'gpt-4.1-mini-2025-04-14'}
                    onValueChange={(value) => setConfig(prev => prev ? {...prev, openai_model: value} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {openAIModels.map(model => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperatura</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={config?.temperature || 0.7}
                    onChange={(e) => setConfig(prev => prev ? {...prev, temperature: parseFloat(e.target.value)} : null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt del Sistema</Label>
                <Textarea
                  id="prompt"
                  rows={6}
                  value={config?.system_prompt || ''}
                  onChange={(e) => setConfig(prev => prev ? {...prev, system_prompt: e.target.value} : null)}
                  placeholder="Eres un psicólogo experto en técnicas proyectivas..."
                />
              </div>

              <Button onClick={handleSaveConfig} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Configuración
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aviso Legal y Consentimiento</CardTitle>
              <CardDescription>
                Edite el texto del aviso legal que aparecerá en todos los exámenes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={legalNotice?.title || ''}
                  onChange={(e) => setLegalNotice(prev => prev ? {...prev, title: e.target.value} : null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenido del Aviso</Label>
                <Textarea
                  id="content"
                  rows={20}
                  value={legalNotice?.content || ''}
                  onChange={(e) => setLegalNotice(prev => prev ? {...prev, content: e.target.value} : null)}
                  placeholder="AVISO LEGAL Y CONSENTIMIENTO INFORMADO..."
                />
              </div>

              <Button onClick={handleSaveLegalNotice} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Aviso Legal
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cargar Imagen HTP</CardTitle>
              <CardDescription>
                Cargue una imagen HTP directamente para un usuario específico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-select">Seleccionar Usuario</Label>
                <Select value={selectedUploadUser} onValueChange={setSelectedUploadUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} - {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-upload">Imagen HTP</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  {uploadFile ? (
                    <div className="space-y-2">
                      <Image className="h-8 w-8 mx-auto text-green-600" />
                      <p className="text-sm font-medium">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUploadFile(null)}
                      >
                        Cambiar imagen
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Seleccionar imagen</p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, JPEG hasta 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('El archivo es muy grande (máximo 10MB)');
                              return;
                            }
                            setUploadFile(file);
                          }
                        }}
                        className="hidden"
                        id="image-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        Seleccionar archivo
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción/Explicación</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Ingrese una descripción o explicación de la imagen..."
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button 
                  onClick={handleUploadImage}
                  disabled={saving || !uploadFile || !selectedUploadUser || !uploadDescription.trim()}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Salvar Imagen Cargada
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={async () => {
                      if (!selectedUploadUser) {
                        toast.error('Seleccione un usuario primero');
                        return;
                      }
                      
                      // Find the latest submission for this user
                      const userSubmission = submissions.find(s => s.user_id === selectedUploadUser);
                      if (!userSubmission) {
                        toast.error('No se encontró ninguna imagen cargada para este usuario');
                        return;
                      }

                      try {
                        setSaving(true);
                        const { data, error } = await supabase.functions.invoke('generate-htp-analysis', {
                          body: { submissionId: userSubmission.id }
                        });

                        if (error) throw error;
                        
                        toast.success('Análisis generado exitosamente');
                        fetchData(); // Refresh data
                      } catch (error: any) {
                        console.error('Error generating analysis:', error);
                        toast.error('Error al generar análisis: ' + error.message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving || !selectedUploadUser}
                    variant="secondary"
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Efectuar Análisis
                      </>
                    )}
                  </Button>

                  <Button 
                    onClick={async () => {
                      if (!selectedUploadUser) {
                        toast.error('Seleccione un usuario primero');
                        return;
                      }
                      
                      // Find the latest submission for this user
                      const userSubmission = submissions.find(s => s.user_id === selectedUploadUser);
                      if (!userSubmission) {
                        toast.error('No se encontró ninguna imagen cargada para este usuario');
                        return;
                      }

                      try {
                        setSaving(true);
                        const { data, error } = await supabase.functions.invoke('generate-htp-report', {
                          body: { submissionId: userSubmission.id }
                        });

                        if (error) throw error;
                        
                        // Create a blob from the HTML response and download it
                        const blob = new Blob([data], { type: 'text/html' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `reporte-htp-${userSubmission.profiles?.full_name || 'usuario'}.html`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        
                        toast.success('Informe generado y descargado exitosamente');
                      } catch (error: any) {
                        console.error('Error generating report:', error);
                        toast.error('Error al generar informe: ' + error.message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving || !selectedUploadUser}
                    variant="outline"
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Efectuar Informe
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          {/* Search and Filter Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar y Filtrar Usuarios
              </CardTitle>
              <CardDescription>
                Use los filtros para encontrar fácilmente a los usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar por nombre o email</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Escriba nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-filter">Filtrar por empresa</Label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las empresas</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredUsers.length} de {users.length} usuarios
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const allFilteredIds = filteredUsers.map(user => user.id);
                      setSelectedUsers(allFilteredIds);
                    }}
                  >
                    Seleccionar Filtrados
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedUsers([])}
                  >
                    Deseleccionar Todo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Envío Individual</CardTitle>
                <CardDescription>
                  Seleccione usuarios específicos para enviar invitaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No se encontraron usuarios con los filtros aplicados</p>
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                      <div key={user.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                        <input
                          type="checkbox"
                          id={user.id}
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded"
                        />
                        <label htmlFor={user.id} className="text-sm flex-1 cursor-pointer">
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-muted-foreground text-xs">{user.email}</div>
                          <div className="text-muted-foreground text-xs">{user.company}</div>
                        </label>
                      </div>
                    ))
                  )}
                </div>

                <Button 
                  onClick={() => handleSendEmails('individual')} 
                  disabled={saving || selectedUsers.length === 0}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar a Seleccionados ({selectedUsers.length})
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Envío Masivo</CardTitle>
                <CardDescription>
                  Enviar invitaciones a todos los usuarios estudiantes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    Se enviará el correo con las instrucciones del examen HTP a <strong>{filteredUsers.length} usuarios</strong> que coinciden con los filtros aplicados.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={() => handleSendEmails('massive')} 
                  disabled={saving || filteredUsers.length === 0}
                  className="w-full"
                  variant="destructive"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar a Filtrados ({filteredUsers.length})
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          {/* Filtros para submissions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtrar Entregas
              </CardTitle>
              <CardDescription>
                Use los filtros para encontrar entregas específicas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submission-search">Buscar por nombre o email</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="submission-search"
                      placeholder="Escriba nombre o email..."
                      value={submissionSearchTerm}
                      onChange={(e) => setSubmissionSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submission-company-filter">Filtrar por empresa</Label>
                  <Select value={submissionCompanyFilter} onValueChange={setSubmissionCompanyFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las empresas</SelectItem>
                      {submissionCompanies.map(company => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submission-status-filter">Filtrar por estado</Label>
                  <Select value={submissionStatusFilter} onValueChange={setSubmissionStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="analyzed">Con análisis generado</SelectItem>
                      <SelectItem value="pending">Pendiente de análisis</SelectItem>
                      <SelectItem value="with_consent">Con consentimiento</SelectItem>
                      <SelectItem value="without_consent">Sin consentimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredSubmissions.length} de {submissions.length} entregas
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSubmissionSearchTerm('');
                    setSubmissionCompanyFilter('all');
                    setSubmissionStatusFilter('all');
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entregas Recibidas</CardTitle>
              <CardDescription>
                Visualice y gestione las entregas de los exámenes HTP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSubmissions.map(submission => (
                  <div key={submission.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{submission.profiles?.full_name || 'Usuario desconocido'}</h4>
                        <p className="text-sm text-muted-foreground">{submission.profiles?.email || 'Email no disponible'}</p>
                        <p className="text-sm text-muted-foreground">{submission.profiles?.company || 'Empresa no disponible'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {submission.legal_consent ? (
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Consentimiento
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Sin Consentimiento
                          </Badge>
                        )}
                        
                         {submission.analysis_generated ? (
                           <div className="flex gap-2">
                             <Badge variant="default">
                               <CheckCircle className="h-3 w-3 mr-1" />
                               Análisis Generado
                             </Badge>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleGenerateAnalysis(submission.id, true)}
                               disabled={saving}
                             >
                               <RefreshCw className="h-4 w-4 mr-2" />
                               Re-generar
                             </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setViewingAnalysis(submission.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Análisis
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleGenerateReport(submission.id)}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Reporte
                              </Button>
                           </div>
                         ) : (
                           <Button
                             size="sm"
                             onClick={() => handleGenerateAnalysis(submission.id, false)}
                             disabled={saving}
                             className="bg-blue-600 hover:bg-blue-700"
                           >
                             <Brain className="h-4 w-4 mr-2" />
                             Proceder al Análisis
                           </Button>
                         )}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <p><strong>Archivo:</strong> {submission.image_filename}</p>
                      <p><strong>Enviado:</strong> {new Date(submission.submitted_at).toLocaleString()}</p>
                      {submission.explanation_text && (
                        <p><strong>Explicación:</strong> {submission.explanation_text}</p>
                      )}
                    </div>
                  </div>
                ))}

                {filteredSubmissions.length === 0 && submissions.length > 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No se encontraron entregas con los filtros aplicados</p>
                    <p className="text-xs mt-1">Hay {submissions.length} entregas en total</p>
                  </div>
                )}

                {submissions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay entregas registradas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {viewingAnalysis ? (
            <HTPAnalysisViewer 
              submissionId={viewingAnalysis}
              onClose={() => setViewingAnalysis(null)}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Análisis Psicológicos
                </CardTitle>
                <CardDescription>
                  Visualice los análisis detallados de las evaluaciones HTP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredSubmissions
                    .filter(s => s.analysis_generated)
                    .map(submission => (
                      <div key={submission.id} className="flex justify-between items-center border rounded-lg p-4">
                        <div>
                          <h4 className="font-semibold">{submission.profiles?.full_name || 'Usuario desconocido'}</h4>
                          <p className="text-sm text-muted-foreground">{submission.profiles?.email}</p>
                          <p className="text-sm text-muted-foreground">{submission.profiles?.company}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Evaluado el {new Date(submission.submitted_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setViewingAnalysis(submission.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Análisis Completo
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleGenerateReport(submission.id)}
                            disabled={saving}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar PDF
                          </Button>
                        </div>
                      </div>
                    ))}

                  {filteredSubmissions.filter(s => s.analysis_generated).length === 0 && submissions.filter(s => s.analysis_generated).length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No se encontraron análisis con los filtros aplicados</p>
                      <p className="text-xs mt-1">Hay {submissions.filter(s => s.analysis_generated).length} análisis disponibles en total</p>
                    </div>
                  )}

                  {submissions.filter(s => s.analysis_generated).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay análisis generados disponibles</p>
                      <p className="text-xs">Los análisis aparecerán aquí una vez que sean procesados</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reportes Generados</CardTitle>
              <CardDescription>
                Descargue los reportes PDF de los análisis psicológicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSubmissions
                  .filter(s => s.analysis_generated)
                  .map(submission => (
                    <div key={submission.id} className="flex justify-between items-center border rounded-lg p-4">
                      <div>
                        <h4 className="font-semibold">{submission.profiles?.full_name || 'Usuario desconocido'}</h4>
                        <p className="text-sm text-muted-foreground">
                          Análisis generado el {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">{submission.profiles?.company}</p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setViewingAnalysis(submission.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Análisis
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleGenerateReport(submission.id)}
                          disabled={saving}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Descargar PDF
                        </Button>
                      </div>
                    </div>
                  ))}

                {filteredSubmissions.filter(s => s.analysis_generated).length === 0 && submissions.filter(s => s.analysis_generated).length > 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No se encontraron reportes con los filtros aplicados</p>
                    <p className="text-xs mt-1">Hay {submissions.filter(s => s.analysis_generated).length} reportes disponibles en total</p>
                  </div>
                )}

                {submissions.filter(s => s.analysis_generated).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay reportes generados disponibles</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HTPManagement;
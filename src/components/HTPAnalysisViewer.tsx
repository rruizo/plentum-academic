import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Brain, 
  Calendar, 
  User, 
  Building2, 
  Mail,
  Download,
  RefreshCw,
  Eye,
  GitCompare,
  Save,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HTPAnalysisViewerProps {
  submissionId: string;
  onClose: () => void;
}

interface AnalysisData {
  submission: {
    id: string;
    image_url: string;
    explanation_text: string;
    submitted_at: string;
    analysis_generated: boolean;
    profiles: {
      full_name: string;
      email: string;
      company: string;
      area: string;
      section: string;
    };
  };
  analysis: {
    id: string;
    analysis_content: any;
    openai_model_used: string;
    word_count: number;
    generated_at: string;
  } | null;
  allAnalyses: Array<{
    id: string;
    analysis_content: any;
    openai_model_used: string;
    word_count: number;
    generated_at: string;
  }>;
}

const OPENAI_MODELS = [
  { value: 'gpt-5-2025-08-07', label: 'GPT-5 (Más avanzado)', description: 'Modelo más potente y actual' },
  { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini (Eficiente)', description: 'Más rápido y económico' },
  { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (Confiable)', description: 'Resultados consistentes' },
  { value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini (Rápido)', description: 'Análisis rápido y eficiente' },
  { value: 'o3-2025-04-16', label: 'O3 (Razonamiento)', description: 'Análisis profundo y razonado' },
  { value: 'o4-mini-2025-04-16', label: 'O4 Mini (Análisis visual)', description: 'Optimizado para imágenes' }
];

const HTPAnalysisViewer: React.FC<HTPAnalysisViewerProps> = ({
  submissionId,
  onClose
}) => {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(OPENAI_MODELS[0].value);
  const [tempAnalyses, setTempAnalyses] = useState<Array<{
    id: string;
    model: string;
    content: any;
    generated_at: string;
    word_count: number;
    isTemporary: boolean;
  }>>([]);
  const [savingAnalysis, setSavingAnalysis] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysisData();
  }, [submissionId]);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      
      // Get submission details
      const { data: submission, error: submissionError } = await supabase
        .from('htp_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (submissionError) throw submissionError;

      // Get user profile separately
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, company, area, section')
        .eq('id', submission.user_id)
        .single();

      if (profileError) throw profileError;

      // Get all analyses for this submission
      const { data: allAnalyses } = await supabase
        .from('htp_analysis')
        .select('*')
        .eq('submission_id', submissionId)
        .order('generated_at', { ascending: false });

      const latestAnalysis = allAnalyses && allAnalyses.length > 0 ? allAnalyses[0] : null;

      setData({
        submission: {
          ...submission,
          profiles: userProfile
        } as any,
        analysis: latestAnalysis,
        allAnalyses: allAnalyses || []
      });

    } catch (error: any) {
      console.error('Error fetching analysis data:', error);
      toast.error('Error al cargar datos del análisis');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAnalysis = async (model: string, isTemporary = false) => {
    setGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-htp-analysis', {
        body: { 
          submissionId, 
          forceRegenerate: true,
          model: model,
          saveToDatabase: !isTemporary
        }
      });

      if (error) throw error;

      if (isTemporary && result) {
        // Add to temporary analyses for comparison
        const tempAnalysis = {
          id: `temp_${Date.now()}`,
          model: model,
          content: result.analysisContent,
          generated_at: new Date().toISOString(),
          word_count: result.wordCount,
          isTemporary: true
        };
        setTempAnalyses(prev => [...prev, tempAnalysis]);
        toast.success(`Análisis temporal generado con ${model}`);
      } else {
        toast.success('Análisis generado y guardado exitosamente');
        await fetchAnalysisData(); // Refresh data
      }
    } catch (error: any) {
      console.error('Error generating analysis:', error);
      toast.error('Error al generar análisis: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAnalysis = async (tempAnalysisId: string) => {
    setSavingAnalysis(tempAnalysisId);
    try {
      const tempAnalysis = tempAnalyses.find(a => a.id === tempAnalysisId);
      if (!tempAnalysis) return;

      const { error } = await supabase.functions.invoke('save-htp-analysis', {
        body: {
          submissionId,
          analysisContent: tempAnalysis.content,
          model: tempAnalysis.model,
          wordCount: tempAnalysis.word_count
        }
      });

      if (error) throw error;

      // Remove from temporary analyses
      setTempAnalyses(prev => prev.filter(a => a.id !== tempAnalysisId));
      toast.success('Análisis guardado como definitivo');
      await fetchAnalysisData();
    } catch (error: any) {
      console.error('Error saving analysis:', error);
      toast.error('Error al guardar análisis: ' + error.message);
    } finally {
      setSavingAnalysis(null);
    }
  };

  const handleDeleteTempAnalysis = (tempAnalysisId: string) => {
    setTempAnalyses(prev => prev.filter(a => a.id !== tempAnalysisId));
    toast.success('Análisis temporal eliminado');
  };

  const handleGenerateReport = async () => {
    try {
      const response = await supabase.functions.invoke('generate-htp-report', {
        body: { submissionId }
      });

      if (response.error) throw response.error;
      
      // Create blob from HTML response and convert to PDF-like download
      const htmlContent = response.data;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-htp-${data?.submission.profiles.full_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${submissionId.slice(0, 8)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte descargado exitosamente (HTML)');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error('Error al generar reporte: ' + error.message);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando análisis...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="text-center py-12">
          <p>No se encontraron datos del análisis</p>
          <Button onClick={onClose} className="mt-4">Volver</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-6 w-6 text-primary" />
                <span>Análisis HTP - {data.submission.profiles.full_name}</span>
              </CardTitle>
              <CardDescription>
                Evaluación Psicológica House-Tree-Person
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-2 items-center">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Seleccionar modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div>
                          <div className="font-medium">{model.label}</div>
                          <div className="text-xs text-muted-foreground">{model.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  onClick={() => handleGenerateAnalysis(selectedModel, true)}
                  disabled={generating}
                  title="Generar análisis temporal para comparar"
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  Comparar
                </Button>
                
                {data.analysis && (
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateAnalysis(selectedModel, false)}
                    disabled={generating}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {generating ? 'Regenerando...' : 'Regenerar'}
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {data.analysis && (
                  <Button
                    onClick={handleGenerateReport}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Reporte
                  </Button>
                )}
                
                {!data.analysis && (
                  <Button
                    onClick={() => handleGenerateAnalysis(selectedModel, false)}
                    disabled={generating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {generating ? 'Generando...' : 'Generar Análisis'}
                  </Button>
                )}
                
                <Button variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Information */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Información del Evaluado</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Nombre</div>
                <div className="font-medium">{data.submission.profiles.full_name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{data.submission.profiles.email}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Empresa</div>
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span>{data.submission.profiles.company}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Área</div>
                <div>{data.submission.profiles.area}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Sección</div>
                <div>{data.submission.profiles.section}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Fecha de Evaluación</div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(data.submission.submitted_at).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Drawing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Dibujo HTP</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <img 
                  src={data.submission.image_url} 
                  alt="Dibujo HTP" 
                  className="w-full rounded border shadow-sm"
                />
                {data.submission.explanation_text && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <div className="text-sm font-medium text-amber-800 mb-2">
                      Explicación del evaluado:
                    </div>
                    <p className="text-sm text-amber-700">
                      "{data.submission.explanation_text}"
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Content */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Análisis Psicológico</span>
                </CardTitle>
                {(data.analysis || tempAnalyses.length > 0) && (
                  <Badge variant="secondary">
                    {tempAnalyses.length > 0 ? `${tempAnalyses.length} análisis temporales` : `${data.analysis?.word_count} palabras`}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {(data.analysis || tempAnalyses.length > 0) ? (
                <Tabs defaultValue={data.analysis ? "saved" : "temp-0"} className="w-full">
                  <TabsList className="grid w-full grid-cols-auto gap-1">
                    {data.analysis && (
                      <TabsTrigger value="saved" className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Análisis Guardado
                      </TabsTrigger>
                    )}
                    {data.allAnalyses.length > 1 && (
                      <TabsTrigger value="history" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Historial ({data.allAnalyses.length})
                      </TabsTrigger>
                    )}
                    {tempAnalyses.map((temp, index) => (
                      <TabsTrigger key={temp.id} value={`temp-${index}`} className="flex items-center gap-2">
                        <GitCompare className="h-4 w-4" />
                        {OPENAI_MODELS.find(m => m.value === temp.model)?.label?.split(' ')[0] || temp.model}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {data.analysis && (
                    <TabsContent value="saved" className="space-y-4">
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div>
                          <strong>Modelo:</strong> {data.analysis.openai_model_used}
                        </div>
                        <div>
                          <strong>Generado:</strong> {new Date(data.analysis.generated_at).toLocaleString('es-ES')}
                        </div>
                        <div>
                          <strong>Palabras:</strong> {data.analysis.word_count}
                        </div>
                      </div>
                      <Separator />
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {data.analysis.analysis_content?.text || 'Contenido del análisis no disponible'}
                        </div>
                      </div>
                    </TabsContent>
                  )}

                  {data.allAnalyses.length > 1 && (
                    <TabsContent value="history" className="space-y-4">
                      <div className="space-y-4">
                        {data.allAnalyses.map((analysis, index) => (
                          <Card key={analysis.id} className={index === 0 ? 'border-primary' : ''}>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Badge variant={index === 0 ? 'default' : 'secondary'}>
                                    {index === 0 ? 'Actual' : `Versión ${data.allAnalyses.length - index}`}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {analysis.openai_model_used}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(analysis.generated_at).toLocaleString('es-ES')}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="prose prose-sm max-w-none">
                                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                                  {analysis.analysis_content?.text?.substring(0, 300) || 'Contenido no disponible'}
                                  {(analysis.analysis_content?.text?.length || 0) > 300 && '...'}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  )}

                  {tempAnalyses.map((temp, index) => (
                    <TabsContent key={temp.id} value={`temp-${index}`} className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div>
                            <strong>Modelo:</strong> {temp.model}
                          </div>
                          <div>
                            <strong>Generado:</strong> {new Date(temp.generated_at).toLocaleString('es-ES')}
                          </div>
                          <div>
                            <strong>Palabras:</strong> {temp.word_count}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveAnalysis(temp.id)}
                            disabled={savingAnalysis === temp.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {savingAnalysis === temp.id ? 'Guardando...' : 'Guardar como Definitivo'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTempAnalysis(temp.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {temp.content?.text || 'Contenido del análisis no disponible'}
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Análisis no disponible</h3>
                  <p className="text-muted-foreground mb-4">
                    El análisis psicológico para esta evaluación aún no ha sido generado.
                  </p>
                  <div className="space-y-3">
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="w-64 mx-auto">
                        <SelectValue placeholder="Seleccionar modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENAI_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <div>
                              <div className="font-medium">{model.label}</div>
                              <div className="text-xs text-muted-foreground">{model.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => handleGenerateAnalysis(selectedModel, false)}
                      disabled={generating}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      {generating ? 'Generando Análisis...' : 'Generar Análisis Ahora'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HTPAnalysisViewer;
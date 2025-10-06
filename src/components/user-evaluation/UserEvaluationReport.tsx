import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download, Eye, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import AnalysisModelSelector from '@/components/AnalysisModelSelector';

interface UserEvaluationReportProps {
  userId: string;
  userName: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ExamAttempt {
  id: string;
  exam_id: string;
  exam_title: string;
  completed_at: string;
  score: number;
  risk_analysis: any;
  questions: any;
  answers: any;
  type: 'reliability';
}

interface PersonalityResult {
  id: string;
  user_id: string;
  session_id: string;
  apertura_score: number;
  responsabilidad_score: number;
  extraversion_score: number;
  amabilidad_score: number;
  neuroticismo_score: number;
  created_at: string;
  type: 'psychometric';
}

type EvaluationWithDisplay = (ExamAttempt & { displayName: string; date: string }) | (PersonalityResult & { displayName: string; date: string });

const UserEvaluationReport = ({ 
  userId, 
  userName, 
  userEmail, 
  isOpen, 
  onClose 
}: UserEvaluationReportProps) => {
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [personalityResults, setPersonalityResults] = useState<PersonalityResult[]>([]);
  const [allEvaluations, setAllEvaluations] = useState<EvaluationWithDisplay[]>([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>('');
  const [selectedEvaluationType, setSelectedEvaluationType] = useState<'reliability' | 'psychometric'>('reliability');
  const [loading, setLoading] = useState(false);
  const [reportHtml, setReportHtml] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);
  const [showRegenerateWarning, setShowRegenerateWarning] = useState(false);
  const [systemName, setSystemName] = useState('Sistema');
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-2025-04-14');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const { config } = useSystemConfig();

  // Modelos disponibles
  const availableModels = [
    { value: 'gpt-5-2025-08-07', label: 'GPT-5 (Recomendado)', description: 'Modelo más avanzado' },
    { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini', description: 'Rápido y eficiente' },
    { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1', description: 'Confiable y estable' },
    { value: 'o3-2025-04-16', label: 'O3 Reasoning', description: 'Análisis profundo' },
    { value: 'o4-mini-2025-04-16', label: 'O4 Mini', description: 'Razonamiento rápido' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Legacy)', description: 'Modelo anterior' }
  ];

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserEvaluations();
    }
  }, [isOpen, userId]);

  const fetchUserEvaluations = async () => {
    try {
      setLoading(true);
      console.log('Fetching evaluations for user:', userId);

      // Obtener intentos de examen (confiabilidad)
      const { data: examData, error: examError } = await supabase
        .from('exam_attempts')
        .select(`
          id,
          exam_id,
          completed_at,
          score,
          risk_analysis,
          questions,
          answers,
          exams (
            title
          )
        `)
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      // Obtener resultados de personalidad
      const { data: personalityData, error: personalityError } = await supabase
        .from('personality_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (examError) {
        console.error('Error fetching exam attempts:', examError);
      }

      if (personalityError) {
        console.error('Error fetching personality results:', personalityError);
      }

      // Procesar datos de confiabilidad
      const attempts = examData?.map(attempt => ({
        id: attempt.id,
        exam_id: attempt.exam_id,
        exam_title: attempt.exams?.title || 'Examen sin título',
        completed_at: attempt.completed_at,
        score: attempt.score || 0,
        risk_analysis: attempt.risk_analysis,
        questions: attempt.questions,
        answers: attempt.answers,
        type: 'reliability' as const
      })) || [];

      // Procesar datos psicométricos
      const personalities = personalityData?.map(result => ({
        ...result,
        type: 'psychometric' as const
      })) || [];

      setExamAttempts(attempts);
      setPersonalityResults(personalities);

      // Combinar ambos tipos de evaluaciones
      const combined = [
        ...attempts.map(a => ({ ...a, displayName: `${a.exam_title} (Confiabilidad)`, date: a.completed_at })),
        ...personalities.map(p => ({ ...p, displayName: 'Evaluación de Personalidad OCEAN', date: p.created_at }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllEvaluations(combined);

      console.log('Found evaluations:', { attempts: attempts.length, personalities: personalities.length });

      // Si solo hay una evaluación, seleccionarla automáticamente
      if (combined.length === 1) {
        setSelectedEvaluationId(combined[0].id);
        setSelectedEvaluationType(combined[0].type);
        checkExistingAnalysis(combined[0]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar las evaluaciones');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAnalysis = (evaluation: EvaluationWithDisplay) => {
    if (evaluation.type === 'reliability') {
      const reliabilityEval = evaluation as ExamAttempt & { displayName: string; date: string };
      setHasExistingAnalysis(!!(reliabilityEval as any).ai_analysis && !!(reliabilityEval as any).ai_analysis_generated_at);
    } else {
      const personalityEval = evaluation as PersonalityResult & { displayName: string; date: string };
      setHasExistingAnalysis(!!(personalityEval as any).ai_interpretation && !!(personalityEval as any).ai_analysis_generated_at);
    }
  };

  const generateReport = async (forceRegenerate = false) => {
    if (!selectedEvaluationId) {
      toast.error('Seleccione una evaluación para generar el reporte');
      return;
    }

    try {
      setGeneratingReport(true);
      console.log('=== GENERATE REPORT START ===');
      console.log('Selected evaluation ID:', selectedEvaluationId);
      console.log('Selected evaluation type:', selectedEvaluationType);
      console.log('Force regenerate:', forceRegenerate);

      let functionName = '';
      let bodyParams = {};

      if (selectedEvaluationType === 'reliability') {
        functionName = 'generate-new-reliability-report';
        bodyParams = {
          examAttemptId: selectedEvaluationId,
          includeCharts: true,
          includeAnalysis: true,
          forceRegenerate
        };
      } else {
        functionName = 'generate-ocean-personality-report';
        bodyParams = {
          personalityResultId: selectedEvaluationId,
          includeCharts: true,
          includeAnalysis: true,
          forceRegenerate,
          selectedModel: selectedModel // Agregar el modelo seleccionado
        };
      }

      console.log('Function to call:', functionName);
      console.log('Parameters:', JSON.stringify(bodyParams, null, 2));

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: bodyParams
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Error generating report:', error);
        toast.error('Error al generar el reporte: ' + error.message);
        return;
      }

      if (data?.html) {
        setReportHtml(data.html);
        toast.success('Reporte generado exitosamente');
      } else {
        toast.error('No se pudo generar el reporte HTML');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al generar el reporte');
    } finally {
      setGeneratingReport(false);
    }
  };

  const printReport = () => {
    if (!reportHtml) {
      toast.error('Primero genere el reporte');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadReport = () => {
    if (!reportHtml) {
      toast.error('Primero genere el reporte');
      return;
    }

    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-evaluacion-${userName}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Reporte descargado exitosamente');
  };

  const generateAlternativeReport = async () => {
    if (!selectedEvaluationId) {
      toast.error('Seleccione una evaluación para generar el reporte alternativo');
      return;
    }

    try {
      setGeneratingReport(true);
      console.log('=== GENERATE ALTERNATIVE REPORT START ===');
      console.log('Selected evaluation ID:', selectedEvaluationId);
      console.log('Selected evaluation type:', selectedEvaluationType);

      const { data, error } = await supabase.functions.invoke('generate-alternative-pdf-report', {
        body: {
          examAttemptId: selectedEvaluationId,
          includeAnalysis: true,
          reportConfig: {
            company_name: config?.system_name || 'Avsec Trust',
            header_logo_url: config?.logo_url || undefined,
            footer_logo_url: config?.logo_url || undefined,
            company_email: config?.contact_email || config?.support_email || undefined,
            company_address: 'Dirección no disponible', // No definido en system_config
            company_phone: 'Teléfono no disponible', // No definido en system_config
            include_sections: {
              personal_info: true,
              risk_analysis: true, 
              category_scores: true,
              recommendations: true
            }
          }
        }
      });

      console.log('Alternative report function response:', { data, error });

      if (error) {
        console.error('Error generating alternative report:', error);
        toast.error('Error al generar el reporte alternativo: ' + error.message);
        return;
      }

      if (data?.html) {
        setReportHtml(data.html);
        toast.success('Reporte alternativo generado exitosamente');
      } else {
        toast.error('No se pudo generar el reporte alternativo HTML');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al generar el reporte alternativo');
    } finally {
      setGeneratingReport(false);
    }
  };

  const selectedEvaluation = allEvaluations.find(evaluation => evaluation.id === selectedEvaluationId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reporte de Evaluación - {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Usuario */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Nombre:</strong> {userName}</p>
                  <p><strong>Email:</strong> {userEmail}</p>
                </div>
                <div>
                  <p><strong>Total de Evaluaciones:</strong> {allEvaluations.length}</p>
                  <p><strong>Fecha de Consulta:</strong> {new Date().toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selección de Examen */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Cargando evaluaciones...</p>
            </div>
          ) : allEvaluations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  Este usuario no tiene evaluaciones completadas
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seleccionar Evaluación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {allEvaluations.length > 1 ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Seleccione la evaluación a revisar:</label>
                    <Select 
                      value={selectedEvaluationId} 
                      onValueChange={(value) => {
                        setSelectedEvaluationId(value);
                        const evaluation = allEvaluations.find(e => e.id === value);
                        if (evaluation) {
                          setSelectedEvaluationType(evaluation.type);
                          checkExistingAnalysis(evaluation);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una evaluación..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allEvaluations.map((evaluation) => (
                          <SelectItem key={evaluation.id} value={evaluation.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{evaluation.displayName}</span>
                              <span className="text-sm text-muted-foreground ml-4">
                                {new Date(evaluation.date).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{allEvaluations[0]?.displayName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Completado: {new Date(allEvaluations[0]?.date).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <Badge variant="outline">
                      Única evaluación
                    </Badge>
                  </div>
                )}

                {selectedEvaluation && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Resumen de la Evaluación Seleccionada</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Tipo:</strong> {selectedEvaluation.type === 'reliability' ? 'Confiabilidad' : 'Personalidad OCEAN'}</p>
                        <p><strong>Fecha:</strong> {new Date(selectedEvaluation.date).toLocaleDateString('es-ES')}</p>
                      </div>
                      <div>
                        {selectedEvaluation.type === 'reliability' ? (
                          <>
                            <p><strong>Puntuación:</strong> {'score' in selectedEvaluation ? selectedEvaluation.score?.toFixed(2) || 'N/A' : 'N/A'}</p>
                            <p><strong>Examen:</strong> {'exam_title' in selectedEvaluation ? selectedEvaluation.exam_title : 'N/A'}</p>
                          </>
                        ) : (
                          <>
                            <p><strong>Dimensiones:</strong> 5 factores OCEAN</p>
                            <p><strong>Estado:</strong> <Badge variant="secondary">Personalidad</Badge></p>
                          </>
                        )}
                        <p><strong>Estado:</strong> <Badge variant="default">Completado</Badge></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selección de Modelo OpenAI para análisis */}
                {selectedEvaluationType === 'psychometric' && selectedEvaluationId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Modelo de IA para análisis:</label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <div>
                              <div className="font-medium">{model.label}</div>
                              <div className="text-xs text-muted-foreground">{model.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Botones de Acción */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => generateReport(false)}
                    disabled={!selectedEvaluationId || generatingReport}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {generatingReport ? 'Generando...' : 'Generar Reporte'}
                  </Button>

                  {(hasExistingAnalysis || selectedEvaluationType === 'psychometric') && (
                    <Button 
                      variant="outline"
                      onClick={() => setShowModelSelector(true)}
                      disabled={!selectedEvaluationId || generatingReport}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Análisis con IA
                    </Button>
                  )}

                  <Button 
                    variant="outline"
                    onClick={printReport}
                    disabled={!reportHtml}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>

                  <Button 
                    variant="outline"
                    onClick={downloadReport}
                    disabled={!reportHtml}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar HTML
                  </Button>

                  {selectedEvaluationType === 'reliability' && (
                    <Button 
                      variant="secondary"
                      onClick={() => generateAlternativeReport()}
                      disabled={!selectedEvaluationId || generatingReport}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      {generatingReport ? 'Generando...' : 'Reporte Alternativo'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vista Previa del Reporte */}
          {reportHtml && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vista Previa del Reporte</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: reportHtml }}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Diálogo de advertencia para regenerar análisis */}
        {showRegenerateWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-lg text-amber-600">⚠️ Advertencia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Regenerar el análisis de IA creará un nuevo análisis y <strong>consumirá tokens adicionales</strong> de la API.
                </p>
                <p className="text-sm text-muted-foreground">
                  ¿Está seguro que desea continuar con la regeneración del análisis?
                </p>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRegenerateWarning(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="default"
                    onClick={() => {
                      setShowRegenerateWarning(false);
                      generateReport(true);
                    }}
                    disabled={generatingReport}
                  >
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserEvaluationReport;
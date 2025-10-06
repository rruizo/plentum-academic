import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileImage, FileText, BarChart3, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExamResultsDisplayProps {
  attemptId: string;
}

interface CategoryResult {
  categoryName: string;
  totalQuestions: number;
  totalScore: number;
  interpretation: string;
  nationalAverage: number;
  difference: number;
  riskLevel: 'BAJO' | 'MEDIO' | 'ALTO';
  simulationAlert: string;
}

interface ExamAnalysis {
  categoryResults: CategoryResult[];
  globalRisk: number;
  highRiskAreas: string[];
  lowScoreAreas: string[];
  recommendations: string[];
  simulationDetected: boolean;
}

interface ReportConfig {
  id?: string;
  exam_id?: string;
  include_sections: {
    personal_info: boolean;
    category_scores: boolean;
    risk_analysis: boolean;
    recommendations: boolean;
    charts: boolean;
    detailed_breakdown: boolean;
  };
  font_family: string;
  font_size: number;
  header_logo_url?: string;
  footer_logo_url?: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
}

const ExamResultsDisplay = ({ attemptId }: ExamResultsDisplayProps) => {
  const [attempt, setAttempt] = useState<any>(null);
  const [analysis, setAnalysis] = useState<ExamAnalysis | null>(null);
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReports, setGeneratingReports] = useState(false);

  useEffect(() => {
    fetchExamResults();
  }, [attemptId]);

  const fetchExamResults = async () => {
    try {
      const { data: attemptData, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (error) throw error;
      setAttempt(attemptData);
      
      // Load report configuration for this exam
      await loadReportConfig(attemptData.exam_id);
      
      if (attemptData.risk_analysis) {
        const parsedAnalysis = typeof attemptData.risk_analysis === 'string' 
          ? JSON.parse(attemptData.risk_analysis) 
          : attemptData.risk_analysis;
        setAnalysis(parsedAnalysis as ExamAnalysis);
      } else {
        await generateAnalysis(attemptData);
      }
    } catch (error) {
      console.error('Error fetching exam results:', error);
      toast.error('Error al cargar los resultados');
    } finally {
      setLoading(false);
    }
  };

  const loadReportConfig = async (examId: string) => {
    try {
      console.log('Loading report config for exam:', examId);
      
      const { data, error } = await supabase
        .from('report_config')
        .select('*')
        .eq('exam_id', examId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading report config:', error);
        return;
      }

      if (data) {
        console.log('Report config loaded:', data);
        
        // Cast the include_sections JSON to the expected type
        const includeSections = data.include_sections as Record<string, boolean> | null;
        
        const loadedConfig: ReportConfig = {
          id: data.id,
          exam_id: data.exam_id,
          include_sections: {
            personal_info: includeSections?.personal_info ?? true,
            category_scores: includeSections?.category_scores ?? true,
            risk_analysis: includeSections?.risk_analysis ?? true,
            recommendations: includeSections?.recommendations ?? true,
            charts: includeSections?.charts ?? false,
            detailed_breakdown: includeSections?.detailed_breakdown ?? false
          },
          font_family: data.font_family || 'Arial',
          font_size: data.font_size || 12,
          header_logo_url: data.header_logo_url || '',
          footer_logo_url: data.footer_logo_url || '',
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          company_phone: data.company_phone || '',
          company_email: data.company_email || ''
        };

        setReportConfig(loadedConfig);
        console.log('Report config state updated:', loadedConfig);
      } else {
        console.log('No report config found for exam:', examId);
        // Set default config
        const defaultConfig: ReportConfig = {
          include_sections: {
            personal_info: true,
            category_scores: true,
            risk_analysis: true,
            recommendations: true,
            charts: false,
            detailed_breakdown: false
          },
          font_family: 'Arial',
          font_size: 12,
          company_name: '',
          company_address: '',
          company_phone: '',
          company_email: ''
        };
        setReportConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading report config:', error);
    }
  };

const calculateResponseScore = (response: string): number => {
    switch (response) {
      case 'Nunca': return 0;
      case 'Rara vez': return 1;
      case 'A veces': return 2;
      case 'Frecuentemente': return 3;
      default: return 0;
    }
  };

  const calculateRealNationalAverage = (categoryScores: any[]): number => {
    if (!categoryScores || categoryScores.length === 0) return 1.5; // fallback
    
    const totalScore = categoryScores.reduce((sum, cat) => sum + (cat.totalScore || 0), 0);
    const totalQuestions = categoryScores.reduce((sum, cat) => sum + (cat.totalQuestions || 0), 0);
    
    return totalQuestions > 0 ? totalScore / totalQuestions : 1.5;
  };

  const interpretRisk = (totalScore: number, totalQuestions: number): string => {
    if (totalScore >= totalQuestions * 2) {
      return 'RIESGO ALTO';
    } else if (totalScore >= totalQuestions * 1) {
      return 'RIESGO MEDIO';
    } else {
      return 'RIESGO BAJO';
    }
  };

  const detectSimulation = (difference: number): string => {
    return Math.abs(difference) > 5 ? '⚠️ Posible simulación' : '';
  };

  const generateAnalysis = async (attemptData: any) => {
    try {
      const questions = attemptData.questions;
      const answers = attemptData.answers;
      
      // Agrupar por categorías
      const categoryMap = new Map();
      
      questions.forEach((question: any) => {
        if (!categoryMap.has(question.category_id)) {
          categoryMap.set(question.category_id, {
            categoryName: question.category_name,
            questions: [],
            answers: []
          });
        }
        categoryMap.get(question.category_id).questions.push(question);
      });

      // Agregar respuestas a cada categoría
      answers.forEach((answer: any) => {
        const question = questions.find((q: any) => q.id === answer.questionId);
        if (question) {
          const categoryData = categoryMap.get(question.category_id);
          if (categoryData) {
            categoryData.answers.push(answer);
          }
        }
      });

      // Calcular resultados por categoría usando la lógica VBA
      const categoryResults: CategoryResult[] = [];
      let simulationDetected = false;
      
      for (const [categoryId, data] of categoryMap) {
        const totalQuestions = data.questions.length; // totalQ
        let totalScore = 0; // totalP
        
        // Calcular puntaje total por categoría
        data.answers.forEach((answer: any) => {
          totalScore += calculateResponseScore(answer.answer);
        });

        // Media poblacional real calculada desde las respuestas guardadas  
        const realAverage = calculateRealNationalAverage(categoryResults.length > 0 ? categoryResults : []);
        const nationalAverage = realAverage * totalQuestions;
        
        // Calcular diferencia
        const difference = totalScore - nationalAverage;
        
        // Interpretación de riesgo usando lógica VBA
        const interpretation = interpretRisk(totalScore, totalQuestions);
        
        // Detección de simulación
        const simulationAlert = detectSimulation(difference);
        if (simulationAlert) {
          simulationDetected = true;
        }
        
        let riskLevel: 'BAJO' | 'MEDIO' | 'ALTO' = 'BAJO';
        if (interpretation === 'RIESGO ALTO') riskLevel = 'ALTO';
        else if (interpretation === 'RIESGO MEDIO') riskLevel = 'MEDIO';

        categoryResults.push({
          categoryName: data.categoryName,
          totalQuestions,
          totalScore,
          interpretation,
          nationalAverage,
          difference,
          riskLevel,
          simulationAlert
        });
      }

      // Calcular riesgo global
      const totalPossibleScore = categoryResults.reduce((sum, cat) => sum + (cat.totalQuestions * 3), 0);
      const totalActualScore = categoryResults.reduce((sum, cat) => sum + cat.totalScore, 0);
      const globalRisk = totalActualScore / totalPossibleScore;

      // Identificar áreas de alto riesgo y bajo puntaje
      const highRiskAreas = categoryResults
        .filter(cat => cat.riskLevel === 'ALTO')
        .map(cat => cat.categoryName);
      
      const lowScoreAreas = categoryResults
        .filter(cat => cat.difference < -2)
        .map(cat => cat.categoryName);

      // Generar recomendaciones específicas basadas en el análisis
      const recommendations = [
        'Entrevista complementaria en áreas donde hay indicios de simulación o desbalance',
        'Supervisión especial en funciones con acceso a recursos financieros',
        'Monitoreo emocional o capacitación en inteligencia emocional',
        'Incluirlo en procesos de retroalimentación ética institucional frecuente'
      ];

      const newAnalysis: ExamAnalysis = {
        categoryResults,
        globalRisk,
        highRiskAreas,
        lowScoreAreas,
        recommendations,
        simulationDetected
      };

      setAnalysis(newAnalysis);

      // Guardar análisis en la base de datos
      await supabase
        .from('exam_attempts')
        .update({ risk_analysis: newAnalysis as any })
        .eq('id', attemptId);

    } catch (error) {
      console.error('Error generating analysis:', error);
      toast.error('Error al generar el análisis');
    }
  };

  const handleGenerateStatisticalReport = async () => {
    setGeneratingReports(true);
    try {
      console.log('Generando histograma horizontal con datos del intento:', attempt);
      console.log('Usando configuración de reporte:', reportConfig);
      
      const response = await supabase.functions.invoke('generate-statistical-report', {
        body: {
          attemptId,
          analysis,
          attemptData: attempt,
          reportConfig // Pass the loaded configuration
        }
      });

      if (response.error) throw response.error;
      
      // Crear y descargar el SVG del histograma horizontal
      const blob = new Blob([response.data], { type: 'image/svg+xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `histograma-horizontal-detallado-${attemptId.substring(0, 8)}.svg`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Histograma horizontal detallado generado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al generar el histograma horizontal: ' + (error.message || 'Error desconocido'));
    } finally {
      setGeneratingReports(false);
    }
  };

  const handleGeneratePDFReport = async () => {
    setGeneratingReports(true);
    try {
      console.log('Generando reporte PDF mejorado con configuración aplicada');
      console.log('Configuración de reporte a aplicar:', reportConfig);
      
      const response = await supabase.functions.invoke('generate-pdf-report', {
        body: {
          attemptId,
          analysis,
          userInfo: {
            full_name: attempt?.user_name || 'Usuario',
            company: reportConfig?.company_name || 'Empresa Evaluada',
            report_contact: reportConfig?.company_email || 'responsable@empresa.com'
          },
          attemptData: attempt,
          reportConfig // Pass the loaded configuration to apply formatting
        }
      });

      console.log('Respuesta de la función PDF:', response);

      if (response.error) {
        console.error('Error en función edge:', response.error);
        throw response.error;
      }
      
      // Abrir el HTML mejorado en una nueva ventana
      const blob = new Blob([response.data], { type: 'text/html; charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        // Dar tiempo para que cargue y luego mostrar el diálogo de impresión
        setTimeout(() => {
          newWindow.print();
        }, 1500); // Más tiempo para cargar el SVG embebido
      }
      
      toast.success('Informe PDF detallado abierto con configuración aplicada. Use Ctrl+P para guardar como PDF');
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar el informe PDF: ' + (error.message || 'Error desconocido'));
    } finally {
      setGeneratingReports(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'RIESGO ALTO': return 'bg-red-100 text-red-800';
      case 'RIESGO MEDIO': return 'bg-yellow-100 text-yellow-800';
      case 'RIESGO BAJO': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Analizando resultados y cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p>No se pudo generar el análisis de resultados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Resultados del Examen de Confiabilidad</CardTitle>
              <CardDescription>
                Análisis completo basado en la metodología estándar de evaluación con histograma horizontal detallado
                {reportConfig && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ Configuración de reporte cargada: {reportConfig.font_family} {reportConfig.font_size}pt
                    {reportConfig.company_name && ` | ${reportConfig.company_name}`}
                  </div>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleGenerateStatisticalReport}
                disabled={generatingReports}
                variant="outline"
              >
                <FileImage className="h-4 w-4 mr-2" />
                Generar Histograma Horizontal
              </Button>
              <Button 
                onClick={handleGeneratePDFReport}
                disabled={generatingReports}
              >
                <FileText className="h-4 w-4 mr-2" />
                {generatingReports ? 'Generando...' : 'Generar Informe Completo'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Resumen Global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resumen Global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analysis.globalRisk.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Riesgo Global</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {analysis.highRiskAreas.length}
              </div>
              <div className="text-sm text-muted-foreground">Áreas de Alto Riesgo</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analysis.categoryResults.length - analysis.highRiskAreas.length}
              </div>
              <div className="text-sm text-muted-foreground">Áreas Controladas</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-amber-600">
                {analysis.simulationDetected ? 'SÍ' : 'NO'}
              </div>
              <div className="text-sm text-muted-foreground">Simulación Detectada</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados por Categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados por Categoría</CardTitle>
          <CardDescription>
            Análisis detallado siguiendo la metodología estándar de evaluación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-2 text-left">Categoría</th>
                  <th className="border border-gray-200 p-2 text-center">Total Preguntas</th>
                  <th className="border border-gray-200 p-2 text-center">Puntaje Total</th>
                  <th className="border border-gray-200 p-2 text-center">Interpretación</th>
                  <th className="border border-gray-200 p-2 text-center">Media Poblacional</th>
                  <th className="border border-gray-200 p-2 text-center">Diferencia</th>
                  <th className="border border-gray-200 p-2 text-center">Alerta</th>
                </tr>
              </thead>
              <tbody>
                {analysis.categoryResults.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-2 font-medium">
                      {result.categoryName}
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      {result.totalQuestions}
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      {result.totalScore}
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      <Badge className={getRiskColor(result.interpretation)}>
                        {result.interpretation}
                      </Badge>
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      {result.nationalAverage.toFixed(1)}
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      <span className={result.difference >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {result.difference > 0 ? '+' : ''}{result.difference.toFixed(1)}
                      </span>
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      {result.simulationAlert && (
                        <Badge variant="destructive" className="text-xs">
                          {result.simulationAlert}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Áreas de Riesgo */}
      {analysis.highRiskAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              🔴 Áreas de Riesgo Detectadas (puntaje promedio alto)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Estas categorías presentan una tendencia de respuestas más permisivas o con menor autocontrol:
            </p>
            <div className="grid grid-cols-1 gap-4">
              {analysis.highRiskAreas.map((area, index) => {
                const result = analysis.categoryResults.find(r => r.categoryName === area);
                const promedio = result ? (result.totalScore / result.totalQuestions).toFixed(1) : '0.0';
                return (
                  <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-800 mb-2">
                      <strong>{area}</strong> (Promedio: {promedio})
                    </div>
                    <div className="text-sm text-red-700">
                      Indica riesgo moderado de priorizar relaciones personales por encima de principios institucionales. 
                      Podría omitir faltas por proteger a compañeros o evitar confrontaciones.
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Áreas por Debajo del Promedio */}
      {analysis.lowScoreAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">🌸 Áreas por Debajo del Promedio Nacional</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Respuestas significativamente más conservadoras o autoexigentes que la media poblacional (estimada en 1.5):
            </p>
            <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="mb-2">
                <strong>{analysis.lowScoreAreas.join(', ')}</strong>, entre otras, están respondidas con valores muy bajos (0 o 1), lo cual podría reflejar:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Alto control personal y respeto a normas.</li>
                <li><strong>O bien, una posible tendencia a la simulación positiva</strong> (responder "lo correcto" más que "lo real").</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">✅ Recomendaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {analysis.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 text-sm">{recommendation}</div>
              </li>
            ))}
          </ul>
          
          <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-lg text-center">
            <div className="font-bold text-green-800 text-lg">
              Recomendación Final: APTO para contratación con observaciones.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamResultsDisplay;

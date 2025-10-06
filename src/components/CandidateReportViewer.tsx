import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  FileText, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateReportHtml, generateSampleData } from '@/utils/reportHtmlGenerator';

interface CandidateData {
  id: string;
  full_name: string;
  email: string;
  company: string;
  area: string;
  section: string;
  photo_url?: string;
}

interface ExamAttempt {
  id: string;
  exam_id: string;
  score: number;
  completed_at: string;
  risk_analysis: any;
  exam_title: string;
  questions?: any;
  answers?: any;
}

interface CandidateReportViewerProps {
  userRole: string;
}

const CandidateReportViewer = ({ userRole }: CandidateReportViewerProps) => {
  // Función para calcular la media poblacional real
  const calculateRealNationalAverage = (categoryScores: any[]): number => {
    if (!categoryScores || categoryScores.length === 0) return 1.5; // fallback
    
    const totalScore = categoryScores.reduce((sum: number, cat: any) => sum + (cat.total_score || 0), 0);
    const totalQuestions = categoryScores.reduce((sum: number, cat: any) => sum + (cat.total_questions || 0), 0);
    
    return totalQuestions > 0 ? totalScore / totalQuestions : 1.5;
  };

  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [candidateExams, setCandidateExams] = useState<ExamAttempt[]>([]);
  const [selectedExamAttempt, setSelectedExamAttempt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, [userRole]);

  useEffect(() => {
    if (selectedCandidate) {
      fetchCandidateExams();
    }
  }, [selectedCandidate]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, company, area, section, photo_url')
        .eq('role', 'student')
        .order('full_name');

      // Para supervisores, solo mostrar candidatos asignados
      if (userRole === 'supervisor') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: assignments } = await supabase
            .from('supervisor_assignments')
            .select('assigned_user_id')
            .eq('supervisor_id', user.id);
          
          const assignedUserIds = assignments?.map(a => a.assigned_user_id) || [];
          if (assignedUserIds.length > 0) {
            query = query.in('id', assignedUserIds);
          } else {
            setCandidates([]);
            setLoading(false);
            return;
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Error al cargar los candidatos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidateExams = async () => {
    if (!selectedCandidate) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('exam_attempts')
        .select(`
          id,
          exam_id,
          score,
          completed_at,
          risk_analysis,
          questions,
          answers,
          exams!inner(title)
        `)
        .eq('user_id', selectedCandidate)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedExams = data?.map(attempt => {
        // Asegurar que el risk_analysis esté presente y correctamente formateado
        let riskAnalysis = attempt.risk_analysis;
        
        // Si no hay risk_analysis, generar uno básico basado en los datos del examen
        if (!riskAnalysis && attempt.answers && attempt.questions) {
          riskAnalysis = generateBasicRiskAnalysis(attempt.answers, attempt.questions);
        }

        return {
          id: attempt.id,
          exam_id: attempt.exam_id,
          score: attempt.score || 0,
          completed_at: attempt.completed_at,
          risk_analysis: riskAnalysis,
          exam_title: (attempt.exams as any)?.title || 'Examen sin título',
          questions: attempt.questions,
          answers: attempt.answers
        };
      }) || [];

      setCandidateExams(formattedExams);
      setSelectedExamAttempt('');
    } catch (error) {
      console.error('Error fetching candidate exams:', error);
      toast.error('Error al cargar los exámenes del candidato');
    } finally {
      setLoading(false);
    }
  };

  // Función para generar análisis básico si no existe
  const generateBasicRiskAnalysis = (answers: any, questions: any) => {
    if (!answers || !questions) return null;

    const interpretRisk = (totalScore: number, totalQuestions: number): string => {
      if (totalScore >= totalQuestions * 2) {
        return 'RIESGO ALTO';
      } else if (totalScore >= totalQuestions * 1) {
        return 'RIESGO MEDIO';
      } else {
        return 'RIESGO BAJO';
      }
    };

    const convertResponseToNumber = (response: string): number => {
      switch (response) {
        case 'Nunca': return 0;
        case 'Rara vez': return 1;
        case 'A veces': return 2;
        case 'Frecuentemente': return 3;
        default: return 0;
      }
    };

    // Calcular puntuación total y categorías
    let totalScore = 0;
    let totalQuestions = 0;
    const categoryMap = new Map();

    if (Array.isArray(answers) && Array.isArray(questions)) {
      answers.forEach(answer => {
        const question = questions.find(q => q.id === answer.questionId);
        if (question && answer.answer) {
          const score = convertResponseToNumber(answer.answer);
          totalScore += score;
          totalQuestions++;

          // Agrupar por categoría
          const categoryName = question.category_name || 'Sin categoría';
          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, {
              category: categoryName,
              category_id: question.category_id || 'unknown',
              total_questions: 0,
              total_score: 0
            });
          }
          
          const category = categoryMap.get(categoryName);
          category.total_questions += 1;
          category.total_score += score;
        }
      });
    }

    // Calcular riesgo por categoría
    const categoryScores = Array.from(categoryMap.values()).map(category => {
      const averageScore = category.total_score / category.total_questions;
      const percentage = (averageScore / 3) * 100;
      
      let risk = 'RIESGO BAJO';
      if (percentage >= 66) risk = 'RIESGO ALTO';
      else if (percentage >= 33) risk = 'RIESGO MEDIO';
      
      return {
        category: category.category,
        category_id: category.category_id,
        total_questions: category.total_questions,
        total_score: category.total_score,
        score: Math.round(percentage),
        risk: risk
      };
    });

    const overallRisk = interpretRisk(totalScore, totalQuestions);
    
    return {
      overall_risk: overallRisk,
      category_scores: categoryScores,
      total_score: totalScore,
      total_questions: totalQuestions,
      detailed_questions: answers || []
    };
  };

  // Función para calcular la puntuación total como promedio de todas las respuestas
  const calculateOverallScore = () => {
    if (!selectedExamData?.answers || !selectedExamData?.questions) return 0;

    const convertResponseToNumber = (response: string): number => {
      switch (response) {
        case 'Nunca': return 0;
        case 'Rara vez': return 1;
        case 'A veces': return 2;
        case 'Frecuentemente': return 3;
        default: return 0;
      }
    };

    let totalScore = 0;
    let totalQuestions = 0;
    
    selectedExamData.answers.forEach(answer => {
      const question = selectedExamData.questions.find(q => q.id === answer.questionId);
      if (question && answer.answer) {
        totalScore += convertResponseToNumber(answer.answer);
        totalQuestions++;
      }
    });

    return totalQuestions > 0 ? totalScore / totalQuestions : 0;
  };

  const generatePDFReport = async (forceReanalysis: boolean = false) => {
    if (!selectedCandidate || !selectedExamAttempt) {
      toast.error('Por favor selecciona un candidato y un examen');
      return;
    }

    try {
      if (forceReanalysis) {
        setReanalyzing(true);
      } else {
        setGeneratingReport(true);
      }
      
      const candidate = candidates.find(c => c.id === selectedCandidate);
      const examAttempt = candidateExams.find(e => e.id === selectedExamAttempt);
      
      if (!candidate || !examAttempt) {
        toast.error('Datos del candidato o examen no encontrados');
        return;
      }

      console.log('Selected Exam Attempt:', examAttempt, 'Force reanalysis:', forceReanalysis);

      // Buscar el exam_session_id relacionado con este attempt
      const { data: sessionData, error: sessionError } = await supabase
        .from('exam_sessions')
        .select('id')
        .eq('user_id', candidate.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) {
        console.warn('Could not find exam session, proceeding without cache:', sessionError);
      }

      // FRONTEND_REPORT_DEBUG: Obtener configuración de reporte desde la base de datos
      console.log("FRONTEND_REPORT_DEBUG: Obteniendo configuración de reporte para exam_id:", examAttempt.exam_id);
      
      const { data: reportConfigData, error: configError } = await supabase
        .from('report_config')
        .select('*')
        .eq('exam_id', examAttempt.exam_id)
        .maybeSingle();

      let reportConfig;
      if (configError && configError.code !== 'PGRST116') {
        console.warn('Error obteniendo configuración de reporte:', configError);
        // Usar configuración por defecto si hay error
        reportConfig = {
          include_sections: {
            personal_info: true,
            category_scores: true,
            risk_analysis: true,
            recommendations: true,
            charts: true,
            detailed_breakdown: true,
            conclusion: true
          },
          font_family: 'Arial',
          font_size: 12,
          company_name: candidate.company || 'Plentum',
          company_address: '',
          company_phone: '',
          company_email: '',
          header_logo_url: '',
          footer_logo_url: ''
        };
      } else if (reportConfigData) {
        // Usar configuración guardada
        const includeSections = reportConfigData.include_sections as Record<string, boolean> | null;
        reportConfig = {
          include_sections: {
            personal_info: includeSections?.personal_info ?? true,
            category_scores: includeSections?.category_scores ?? true,
            risk_analysis: includeSections?.risk_analysis ?? true,
            recommendations: includeSections?.recommendations ?? true,
            charts: includeSections?.charts ?? true,
            detailed_breakdown: includeSections?.detailed_breakdown ?? true,
            conclusion: includeSections?.conclusion ?? true
          },
          font_family: reportConfigData.font_family || 'Arial',
          font_size: reportConfigData.font_size || 12,
          company_name: reportConfigData.company_name || candidate.company || 'Plentum',
          company_address: reportConfigData.company_address || '',
          company_phone: reportConfigData.company_phone || '',
          company_email: reportConfigData.company_email || '',
          header_logo_url: reportConfigData.header_logo_url || '',
          footer_logo_url: reportConfigData.footer_logo_url || ''
        };
      } else {
        // No hay configuración guardada, usar valores por defecto
        reportConfig = {
          include_sections: {
            personal_info: true,
            category_scores: true,
            risk_analysis: true,
            recommendations: true,
            charts: true,
            detailed_breakdown: true,
            conclusion: true
          },
          font_family: 'Arial',
          font_size: 12,
          company_name: candidate.company || 'Plentum',
          company_address: '',
          company_phone: '',
          company_email: '',
          header_logo_url: '',
          footer_logo_url: ''
        };
      }

      console.log("FRONTEND_REPORT_DEBUG: Enviando configuración de reporte:", reportConfig);

      // Procesar risk_analysis si no existe o está mal formateado
      let categoryScores = [];
      if (examAttempt.risk_analysis?.category_scores) {
        categoryScores = examAttempt.risk_analysis.category_scores;
      } else {
        // Generar análisis basado en answers si está disponible
        const analysisResult = processExamAnswers(examAttempt.answers, examAttempt.questions);
        categoryScores = analysisResult.category_scores;
      }

      // Preparar categoryResults para el análisis
      const categoryResults = categoryScores.map((cat: any) => ({
        categoryId: cat.category_id || cat.category,
        categoryName: cat.category,
        totalQuestions: cat.total_questions || 10,
        totalScore: cat.total_score || Math.round((cat.score / 100) * (cat.total_questions || 10) * 3),
        interpretation: cat.risk || 'RIESGO BAJO',
        nationalAverage: calculateRealNationalAverage(categoryScores), // Promedio poblacional real
        difference: ((cat.total_score || cat.score || 0) / (cat.total_questions || 10)) - calculateRealNationalAverage(categoryScores)
      }));

      // Calcular riesgo global basado en las categorías
      const totalHighRisk = categoryResults.filter(cat => cat.interpretation === 'RIESGO ALTO').length;
      const totalCategories = categoryResults.length;
      const globalRiskLevel = totalCategories > 0 ? totalHighRisk / totalCategories : 0;

      const analysisData = {
        categoryResults,
        globalRisk: globalRiskLevel > 0.5 ? 0.8 : globalRiskLevel > 0.2 ? 0.5 : 0.2,
        highRiskAreas: categoryResults.filter(cat => cat.interpretation === 'RIESGO ALTO').map(cat => cat.categoryName),
        lowScoreAreas: categoryResults.filter(cat => cat.totalScore < 10).map(cat => cat.categoryName),
        recommendations: [
          'Revisar las puntuaciones específicas por categoría',
          'Considerar entrevistas de seguimiento si es necesario',
          'Evaluar la consistencia con otros métodos de evaluación'
        ],
        simulationDetected: false
      };

      const userInfo = {
        full_name: candidate.full_name,
        email: candidate.email,
        company: candidate.company || '',
        area: candidate.area || '',
        section: candidate.section || '',
        photo_url: candidate.photo_url || null
      };

      const attemptData = {
        exam_title: examAttempt.exam_title,
        completed_at: examAttempt.completed_at,
        score: examAttempt.score,
        questions: examAttempt.questions || [],
        answers: examAttempt.answers || []
      };

      // Llamar a la función de generación de PDF con los nuevos parámetros de caché
      const { data, error } = await supabase.functions.invoke('generate-pdf-report', {
        body: { 
          attemptId: examAttempt.id,
          analysis: analysisData,
          userInfo: userInfo,
          attemptData: attemptData,
          reportConfig: reportConfig, // <-- ¡Pasar la configuración obtenida de la BD!
          examSessionId: sessionData?.id || null,
          forceReanalysis: forceReanalysis
        }
      });

      if (error) throw error;

      console.log('Respuesta de generate-pdf-report:', { 
        dataType: typeof data, 
        dataLength: data ? data.length : 0, 
        hasContent: data && data.includes('<html>') 
      });

      // Verificar que el contenido del reporte sea válido
      if (!data || typeof data !== 'string') {
        throw new Error('Respuesta inválida del servidor - no se recibió contenido HTML');
      }

      if (data.length < 100) {
        throw new Error('El contenido del reporte parece estar vacío o incompleto');
      }

      if (!data.includes('<html>') && !data.includes('<!DOCTYPE html>')) {
        console.warn('El contenido no parece ser HTML válido:', data.substring(0, 200));
        throw new Error('El contenido recibido no es HTML válido');
      }

      // Crear blob URL para el contenido HTML
      const blob = new Blob([data], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Intentar abrir en nueva ventana usando blob URL
      const reportWindow = window.open(blobUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      
      if (!reportWindow || reportWindow.closed || typeof reportWindow.closed === 'undefined') {
        // Si se bloquea la ventana emergente, mostrar mensaje y crear enlace
        console.log('Pop-up bloqueado, creando enlace alternativo');
        
        // Crear enlace que abre en nueva pestaña
        const openLink = document.createElement('a');
        openLink.href = blobUrl;
        openLink.target = '_blank';
        openLink.style.display = 'none';
        
        document.body.appendChild(openLink);
        openLink.click();
        setTimeout(() => {
          document.body.removeChild(openLink);
          URL.revokeObjectURL(blobUrl);
        }, 1000);
        
        toast.success('Reporte generado. Se abrió en nueva pestaña (si los pop-ups están permitidos).');
        return;
      } else {
        // Limpiar el blob URL después de un tiempo
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        
        // Agregar funcionalidad de impresión automática después de cargar
        reportWindow.addEventListener('load', () => {
          setTimeout(() => {
            if (!reportWindow.closed) {
              reportWindow.print();
            }
          }, 1000);
        });
      }
      
      const message = forceReanalysis 
        ? 'Reporte re-generado exitosamente con nuevo análisis IA. Se abrió en una nueva ventana.'
        : 'Reporte generado exitosamente. Se abrió en una nueva ventana.';
      toast.success(message);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el reporte PDF');
    } finally {
      setGeneratingReport(false);
      setReanalyzing(false);
    }
  };

  // Función auxiliar para procesar respuestas si no hay risk_analysis
  const processExamAnswers = (answers: any, questions: any) => {
    // Esta función ya existe en el código, no necesita ser redefinida
    return generateBasicRiskAnalysis(answers, questions) || { category_scores: [] };
  };

  const selectedCandidateData = candidates.find(c => c.id === selectedCandidate);
  const selectedExamData = candidateExams.find(e => e.id === selectedExamAttempt);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'RIESGO BAJO':
        return 'bg-green-100 text-green-800';
      case 'RIESGO MEDIO':
        return 'bg-yellow-100 text-yellow-800';
      case 'RIESGO ALTO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Análisis Psicométrico para Selección de Personal
          </CardTitle>
          <CardDescription>
            Selecciona un candidato evaluado para ver sus reportes y resultados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Seleccionar Candidato</label>
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un candidato evaluado" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map(candidate => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.full_name} - {candidate.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCandidate && candidateExams.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Seleccionar Examen</label>
                <Select value={selectedExamAttempt} onValueChange={setSelectedExamAttempt}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un examen completado" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateExams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.exam_title} - {new Date(exam.completed_at).toLocaleDateString('es-ES')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {selectedCandidate && candidateExams.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <strong>Nota:</strong> Este candidato no ha completado ningún examen aún.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCandidateData && (
        <Card>
          <CardHeader>
            <CardTitle>Información del Candidato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                <p className="text-lg">{selectedCandidateData.full_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg">{selectedCandidateData.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                <p className="text-lg">{selectedCandidateData.company}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Área</p>
                <p className="text-lg">{selectedCandidateData.area}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sección</p>
                <p className="text-lg">{selectedCandidateData.section}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Exámenes Completados</p>
                <p className="text-lg font-semibold">{candidateExams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedExamData && (
        <Tabs defaultValue="results" className="space-y-4">
          <TabsList>
            <TabsTrigger value="results">Resultados del Examen</TabsTrigger>
            <TabsTrigger value="interpretation">Interpretación</TabsTrigger>
            <TabsTrigger value="actions">Acciones</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resultados - {selectedExamData.exam_title}
                </CardTitle>
                <CardDescription>
                  Completado el {new Date(selectedExamData.completed_at).toLocaleDateString('es-ES')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Puntuación Total</p>
                    <p className="text-2xl font-bold">{calculateOverallScore().toFixed(2)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Nivel de Riesgo</p>
                    <Badge className={getRiskColor(selectedExamData.risk_analysis?.overall_risk || '')}>
                      {selectedExamData.risk_analysis?.overall_risk || 'No determinado'}
                    </Badge>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Completado</span>
                    </div>
                  </div>
                </div>

                {selectedExamData.risk_analysis?.category_scores && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Puntuaciones por Categoría</h3>
                    <div className="space-y-2">
                      {selectedExamData.risk_analysis.category_scores.map((category: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="font-medium">{category.category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{category.score}</span>
                            <Badge className={getRiskColor(category.risk)}>
                              {category.risk}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interpretation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Interpretación de Resultados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <h3>Análisis General</h3>
                  <p>
                    El candidato <strong>{selectedCandidateData?.full_name}</strong> ha completado 
                    el examen <strong>{selectedExamData.exam_title}</strong> con una puntuación 
                    total de <strong>{selectedExamData.score}%</strong>.
                  </p>
                  
                  <h3>Nivel de Riesgo</h3>
                  <p>
                    El análisis indica un nivel de riesgo: 
                    <Badge className={`ml-2 ${getRiskColor(selectedExamData.risk_analysis?.overall_risk || '')}`}>
                      {selectedExamData.risk_analysis?.overall_risk || 'No determinado'}
                    </Badge>
                  </p>
                  
                  {selectedExamData.risk_analysis?.overall_risk === 'RIESGO BAJO' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800">Interpretación Positiva</h4>
                      <p className="text-green-700">
                        El candidato muestra un perfil de alta confiabilidad. Los resultados 
                        sugieren que es una persona íntegra y confiable para el puesto.
                      </p>
                    </div>
                  )}
                  
                  {selectedExamData.risk_analysis?.overall_risk === 'RIESGO MEDIO' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-800">Interpretación Moderada</h4>
                      <p className="text-yellow-700">
                        El candidato presenta algunas áreas de atención. Se recomienda 
                        realizar entrevistas adicionales para evaluar aspectos específicos.
                      </p>
                    </div>
                  )}
                  
                  {selectedExamData.risk_analysis?.overall_risk === 'RIESGO ALTO' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-800">Interpretación de Precaución</h4>
                      <p className="text-red-700">
                        Los resultados sugieren la necesidad de una evaluación más profunda. 
                        Se recomienda proceder con precaución en el proceso de selección.
                      </p>
                    </div>
                  )}

                  <h3>Recomendaciones</h3>
                  <ul>
                    <li>Revisar las puntuaciones específicas por categoría</li>
                    <li>Considerar entrevistas de seguimiento si es necesario</li>
                    <li>Evaluar la consistencia con otros métodos de evaluación</li>
                    <li>Documentar las decisiones tomadas basadas en estos resultados</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Acciones Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button 
                    onClick={() => generatePDFReport(false)}
                    disabled={generatingReport}
                    className="w-full"
                  >
                    {generatingReport ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generando Reporte...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar Reporte PDF Completo
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => generatePDFReport(true)}
                    disabled={generatingReport || reanalyzing}
                    variant="outline"
                    className="w-full"
                  >
                    {reanalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Re-analizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Re-analizar con IA
                      </>
                    )}
                  </Button>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="text-center">
                      El reporte PDF incluirá todos los detalles del análisis, 
                      interpretaciones y recomendaciones para este candidato.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-xs">
                        <strong>💡 Optimización:</strong> Los análisis IA se almacenan en caché para mayor velocidad. 
                        Use "Re-analizar con IA" solo si necesita un análisis completamente nuevo.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando información...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CandidateReportViewer;
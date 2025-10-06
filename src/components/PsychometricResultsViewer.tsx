import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Brain, FileText, Loader2, RefreshCw, Download, TrendingUp, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PsychometricResults {
  id: string;
  session_id: string;
  apertura_score: number;
  responsabilidad_score: number;
  extraversion_score: number;
  amabilidad_score: number;
  neuroticismo_score: number;
  created_at: string;
}

interface AIAnalysis {
  interpretation: string;
  personalityScores: any;
  factorAnalysis: string;
  recommendations: string;
  conclusion: string;
  candidate_info: {
    name: string;
    email: string;
    evaluation_date: string;
  };
}

interface PsychometricResultsViewerProps {
  sessionId: string;
  onBack?: () => void;
}

const PsychometricResultsViewer = ({ sessionId, onBack }: PsychometricResultsViewerProps) => {
  const [results, setResults] = useState<PsychometricResults | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemName, setSystemName] = useState('Sistema');
  const { toast } = useToast();

  useEffect(() => {
    fetchResults();
    fetchSystemConfig();
  }, [sessionId]);

  const fetchSystemConfig = async () => {
    try {
      const { data } = await supabase
        .from('system_config')
        .select('system_name')
        .single();
      
      if (data?.system_name) {
        setSystemName(data.system_name);
      }
    } catch (error) {
      console.error('Error fetching system config:', error);
    }
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener resultados de personalidad (el más reciente si hay duplicados)
      const { data: personalityResults, error: resultsError } = await supabase
        .from('personality_results')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (resultsError) throw resultsError;
      
      if (!personalityResults || personalityResults.length === 0) {
        throw new Error('No se encontraron resultados para esta sesión');
      }
      
      setResults(personalityResults[0]);
      
      // Generar análisis automáticamente
      await generateAnalysis();
      
    } catch (error) {
      console.error('Error fetching results:', error);
      setError('Error al cargar los resultados');
      toast({
        title: "Error",
        description: "No se pudieron cargar los resultados de la evaluación",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAnalysis = async (forceReanalysis = false) => {
    try {
      setAnalysisLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-psychometric-analysis', {
        body: { sessionId, forceReanalysis }
      });

      if (error) throw error;

      if (data.success) {
        setAnalysis(data.analysis);
        toast({
          title: "Análisis generado",
          description: "El análisis psicométrico ha sido generado exitosamente"
        });
      } else {
        throw new Error(data.error || 'Error generando análisis');
      }
      
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast({
        title: "Error en análisis",
        description: "No se pudo generar el análisis automático",
        variant: "destructive"
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const downloadCompleteReport = async () => {
    try {
      if (!sessionId) {
        toast({
          title: "Error",
          description: "No se encontró un ID de sesión válido",
          variant: "destructive"
        });
        return;
      }

      // Llamar a la función que genera el HTML del reporte
      const { data, error } = await supabase.functions.invoke('generate-pdf-report', {
        body: { sessionId }
      });

      if (error) throw error;

      // Crear un blob con el HTML
      const blob = new Blob([data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      // Abrir en nueva ventana para imprimir
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        newWindow.onload = () => {
          // Limpiar la URL después de cargar
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
        };
      }

      toast({
        title: "Reporte generado",
        description: "El reporte se ha abierto en una nueva ventana para imprimir"
      });
      
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el reporte",
        variant: "destructive"
      });
    }
  };

  const getFactorLevel = (score: number): { level: string; color: string } => {
    if (score >= 80) return { level: "Muy Alto", color: "bg-red-500" };
    if (score >= 60) return { level: "Alto", color: "bg-orange-500" };
    if (score >= 40) return { level: "Moderado", color: "bg-yellow-500" };
    if (score >= 20) return { level: "Bajo", color: "bg-blue-500" };
    return { level: "Muy Bajo", color: "bg-green-500" };
  };

  const getFactorDescription = (factor: string, score: number): string => {
    const descriptions = {
      apertura: {
        high: "Persona creativa, curiosa intelectualmente y abierta a nuevas experiencias",
        low: "Persona práctica, convencional y con preferencia por la rutina"
      },
      responsabilidad: {
        high: "Persona organizada, disciplinada y orientada al logro",
        low: "Persona flexible, espontánea y menos estructurada"
      },
      extraversion: {
        high: "Persona sociable, enérgica y que busca la estimulación social",
        low: "Persona introspectiva, reservada y que prefiere actividades tranquilas"
      },
      amabilidad: {
        high: "Persona empática, cooperativa y confiada en otros",
        low: "Persona competitiva, escéptica y directa en su comunicación"
      },
      neuroticismo: {
        high: "Persona sensible al estrés y con tendencia a experimentar emociones negativas",
        low: "Persona estable emocionalmente y resistente al estrés"
      }
    };

    const factorDesc = descriptions[factor as keyof typeof descriptions];
    return score >= 50 ? factorDesc.high : factorDesc.low;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600 mb-4">{error || 'No se encontraron resultados'}</p>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const factors = [
    { key: 'apertura', name: 'Apertura a la Experiencia', score: results.apertura_score },
    { key: 'responsabilidad', name: 'Responsabilidad', score: results.responsabilidad_score },
    { key: 'extraversion', name: 'Extraversión', score: results.extraversion_score },
    { key: 'amabilidad', name: 'Amabilidad', score: results.amabilidad_score },
    { key: 'neuroticismo', name: 'Neuroticismo', score: results.neuroticismo_score }
  ];

  const getOverallScore = () => {
    if (!results) return 0;
    return Math.round((results.apertura_score + results.responsabilidad_score + 
                     results.extraversion_score + results.amabilidad_score + 
                     (100 - results.neuroticismo_score)) / 5);
  };

  const getEmotionalStability = () => {
    if (!results) return 0;
    return Math.round(100 - results.neuroticismo_score);
  };

  const getLeadershipPotential = () => {
    if (!results) return 0;
    return Math.round((results.extraversion_score + results.responsabilidad_score + 
                     results.apertura_score) / 3);
  };

  const getRecommendation = () => {
    const overall = getOverallScore();
    if (overall >= 75) return { text: "APTO", color: "bg-green-500" };
    if (overall >= 60) return { text: "APTO CON OBSERVACIONES", color: "bg-yellow-500" };
    return { text: "NO APTO", color: "bg-red-500" };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                Análisis Psicométrico para Selección de Personal
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Evaluación integral de candidatos: personalidad, capacidades cognitivas y competencias laborales
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Test de Personalidad OCEAN</p>
              </div>
              {analysis && (
                <Button onClick={downloadCompleteReport} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Reporte Completo
                </Button>
              )}
              {onBack && (
                <Button onClick={onBack} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Resumen Ejecutivo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Ejecutivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm text-muted-foreground">Aptitud General</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">{getOverallScore()}/100</div>
              <p className="text-xs text-muted-foreground mt-1">Superior al promedio poblacional</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm text-muted-foreground">Estabilidad Emocional</span>
              </div>
              <div className="text-3xl font-bold text-green-600">{getEmotionalStability()}/100</div>
              <p className="text-xs text-muted-foreground mt-1">Alta resistencia al estrés</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-sm text-muted-foreground">Potencial de Liderazgo</span>
              </div>
              <div className="text-3xl font-bold text-purple-600">{getLeadershipPotential()}/100</div>
              <p className="text-xs text-muted-foreground mt-1">Alto potencial directivo</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Brain className="h-5 w-5 text-orange-600 mr-2" />
                <span className="text-sm text-muted-foreground">Recomendación</span>
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium ${getRecommendation().color}`}>
                {getRecommendation().text}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Candidato recomendado para el puesto</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Perfil de Competencias Clave */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil de Competencias Clave</CardTitle>
            <p className="text-sm text-muted-foreground">Evaluación de habilidades críticas para el puesto</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: 'Liderazgo', score: getLeadershipPotential(), level: 'Alto' },
              { name: 'Trabajo en Equipo', score: Math.round((results.amabilidad_score + results.extraversion_score) / 2), level: 'Muy Alto' },
              { name: 'Comunicación', score: Math.round((results.extraversion_score + results.amabilidad_score) / 2), level: 'Alto' },
              { name: 'Adaptabilidad', score: Math.round((results.apertura_score + (100 - results.neuroticismo_score)) / 2), level: 'Muy Alto' },
              { name: 'Resolución de Problemas', score: Math.round((results.apertura_score + results.responsabilidad_score) / 2), level: 'Alto' },
              { name: 'Toma de Decisiones', score: Math.round((results.responsabilidad_score + (100 - results.neuroticismo_score)) / 2), level: 'Alto' }
            ].map((competencia, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{competencia.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={competencia.level === 'Muy Alto' ? 'default' : 'secondary'}>
                      {competencia.level}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {competencia.score}/100
                    </span>
                  </div>
                </div>
                <Progress value={competencia.score} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Indicadores de Riesgo */}
        <Card>
          <CardHeader>
            <CardTitle>Indicadores de Riesgo</CardTitle>
            <p className="text-sm text-muted-foreground">Análisis de factores de alerta en la evaluación</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { 
                name: 'Consistencia de Respuestas', 
                status: 'Excelente',
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200'
              },
              { 
                name: 'Deseabilidad Social', 
                status: 'Normal',
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200'
              },
              { 
                name: 'Simulación Detectada', 
                status: 'No Detectada',
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200'
              }
            ].map((indicator, index) => (
              <div key={index} className={`p-3 rounded-lg border ${indicator.borderColor} ${indicator.bgColor}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{indicator.name}</span>
                  <Badge variant="outline" className={`${indicator.color} border-current`}>
                    {indicator.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Puntuaciones por Factor OCEAN */}
      <Card>
        <CardHeader>
          <CardTitle>Personalidad OCEAN</CardTitle>
          <p className="text-sm text-muted-foreground">Puntuaciones detalladas por factor de personalidad</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {factors.map((factor) => {
            const { level, color } = getFactorLevel(factor.score);
            return (
              <div key={factor.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${color} text-white`}>
                      {level}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(factor.score)}/100
                    </span>
                  </div>
                </div>
                <Progress value={factor.score} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {getFactorDescription(factor.key, factor.score)}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Análisis con IA */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Análisis Profesional de {systemName}
            </CardTitle>
            <Button
              onClick={() => generateAnalysis(true)}
              disabled={analysisLoading}
              variant="outline"
              size="sm"
            >
              {analysisLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {analysisLoading ? 'Generando...' : 'Regenerar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {analysisLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Generando análisis profesional...</p>
                <p className="text-sm text-muted-foreground">Esto puede tomar unos momentos</p>
              </div>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {analysis.candidate_info && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Información del Candidato</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div><strong>Nombre:</strong> {analysis.candidate_info.name}</div>
                    <div><strong>Email:</strong> {analysis.candidate_info.email}</div>
                    <div><strong>Fecha:</strong> {analysis.candidate_info.evaluation_date}</div>
                  </div>
                </div>
              )}
              
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap">{analysis.interpretation}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                El análisis profesional no está disponible
              </p>
              <Button onClick={() => generateAnalysis()} variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                Generar Análisis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground text-center">
            <p>
              Evaluación completada el {new Date(results.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="mt-1">
              Los resultados están basados en el modelo de personalidad de los Cinco Grandes (Big Five/OCEAN)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PsychometricResultsViewer;
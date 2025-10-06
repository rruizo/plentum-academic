import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface PersonalityResult {
  id: string;
  session_id: string;
  apertura_score: number;
  responsabilidad_score: number;
  extraversion_score: number;
  amabilidad_score: number;
  neuroticismo_score: number;
  ai_interpretation?: any;
  created_at: string;
}

interface PersonalityResultsViewerProps {
  sessionId: string;
  onBack: () => void;
}

const PersonalityResultsViewer = ({ sessionId, onBack }: PersonalityResultsViewerProps) => {
  const [results, setResults] = useState<PersonalityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchResults();
  }, [sessionId]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('personality_results')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;
      setResults(data);
    } catch (error) {
      console.error('Error al cargar resultados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los resultados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getFactorLevel = (score: number): { level: string; color: string; icon: React.ReactNode } => {
    if (score >= 80) return { level: 'Muy Alto', color: 'text-green-600', icon: <TrendingUp className="h-4 w-4" /> };
    if (score >= 60) return { level: 'Alto', color: 'text-green-500', icon: <TrendingUp className="h-4 w-4" /> };
    if (score >= 40) return { level: 'Medio', color: 'text-yellow-600', icon: <Minus className="h-4 w-4" /> };
    if (score >= 20) return { level: 'Bajo', color: 'text-orange-500', icon: <TrendingDown className="h-4 w-4" /> };
    return { level: 'Muy Bajo', color: 'text-red-500', icon: <TrendingDown className="h-4 w-4" /> };
  };

  const getPercentile = (score: number): number => {
    // Simulación de percentiles basados en distribución normal
    return Math.round(score);
  };

  const getFactorDescription = (factor: string, score: number): string => {
    const level = getFactorLevel(score).level;
    
    const descriptions: Record<string, Record<string, string>> = {
      apertura: {
        'Muy Alto': 'Extremadamente creativo, imaginativo y abierto a nuevas experiencias. Busca constantemente novedad y variedad.',
        'Alto': 'Muy creativo e imaginativo. Disfruta del arte, las ideas abstractas y las nuevas experiencias.',
        'Medio': 'Equilibrio entre convencional e innovador. Aprecia tanto la tradición como la novedad.',
        'Bajo': 'Prefiere lo familiar y tradicional. Más práctico que imaginativo.',
        'Muy Bajo': 'Muy convencional y tradicional. Prefiere rutinas establecidas y evita lo desconocido.'
      },
      responsabilidad: {
        'Muy Alto': 'Extremadamente organizado, confiable y autodisciplinado. Siempre cumple compromisos y busca la perfección.',
        'Alto': 'Muy organizado y confiable. Planifica cuidadosamente y cumple sus responsabilidades.',
        'Medio': 'Moderadamente organizado. Equilibrio entre espontaneidad y planificación.',
        'Bajo': 'Tendencia a ser desorganizado y a postergar tareas. Prefiere la espontaneidad.',
        'Muy Bajo': 'Muy desorganizado y poco confiable. Dificultad para cumplir compromisos y plazos.'
      },
      extraversion: {
        'Muy Alto': 'Extremadamente sociable, enérgico y asertivo. Busca constantemente estimulación social.',
        'Alto': 'Muy sociable y enérgico. Disfruta estar con otros y ser el centro de atención.',
        'Medio': 'Equilibrio entre introversión y extraversión. Disfruta tanto la soledad como la compañía.',
        'Bajo': 'Prefiere actividades tranquilas y grupos pequeños. Más reservado en situaciones sociales.',
        'Muy Bajo': 'Muy introvertido y reservado. Prefiere la soledad y evita situaciones sociales intensas.'
      },
      amabilidad: {
        'Muy Alto': 'Extremadamente compasivo, confiado y cooperativo. Siempre pone las necesidades de otros primero.',
        'Alto': 'Muy empático y cooperativo. Confía en otros y busca ayudar cuando es posible.',
        'Medio': 'Equilibrio entre cooperación y competencia. Generalmente compasivo pero también asertivo.',
        'Bajo': 'Tendencia a ser competitivo y escéptico. Prioriza sus propios intereses.',
        'Muy Bajo': 'Muy competitivo y desconfiado. Enfoque principalmente en beneficio personal.'
      },
      neuroticismo: {
        'Muy Alto': 'Muy propenso a experimentar emociones negativas. Alta ansiedad y vulnerabilidad al estrés.',
        'Alto': 'Frecuentemente experimenta ansiedad y preocupación. Sensible al estrés.',
        'Medio': 'Estabilidad emocional moderada. Ocasionalmente experimenta ansiedad o estrés.',
        'Bajo': 'Generalmente calmado y emocionalmente estable. Maneja bien el estrés.',
        'Muy Bajo': 'Extremadamente calmado y estable emocionalmente. Rara vez experimenta ansiedad o estrés.'
      }
    };

    return descriptions[factor]?.[level] || 'Descripción no disponible';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Generando tu perfil de personalidad...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>No se encontraron resultados para esta sesión.</p>
          <Button onClick={onBack} className="mt-4">
            Volver
          </Button>
        </CardContent>
      </Card>
    );
  }

  const radarData = [
    { factor: 'Apertura', score: results.apertura_score, fullMark: 100 },
    { factor: 'Responsabilidad', score: results.responsabilidad_score, fullMark: 100 },
    { factor: 'Extraversión', score: results.extraversion_score, fullMark: 100 },
    { factor: 'Amabilidad', score: results.amabilidad_score, fullMark: 100 },
    { factor: 'Neuroticismo', score: results.neuroticismo_score, fullMark: 100 }
  ];

  const barData = radarData.map(item => ({
    ...item,
    percentile: getPercentile(item.score)
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Análisis de Personalidad OCEAN</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Evaluación completada el {new Date(results.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil de los Cinco Grandes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="factor" />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={false}
                />
                <Radar
                  name="Puntuación"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras */}
        <Card>
          <CardHeader>
            <CardTitle>Puntuaciones por Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="factor" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar 
                  dataKey="score" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Desglose Detallado */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis Detallado por Factor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { name: 'Apertura a la Experiencia', key: 'apertura', score: results.apertura_score },
            { name: 'Responsabilidad', key: 'responsabilidad', score: results.responsabilidad_score },
            { name: 'Extraversión', key: 'extraversion', score: results.extraversion_score },
            { name: 'Amabilidad', key: 'amabilidad', score: results.amabilidad_score },
            { name: 'Neuroticismo', key: 'neuroticismo', score: results.neuroticismo_score }
          ].map((factor) => {
            const { level, color, icon } = getFactorLevel(factor.score);
            const percentile = getPercentile(factor.score);
            
            return (
              <div key={factor.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{factor.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${color} flex items-center gap-1`}>
                      {icon}
                      {level}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Percentil {percentile}
                    </span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Puntuación: {Math.round(factor.score)}/100</span>
                  </div>
                  <Progress value={factor.score} className="h-2" />
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {getFactorDescription(factor.key, factor.score)}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Resumen e Implicaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Perfil de Personalidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-600 mb-2">Fortalezas Principales</h4>
              <ul className="space-y-1 text-sm">
                {barData
                  .filter(item => item.score >= 60)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3)
                  .map(item => (
                    <li key={item.factor} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {item.factor} ({Math.round(item.score)}/100)
                    </li>
                  ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-orange-600 mb-2">Áreas de Atención</h4>
              <ul className="space-y-1 text-sm">
                {barData
                  .filter(item => item.score < 40)
                  .sort((a, b) => a.score - b.score)
                  .slice(0, 3)
                  .map(item => (
                    <li key={item.factor} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      {item.factor} ({Math.round(item.score)}/100)
                    </li>
                  ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Implicaciones para el Desarrollo Profesional</h4>
            <p className="text-sm text-blue-700">
              Este perfil de personalidad puede ser especialmente valioso para identificar roles y entornos 
              de trabajo que se alineen con tus fortalezas naturales, así como para desarrollar estrategias 
              de crecimiento personal y profesional.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalityResultsViewer;
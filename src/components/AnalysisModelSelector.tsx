import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Save, Brain, Zap, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnalysisResult {
  id: string;
  model: string;
  analysis: any;
  generated_at: string;
  temporary: boolean;
}

interface AnalysisModelSelectorProps {
  sessionId: string;
  analysisType: 'ocean' | 'reliability';
  onAnalysisGenerated: (analysis: any) => void;
  existingAnalysis?: any;
}

// Modelos disponibles con sus características
const availableModels = [
  { 
    value: 'gpt-5-2025-08-07', 
    label: 'GPT-5', 
    description: 'Modelo más avanzado',
    icon: <Brain className="h-4 w-4" />,
    variant: 'default' as const
  },
  { 
    value: 'gpt-5-mini-2025-08-07', 
    label: 'GPT-5 Mini', 
    description: 'Rápido y eficiente',
    icon: <Zap className="h-4 w-4" />,
    variant: 'secondary' as const
  },
  { 
    value: 'gpt-4.1-2025-04-14', 
    label: 'GPT-4.1', 
    description: 'Confiable y estable',
    icon: <Clock className="h-4 w-4" />,
    variant: 'outline' as const
  },
  { 
    value: 'o3-2025-04-16', 
    label: 'O3 Reasoning', 
    description: 'Análisis profundo',
    icon: <Brain className="h-4 w-4" />,
    variant: 'default' as const
  },
  { 
    value: 'o4-mini-2025-04-16', 
    label: 'O4 Mini', 
    description: 'Razonamiento rápido',
    icon: <Zap className="h-4 w-4" />,
    variant: 'secondary' as const
  }
];

const AnalysisModelSelector = ({ 
  sessionId, 
  analysisType, 
  onAnalysisGenerated, 
  existingAnalysis 
}: AnalysisModelSelectorProps) => {
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-2025-04-14');
  const [temporaryAnalyses, setTemporaryAnalyses] = useState<AnalysisResult[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const generateAnalysis = async () => {
    try {
      setGenerating(true);
      
      const functionName = analysisType === 'ocean' 
        ? 'generate-psychometric-analysis' 
        : 'generate-reliability-analysis';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          sessionId, 
          forceReanalysis: true,
          selectedModel,
          temporary: true // Marcar como temporal
        }
      });

      if (error) throw error;

      if (data.success) {
        const newAnalysis: AnalysisResult = {
          id: crypto.randomUUID(),
          model: selectedModel,
          analysis: data.analysis,
          generated_at: new Date().toISOString(),
          temporary: true
        };

        setTemporaryAnalyses(prev => [...prev, newAnalysis]);
        
        toast.success(`Análisis generado con ${selectedModel}`);
      } else {
        throw new Error(data.error || 'Error generando análisis');
      }
      
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast.error('Error al generar análisis temporal');
    } finally {
      setGenerating(false);
    }
  };

  const saveAnalysis = async (analysisId: string) => {
    const analysis = temporaryAnalyses.find(a => a.id === analysisId);
    if (!analysis) return;

    try {
      setSavingId(analysisId);

      const { error } = await supabase.functions.invoke('save-analysis-to-cache', {
        body: {
          sessionId,
          analysisType,
          analysis: analysis.analysis,
          model: analysis.model
        }
      });

      if (error) throw error;

      // Remover de temporales y notificar
      setTemporaryAnalyses(prev => prev.filter(a => a.id !== analysisId));
      onAnalysisGenerated(analysis.analysis);
      
      toast.success('Análisis guardado exitosamente');
      
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast.error('Error al guardar análisis');
    } finally {
      setSavingId(null);
    }
  };

  const deleteAnalysis = (analysisId: string) => {
    setTemporaryAnalyses(prev => prev.filter(a => a.id !== analysisId));
    toast.success('Análisis temporal eliminado');
  };

  return (
    <div className="space-y-6">
      {/* Selector de modelo y generación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Generar Análisis con IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Seleccionar modelo:</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex items-center gap-2">
                      {model.icon}
                      <div>
                        <div className="font-medium">{model.label}</div>
                        <div className="text-xs text-muted-foreground">{model.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={generateAnalysis}
            disabled={generating}
            className="w-full"
          >
            {generating ? 'Generando análisis...' : `Generar con ${availableModels.find(m => m.value === selectedModel)?.label}`}
          </Button>
        </CardContent>
      </Card>

      {/* Análisis existente */}
      {existingAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">✅ Análisis Guardado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Análisis principal</p>
                <p className="text-sm text-muted-foreground">
                  Generado: {existingAnalysis.generated_at ? new Date(existingAnalysis.generated_at).toLocaleString() : 'Fecha no disponible'}
                </p>
              </div>
              <Badge variant="default">Actual</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Análisis temporales para comparación */}
      {temporaryAnalyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>⚡ Análisis Temporales para Comparación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {temporaryAnalyses.map((analysis) => {
              const modelInfo = availableModels.find(m => m.value === analysis.model);
              
              return (
                <div key={analysis.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {modelInfo?.icon}
                      <span className="font-medium">{modelInfo?.label}</span>
                      <Badge variant={modelInfo?.variant || 'outline'}>
                        Temporal
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveAnalysis(analysis.id)}
                        disabled={savingId === analysis.id}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {savingId === analysis.id ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAnalysis(analysis.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    Generado: {new Date(analysis.generated_at).toLocaleString()}
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                    <strong>Vista previa:</strong>
                    <p className="mt-1">
                      {typeof analysis.analysis.interpretation === 'string' 
                        ? analysis.analysis.interpretation.substring(0, 200) + '...'
                        : 'Análisis generado exitosamente'}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {temporaryAnalyses.length > 0 && (
              <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
                💡 <strong>Tip:</strong> Los análisis temporales te permiten comparar diferentes modelos. 
                Guarda el que más te convenga para reemplazar el análisis principal.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalysisModelSelector;

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calculator, CheckCircle, AlertCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  nombre: string;
}

interface ExamQuestionCounterProps {
  categories: Category[];
  questionsPerCategory: Record<string, number>;
  onCategoryChange: (categoryId: string, count: number) => void;
  estimatedDuration?: number;
}

const ExamQuestionCounter = ({ 
  categories, 
  questionsPerCategory, 
  onCategoryChange, 
  estimatedDuration 
}: ExamQuestionCounterProps) => {
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [validConfigs, setValidConfigs] = useState(0);
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    calculateTotals();
  }, [questionsPerCategory]);

  const calculateTotals = () => {
    let total = 0;
    let valid = 0;
    let errors = false;

    Object.entries(questionsPerCategory).forEach(([categoryId, count]) => {
      if (count > 0) {
        total += count;
        valid++;
        // For now, we assume all configurations are valid
        // This could be enhanced with actual available question counts
      }
    });

    setTotalQuestions(total);
    setValidConfigs(valid);
    setHasErrors(errors);
  };

  const getStatusColor = () => {
    if (hasErrors) return 'destructive';
    if (totalQuestions === 0) return 'secondary';
    return 'default';
  };

  const getStatusIcon = () => {
    if (hasErrors) return <AlertCircle className="h-4 w-4" />;
    if (totalQuestions > 0 && !hasErrors) return <CheckCircle className="h-4 w-4" />;
    return <Calculator className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (hasErrors) return 'Configuración con errores';
    if (totalQuestions === 0) return 'Sin preguntas configuradas';
    return 'Configuración válida';
  };

  const getRecommendedDuration = () => {
    // 1.5 minutos por pregunta + 15 minutos de buffer
    return Math.max(Math.ceil(totalQuestions * 1.5) + 15, 30);
  };

  const getDurationStatus = () => {
    if (!estimatedDuration || totalQuestions === 0) return 'neutral';
    
    const recommended = getRecommendedDuration();
    const difference = estimatedDuration - recommended;
    
    if (difference < -10) return 'too-short';
    if (difference > 30) return 'too-long';
    return 'good';
  };

  const getDurationColor = () => {
    const status = getDurationStatus();
    switch (status) {
      case 'too-short': return 'text-red-600';
      case 'too-long': return 'text-yellow-600';
      case 'good': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          Contador de Preguntas en Tiempo Real
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen principal */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-primary">{totalQuestions}</p>
            <p className="text-sm text-muted-foreground">Preguntas totales</p>
          </div>
          <Badge variant={getStatusColor()} className="flex items-center gap-1">
            {getStatusText()}
          </Badge>
        </div>

        {/* Progreso de configuración */}
        {categories.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Categorías configuradas</span>
              <span>{validConfigs} de {categories.length}</span>
            </div>
            <Progress 
              value={categories.length > 0 ? (validConfigs / categories.length) * 100 : 0} 
              className="h-2"
            />
          </div>
        )}

        {/* Detalles por categoría */}
        {categories.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Desglose por categoría:</h4>
            <div className="space-y-1">
              {categories.map((category) => {
                const count = questionsPerCategory[category.id] || 0;
                return (
                  <div key={category.id} className="flex justify-between items-center text-sm">
                    <span>{category.nombre || category.name}</span>
                    <div className="flex items-center gap-2">
                      <span>{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Información de duración */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Duración recomendada:</span>
            <span className="text-sm font-mono">{getRecommendedDuration()} min</span>
          </div>
          
          {estimatedDuration && totalQuestions > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Duración configurada:</span>
              <span className={`text-sm font-mono ${getDurationColor()}`}>
                {estimatedDuration} min
              </span>
            </div>
          )}
          
          {estimatedDuration && totalQuestions > 0 && (
            <div className="text-xs text-muted-foreground">
              {getDurationStatus() === 'too-short' && '⚠️ Duración muy corta para el número de preguntas'}
              {getDurationStatus() === 'too-long' && '⚠️ Duración excesiva para el número de preguntas'}
              {getDurationStatus() === 'good' && '✅ Duración apropiada'}
            </div>
          )}
        </div>

        {/* Consejos */}
        {totalQuestions > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Consejo:</strong> Se recomienda 1.5 minutos por pregunta más 15 minutos adicionales para lectura e instrucciones.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExamQuestionCounter;

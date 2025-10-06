import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { ExamService } from '@/services/examService';

interface ExamValidationWarningProps {
  examId: string;
  onValidationComplete?: (isValid: boolean) => void;
  showRefresh?: boolean;
}

const ExamValidationWarning = ({ examId, onValidationComplete, showRefresh = false }: ExamValidationWarningProps) => {
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const validateExam = async () => {
    try {
      setLoading(true);
      const result = await ExamService.validateExamReadiness(examId);
      setValidationResult(result);
      onValidationComplete?.(result.isReady);
    } catch (error) {
      console.error('Error validating exam:', error);
      setValidationResult({
        isReady: false,
        message: 'Error al validar el examen',
        details: { error: error.message }
      });
      onValidationComplete?.(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      validateExam();
    }
  }, [examId]);

  if (loading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Validando configuración del examen...
        </AlertDescription>
      </Alert>
    );
  }

  if (!validationResult) {
    return null;
  }

  if (validationResult.isReady) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Examen válido:</strong> {validationResult.message}
          {showRefresh && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={validateExam}
              className="ml-2 h-6 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="h-5 w-5" />
          Configuración Incompleta del Examen
        </CardTitle>
        <CardDescription className="text-yellow-700">
          {validationResult.message}
        </CardDescription>
      </CardHeader>
      
      {validationResult.details?.categoryValidation && (
        <CardContent>
          <div className="space-y-2">
            <h4 className="font-medium text-yellow-800">Estado por Categoría:</h4>
            <div className="space-y-1">
              {validationResult.details.categoryValidation.map((category: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-yellow-100 rounded text-sm">
                  <span className="font-medium">{category.categoryName}</span>
                  <div className="flex items-center gap-2">
                    <span>
                      {category.questionsAvailable} / {category.questionsNeeded} preguntas
                    </span>
                    <Badge 
                      variant={category.hasEnough ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {category.hasEnough ? 'OK' : 'Insuficiente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {showRefresh && (
            <Button 
              variant="outline" 
              onClick={validateExam}
              className="mt-4 w-full"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Revalidar Examen
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ExamValidationWarning;
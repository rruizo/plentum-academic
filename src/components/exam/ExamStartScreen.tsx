
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ExamStartScreenProps {
  exam: any;
  questionCount: number;
  attemptsRemaining?: number;
  onStart: () => void;
}

const ExamStartScreen = ({ exam, questionCount, attemptsRemaining = 2, onStart }: ExamStartScreenProps) => {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle>{exam?.title}</CardTitle>
        <CardDescription>{exam?.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">{questionCount}</div>
              <div className="text-sm text-blue-700">Preguntas</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">{exam?.duracion_minutos}</div>
              <div className="text-sm text-green-700">Minutos</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 mb-1">{attemptsRemaining}</div>
              <div className="text-sm text-orange-700">Intentos Restantes</div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Información del Examen</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Tipo de respuestas:</strong> Escala: Nunca, Rara vez, A veces, Frecuentemente</p>
              <p><strong>Máximo de intentos:</strong> 2 intentos por examen</p>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">Instrucciones Importantes</h3>
            </div>
            <ul className="text-sm text-amber-700 space-y-1 text-left">
              <li>• Responda todas las preguntas de manera honesta</li>
              <li>• No hay respuestas correctas o incorrectas</li>
              <li>• Una vez iniciado, el examen debe completarse</li>
              <li>• El tiempo es limitado y se cuenta automáticamente</li>
            </ul>
          </div>
          
          <Button onClick={onStart} size="lg" className="w-full">
            <CheckCircle className="h-4 w-4 mr-2" />
            Iniciar Examen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExamStartScreen;

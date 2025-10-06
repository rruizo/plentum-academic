
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface ExamCompletedScreenProps {
  onFinish?: () => void;
}

const ExamCompletedScreen = ({ onFinish }: ExamCompletedScreenProps) => {
  const handleFinish = () => {
    if (onFinish) {
      onFinish();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="text-center py-12 px-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ¡Evaluación Completada!
          </h1>
          
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <p className="text-lg text-gray-800 leading-relaxed">
              Estimado usuario, <strong>gracias por haber presentado la evaluación sobre su perfil de confiabilidad</strong>. 
              En breve, un representante del área de Recursos Humanos se pondrá en contacto con usted.
            </p>
          </div>
          
          <div className="text-sm text-gray-600 mb-6">
            <p>Sus respuestas han sido guardadas exitosamente.</p>
            <p>El sistema cerrará su sesión automáticamente.</p>
          </div>
          
          <Button 
            onClick={handleFinish}
            size="lg"
            className="px-8 py-3"
          >
            Gracias
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamCompletedScreen;

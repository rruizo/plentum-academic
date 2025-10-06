
import { Card, CardContent } from '@/components/ui/card';

const ExamLoadingState = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando examen...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamLoadingState;

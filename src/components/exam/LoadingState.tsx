
import { Card, CardContent } from '@/components/ui/card';

const LoadingState = () => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Cargando exámenes...</p>
      </CardContent>
    </Card>
  );
};

export default LoadingState;

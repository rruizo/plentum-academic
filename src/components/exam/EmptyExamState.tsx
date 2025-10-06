
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const EmptyExamState = () => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No hay exámenes disponibles
        </h3>
        <p className="text-sm text-muted-foreground">
          Los exámenes aparecerán aquí cuando estén activos y disponibles
        </p>
      </CardContent>
    </Card>
  );
};

export default EmptyExamState;

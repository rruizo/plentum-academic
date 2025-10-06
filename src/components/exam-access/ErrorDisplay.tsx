
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorDisplayProps {
  error: string;
  onNavigateHome: () => void;
}

const ErrorDisplay = ({ error, onNavigateHome }: ErrorDisplayProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="text-center py-12">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            className="mt-4" 
            variant="outline" 
            onClick={onNavigateHome}
          >
            Volver al inicio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorDisplay;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUserManagement } from "@/hooks/useUserManagement";
import { toast } from "sonner";
import { Trash2, Database, AlertTriangle, RotateCcw } from "lucide-react";

const TestDataManager = () => {
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [adminEmail, setAdminEmail] = useState("reneycec@gmail.com");
  const [resetResult, setResetResult] = useState<string | null>(null);
  
  const { resetSystemToAdminOnly } = useUserManagement();

  const handlePurgeTestData = async () => {
    try {
      setIsPurging(true);
      
      // Llamar a la función de purga
      const { data, error } = await supabase.rpc('purge_test_data');
      
      if (error) {
        console.error('Error purging test data:', error);
        toast.error('Error al purgar datos: ' + error.message);
        return;
      }
      
      setPurgeResult(data);
      toast.success('Datos de prueba purgados exitosamente');
      
    } catch (error) {
      console.error('Error in purge operation:', error);
      toast.error('Error inesperado al purgar datos');
    } finally {
      setIsPurging(false);
    }
  };

  const handleResetSystem = async () => {
    if (!adminEmail.trim()) {
      toast.error('Email de administrador requerido');
      return;
    }
    
    try {
      setIsResetting(true);
      setResetResult(null);
      
      const result = await resetSystemToAdminOnly(adminEmail);
      
      if (result) {
        setResetResult(result.message);
      }
      
    } catch (error) {
      console.error('Error in reset operation:', error);
      toast.error('Error inesperado al resetear sistema');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Gestión de Datos de Prueba
        </CardTitle>
        <CardDescription>
          Herramientas para limpiar datos durante desarrollo y pruebas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">
                Conflicto de IDs Identificado
              </h4>
              <p className="text-sm text-yellow-700 mb-2">
                Hay un conflicto entre los tipos de user_id:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1 ml-4">
                <li>• <strong>Exámenes de Confiabilidad:</strong> Usan UUIDs (usuarios registrados)</li>
                <li>• <strong>Exámenes Psicométricos:</strong> Usan emails (usuarios no registrados)</li>
              </ul>
              <p className="text-sm text-yellow-700 mt-2">
                Se ha implementado un trigger automático que normaliza los IDs antes de insertar en exam_attempts.
              </p>
            </div>
          </div>
        </div>

        {purgeResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Resultado del Purgado:</h4>
            <p className="text-sm text-green-700 font-mono whitespace-pre-line">{purgeResult}</p>
          </div>
        )}

        {resetResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Resultado del Reset:</h4>
            <p className="text-sm text-blue-700 font-mono whitespace-pre-line">{resetResult}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email del Administrador Principal</Label>
            <Input
              id="admin-email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="reneycec@gmail.com"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Este usuario será el único que permanecerá en el sistema después del reset
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={isResetting || !adminEmail.trim()}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {isResetting ? 'Reseteando Sistema...' : 'Resetear Sistema (Solo Admin)'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>⚠️ RESETEO COMPLETO DEL SISTEMA ⚠️</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="font-medium text-red-800">¡ATENCIÓN! Esta acción es IRREVERSIBLE</p>
                  </div>
                  
                  <div>
                    <p className="font-medium mb-2">Esta operación eliminará PERMANENTEMENTE:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                      <li>TODOS los usuarios excepto: <strong>{adminEmail}</strong></li>
                      <li>TODOS los exámenes y resultados</li>
                      <li>TODAS las sesiones y respuestas</li>
                      <li>TODAS las asignaciones y credenciales</li>
                      <li>TODOS los datos de prueba y configuraciones</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm">
                      <strong>Usuario que permanecerá:</strong><br/>
                      📧 {adminEmail}<br/>
                      👤 Rene Ruiz Olmedo<br/>
                      🔑 r3n3yc3c
                    </p>
                  </div>

                  <p className="text-sm font-medium text-red-600">
                    ⚠️ Solo usar en desarrollo o para limpiar el sistema en producción
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleResetSystem}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  SÍ, RESETEAR COMPLETAMENTE
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full"
              disabled={isPurging}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isPurging ? 'Purgando...' : 'Purgar Todos los Datos de Prueba'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Esta acción eliminará PERMANENTEMENTE:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Todos los intentos de examen</li>
                  <li>Todas las sesiones de examen</li>
                  <li>Todas las asignaciones de examen</li>
                  <li>Todas las credenciales de examen</li>
                  <li>Todas las respuestas psicométricas</li>
                  <li>Todos los resultados psicométricos</li>
                  <li>Todas las notificaciones de email</li>
                </ul>
                <p className="font-medium text-red-600 mt-2">
                  Esta acción NO se puede deshacer y solo funciona en desarrollo (&lt; 20 usuarios).
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handlePurgeTestData}
                className="bg-destructive hover:bg-destructive/90"
              >
                Sí, purgar todos los datos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="text-xs text-muted-foreground">
          <p><strong>Nota:</strong> Esta función solo funciona cuando hay menos de 20 usuarios en la base de datos para prevenir uso accidental en producción.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestDataManager;
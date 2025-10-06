import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, AlertTriangle, CheckCircle, Info, XCircle, RefreshCw, Bug } from 'lucide-react';
import { useExamAccessDiagnostics } from '@/hooks/useExamAccessDiagnostics';

export const DiagnosticsPanel = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { 
    diagnostics, 
    isRunning, 
    runDiagnostics, 
    getErrorCount, 
    getWarningCount,
    showDiagnosticsToast 
  } = useExamAccessDiagnostics();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="default" className="bg-green-100 text-green-800">Éxito</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Advertencia</Badge>;
      case 'info': return <Badge variant="outline">Info</Badge>;
      default: return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const errorCount = getErrorCount();
  const warningCount = getWarningCount();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="w-full">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                <div>
                  <CardTitle className="text-sm font-medium">
                    Diagnósticos del Sistema
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {diagnostics.length > 0 ? (
                      <>
                        {errorCount > 0 && <span className="text-red-600">{errorCount} errores</span>}
                        {errorCount > 0 && warningCount > 0 && ', '}
                        {warningCount > 0 && <span className="text-yellow-600">{warningCount} advertencias</span>}
                        {errorCount === 0 && warningCount === 0 && (
                          <span className="text-green-600">Sin problemas detectados</span>
                        )}
                      </>
                    ) : (
                      'Ejecuta diagnósticos para verificar el estado del sistema'
                    )}
                  </CardDescription>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={runDiagnostics}
                  disabled={isRunning}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
                  {isRunning ? 'Ejecutando...' : 'Ejecutar Diagnósticos'}
                </Button>
                
                {diagnostics.length > 0 && (
                  <Button 
                    onClick={showDiagnosticsToast}
                    size="sm"
                    variant="ghost"
                  >
                    Mostrar Resumen
                  </Button>
                )}
              </div>

              {diagnostics.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {diagnostics.map((diagnostic, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      {getStatusIcon(diagnostic.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{diagnostic.step}</h4>
                          {getStatusBadge(diagnostic.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {diagnostic.message}
                        </p>
                        {diagnostic.details && (
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer text-blue-600 hover:text-blue-800">
                              Ver detalles
                            </summary>
                            <pre className="text-xs bg-muted p-2 mt-1 rounded overflow-x-auto">
                              {typeof diagnostic.details === 'string' 
                                ? diagnostic.details 
                                : JSON.stringify(diagnostic.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isRunning && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Ejecutando diagnósticos del sistema...
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
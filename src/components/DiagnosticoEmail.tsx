import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DiagnosticoEmail = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [results, setResults] = useState<{
    simple?: any;
    complex?: any;
  }>({});

  const sendTestEmail = async (testType: 'simple' | 'complex') => {
    if (!email.trim()) {
      toast.error('Ingrese un email válido');
      return;
    }

    setSending(testType);
    
    try {
      console.log(`🧪 Enviando prueba ${testType} a ${email}`);
      
      const { data, error } = await supabase.functions.invoke('test-simple-email', {
        body: {
          email: email.trim(),
          testType: testType
        }
      });

      console.log(`📧 Respuesta de prueba ${testType}:`, { data, error });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido');
      }

      setResults(prev => ({
        ...prev,
        [testType]: data
      }));

      toast.success(`✅ Email ${testType} enviado exitosamente`);
      
    } catch (error: any) {
      console.error(`❌ Error en prueba ${testType}:`, error);
      toast.error(`Error: ${error.message}`);
      
      setResults(prev => ({
        ...prev,
        [testType]: { success: false, error: error.message }
      }));
    } finally {
      setSending(null);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Diagnóstico de Entrega de Correos
        </CardTitle>
        <CardDescription>
          Prueba la entrega de correos para identificar problemas de SPAM o filtros
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input de Email */}
        <div className="flex gap-3">
          <Input
            type="email"
            placeholder="Ingrese el email de prueba"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
        </div>

        {/* Tabs de Pruebas */}
        <Tabs defaultValue="simple" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">Prueba Simple</TabsTrigger>
            <TabsTrigger value="complex">Prueba Compleja</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">📧 Prueba Simple</h4>
              <p className="text-sm text-green-700 mb-3">
                Email básico sin estilos complejos. Si este llega pero el complejo no, 
                el problema son los filtros de contenido.
              </p>
              <Button 
                onClick={() => sendTestEmail('simple')}
                disabled={sending === 'simple' || !email.trim()}
                className="w-full"
              >
                {sending === 'simple' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Prueba Simple
                  </>
                )}
              </Button>
            </div>

            {results.simple && (
              <div className={`p-4 border rounded-lg ${
                results.simple.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {results.simple.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <Badge variant={results.simple.success ? "default" : "destructive"}>
                    {results.simple.success ? 'ENVIADO' : 'ERROR'}
                  </Badge>
                </div>
                
                {results.simple.success ? (
                  <div className="space-y-2 text-sm">
                    <p><strong>ID Resend:</strong> {results.simple.resendId}</p>
                    <div>
                      <strong>Verificar:</strong>
                      <ul className="list-disc list-inside mt-1 text-green-700">
                        {results.simple.recommendations?.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-700">
                    <strong>Error:</strong> {results.simple.error}
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="complex" className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">🎨 Prueba Compleja</h4>
              <p className="text-sm text-blue-700 mb-3">
                Email con estilos avanzados, gradientes y HTML complejo. 
                Simula el formato real de invitaciones.
              </p>
              <Button 
                onClick={() => sendTestEmail('complex')}
                disabled={sending === 'complex' || !email.trim()}
                className="w-full"
                variant="outline"
              >
                {sending === 'complex' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Prueba Compleja
                  </>
                )}
              </Button>
            </div>

            {results.complex && (
              <div className={`p-4 border rounded-lg ${
                results.complex.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {results.complex.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <Badge variant={results.complex.success ? "default" : "destructive"}>
                    {results.complex.success ? 'ENVIADO' : 'ERROR'}
                  </Badge>
                </div>
                
                {results.complex.success ? (
                  <div className="space-y-2 text-sm">
                    <p><strong>ID Resend:</strong> {results.complex.resendId}</p>
                    <div>
                      <strong>Verificar:</strong>
                      <ul className="list-disc list-inside mt-1 text-blue-700">
                        {results.complex.recommendations?.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-700">
                    <strong>Error:</strong> {results.complex.error}
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Resultados Comparativos */}
        {results.simple && results.complex && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium mb-3">📊 Análisis Comparativo</h4>
            
            {results.simple.success && results.complex.success && (
              <div className="text-green-700">
                <p>✅ <strong>Ambas pruebas exitosas</strong> - Verifique carpeta de SPAM</p>
              </div>
            )}
            
            {results.simple.success && !results.complex.success && (
              <div className="text-yellow-700">
                <p>⚠️ <strong>Simple OK, Compleja FALLA</strong> - Problema de filtros de contenido</p>
                <p className="text-sm mt-1">Recomendación: Simplificar el HTML de los emails</p>
              </div>
            )}
            
            {!results.simple.success && (
              <div className="text-red-700">
                <p>❌ <strong>Problema de configuración básica</strong></p>
                <p className="text-sm mt-1">Revisar configuración de dominio y API key</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiagnosticoEmail;
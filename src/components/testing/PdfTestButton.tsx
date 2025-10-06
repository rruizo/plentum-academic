import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PdfTestButton = () => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const testPdfGeneration = async () => {
    try {
      setTesting(true);
      setTestResults(null);
      
      console.log('Iniciando prueba de generación de PDF...');
      
      // Primero probar generate-alternative-pdf-report
      const { data: htmlData, error: htmlError } = await supabase.functions.invoke('generate-alternative-pdf-report', {
        body: {
          examAttemptId: '29526275-26a5-400a-8722-d6fb4eebd311', // ID de ejemplo
          reportConfig: {
            include_sections: {
              personal_info: true,
              category_scores: true,
              risk_analysis: true,
              recommendations: true
            }
          },
          includeAnalysis: false // Sin análisis AI para prueba rápida
        }
      });

      if (htmlError) {
        console.error('Error generando HTML:', htmlError);
        throw new Error(`Error generando HTML: ${htmlError.message}`);
      }

      console.log('HTML generado exitosamente');

      // Ahora probar generate-pdf-with-storage
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf-with-storage', {
        body: {
          htmlContent: htmlData.html,
          userId: 'e34e05f8-5454-4ad2-8a32-ef8731afee5d',
          examId: '766d0bba-fea9-47c5-b6ea-581f4653b156',
          reportType: 'test_reliability',
          templateName: 'Reporte de Prueba de Sistema'
        }
      });

      if (pdfError) {
        console.error('Error generando PDF:', pdfError);
        throw new Error(`Error generando PDF: ${pdfError.message}`);
      }

      console.log('PDF generado exitosamente');

      // Verificar si se guardó en la base de datos
      const { data: savedReports, error: dbError } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('report_type', 'reliability') // Buscar por el tipo normalizado
        .order('created_at', { ascending: false })
        .limit(1);

      if (dbError) {
        console.error('Error verificando base de datos:', dbError);
        throw new Error(`Error verificando DB: ${dbError.message}`);
      }

      setTestResults({
        success: true,
        htmlGenerated: !!htmlData,
        pdfGenerated: !!pdfData,
        savedToDb: savedReports && savedReports.length > 0,
        reportRecord: savedReports?.[0] || null,
        timestamp: new Date().toISOString()
      });

      toast.success('Prueba de PDF completada exitosamente');
      
    } catch (error) {
      console.error('Error en prueba de PDF:', error);
      setTestResults({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      toast.error(`Error en prueba: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Prueba de Generación de PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testPdfGeneration} 
          disabled={testing}
          className="flex items-center gap-2"
        >
          {testing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {testing ? 'Probando...' : 'Probar Generación de PDF'}
        </Button>

        {testResults && (
          <div className="mt-4 p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Resultados de la Prueba:</h3>
            <div className="space-y-2 text-sm">
              <div>✅ Éxito general: {testResults.success ? 'SÍ' : 'NO'}</div>
              {testResults.success ? (
                <>
                  <div>📄 HTML generado: {testResults.htmlGenerated ? 'SÍ' : 'NO'}</div>
                  <div>📋 PDF generado: {testResults.pdfGenerated ? 'SÍ' : 'NO'}</div>
                  <div>💾 Guardado en DB: {testResults.savedToDb ? 'SÍ' : 'NO'}</div>
                  {testResults.reportRecord && (
                    <div>📁 ID del reporte: {testResults.reportRecord.id}</div>
                  )}
                </>
              ) : (
                <div className="text-red-600">❌ Error: {testResults.error}</div>
              )}
              <div>🕒 Timestamp: {testResults.timestamp}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfTestButton;
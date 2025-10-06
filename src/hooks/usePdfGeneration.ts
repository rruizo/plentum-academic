import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeneratePdfOptions {
  htmlContent: string;
  reportConfig?: any;
  userId: string;
  examId?: string;
  psychometricTestId?: string;
  reportType?: 'reliability' | 'ocean' | 'custom';
  templateName?: string;
}

export const usePdfGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const generatePdf = async (options: GeneratePdfOptions): Promise<Blob | null> => {
    setIsGenerating(true);
    setProgress(0);
    
    try {
      setProgress(20);
      console.log('Iniciando generación de PDF...');

      const { data, error } = await supabase.functions.invoke('generate-pdf-with-storage', {
        body: {
          htmlContent: options.htmlContent,
          reportConfig: options.reportConfig,
          userId: options.userId,
          examId: options.examId,
          psychometricTestId: options.psychometricTestId,
          reportType: options.reportType || 'custom',
          templateName: options.templateName || 'Reporte personalizado'
        }
      });

      setProgress(60);

      if (error) {
        console.error('Error generating PDF:', error);
        throw new Error(error.message || 'Error al generar PDF');
      }

      setProgress(80);

      // La respuesta debería ser un blob del PDF
      if (data instanceof Blob) {
        setProgress(100);
        
        toast({
          title: "PDF Generado",
          description: "El reporte PDF ha sido generado y guardado exitosamente"
        });

        return data;
      } else {
        throw new Error('Formato de respuesta inválido');
      }

    } catch (error: any) {
      console.error('Error en generación de PDF:', error);
      
      toast({
        title: "Error",
        description: error.message || "Error al generar el PDF",
        variant: "destructive"
      });

      return null;
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const downloadPdf = (pdfBlob: Blob, filename?: string) => {
    try {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `reporte-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Descarga iniciada",
        description: "El PDF se está descargando"
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Error al descargar el PDF",
        variant: "destructive"
      });
    }
  };

  const generateAndDownloadPdf = async (options: GeneratePdfOptions, filename?: string) => {
    const pdfBlob = await generatePdf(options);
    if (pdfBlob) {
      downloadPdf(pdfBlob, filename);
    }
    return pdfBlob;
  };

  return {
    generatePdf,
    downloadPdf,
    generateAndDownloadPdf,
    isGenerating,
    progress
  };
};
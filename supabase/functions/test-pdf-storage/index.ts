import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

serve(async (req) => {
  console.log('=== TEST-PDF-STORAGE FUNCTION STARTED ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generar HTML de prueba
    const testHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Prueba</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #2563eb; }
          .content { margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>Reporte de Confiabilidad - Prueba</h1>
        <div class="content">
          <p><strong>Usuario:</strong> Usuario de Prueba</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
          <p><strong>Tipo:</strong> Reporte de Prueba del Sistema</p>
          <h2>Resultados</h2>
          <p>Este es un reporte de prueba para verificar que el sistema de generación de PDFs funciona correctamente.</p>
          <p>El PDF debería guardarse en la tabla generated_reports y en el storage bucket.</p>
        </div>
      </body>
    </html>
    `;

    console.log('Calling generate-pdf-with-storage...');

    // Llamar a la función de generación de PDFs
    const { data, error } = await supabase.functions.invoke('generate-pdf-with-storage', {
      body: {
        htmlContent: testHtml,
        userId: 'e34e05f8-5454-4ad2-8a32-ef8731afee5d', // ID del usuario de prueba
        examId: '766d0bba-fea9-47c5-b6ea-581f4653b156',
        reportType: 'test_reliability',
        templateName: 'Reporte de Prueba'
      }
    });

    if (error) {
      console.error('Error from generate-pdf-with-storage:', error);
      throw error;
    }

    console.log('PDF generation completed successfully');

    // Verificar que se guardó en la base de datos
    const { data: reportData, error: reportError } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('report_type', 'test_reliability')
      .order('created_at', { ascending: false })
      .limit(1);

    if (reportError) {
      console.error('Error checking saved reports:', reportError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'PDF de prueba generado exitosamente',
        pdf_response: data ? 'PDF generado' : 'No data',
        saved_report: reportData ? reportData[0] : null,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in test-pdf-storage:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error en prueba de PDF', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
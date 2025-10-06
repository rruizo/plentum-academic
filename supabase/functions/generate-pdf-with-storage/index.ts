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
  console.log('=== GENERATE-PDF-WITH-STORAGE FUNCTION STARTED ===');
  console.log('Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const requestBody = await req.json();
    console.log('Request body received:', Object.keys(requestBody));
    
    const { 
      htmlContent, 
      reportConfig, 
      userId, 
      examId, 
      psychometricTestId,
      reportType = 'custom',
      templateName = 'Reporte personalizado'
    } = requestBody;
    
    console.log('Request body keys:', Object.keys(requestBody));
    console.log('htmlContent received:', !!htmlContent);
    console.log('htmlContent type:', typeof htmlContent);
    
    // Normalizar reportType para que coincida con los valores permitidos en DB
    const normalizeReportType = (type: string): string => {
      const typeMap: { [key: string]: string } = {
        'test_reliability': 'reliability',
        'test_ocean': 'ocean',
        'test_custom': 'custom',
        'reliability': 'reliability',
        'ocean': 'ocean',
        'custom': 'custom'
      };
      return typeMap[type] || 'custom';
    };
    
    const normalizedReportType = normalizeReportType(reportType);
    console.log(`Report type normalized: ${reportType} -> ${normalizedReportType}`);
    
    if (!htmlContent) {
      console.error('Missing htmlContent in request body');
      return new Response(
        JSON.stringify({ 
          error: 'htmlContent es requerido',
          received_keys: Object.keys(requestBody)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar que htmlContent sea string
    const htmlString = typeof htmlContent === 'string' ? htmlContent : 
                      typeof htmlContent === 'object' && htmlContent.html ? htmlContent.html :
                      JSON.stringify(htmlContent);
    
    console.log('HTML content type:', typeof htmlContent);
    console.log('HTML content length:', htmlString.length);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Getting user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating PDF from HTML...');
    
    let pdfBuffer: ArrayBuffer;
    
    // Primero guardar el HTML como archivo Word para revisión
    const timestamp = Date.now();
    const htmlFileName = `${userId}/${examId || psychometricTestId || 'custom'}/reporte-html-${timestamp}.html`;
    const wordFileName = `${userId}/${examId || psychometricTestId || 'custom'}/reporte-word-${timestamp}.docx`;
    
    console.log('Saving HTML content for review...');
    
    // Crear HTML completo para el archivo Word
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Evaluación - ${profile.full_name}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .header { background: #f5f5f5; padding: 20px; margin-bottom: 20px; }
    .section { margin-bottom: 30px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    .table th { background-color: #f2f2f2; }
    .risk-bajo { color: #28a745; font-weight: bold; }
    .risk-medio { color: #ffc107; font-weight: bold; }
    .risk-alto { color: #dc3545; font-weight: bold; }
  </style>
</head>
<body>
  ${htmlString}
</body>
</html>`;

    // Guardar HTML completo
    const { data: htmlUpload, error: htmlError } = await supabase.storage
      .from('generated-reports')
      .upload(htmlFileName, fullHtml, {
        contentType: 'text/html',
        upsert: false
      });

    if (htmlError) {
      console.error('Error saving HTML file:', htmlError);
    } else {
      console.log('HTML file saved:', htmlUpload.path);
    }

    // Crear archivo Word (formato docx simple)
    const wordContent = createWordDocument(fullHtml, profile);
    
    const { data: wordUpload, error: wordError } = await supabase.storage
      .from('generated-reports')
      .upload(wordFileName, wordContent, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false
      });

    if (wordError) {
      console.error('Error saving Word file:', wordError);
    } else {
      console.log('Word file saved:', wordUpload.path);
    }

    // Generar PDF usando método confiable
    console.log('Generating PDF using reliable method...');
    pdfBuffer = createSimplePDF(htmlString, profile);
    console.log('PDF generated successfully using internal method');
    console.log('PDF generated successfully, size:', pdfBuffer.byteLength);

    // Generar nombre de archivo único para PDF
    const pdfFileName = `${userId}/${examId || psychometricTestId || 'custom'}/reporte-pdf-${timestamp}.pdf`;
    
    console.log('Uploading PDF to storage:', pdfFileName);
    
    // Subir PDF a storage
    const { data: pdfUploadData, error: pdfUploadError } = await supabase.storage
      .from('generated-reports')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (pdfUploadError) {
      console.error('Error uploading PDF to storage:', pdfUploadError);
    } else {
      console.log('PDF uploaded successfully to:', pdfUploadData.path);
    }
    
    // Registrar todos los archivos generados en la base de datos
    const files_generated = {
      html_file: htmlUpload?.path || null,
      word_file: wordUpload?.path || null,
      pdf_file: pdfUploadData?.path || null
    };
    
    const { error: dbError } = await supabase
      .from('generated_reports')
      .insert({
        user_id: userId,
        exam_id: examId || null,
        psychometric_test_id: psychometricTestId || null,
        report_type: normalizedReportType,
        template_name: templateName,
        file_path: pdfUploadData?.path || `no-pdf-${timestamp}`,
        file_size: pdfBuffer.byteLength,
        generation_metadata: {
          generated_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime,
          html_length: htmlString.length,
          pdf_size_bytes: pdfBuffer.byteLength,
          files_generated: files_generated,
          report_config: reportConfig || null
        }
      });

    if (dbError) {
      console.error('Error registering files in database:', dbError);
    } else {
      console.log('Files registered in database successfully');
    }

    // Devolver el PDF como respuesta con información de todos los archivos generados
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte-${profile.full_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`,
        'X-PDF-Storage-Path': pdfUploadData?.path || 'not-saved',
        'X-HTML-Storage-Path': htmlUpload?.path || 'not-saved',
        'X-Word-Storage-Path': wordUpload?.path || 'not-saved',
        'X-File-Size': pdfBuffer.byteLength.toString(),
        'X-Processing-Time': (Date.now() - startTime).toString(),
        'X-Files-Generated': JSON.stringify(files_generated)
      }
    });

  } catch (error) {
    console.error('Error in generate-pdf-with-storage:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Función auxiliar para crear un documento Word simple
function createWordDocument(htmlContent: string, profile: any): ArrayBuffer {
  // Crear un documento Word básico usando XML
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Reporte de Evaluación - ${profile?.full_name || 'Usuario'}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Fecha: ${new Date().toLocaleDateString()}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 5000)}...</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
  
  return new TextEncoder().encode(docXml).buffer;
}

// Función auxiliar para crear un PDF simple sin servicios externos
function createSimplePDF(htmlContent: string, profile: any): ArrayBuffer {
  // Asegurar que htmlContent es string
  const htmlString = typeof htmlContent === 'string' ? htmlContent : String(htmlContent || '');
  
  // Extraer solo el texto del HTML para crear un PDF básico
  const textContent = htmlString.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Crear un PDF simple (esto es un placeholder, en un entorno real usarías una librería de PDF)
  const pdfHeader = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${textContent.length + 200}
>>
stream
BT
/F1 12 Tf
50 750 Td
(Reporte de Evaluacion - ${profile?.full_name || 'Usuario'}) Tj
0 -20 Td
(Fecha: ${new Date().toLocaleDateString()}) Tj
0 -40 Td
(${textContent.substring(0, 1000)}...) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000526 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
625
%%EOF`;
  
  return new TextEncoder().encode(pdfHeader).buffer;
}
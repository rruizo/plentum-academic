import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateHTPReportRequest {
  submissionId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId }: GenerateHTPReportRequest = await req.json();

    console.log(`🎨 Generando reporte HTP para submission: ${submissionId}`);

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get submission details
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('htp_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      console.error('❌ Error obteniendo submission:', submissionError);
      throw new Error(`Submission no encontrada: ${submissionError?.message || 'ID no válido'}`);
    }

    // Get user profile separately
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, company, area, section')
      .eq('id', submission.user_id)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ Error obteniendo perfil:', profileError);
      throw new Error(`Perfil de usuario no encontrado: ${profileError?.message || 'Usuario no válido'}`);
    }

    // Get analysis separately
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from('htp_analysis')
      .select('analysis_content, generated_at, openai_model_used, word_count')
      .eq('submission_id', submissionId)
      .single();

    if (analysisError || !analysis) {
      console.error('❌ Error obteniendo análisis:', analysisError);
      throw new Error(`Análisis no encontrado: ${analysisError?.message || 'Análisis no generado'}`);
    }

    // Get system configuration
    const { data: systemConfig } = await supabaseAdmin
      .from('system_config')
      .select('*')
      .single();

    // Generate HTML report
    const reportDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const reportTime = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const analysisText = analysis.analysis_content?.text || 'Análisis no disponible';

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Análisis HTP - ${userProfile.full_name}</title>
    <style>
        @page {
            margin: 20mm;
            size: A4;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .logo {
            max-height: 60px;
        }
        
        .company-info {
            text-align: right;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin: 0;
        }
        
        .report-title {
            text-align: center;
            color: #1e40af;
            font-size: 28px;
            font-weight: bold;
            margin: 30px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .section {
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-left: 4px solid #2563eb;
            border-radius: 0 8px 8px 0;
        }
        
        .section-title {
            color: #1e40af;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .info-label {
            font-weight: bold;
            color: #475569;
            margin-bottom: 5px;
        }
        
        .info-value {
            color: #1e293b;
        }
        
        .analysis-content {
            background: white;
            padding: 25px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            line-height: 1.8;
            text-align: justify;
        }
        
        .drawing-section {
            text-align: center;
            margin: 30px 0;
        }
        
        .drawing-image {
            max-width: 100%;
            max-height: 400px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .explanation-box {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 12px;
            color: #64748b;
        }
        
        .footer-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .technical-details {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 10px;
        }
        
        .confidential {
            background: #fee2e2;
            border: 2px solid #dc2626;
            color: #dc2626;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-weight: bold;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div>
            ${systemConfig?.logo_url ? `<img src="${systemConfig.logo_url}" alt="Logo" class="logo">` : ''}
        </div>
        <div class="company-info">
            <h1 class="company-name">${systemConfig?.system_name || 'Sistema de Evaluación'}</h1>
            <p>Análisis Psicológico Proyectivo</p>
        </div>
    </div>

    <!-- Report Title -->
    <h1 class="report-title">Reporte de Análisis HTP</h1>
    <p style="text-align: center; color: #64748b; margin-bottom: 40px;">
        House-Tree-Person Test Analysis Report
    </p>

    <!-- Confidentiality Notice -->
    <div class="confidential">
        DOCUMENTO CONFIDENCIAL - EVALUACIÓN PSICOLÓGICA
    </div>

    <!-- Personal Information -->
    <div class="section">
        <h2 class="section-title">Información del Evaluado</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Nombre Completo:</div>
                <div class="info-value">${userProfile.full_name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Correo Electrónico:</div>
                <div class="info-value">${userProfile.email}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Empresa:</div>
                <div class="info-value">${userProfile.company}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Área:</div>
                <div class="info-value">${userProfile.area}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Sección:</div>
                <div class="info-value">${userProfile.section}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Fecha de Evaluación:</div>
                <div class="info-value">${new Date(submission.submitted_at).toLocaleDateString('es-ES')}</div>
            </div>
        </div>
    </div>

    <!-- Drawing Section -->
    <div class="section">
        <h2 class="section-title">Material Evaluativo</h2>
        <div class="drawing-section">
            <img src="${submission.image_url}" alt="Dibujo HTP" class="drawing-image">
        </div>
        
        ${submission.explanation_text ? `
        <div class="explanation-box">
            <div class="info-label">Explicación del Evaluado:</div>
            <p>"${submission.explanation_text}"</p>
        </div>
        ` : ''}
    </div>

    <!-- Psychological Analysis -->
    <div class="section">
        <h2 class="section-title">Análisis Psicológico</h2>
        <div class="analysis-content">
            ${analysisText.split('\n').map((paragraph: string) => 
              paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
            ).join('')}
        </div>
    </div>

    <!-- Technical Information -->
    <div class="section">
        <h2 class="section-title">Información Técnica</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Modelo de IA Utilizado:</div>
                <div class="info-value">${analysis.openai_model_used}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Palabras del Análisis:</div>
                <div class="info-value">${analysis.word_count} palabras</div>
            </div>
            <div class="info-item">
                <div class="info-label">Fecha de Análisis:</div>
                <div class="info-value">${new Date(analysis.generated_at).toLocaleDateString('es-ES')}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Técnica Proyectiva:</div>
                <div class="info-value">House-Tree-Person (HTP)</div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="footer-info">
            <div>
                ${systemConfig?.logo_url ? `<img src="${systemConfig.logo_url}" alt="Logo" style="height: 30px;">` : ''}
            </div>
            <div>
                <strong>${systemConfig?.system_name || 'Sistema de Evaluación'}</strong>
            </div>
        </div>
        
        <div>
            ${systemConfig?.contact_email ? `Contacto: ${systemConfig.contact_email}` : ''}
            ${systemConfig?.footer_text ? ` | ${systemConfig.footer_text}` : ''}
        </div>
        
        <div class="technical-details">
            Reporte generado el ${reportDate} a las ${reportTime} | 
            ID del Reporte: ${submissionId.slice(0, 8)} |
            Este documento contiene información psicológica confidencial
        </div>
    </div>
</body>
</html>`;

    // For now, return HTML report as it's more reliable than external PDF services
    console.log('✅ Reporte HTP generado exitosamente como HTML');
    
    return new Response(htmlContent, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="reporte-htp-${submissionId.slice(0, 8)}.html"`
      },
    });

  } catch (error: any) {
    console.error('❌ Error en generate-htp-report:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
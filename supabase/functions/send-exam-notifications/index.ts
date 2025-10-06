import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds, examId, includesTurnover } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    const resend = new Resend(resendApiKey);

    const { data: systemConfig } = await supabase
      .from('system_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const userId of userIds) {
      try {
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('id, full_name, email, company, area')
          .eq('id', userId)
          .single();

        if (userError || !userProfile) {
          console.error(`User not found: ${userId}`, userError);
          errorCount++;
          results.push({ userId, success: false, error: 'Usuario no encontrado' });
          continue;
        }

        // Buscar credenciales específicas para este examen o las más recientes del tipo correcto
        let credentialQuery = supabase
          .from('exam_credentials')
          .select('username, password_hash, test_type, exam_id, expires_at')
          .eq('user_email', userProfile.email)
          .eq('is_used', false);

        // Si hay examId específico, buscar por ese examen primero
        if (examId) {
          credentialQuery = credentialQuery.eq('exam_id', examId);
        }

        const { data: specificCredentials } = await credentialQuery
          .order('created_at', { ascending: false })
          .limit(1);

        let reliabilityCredentials;
        
        if (specificCredentials && specificCredentials.length > 0) {
          reliabilityCredentials = specificCredentials[0];
        } else {
          // Fallback: buscar por test_type si no hay credenciales específicas del examen
          const { data: fallbackCredentials } = await supabase
            .from('exam_credentials')
            .select('username, password_hash, test_type, exam_id, expires_at')
            .eq('user_email', userProfile.email)
            .eq('is_used', false)
            .eq('test_type', includesTurnover ? 'turnover' : 'reliability')
            .order('created_at', { ascending: false })
            .limit(1);
          
          reliabilityCredentials = fallbackCredentials?.[0];
        }
        
        if (!reliabilityCredentials) {
          // Generar credenciales automáticamente si no existen
          console.log(`⚙️ Generating new credentials for user: ${userProfile.email}`);
          
          const username = `eval_${userProfile.email.split('@')[0]}_${Date.now().toString().slice(-4)}`;
          const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
          
          // Determinar el test_type y exam_id correctos
          let credentialTestType = 'reliability';
          let credentialExamId = examId;
          
          if (includesTurnover) {
            credentialTestType = 'turnover';
            credentialExamId = null; // Turnover SIEMPRE debe tener exam_id NULL
          } else if (examId) {
            credentialTestType = 'reliability';
            credentialExamId = examId;
          }
          
          console.log(`🔐 Creating credentials - Type: ${credentialTestType}, ExamId: ${credentialExamId}`);
          
          const { data: newCredentials, error: credError } = await supabase
            .from('exam_credentials')
            .insert({
              exam_id: credentialExamId,
              user_email: userProfile.email,
              username: username,
              password_hash: password,
              full_name: userProfile.full_name,
              test_type: credentialTestType,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select('username, password_hash, test_type, exam_id, expires_at')
            .single();
          
          if (credError || !newCredentials) {
            console.error(`❌ Failed to generate credentials for user: ${userProfile.email}`, credError);
            errorCount++;
            results.push({ userId, success: false, error: 'No se pudieron generar credenciales' });
            continue;
          }
          
          reliabilityCredentials = newCredentials;
          console.log(`✅ Generated credentials for ${userProfile.email}: ${username}`);
        }

        let examInfo = null;
        let expirationDays = 30; // default
        
        if (examId && examId !== 'turnover-virtual') {
          const { data: examData } = await supabase
            .from('exams')
            .select('title, description, duracion_minutos, fecha_cierre')
            .eq('id', examId)
            .single();
          examInfo = examData;
          
          // Calcular días hasta expiración basado en fecha_cierre del examen o expires_at de credenciales
          if (examData?.fecha_cierre) {
            const daysUntilClose = Math.ceil((new Date(examData.fecha_cierre).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            expirationDays = Math.max(1, daysUntilClose);
          }
        }
        
        // Si hay expires_at en las credenciales, usar eso
        if (reliabilityCredentials?.expires_at) {
          const daysUntilExpiry = Math.ceil((new Date(reliabilityCredentials.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          expirationDays = Math.min(expirationDays, Math.max(1, daysUntilExpiry));
        }

    const baseUrl = supabaseUrl.includes('localhost') 
      ? 'http://localhost:5173' 
      : 'https://www.plentum-academic.com.mx';
    const loginUrl = `${baseUrl}/estudiante`;

        const emailSubject = examInfo 
          ? `Invitación para realizar: ${examInfo.title}`
          : 'Invitación para realizar evaluaciones de Plentum Verify';

        const examsListHtml = `
          <ul style="list-style: none; padding-left: 0;">
            ${examInfo ? `<li>✓ ${examInfo.title} (Confiabilidad)</li>` : '<li>✓ Evaluación de Confiabilidad</li>'}
            ${includesTurnover ? '<li>✓ Evaluación de Rotación de Personal</li>' : ''}
            <li>✓ Test de Personalidad OCEAN (Big Five)</li>
            <li>✓ Evaluación HTP (House-Tree-Person)</li>
          </ul>
        `;

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${emailSubject}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
              .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
              .credentials { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }
              .credential-item { background: #ffffff; padding: 12px; border: 1px dashed #1e40af; border-radius: 4px; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 16px; }
              .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .highlight { color: #1e40af; font-weight: bold; }
              .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎯 Evaluación Plentum Verify</h1>
              <p>Sistema de Evaluación Profesional</p>
            </div>
            
            <div class="content">
              <p>Estimado(a) <strong>${userProfile.full_name}</strong>,</p>
              
              <p>Ha sido seleccionado(a) para participar en las siguientes evaluaciones:</p>
              
              ${examsListHtml}
              
              ${examInfo?.description ? `<p><em>${examInfo.description}</em></p>` : ''}
              
              ${examInfo?.duracion_minutos ? `<p>Duración estimada total: <strong>${examInfo.duracion_minutos + 60} minutos</strong></p>` : ''}
              
              <div class="credentials">
                <h3>🔐 Credenciales de Acceso</h3>
                <p>Por favor, copie y utilice las siguientes credenciales para acceder al sistema:</p>
                
                <div class="credential-item">
                  <span class="highlight">Usuario:</span> ${reliabilityCredentials.username}
                </div>
                
                <div class="credential-item">
                  <span class="highlight">Contraseña:</span> ${reliabilityCredentials.password_hash}
                </div>
                
                <p style="margin-top: 20px;"><span class="highlight">Portal de acceso:</span></p>
                <a href="${loginUrl}" class="button" target="_blank">Ir al Portal de Estudiantes</a>
                <p><small>Ingrese las credenciales mostradas arriba en la página de inicio de sesión</small></p>
              </div>
              
              <div class="warning-box">
                <strong>⚠️ Importante:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Copie sus credenciales antes de acceder al portal</li>
                  <li>Complete todas las evaluaciones en una sola sesión</li>
                  <li>Las evaluaciones se presentarán de manera secuencial</li>
                  <li>Asegúrese de tener buena conexión a internet</li>
                  <li>Encuentre un lugar tranquilo y sin distracciones</li>
                  <li>Las credenciales son válidas por ${expirationDays} días</li>
                </ul>
              </div>
              
              <p>Si tiene alguna pregunta o inconveniente técnico, no dude en contactarnos.</p>
              
              <p>¡Le deseamos el mejor de los éxitos!</p>
              
              <p>Atentamente,<br>
              <strong>Equipo de Recursos Humanos</strong><br>
              ${userProfile.company || 'Plentum Verify'}<br>
              ${systemConfig?.contact_email || 'contacto@plentumverify.com'}</p>
            </div>
            
            <div class="footer">
              <p>Plentum Verify - Sistema de Evaluación Profesional</p>
              <p>Este es un correo automático, por favor no responda directamente.</p>
            </div>
          </body>
          </html>
        `;

        const { error: emailError } = await resend.emails.send({
          from: `${systemConfig?.resend_from_name || 'Plentum Verify'} <${systemConfig?.resend_from_email || 'onboarding@resend.dev'}>`,
          to: [userProfile.email],
          subject: emailSubject,
          html: emailHtml
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
          errorCount++;
          results.push({ userId, userEmail: userProfile.email, success: false, error: 'Error al enviar correo' });
        } else {
          successCount++;
          results.push({ userId, userEmail: userProfile.email, userName: userProfile.full_name, success: true });

          await supabase
            .from('exam_assignments')
            .update({ status: 'notified', notified_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'pending');

          await supabase.from('exam_email_notifications').insert({
            user_email: userProfile.email,
            user_name: userProfile.full_name,
            exam_title: examInfo?.title || 'Evaluaciones múltiples',
            email_type: 'exam_invitation',
            status: 'sent'
          });
        }

      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
        errorCount++;
        results.push({ userId, success: false, error: userError instanceof Error ? userError.message : 'Error desconocido' });
      }
    }

    console.log(`Exam notifications sent - Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificaciones procesadas. Enviadas: ${successCount}, Errores: ${errorCount}`,
        results,
        summary: { total: userIds.length, successful: successCount, failed: errorCount }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in send-exam-notifications function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error desconocido',
        details: 'Error interno del servidor'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

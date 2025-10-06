import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendHTPInvitationsRequest {
  userIds: string[];
  type: 'individual' | 'massive';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds, type }: SendHTPInvitationsRequest = await req.json();

    console.log(`📨 Procesando envío ${type} para ${userIds.length} usuarios`);

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get system config for email settings
    const { data: systemConfig } = await supabaseAdmin
      .from('system_config')
      .select('*')
      .limit(1)
      .single();

    const fromEmail = systemConfig?.resend_from_email || 'onboarding@resend.dev';
    const fromName = systemConfig?.resend_from_name || 'Plentum Verify';
    const companyName = systemConfig?.system_name || 'Plentum Verify';

    // Get legal notice
    const { data: legalNotice } = await supabaseAdmin
      .from('legal_notice')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    let successCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const userId of userIds) {
      try {
        console.log(`📤 Procesando usuario: ${userId}`);

        // Get user profile
        const { data: user, error: userError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError || !user) {
          console.error(`❌ Error obteniendo usuario ${userId}:`, userError);
          errorCount++;
          results.push({ userId, success: false, error: 'Usuario no encontrado' });
          continue;
        }

        // Create HTP assignment
        const accessId = crypto.randomUUID();
        // Use production domain for access link
        const accessLink = `https://confianza-lms-analytica.lovable.app/htp-exam/${accessId}`;
        
        const { data: assignment, error: assignmentError } = await supabaseAdmin
          .from('htp_assignments')
          .insert({
            user_id: userId,
            assigned_by: userId, // In this context, assuming system assignment
            access_link: accessLink,
            expires_at: null, // No expiration limit for HTP exams
            status: 'pending'
          })
          .select()
          .single();

        if (assignmentError) {
          console.error(`❌ Error creando asignación para ${userId}:`, assignmentError);
          errorCount++;
          results.push({ userId, success: false, error: 'Error creando asignación' });
          continue;
        }

        // Prepare email content
        const userName = user.full_name || 'Estimado/a participante';
        const legalText = (legalNotice?.content || 'Aviso legal no disponible.').replace('[Nombre del usuario]', userName);

        const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Examen HTP - ${companyName}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .instructions { background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .step { margin: 15px 0; padding: 10px; border-left: 4px solid #2196f3; }
    .legal-notice { background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; font-size: 0.9em; }
    .button { background-color: #2196f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎨 Examen HTP - Evaluación Proyectiva</h1>
    <h2>Hola ${userName}</h2>
    <p>Es un gusto que participes con nosotros en este proceso de selección, deseamos que puedas colaborar con nosotros, por lo que te pedimos sigas las siguientes instrucciones al pie de la letra ya que forman parte de la evaluación.</p>
  </div>

  <div class="instructions">
    <h3>📝 Instrucciones del Examen</h3>
    
    <div class="step">
      <h4>1️⃣ Dibuja una persona bajo la lluvia</h4>
      <p>En una hoja blanca tamaño carta, dibuja una persona bajo la lluvia.<br>
      Al terminar, escribe debajo una breve explicación de lo que significa para ti ese dibujo.</p>
    </div>

    <div class="step">
      <h4>2️⃣ Agrega tu compromiso personal</h4>
      <p>En la misma hoja blanca coloca el siguiente texto con tu puño y letra:<br>
      <strong>'Yo, ${userName}, me comprometo a dar lo mejor de mí en este trabajo'.</strong></p>
    </div>

    <div class="step">
      <h4>3️⃣ Firma al final</h4>
      <p>Firma al final de la hoja.</p>
    </div>

    <div class="step">
      <h4>4️⃣ Toma la fotografía y súbela</h4>
      <p>Toma una foto clara donde se debe ver toda la hoja. No importa que se vea parte de la superficie donde descansa la hoja y súbela en el enlace enviado.</p>
    </div>
  </div>

  <div style="text-align: center;">
    <a href="${accessLink}" class="button">🔗 Acceder al Examen HTP</a>
  </div>

  <div class="legal-notice">
    <h3>⚖️ Aviso Legal y Consentimiento Informado</h3>
    <div style="white-space: pre-line;">${legalText}</div>
  </div>

  <div class="footer">
    <p><strong>${companyName}</strong></p>
    <p>Este es un mensaje automático, por favor no responda a este correo.</p>
    <p>Si tienes dudas, contacta al área de Recursos Humanos.</p>
  </div>
</body>
</html>
        `;

        // Send email
        const emailResponse = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [user.email],
          subject: `🎨 Examen HTP - ${companyName} | Instrucciones Importantes`,
          html: emailContent,
        });

        if (emailResponse.error) {
          console.error(`❌ Error enviando email a ${user.email}:`, emailResponse.error);
          errorCount++;
          results.push({ 
            userId, 
            success: false, 
            error: `Error enviando email: ${emailResponse.error instanceof Error ? emailResponse.error.message : 'Unknown email error'}` 
          });
        } else {
          console.log(`✅ Email enviado exitosamente a ${user.email}`);
          
          // Update assignment status
          await supabaseAdmin
            .from('htp_assignments')
            .update({ email_sent: true, status: 'notified' })
            .eq('id', assignment.id);

          successCount++;
          results.push({ 
            userId, 
            success: true, 
            email: user.email,
            assignmentId: assignment.id 
          });
        }

      } catch (error: any) {
        console.error(`❌ Error procesando usuario ${userId}:`, error);
        errorCount++;
        results.push({ 
          userId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`📊 Resumen: ${successCount} exitosos, ${errorCount} errores`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total: userIds.length,
        successful: successCount,
        errors: errorCount
      },
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error en send-htp-invitations:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds, examId, assignedBy } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds array is required' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (!examId || !assignedBy) {
      return new Response(
        JSON.stringify({ error: 'examId and assignedBy are required' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    const resend = new Resend(resendApiKey);

    // Get exam details - handle special turnover exam
    let examData: { title: string; description: string; duracion_minutos: number };
    let isTurnoverExam = false;
    
    if (examId === 'TURNOVER_EXAM_SPECIAL') {
      // Examen especial de rotación de personal
      examData = {
        title: 'Examen de Rotación de Personal',
        description: 'Evaluación de riesgo de rotación de personal',
        duracion_minutos: 30
      };
      isTurnoverExam = true;
    } else {
      // Buscar examen regular en la base de datos
      const { data: dbExamData, error: examError } = await supabase
        .from('exams')
        .select('title, description, duracion_minutos')
        .eq('id', examId)
        .single();

      if (examError || !dbExamData) {
        return new Response(
          JSON.stringify({ error: 'Examen no encontrado' }),
          { 
            status: 404, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }
      examData = dbExamData;
    }

    // Get system configuration
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
        // Get user profile
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('id, full_name, email, company, area')
          .eq('id', userId)
          .single();

        if (userError || !userProfile) {
          console.error(`User not found: ${userId}`, userError);
          errorCount++;
          results.push({
            userId,
            success: false,
            error: 'Usuario no encontrado'
          });
          continue;
        }

        // Create exam assignment - handle turnover with null exam_id
        let assignment;
        let assignmentError;
        
        if (isTurnoverExam) {
          // Para examen de rotación, crear asignación con exam_id NULL y test_type 'turnover'
          console.log('✅ Creating turnover exam assignment with exam_id=NULL');
          const result = await supabase
            .from('exam_assignments')
            .insert({
              exam_id: null, // NULL para examen de rotación
              user_id: userId,
              test_type: 'turnover',
              status: 'pending',
              assigned_by: assignedBy
            })
            .select()
            .single();
          
          assignment = result.data;
          assignmentError = result.error;
        } else {
          // Para exámenes regulares, crear asignación normal
          const result = await supabase
            .from('exam_assignments')
            .insert({
              exam_id: examId,
              user_id: userId,
              test_type: 'reliability',
              status: 'pending',
              assigned_by: assignedBy
            })
            .select()
            .single();
          
          assignment = result.data;
          assignmentError = result.error;
        }

        if (assignmentError) {
          console.error('Error creating assignment:', assignmentError);
          errorCount++;
          results.push({
            userId,
            success: false,
            error: 'Error al crear asignación'
          });
          continue;
        }

        // Create automatic psychometric assignments
        await supabase
          .from('exam_assignments')
          .insert({
            user_id: userId,
            test_type: 'psychometric',
            psychometric_test_id: 'cd20752e-4bfd-40a5-b425-8bd437983a56', // Ocean Five
            status: 'pending',
            assigned_by: assignedBy
          });

        // Create HTP assignment
        await supabase
          .from('htp_assignments')
          .insert({
            user_id: userId,
            assigned_by: assignedBy,
            access_link: `htp-exam/${crypto.randomUUID()}`,
            status: 'pending'
          });

        // Get or create exam credentials for this user
        let credentials = null;
        const { data: existingCredentials } = await supabase
          .from('exam_credentials')
          .select('username, password_hash')
          .eq('user_email', userProfile.email)
          .eq('test_type', 'reliability')
          .limit(1)
          .maybeSingle();

        if (existingCredentials) {
          credentials = existingCredentials;
        } else {
          // Generate new credentials
          const username = Math.random().toString(36).substring(2, 10).toUpperCase();
          const password = generateTempPassword();
          
          const { data: newCredentials, error: credError } = await supabase
            .from('exam_credentials')
            .insert({
              user_email: userProfile.email,
              username: username,
              password_hash: password,
              full_name: userProfile.full_name,
              test_type: 'reliability',
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            })
            .select('username, password_hash')
            .single();

          if (credError) {
            console.error('Error creating credentials:', credError);
            errorCount++;
            results.push({
              userId,
              success: false,
              error: 'Error al crear credenciales'
            });
            continue;
          }

          credentials = newCredentials;
        }

        // Create access URL with preloaded credentials
        const baseUrl = Deno.env.get('SUPABASE_URL')?.includes('localhost') 
          ? 'http://localhost:5173' 
          : 'https://preview--confianza-lms-analytica.lovable.app';
        const accessUrl = `${baseUrl}/exam-access?username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password_hash)}`;

        // Prepare email content
        const emailSubject = `Invitación para realizar: ${examData.title}`;
        
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
              .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .highlight { color: #1e40af; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎯 Evaluación de Confiabilidad</h1>
              <p>Plentum Verify - Sistema de Evaluación</p>
            </div>
            
            <div class="content">
              <p>Estimado(a) <strong>${userProfile.full_name}</strong>,</p>
              
              <p>Ha sido seleccionado(a) para participar en una evaluación de confiabilidad: <strong>${examData.title}</strong></p>
              
              ${examData.description ? `<p><em>${examData.description}</em></p>` : ''}
              
              <p>Duración estimada: <strong>${examData.duracion_minutos || 60} minutos</strong></p>
              
              <div class="credentials">
                <h3>🔐 Credenciales de Acceso</h3>
                <p><span class="highlight">Usuario:</span> ${credentials.username}</p>
                <p><span class="highlight">Contraseña:</span> ${credentials.password_hash}</p>
                <p><span class="highlight">Enlace de acceso:</span></p>
                <a href="${accessUrl}" class="button" target="_blank">Acceder al Sistema de Evaluación</a>
                <p><small>Al hacer clic en el enlace, tus credenciales se cargarán automáticamente</small></p>
              </div>
              
              <p><strong>Nota importante:</strong> Esta evaluación incluye múltiples componentes (confiabilidad, personalidad y dibujo HTP) que se completarán de manera secuencial.</p>
              
              <p>Si tiene alguna pregunta o inconveniente técnico, no dude en contactarnos.</p>
              
              <p>¡Le deseamos el mejor de los éxitos!</p>
              
              <p>Atentamente,<br>
              <strong>Equipo de Recursos Humanos</strong><br>
              ${systemConfig?.contact_email || 'contacto@plentumverify.com'}</p>
            </div>
            
            <div class="footer">
              <p>Plentum Verify - Sistema de Evaluación Profesional</p>
              <p>Este es un correo automático, por favor no responda directamente.</p>
            </div>
          </body>
          </html>
        `;

        // Send email using Resend
        const { error: emailError } = await resend.emails.send({
          from: `${systemConfig?.resend_from_name || 'Plentum Verify'} <${systemConfig?.resend_from_email || 'onboarding@resend.dev'}>`,
          to: [userProfile.email],
          subject: emailSubject,
          html: emailHtml
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
          errorCount++;
          results.push({
            userId,
            userEmail: userProfile.email,
            success: false,
            error: 'Error al enviar correo'
          });
        } else {
          successCount++;
          results.push({
            userId,
            userEmail: userProfile.email,
            userName: userProfile.full_name,
            success: true
          });

          // Update assignment status to notified
          await supabase
            .from('exam_assignments')
            .update({ status: 'notified', notified_at: new Date().toISOString() })
            .eq('id', assignment.id);

          // Log the email notification
          await supabase.from('exam_email_notifications').insert({
            user_email: userProfile.email,
            user_name: userProfile.full_name,
            exam_title: examData.title,
            email_type: 'exam_invitation',
            status: 'sent',
            exam_assignment_id: assignment.id
          });
        }

      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
        errorCount++;
        results.push({
          userId,
          success: false,
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
      }
    }

    console.log(`Mass exam assignments sent - Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Asignaciones masivas procesadas. Enviados: ${successCount}, Errores: ${errorCount}`,
        results,
        summary: {
          total: userIds.length,
          successful: successCount,
          failed: errorCount
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Error in send-mass-exam-assignments function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Error interno del servidor'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
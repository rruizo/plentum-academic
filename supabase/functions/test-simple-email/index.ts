import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  email: string;
  testType?: 'simple' | 'complex';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, testType = 'simple' }: TestEmailRequest = await req.json();

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY no configurada');
    }

    const resend = new Resend(resendApiKey);

    console.log(`🧪 [TEST-EMAIL] Enviando email de prueba a: ${email}`);
    console.log(`🧪 [TEST-EMAIL] Tipo de prueba: ${testType}`);

    const emailData = testType === 'simple' ? {
      from: 'Plentum Academic <examen@plentum-academic.com.mx>',
      to: [email],
      subject: '🧪 Prueba Simple - Sistema de Correos',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #333;">✅ Prueba de Correo Simple</h2>
          <p>Este es un email de prueba simple para verificar la entrega.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
          <p><strong>Remitente:</strong> examen@plentum-academic.com.mx</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Si recibe este correo, la configuración básica está funcionando.
          </p>
        </div>
      `
    } : {
      from: 'Plentum Academic <examen@plentum-academic.com.mx>',
      to: [email],
      subject: '🎯 Prueba Compleja - Invitación a Evaluación',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Invitación a Evaluación</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎯 Evaluación de Confiabilidad</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Plentum Academic - Sistema de Evaluación</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Hola Usuario de Prueba,</h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; line-height: 1.6;">Esta es una prueba del formato completo de correo con estilos avanzados.</p>
            </div>
            
            <div style="background: #667eea; color: white; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <h3 style="margin: 0 0 10px 0;">📋 Información del Examen</h3>
              <p style="margin: 0; font-size: 18px; font-weight: bold;">Examen de Prueba</p>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">ID: test-123</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="margin: 0 0 10px 0; color: #1976d2;">📋 Instrucciones:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #333;">
                <li>Esta es solo una prueba de formato</li>
                <li>Verifique si llega a bandeja o spam</li>
                <li>Compare con la prueba simple</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; margin: 0;">Prueba de correo complejo</p>
              <p style="color: #666; margin: 10px 0 0 0;">
                Atentamente,<br>
                <strong>Equipo de Recursos Humanos - Plentum Academic</strong>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log(`📧 [TEST-EMAIL] Enviando con datos:`, {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject
    });

    const result = await resend.emails.send(emailData);
    
    console.log(`📨 [TEST-EMAIL] Resultado:`, JSON.stringify(result, null, 2));

    if (result.error) {
      throw new Error(`Error de Resend: ${JSON.stringify(result.error)}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Email de prueba enviado a ${email}`,
      testType,
      resendId: result.data?.id,
      timestamp: new Date().toISOString(),
      recommendations: [
        "1. Revise su bandeja de entrada",
        "2. Revise la carpeta de SPAM/JUNK",
        "3. Revise filtros corporativos si aplica",
        "4. Compare con la prueba simple vs compleja"
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error(`❌ [TEST-EMAIL] Error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);

import { supabase } from '@/integrations/supabase/client';
import { createFallbackNotification, generateManualDeliveryInstructions } from './FallbackEmailService';

interface SendEmailParams {
  assignmentId: string;
  userEmail: string;
  userName: string;
  examTitle: string;
  accessLink: string;
  credentials?: { username: string; password_hash: string } | null;
  examDetails?: {
    fechaCierre?: string;
    fechaApertura?: string;
  };
  sessionLinks?: Array<{
    email: string;
    sessionId: string;
    full_name: string;
  }>;
}

interface EmailResult {
  success: boolean;
  error?: string;
  userEmail?: string;
  notificationId?: string;
  resendId?: string;
  requiresManualDelivery?: boolean;
  manualDeliveryInstructions?: string;
  troubleshooting?: any;
}

const isResendDomainRestrictionError = (error: string): boolean => {
  return error.includes('You can only send testing emails to your own email address') ||
         error.includes('verify a domain at resend.com/domains');
};

export const sendExamInvitationEmail = async (params: SendEmailParams): Promise<EmailResult> => {
  let notificationId: string | null = null;
  
  try {
    console.log(`[EmailService] 🚀 INICIANDO envío para: ${params.userEmail}`);
    console.log(`[EmailService] 📋 Parámetros:`, {
      assignmentId: params.assignmentId,
      userEmail: params.userEmail,
      userName: params.userName,
      examTitle: params.examTitle,
      hasCredentials: !!params.credentials
    });
    
    // Registrar la notificación en la base de datos
    const { data: notificationData, error: dbError } = await supabase
      .from('exam_email_notifications')
      .insert({
        exam_assignment_id: params.assignmentId,
        user_email: params.userEmail,
        user_name: params.userName,
        exam_title: params.examTitle,
        email_type: 'exam_invitation',
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error(`[EmailService] ❌ Error en BD para ${params.userEmail}:`, dbError);
      throw new Error(`Error al registrar notificación: ${dbError.message}`);
    }

    notificationId = notificationData.id;
    console.log(`[EmailService] ✅ Notificación registrada: ${notificationId}`);

    // Preparar mensaje
    const message = `Estimado/a ${params.userName},

¡Esperamos que se encuentre muy bien!

Le escribimos para informarle que ha sido seleccionado/a para participar en una evaluación como parte de nuestro riguroso proceso de selección.

🎯 INSTRUCCIONES IMPORTANTES:
• Busque un lugar tranquilo y libre de distracciones
• Asegúrese de contar con una conexión estable a internet
• La evaluación debe completarse en una sola sesión continua
• Responda de manera honesta y espontánea a todas las preguntas

🔐 ACCESO AL EXAMEN:
Puede acceder directamente haciendo clic en el siguiente enlace:
${params.accessLink}

${params.credentials ? `
👤 SUS CREDENCIALES DE ACCESO:
Usuario: ${params.credentials.username}
Contraseña: ${params.credentials.password_hash}

⚠️ Estas credenciales solo pueden utilizarse una vez.
` : ''}

📞 SOPORTE:
Si experimenta alguna dificultad técnica o tiene preguntas, no dude en contactarnos de inmediato.

¡Le deseamos mucho éxito en su evaluación!

Atentamente,
Equipo de Recursos Humanos
Plentum Verify`;

    console.log(`[EmailService] 📧 PREPARANDO envío a: ${params.userEmail}`);
    
    // LLAMADA A la función edge
    console.log(`[EmailService] 🚀 INVOCANDO edge function...`);
    console.log(`[EmailService] 📤 PARÁMETROS PARA EDGE FUNCTION:`, {
      emails: [params.userEmail],
      subject: `🎯 Evaluación - ${params.examTitle}`,
      examTitle: params.examTitle,
      examId: params.assignmentId,
      fechaCierre: params.examDetails?.fechaCierre,
      fechaApertura: params.examDetails?.fechaApertura
    });
    
    const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-exam-notifications', {
        body: {
          emails: [params.userEmail],
          subject: `🎯 Evaluación - ${params.examTitle}`,
          message: message,
          examDetails: {
            title: params.examTitle,
            testType: 'reliability',
            testId: params.assignmentId,
            fechaCierre: params.examDetails?.fechaCierre,
            fechaApertura: params.examDetails?.fechaApertura
          },
          credentials: params.credentials ? [{
            email: params.userEmail,
            username: params.credentials.username,
            password: params.credentials.password_hash,
            full_name: params.userName
          }] : undefined,
          sessionLinks: params.sessionLinks || undefined
        }
    });

    console.log(`[EmailService] 📡 RESPUESTA completa de edge function:`, {
      data: emailResponse,
      error: emailError,
      timestamp: new Date().toISOString()
    });

    // MANEJO DE ERRORES DE EDGE FUNCTION
    if (emailError) {
      console.error(`[EmailService] ❌ ERROR en edge function:`, emailError);
      
      await supabase
        .from('exam_email_notifications')
        .update({ 
          status: 'failed',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      return {
        success: false,
        error: `Error en servicio de correo: ${emailError.message}`,
        userEmail: params.userEmail,
        notificationId: notificationId || undefined,
        troubleshooting: {
          step: "edge_function_invocation",
          edgeError: emailError,
          recommendation: "Verificar logs de la edge function"
        }
      };
    }

    // VALIDACIÓN DE RESPUESTA
    if (!emailResponse) {
      console.error(`[EmailService] ❌ Respuesta VACÍA del servicio`);
      
      await supabase
        .from('exam_email_notifications')
        .update({ 
          status: 'failed',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      return {
        success: false,
        error: 'El servicio de correo no devolvió respuesta',
        userEmail: params.userEmail,
        notificationId: notificationId || undefined
      };
    }

    // DETECTAR ERRORES ESPECÍFICOS DE RESEND CON ANÁLISIS MEJORADO
    if (!emailResponse.success && emailResponse.errorAnalysis) {
      console.log(`[EmailService] 📊 Análisis de errores de Resend:`, emailResponse.errorAnalysis);
      
      // Detectar diferentes tipos de errores
      const hasConfigurationError = emailResponse.errorAnalysis.configuration > 0;
      const hasDomainError = emailResponse.errorAnalysis.domain_verification > 0;
      const hasTestingRestriction = emailResponse.errorAnalysis.testing_restriction > 0;
      const hasRateLimit = emailResponse.errorAnalysis.rate_limit > 0;
      
      let errorType = "unknown";
      let userMessage = "Error en servicio de correo";
      let recommendation = "Contactar soporte técnico";
      
      if (hasConfigurationError) {
        errorType = "configuration";
        userMessage = "Error de configuración de Resend";
        recommendation = "Verificar API Key de Resend";
      } else if (hasDomainError) {
        errorType = "domain_verification";
        userMessage = "Dominio de envío no verificado";
        recommendation = "Verificar dominio en resend.com/domains";
      } else if (hasTestingRestriction) {
        errorType = "testing_restriction";
        userMessage = "Restricción del tier gratuito de Resend";
        recommendation = "Usar email propio para pruebas o verificar dominio";
      } else if (hasRateLimit) {
        errorType = "rate_limit";
        userMessage = "Límite de envío excedido";
        recommendation = "Esperar 24h o actualizar plan de Resend";
      }
      
      console.log(`[EmailService] 🔄 Error categorizado como: ${errorType}, activando entrega manual`);
      
      // Crear notificación alternativa para todos estos casos
      const fallbackResult = await createFallbackNotification(params);
      
      await supabase
        .from('exam_email_notifications')
        .update({ 
          status: 'requires_manual_delivery',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      return {
        success: false,
        error: `Entrega manual requerida: ${userMessage}`,
        userEmail: params.userEmail,
        notificationId: notificationId || undefined,
        requiresManualDelivery: true,
        manualDeliveryInstructions: generateManualDeliveryInstructions(params),
        troubleshooting: {
          step: "resend_error_detected",
          errorType: errorType,
          issue: userMessage,
          solution: "manual_delivery_activated",
          recommendation: recommendation,
          detailedErrors: emailResponse.errorAnalysis,
          troubleshootingSteps: emailResponse.troubleshooting
        }
      };
    }
    
    // DETECTAR ERROR GENÉRICO DE RESTRICCIÓN DE DOMINIO (fallback)
    if (!emailResponse.success && emailResponse.errors) {
      const errorMessage = emailResponse.errors.join(', ');
      
      if (isResendDomainRestrictionError(errorMessage)) {
        console.log(`[EmailService] 🔄 Detectado error de restricción de dominio (método legacy), activando entrega manual`);
        
        // Crear notificación alternativa
        const fallbackResult = await createFallbackNotification(params);
        
        await supabase
          .from('exam_email_notifications')
          .update({ 
            status: 'requires_manual_delivery',
            sent_at: new Date().toISOString()
          })
          .eq('id', notificationId);

        return {
          success: false,
          error: `Entrega manual requerida debido a limitaciones del tier gratuito de Resend`,
          userEmail: params.userEmail,
          notificationId: notificationId || undefined,
          requiresManualDelivery: true,
          manualDeliveryInstructions: generateManualDeliveryInstructions(params),
          troubleshooting: {
            step: "resend_domain_restriction_legacy",
            issue: "free_tier_limitation",
            solution: "manual_delivery_created",
            recommendation: "Verificar dominio en resend.com/domains para entregas automáticas futuras"
          }
        };
      }
    }

    // ANÁLISIS DE ÉXITO/FALLO NORMAL
    if (!emailResponse.success) {
      console.error(`[EmailService] ❌ Servicio reportó FALLA:`, emailResponse);
      
      // Revisar si cualquier error sugiere problemas de dominio/configuración de Resend
      const errorDetails = emailResponse.errors ? emailResponse.errors.join(', ') : '';
      const shouldTriggerManualDelivery = 
        errorDetails.includes('Error desconocido de Resend') ||
        errorDetails.includes('403') ||
        errorDetails.includes('domain') ||
        errorDetails.includes('testing emails') ||
        emailResponse.recommendations?.some((rec: string) => 
          rec.includes('dominio') || rec.includes('plan de pago')
        );

      if (shouldTriggerManualDelivery) {
        console.log(`[EmailService] 🔄 Error de Resend detectado, activando entrega manual`);
        
        // Crear notificación alternativa
        const fallbackResult = await createFallbackNotification(params);
        
        await supabase
          .from('exam_email_notifications')
          .update({ 
            status: 'requires_manual_delivery',
            sent_at: new Date().toISOString()
          })
          .eq('id', notificationId);

        return {
          success: false,
          error: `Entrega manual requerida debido a limitaciones de configuración de correo`,
          userEmail: params.userEmail,
          notificationId: notificationId || undefined,
          requiresManualDelivery: true,
          manualDeliveryInstructions: generateManualDeliveryInstructions(params),
          troubleshooting: {
            step: "email_service_limitation",
            issue: "configuration_or_domain_issue",
            solution: "manual_delivery_activated",
            recommendation: "Verificar configuración de Resend y dominio verificado"
          }
        };
      }
      
      await supabase
        .from('exam_email_notifications')
        .update({ 
          status: 'failed',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);
      
      return {
        success: false,
        error: `Falla en envío de correo.${errorDetails ? ` Detalles: ${errorDetails}` : ''}`,
        userEmail: params.userEmail,
        notificationId: notificationId || undefined,
        troubleshooting: {
          step: "service_reported_failure",
          serviceResponse: emailResponse
        }
      };
    }

    // VERIFICAR CONTEO DE FALLOS
    if (emailResponse.failed > 0) {
      console.error(`[EmailService] ⚠️ ENVÍOS FALLIDOS: ${emailResponse.failed}/${emailResponse.total}`);
      
      await supabase
        .from('exam_email_notifications')
        .update({ 
          status: 'failed',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      return {
        success: false,
        error: `${emailResponse.failed} de ${emailResponse.total} correos fallaron`,
        userEmail: params.userEmail,
        notificationId: notificationId || undefined
      };
    }

    // ¡ÉXITO CONFIRMADO!
    console.log(`[EmailService] ✅ CORREO ENVIADO EXITOSAMENTE:`, {
      email: params.userEmail,
      sent: emailResponse.sent,
      total: emailResponse.total,
      resendIds: emailResponse.successfulIds
    });

    // Actualizar estado a exitoso
    const { error: updateError } = await supabase
      .from('exam_email_notifications')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (updateError) {
      console.warn(`[EmailService] ⚠️ Error actualizando estado (pero email SÍ se envió):`, updateError);
    }

    return { 
      success: true, 
      userEmail: params.userEmail, 
      notificationId: notificationId,
      resendId: emailResponse.successfulIds?.[0] || undefined
    };

  } catch (error) {
    console.error(`[EmailService] ❌ ERROR CRÍTICO para ${params.userEmail}:`, error);
    
    // Marcar notificación como fallida si existe
    if (notificationId) {
      try {
        await supabase
          .from('exam_email_notifications')
          .update({ 
            status: 'failed',
            sent_at: new Date().toISOString()
          })
          .eq('id', notificationId);
      } catch (updateError) {
        console.error(`[EmailService] ❌ Error actualizando notificación fallida:`, updateError);
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error crítico desconocido en envío de correo',
      userEmail: params.userEmail,
      notificationId: notificationId || undefined
    };
  }
};


import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FallbackNotificationParams {
  assignmentId: string;
  userEmail: string;
  userName: string;
  examTitle: string;
  accessLink: string;
  credentials?: { username: string; password_hash: string } | null;
}

interface FallbackResult {
  success: boolean;
  method: 'email' | 'notification' | 'manual';
  message: string;
  data?: any;
}

export const createFallbackNotification = async (params: FallbackNotificationParams): Promise<FallbackResult> => {
  console.log(`[FallbackService] 🔄 Creando notificación alternativa para: ${params.userEmail}`);
  
  try {
    // Crear notificación en la base de datos para el usuario
    const { data: notificationData, error: notificationError } = await supabase
      .from('exam_email_notifications')
      .insert({
        exam_assignment_id: params.assignmentId,
        user_email: params.userEmail,
        user_name: params.userName,
        exam_title: params.examTitle,
        email_type: 'exam_invitation_fallback',
        status: 'pending_manual_delivery'
      })
      .select()
      .single();

    if (notificationError) {
      throw new Error(`Error al crear notificación: ${notificationError.message}`);
    }

    console.log(`[FallbackService] ✅ Notificación alternativa creada para: ${params.userEmail}`);

    return {
      success: true,
      method: 'notification',
      message: `Información del examen guardada para entrega manual a ${params.userName}`,
      data: {
        notificationId: notificationData.id
      }
    };

  } catch (error) {
    console.error('[FallbackService] ❌ Error en notificación alternativa:', error);
    return {
      success: false,
      method: 'manual',
      message: `Error al crear notificación alternativa: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
};

export const generateManualDeliveryInstructions = (params: FallbackNotificationParams): string => {
  return `
📧 INFORMACIÓN DE EXAMEN PARA ENTREGA MANUAL

👤 Destinatario: ${params.userName}
📩 Email: ${params.userEmail}
📋 Examen: ${params.examTitle}

🔗 ENLACE DE ACCESO:
${params.accessLink}

${params.credentials ? `
🔐 CREDENCIALES DE ACCESO:
Usuario: ${params.credentials.username}
Contraseña: ${params.credentials.password_hash}
` : ''}

⚠️ INSTRUCCIONES PARA EL EVALUADO:
1. Haga clic en el enlace de acceso
2. Use las credenciales proporcionadas para ingresar
3. Complete el examen en una sola sesión
4. Contacte al instructor si tiene problemas técnicos

📞 Esta información debe ser enviada manualmente al evaluado por el medio de comunicación disponible (WhatsApp, llamada telefónica, correo personal, etc.)
  `.trim();
};

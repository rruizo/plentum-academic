import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchEvaluatedUsers, validateAssignment, forceCleanupAssignments } from './userManagement';
import type { User, AssignmentResult } from './types';

export const processExamAssignment = async (
  examId: string,
  examTitle: string,
  selectedUserIds: string[],
  allUsers: User[],
  currentUserId: string
): Promise<AssignmentResult[]> => {
  console.log(`[ExamAssignment] Starting assignment for ${selectedUserIds.length} users`);
  console.log(`[ExamAssignment] Exam: ${examTitle} (${examId})`);

  // Obtener información completa del examen para las fechas
  console.log(`[ExamAssignment] Fetching exam details for dates`);
  const { data: examData, error: examError } = await supabase
    .from('exams')
    .select('fecha_cierre, fecha_apertura, title, type')
    .eq('id', examId)
    .single();

  let examDetails = null;
  if (!examError && examData) {
    examDetails = {
      fechaCierre: examData.fecha_cierre,
      fechaApertura: examData.fecha_apertura
    };
    console.log(`[ExamAssignment] Exam expires: ${examData.fecha_cierre}`);
  } else {
    console.warn(`[ExamAssignment] Could not fetch exam details:`, examError);
  }

  const results: AssignmentResult[] = [];

  for (const userIdentifier of selectedUserIds) {
    // Determinar si es un email o un ID
    const isEmailInput = userIdentifier.includes('@');
    
    // Buscar usuario por email o por ID según corresponda
    const user = isEmailInput 
      ? allUsers.find(u => u.email === userIdentifier)
      : allUsers.find(u => u.id === userIdentifier);
    
    if (!user) {
      console.warn(`[ExamAssignment] User not found: ${userIdentifier}`);
      
      // Si estamos procesando un email pero el usuario no está en la BD
      if (isEmailInput) {
        console.log(`[ExamAssignment] Email provided but user not found: ${userIdentifier}. Creating session for manual delivery.`);
        
        try {
          // Verificar si ya existe una sesión para este usuario y examen
          const { data: existingSession } = await supabase
            .from('exam_sessions')
            .select('id')
            .eq('exam_id', examId)
            .eq('user_id', userIdentifier)
            .maybeSingle();

          let sessionId: string;

          if (existingSession) {
            console.log(`[ExamAssignment] Using existing session for ${userIdentifier}: ${existingSession.id}`);
            sessionId = existingSession.id;
          } else {
            // Crear una sesión temporal para el usuario no registrado
            const { data: sessionData, error: sessionError } = await supabase
              .from('exam_sessions')
              .insert({
                exam_id: examId,
                user_id: userIdentifier, // Temporalmente usamos el email como user_id para usuarios no registrados
                status: 'pending',
                attempts_taken: 0,
                max_attempts: 2
              })
              .select('id')
              .single();

            if (sessionError) {
              throw sessionError;
            }
            
            console.log(`[ExamAssignment] Created new session for ${userIdentifier}: ${sessionData.id}`);
            sessionId = sessionData.id;
          }

          const examLink = `${window.location.origin}/examen/${sessionId}`;
          
          // Generar instrucciones de entrega manual con enlace real
          const manualInstructions = `
Información del Examen:
- Título: ${examTitle}
- Usuario: ${userIdentifier}
- Enlace de acceso: ${examLink}

Instrucciones para el evaluado:
1. Acceda al enlace proporcionado: ${examLink}
2. Complete el examen en el tiempo asignado
3. El enlace es único y personal para este evaluado

Por favor, entregue esta información al usuario de forma manual.
          `.trim();
          
          results.push({
            success: false,
            userId: userIdentifier,
            userName: userIdentifier,
            userEmail: userIdentifier,
            error: 'Usuario no encontrado - requiere entrega manual',
            requiresManualDelivery: true,
            manualDeliveryInstructions: manualInstructions,
            assignmentId: sessionId
          });
        } catch (error: any) {
          console.error(`[ExamAssignment] Error creating session for ${userIdentifier}:`, error);
          
          // Incluso si falla la creación de sesión, se considera para entrega manual
          const fallbackLink = `${window.location.origin}/examen/new?email=${encodeURIComponent(userIdentifier)}&exam=${examId}`;
          const manualInstructions = `
Información del Examen:
- Título: ${examTitle}
- Usuario: ${userIdentifier}
- Error técnico: No se pudo crear sesión automática
- Contacte al administrador con el email: ${userIdentifier}

Por favor, entregue esta información al usuario de forma manual y solicite al administrador que genere el enlace de acceso.
          `.trim();
          
          results.push({
            success: false,
            userId: userIdentifier,
            userName: userIdentifier,
            userEmail: userIdentifier,
            error: 'Error al crear sesión del examen - requiere entrega manual',
            requiresManualDelivery: true,
            manualDeliveryInstructions: manualInstructions
          });
        }
      } else {
        results.push({
          success: false,
          userId: userIdentifier,
          userName: 'Usuario no encontrado',
          userEmail: 'N/A',
          error: 'Usuario no encontrado en la lista'
        });
      }
      continue;
    }

    console.log(`[ExamAssignment] Processing user: ${user.full_name} (${user.email})`);
    console.log(`[ExamAssignment] User ID: ${user.id}, Email: ${user.email}`);

    // Determinar si este es un usuario real de la BD o un usuario temporal de email
    const isRealUser = user.id && !user.id.startsWith('email-');
    
    if (!isRealUser) {
      console.log(`[ExamAssignment] User ${user.email} is not registered in database, creating session for manual delivery`);
      
      try {
        // Verificar si ya existe una sesión para este email
        const { data: existingSession } = await supabase
          .from('exam_sessions')
          .select('id')
          .eq('exam_id', examId)
          .eq('user_id', user.email) // Usar email como user_id para usuarios no registrados
          .maybeSingle();

        let sessionId: string;

        if (existingSession) {
          console.log(`[ExamAssignment] Using existing session for ${user.email}: ${existingSession.id}`);
          sessionId = existingSession.id;
        } else {
          // Crear una sesión temporal para el usuario no registrado
          const { data: sessionData, error: sessionError } = await supabase
            .from('exam_sessions')
            .insert({
              exam_id: examId,
              user_id: user.email, // Usar email como user_id para usuarios no registrados
              status: 'pending',
              attempts_taken: 0,
              max_attempts: 2
            })
            .select('id')
            .single();

          if (sessionError) {
            throw sessionError;
          }
          
          console.log(`[ExamAssignment] Created new session for ${user.email}: ${sessionData.id}`);
          sessionId = sessionData.id;
        }

        const examLink = `${window.location.origin}/examen/${sessionId}`;
        
        // Generar instrucciones de entrega manual con enlace real
        const manualInstructions = `
Información del Examen:
- Título: ${examTitle}
- Usuario: ${user.email}
- Enlace de acceso: ${examLink}

Instrucciones para el evaluado:
1. Acceda al enlace proporcionado: ${examLink}
2. Complete el examen en el tiempo asignado
3. El enlace es único y personal para este evaluado

Por favor, entregue esta información al usuario de forma manual.
        `.trim();
        
        results.push({
          success: false,
          userId: userIdentifier,
          userName: user.full_name,
          userEmail: user.email,
          error: 'Usuario no registrado - requiere entrega manual',
          requiresManualDelivery: true,
          manualDeliveryInstructions: manualInstructions,
          assignmentId: sessionId
        });
        continue;
        
      } catch (error: any) {
        console.error(`[ExamAssignment] Error creating session for unregistered user ${user.email}:`, error);
        
        const manualInstructions = `
Información del Examen:
- Título: ${examTitle}
- Usuario: ${user.email}
- Error técnico: No se pudo crear sesión automática
- Contacte al administrador con el email: ${user.email}

Por favor, entregue esta información al usuario de forma manual y solicite al administrador que genere el enlace de acceso.
        `.trim();
        
        results.push({
          success: false,
          userId: userIdentifier,
          userName: user.full_name,
          userEmail: user.email,
          error: 'Error al crear sesión para usuario no registrado - requiere entrega manual',
          requiresManualDelivery: true,
          manualDeliveryInstructions: manualInstructions
        });
        continue;
      }
    }

    try {
      // Este es un usuario real de la BD - proceder con flujo normal
      const actualUserId = user.id;
      
      if (!actualUserId) {
        console.error(`[ExamAssignment] User ID is undefined for ${user.email}`);
        results.push({
          success: false,
          userId: userIdentifier,
          userName: user.full_name,
          userEmail: user.email,
          error: 'ID de usuario no válido'
        });
        continue;
      }
      
      console.log(`[ExamAssignment] Force cleaning existing assignments for ${user.email} (ID: ${actualUserId})`);
      await forceCleanupAssignments(actualUserId, examId);

      // NUEVO: Reiniciar contador de intentos y registrar en logs
      console.log(`[ExamAssignment] Resetting attempts and logging for ${user.email}`);
      await resetUserAttemptsAndLog(actualUserId, examId, currentUserId, user.full_name, examTitle);

      // Validate no existing assignments
      const validation = await validateAssignment(actualUserId, examId);
      if (!validation.isValid) {
        console.error(`[ExamAssignment] Validation failed for ${user.email}:`, validation.error);
        results.push({
          success: false,
          userId: userIdentifier,
          userName: user.full_name,
          userEmail: user.email,
          error: `Validación fallida: ${validation.error}`
        });
        continue;
      }

      // Create assignment
      console.log(`[ExamAssignment] Creating NEW assignment for ${user.email}`);
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('exam_assignments')
        .insert({
          exam_id: examId,
          user_id: actualUserId,
          assigned_by: currentUserId,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .select()
        .single();

      if (assignmentError) {
        console.error(`[ExamAssignment] Assignment creation failed for ${user.email}:`, assignmentError);
        results.push({
          success: false,
          userId: userIdentifier,
          userName: user.full_name,
          userEmail: user.email,
          error: `Error creando asignación: ${assignmentError.message}`
        });
        continue;
      }

      console.log(`[ExamAssignment] Assignment created successfully for ${user.email}: ${assignmentData.id}`);

      // Create exam session for unique link - check if exists first
      console.log(`[ExamAssignment] Checking for existing exam session for ${user.email}`);
      const { data: existingUserSession } = await supabase
        .from('exam_sessions')
        .select('id')
        .eq('exam_id', examId)
        .eq('user_id', actualUserId)
        .maybeSingle();

      let userSessionId: string;

      if (existingUserSession) {
        console.log(`[ExamAssignment] Using existing session for ${user.email}: ${existingUserSession.id}`);
        userSessionId = existingUserSession.id;
      } else {
        console.log(`[ExamAssignment] Creating new exam session for ${user.email}`);
        const { data: sessionData, error: sessionError } = await supabase
          .from('exam_sessions')
          .insert({
            exam_id: examId,
            user_id: actualUserId,
            status: 'pending',
            attempts_taken: 0,
            max_attempts: 2
          })
          .select('id')
          .single();

        if (sessionError) {
          console.error(`[ExamAssignment] Session creation failed for ${user.email}:`, sessionError);
          results.push({
            success: false,
            userId: userIdentifier,
            userName: user.full_name,
            userEmail: user.email,
            error: `Error creando sesión: ${sessionError.message}`
          });
          continue;
        }

        console.log(`[ExamAssignment] Session created successfully for ${user.email}: ${sessionData.id}`);
        userSessionId = sessionData.id;
      }

      // Get or create credentials
      let credentials = null;
      const { data: existingCredentials } = await supabase
        .from('exam_credentials')
        .select('username, password_hash')
        .eq('user_email', user.email)
        .eq('exam_id', examId)
        .maybeSingle();

      if (existingCredentials) {
        console.log(`[ExamAssignment] Found existing credentials for ${user.email}`);
        credentials = existingCredentials;
      } else {
        console.log(`[ExamAssignment] Creating new credentials for ${user.email}`);
        const username = `eval_${user.email.split('@')[0]}_${Date.now().toString().slice(-4)}`;
        const password = Math.random().toString(36).slice(-8);

        const { data: newCredentials, error: credError } = await supabase
          .from('exam_credentials')
          .insert({
            exam_id: examId,
            user_email: user.email,
            username: username,
            password_hash: password,
            full_name: user.full_name
          })
          .select('username, password_hash')
          .single();

        if (credError) {
          console.warn(`[ExamAssignment] Failed to create credentials for ${user.email}:`, credError);
        } else {
          credentials = newCredentials;
          console.log(`[ExamAssignment] Created credentials for ${user.email}: ${username}`);
        }
      }

      if (credentials) {
        console.log(`[ExamAssignment] Found credentials for ${user.email}`);
      } else {
        console.warn(`[ExamAssignment] No credentials available for ${user.email}`);
      }

      // Generate access link with credentials included
      const accessLink = credentials 
        ? `${window.location.origin}/exam-access?username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password_hash)}&type=reliability&exam=${examId}`
        : `${window.location.origin}/examen/${userSessionId}`;

      // Send email notification - SIMPLIFICADO COMO BulkWelcomeEmail
      console.log(`[ExamAssignment] 📧 ENVÍO DIRECTO DE EMAIL PARA: ${user.email}`);
      console.log(`[ExamAssignment] - Nombre: ${user.full_name}`);
      console.log(`[ExamAssignment] - Assignment ID: ${assignmentData.id}`);
      console.log(`[ExamAssignment] - Session ID: ${userSessionId}`);
      console.log(`[ExamAssignment] - Access Link: ${accessLink}`);
      console.log(`[ExamAssignment] - Credenciales: ${!!credentials}`);
      
      // Preparar mensaje del correo
      const message = `Estimado/a ${user.full_name},

¡Esperamos que se encuentre muy bien!

Le escribimos para informarle que ha sido seleccionado/a para participar en una evaluación como parte de nuestro riguroso proceso de selección.

🎯 INSTRUCCIONES IMPORTANTES:
• Busque un lugar tranquilo y libre de distracciones
• Asegúrese de contar con una conexión estable a internet
• La evaluación debe completarse en una sola sesión continua
• Responda de manera honesta y espontánea a todas las preguntas

🔐 ACCESO AL EXAMEN:
Puede acceder directamente haciendo clic en el enlace que se proporcionará.

${credentials ? `
👤 SUS CREDENCIALES DE ACCESO:
Usuario: ${credentials.username}
Contraseña: ${credentials.password_hash}

⚠️ Estas credenciales solo pueden utilizarse una vez.
` : ''}

📞 SOPORTE:
Si experimenta alguna dificultad técnica o tiene preguntas, no dude en contactarnos de inmediato.

¡Le deseamos mucho éxito en su evaluación!

Atentamente,
Equipo de Recursos Humanos
Plentum Verify`;

      try {
        // LLAMADA DIRECTA como BulkWelcomeEmail
        console.log(`[ExamAssignment] 🚀 INVOCANDO send-exam-notifications directamente...`);
        
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-exam-notifications', {
          body: {
            emails: [user.email],
            subject: `🎯 Evaluación - ${examTitle}`,
            message: message,
            examDetails: {
              title: examTitle,
              testType: 'reliability'
            },
            credentials: credentials ? [{
              email: user.email,
              username: credentials.username,
              password: credentials.password_hash,
              full_name: user.full_name
            }] : undefined,
            sessionLinks: [{
              email: user.email,
              sessionId: userSessionId,
              full_name: user.full_name
            }]
          }
        });

        console.log(`[ExamAssignment] 📡 Respuesta de edge function:`, { emailResponse, emailError });

        if (emailError) {
          console.error(`[ExamAssignment] ❌ Error en edge function:`, emailError);
          throw new Error(`Error en servicio de correo: ${emailError.message}`);
        }

        if (!emailResponse || !emailResponse.success) {
          console.error(`[ExamAssignment] ❌ Fallo en envío:`, emailResponse);
          throw new Error(`Fallo en envío de correo: ${emailResponse?.message || 'Error desconocido'}`);
        }

        console.log(`[ExamAssignment] ✅ CORREO ENVIADO EXITOSAMENTE a ${user.email}`);
        console.log(`[ExamAssignment] ✅ Enviados: ${emailResponse.sent}/${emailResponse.total}`);
        
        results.push({
          success: true,
          userId: userIdentifier,
          userName: user.full_name,
          userEmail: user.email,
          assignmentId: assignmentData.id
        });

      } catch (emailError: any) {
        console.error(`[ExamAssignment] ❌ ERROR EN ENVÍO DE EMAIL:`, emailError);
        
        results.push({
          success: false,
          userId: userIdentifier,
          userName: user.full_name,
          userEmail: user.email,
          error: `Asignación creada pero falló el envío de correo: ${emailError.message}`,
          assignmentId: assignmentData.id
        });
      }

    } catch (error) {
      console.error(`[ExamAssignment] Critical error processing ${user.email}:`, error);
      results.push({
        success: false,
        userId: userIdentifier,
        userName: user.full_name,
        userEmail: user.email,
        error: `Error crítico: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    }
  }

  console.log(`[ExamAssignment] Process completed with ${results.length} results`);
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const manualDeliveryCount = results.filter(r => r.requiresManualDelivery).length;

  console.log(`[ExamAssignment] Final results: ${successCount} success, ${failureCount} failures, ${manualDeliveryCount} require manual delivery`);
  
  if (failureCount > 0) {
    console.error(`[ExamAssignment] Failed assignments:`, results.filter(r => !r.success));
  }

  return results;
};

// Nueva función para reiniciar intentos y registrar en logs
const resetUserAttemptsAndLog = async (
  userId: string, 
  examId: string, 
  adminId: string, 
  userName: string, 
  examTitle: string
) => {
  try {
    // 1. Buscar sesión existente para este usuario y examen
    const { data: existingSession } = await supabase
      .from('exam_sessions')
      .select('id, attempts_taken, max_attempts')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .maybeSingle();

    let previousAttempts = 0;
    let sessionId = null;

    if (existingSession) {
      previousAttempts = existingSession.attempts_taken;
      sessionId = existingSession.id;
      
      // Reiniciar contador de intentos en la sesión existente
      await supabase
        .from('exam_sessions')
        .update({ 
          attempts_taken: 0,
          status: 'pending',
          start_time: null,
          end_time: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSession.id);
      
      console.log(`[ExamAssignment] Reset attempts for existing session ${sessionId}: ${previousAttempts} -> 0`);
    }

    // 2. Registrar en logs de actividad del usuario
    await supabase
      .from('user_activity_log')
      .insert({
        user_id: userId,
        admin_id: adminId,
        activity_type: 'exam_assignment_attempts_reset',
        activity_description: `Asignación masiva de examen con reinicio de intentos`,
        previous_value: { 
          attempts_taken: previousAttempts,
          session_id: sessionId 
        },
        new_value: { 
          attempts_taken: 0,
          exam_title: examTitle,
          reset_reason: 'mass_assignment'
        },
        metadata: {
          exam_id: examId,
          exam_title: examTitle,
          assignment_type: 'mass_assignment',
          previous_attempts: previousAttempts
        }
      });

    console.log(`[ExamAssignment] Logged attempts reset for user ${userName}: ${previousAttempts} -> 0`);
    
  } catch (error) {
    console.error(`[ExamAssignment] Error resetting attempts for user ${userName}:`, error);
    // No lanzar error para no interrumpir el proceso de asignación
  }
};

export const handleAssignmentResults = (results: AssignmentResult[]) => {
  const successCount = results.filter(r => r.success).length;
  const actualFailureCount = results.filter(r => !r.success && !r.requiresManualDelivery).length;
  const manualDeliveryCount = results.filter(r => r.requiresManualDelivery).length;

  console.log(`[ExamAssignment] Handling results: ${successCount} success, ${actualFailureCount} actual failures, ${manualDeliveryCount} manual delivery`);

  if (successCount > 0) {
    toast.success(`✅ ${successCount} exámenes asignados y notificados por email correctamente`);
  }

  if (manualDeliveryCount > 0) {
    const manualUsers = results
      .filter(r => r.requiresManualDelivery)
      .map(r => r.userName)
      .join(', ');
    
    toast.info(
      `📋 ${manualDeliveryCount} enlaces generados para entrega manual: ${manualUsers}`,
      {
        duration: 10000,
        description: "Los usuarios no están registrados. Se proporcionarán enlaces de acceso directo."
      }
    );
  }

  if (actualFailureCount > 0) {
    const failedUsers = results
      .filter(r => !r.success && !r.requiresManualDelivery)
      .map(r => `• ${r.userName}: ${r.error}`)
      .join('\n');
    
    toast.error(
      `❌ ${actualFailureCount} asignaciones fallaron: ${failedUsers}`,
      {
        duration: 15000,
        description: "Revise los logs para más detalles"
      }
    );
  }
};
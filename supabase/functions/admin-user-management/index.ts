import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced password generation for better security
function generateStrongPassword(length = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Input validation functions for security
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

const validateName = (name: string): boolean => {
  return Boolean(name && name.trim().length > 0 && name.length <= 100);
};

const validateRole = (role: string): boolean => {
  const validRoles = ['admin', 'teacher', 'student', 'supervisor'];
  return validRoles.includes(role);
};

const sanitizeInput = (input: any): string => {
  if (!input && input !== 0) return '';
  return String(input).trim().replace(/[<>\"'&]/g, '');
};

serve(async (req) => {
  console.log("🚀 EF: admin-user-management - Invocada");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // DEBUG: Verificar variables de entorno (temporal)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("🔍 DEBUG: SUPABASE_URL length:", SUPABASE_URL ? SUPABASE_URL.length : "undefined");
    console.log("🔍 DEBUG: SERVICE_ROLE_KEY length:", SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY.length : "undefined");
    console.log("🔍 DEBUG: SERVICE_ROLE_KEY startsWith 'ey':", SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY.startsWith('ey') : "false");

    const supabaseAdmin = createClient(
      SUPABASE_URL ?? '',
      SERVICE_ROLE_KEY ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the calling user is an admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'teacher'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestBody = await req.json()
    console.log("📥 EF: Body recibido:", JSON.stringify(requestBody, null, 2));
    
    const { action, ...data } = requestBody

    switch (action) {
      case 'createUser': {
        const { email, password, full_name, role, company, area, section, report_contact, company_id } = data
        
        console.log(`👤 EF: Procesando usuario: ${full_name} (${email})`);

        // Enhanced input validation
        if (!email || !full_name) {
          return new Response(
            JSON.stringify({ 
              error: 'Los campos email y full_name son requeridos',
              code: 'MISSING_REQUIRED_FIELDS'
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        // Validate email format
        if (!validateEmail(email)) {
          return new Response(
            JSON.stringify({ 
              error: 'Formato de email inválido',
              code: 'INVALID_EMAIL_FORMAT'
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        // Validate name
        if (!validateName(full_name)) {
          return new Response(
            JSON.stringify({ 
              error: 'Nombre inválido',
              code: 'INVALID_NAME'
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        // Validate role if provided
        if (role && !validateRole(role)) {
          return new Response(
            JSON.stringify({ 
              error: 'Rol inválido',
              code: 'INVALID_ROLE'
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        // Sanitize inputs
        const sanitizedData = {
          email: sanitizeInput(email).toLowerCase(),
          full_name: sanitizeInput(full_name),
          role: sanitizeInput(role || 'student'),
          company: sanitizeInput(company || ''),
          area: sanitizeInput(area || ''),
          section: sanitizeInput(section || ''),
          report_contact: sanitizeInput(report_contact || '')
        };

        console.log(`🔧 EF: Datos del usuario:`, {
          email: sanitizedData.email,
          full_name: sanitizedData.full_name,
          role: sanitizedData.role,
          company: sanitizedData.company,
          area: sanitizedData.area,
          section: sanitizedData.section,
          report_contact: sanitizedData.report_contact,
          hasPassword: !!password
        });

        // Verificar si el usuario ya existe
        console.log(`🔍 EF: Verificando si usuario ${sanitizedData.email} ya existe...`);
        const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.listUsers()
        if (checkError) {
          console.error(`❌ EF: Error verificando usuarios existentes:`, checkError);
        } else {
          const userExists = existingUser.users.find(u => u.email === sanitizedData.email);
          if (userExists) {
            console.log(`⚠️ EF: Usuario ${sanitizedData.email} ya existe en el sistema`);
            return new Response(
              JSON.stringify({ 
                error: `El usuario ${sanitizedData.email} ya existe`,
                code: 'USER_ALREADY_EXISTS'
              }),
              { 
                status: 409, 
                headers: { 'Content-Type': 'application/json', ...corsHeaders } 
              }
            )
          }
        }

        // Generar contraseña robusta si no se proporciona
        const finalPassword = password || generateStrongPassword(12);
        console.log(`🔑 EF: Usando contraseña para ${sanitizedData.email} (generada: ${!password})`);
        
        console.log(`🚀 EF: Intentando crear usuario ${sanitizedData.email} en Supabase Auth...`);
        
        // Create user with admin privileges using sanitized data
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: sanitizedData.email,
          password: finalPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: sanitizedData.full_name,
            role: sanitizedData.role,
            company: sanitizedData.company,
            area: sanitizedData.area,
            section: sanitizedData.section,
            report_contact: sanitizedData.report_contact,
            company_id: company_id, // Incluir company_id en metadatos
            temp_password: !password
          }
        })

        if (createError) {
          console.error(`❌ EF: Error Supabase para usuario ${sanitizedData.email}:`, {
            message: createError.message,
            code: createError.code
          });
          return new Response(
            JSON.stringify({ 
              error: `Error al crear usuario: ${createError.message}`,
              code: createError.code || 'AUTH_ERROR',
              details: createError
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          )
        }

        console.log(`✅ EF: Usuario ${sanitizedData.email} creado exitosamente en Supabase Auth`);
        console.log(`📋 EF: User ID: ${authData.user?.id}`);
        
        // Verificar que el trigger creó el perfil
        console.log(`🔍 EF: Verificando creación del perfil para ${sanitizedData.email}...`);
        try {
          const { data: profileData, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', authData.user?.id)
            .single();
            
          if (profileError) {
            console.error(`❌ EF: Error verificando perfil para ${sanitizedData.email}:`, profileError);
          } else {
            console.log(`✅ EF: Perfil creado correctamente para ${sanitizedData.email}:`, profileData);
          }
        } catch (profileCheckError) {
          console.error(`❌ EF: Excepción verificando perfil:`, profileCheckError);
        }

        return new Response(
          JSON.stringify({ 
            message: `Usuario ${sanitizedData.email} creado exitosamente`,
            user: {
              id: authData.user?.id,
              email: authData.user?.email,
              tempPassword: !password ? finalPassword : undefined
            }
          }),
          { 
            status: 201, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        )
      }

      case 'deleteUser': {
        const { userId } = data

        // Validate userId format
        if (!userId || typeof userId !== 'string' || userId.length !== 36) {
          return new Response(
            JSON.stringify({ 
              error: 'ID de usuario inválido',
              code: 'INVALID_USER_ID'
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          )
        }

        console.log(`🗑️ EF: Iniciando eliminación en cascada del usuario ${userId}`);

        // Primero eliminar todas las dependencias usando la función de cascada
        const { data: cascadeResult, error: cascadeError } = await supabaseAdmin
          .rpc('delete_user_cascade', { target_user_id: userId });

        if (cascadeError) {
          console.error('❌ EF: Error en eliminación cascada:', cascadeError);
          return new Response(
            JSON.stringify({ 
              error: `Error eliminando dependencias: ${cascadeError.message}`,
              code: 'CASCADE_DELETE_ERROR'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`✅ EF: Eliminación cascada completada:`, cascadeResult);

        // Después eliminar del auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
          console.error('❌ EF: Error eliminando de auth:', deleteError);
          return new Response(
            JSON.stringify({ 
              error: `Error eliminando usuario del auth: ${deleteError.message}`,
              code: 'AUTH_DELETE_ERROR'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`✅ EF: Usuario ${userId} eliminado completamente`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: cascadeResult || 'Usuario eliminado exitosamente'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'resetSystem': {
        const { adminEmail } = data

        if (!adminEmail || !validateEmail(adminEmail)) {
          return new Response(
            JSON.stringify({ 
              error: 'Email de administrador inválido',
              code: 'INVALID_ADMIN_EMAIL'
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          )
        }

        console.log(`🔄 EF: Iniciando reset del sistema manteniendo admin: ${adminEmail}`);

        // Llamar a la función de reset del sistema
        const { data: resetResult, error: resetError } = await supabaseAdmin
          .rpc('reset_system_to_admin_only', { admin_email: adminEmail });

        if (resetError) {
          console.error('❌ EF: Error en reset del sistema:', resetError);
          return new Response(
            JSON.stringify({ 
              error: `Error reseteando sistema: ${resetError.message}`,
              code: 'SYSTEM_RESET_ERROR'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`✅ EF: Reset del sistema completado:`, resetResult);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: resetResult || 'Sistema reseteado exitosamente'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'updatePassword': {
        const { userId, newPassword } = data;
        
        if (!userId || !newPassword) {
          return new Response(
            JSON.stringify({ error: 'userId y newPassword son requeridos' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`🔑 EF: Actualizando contraseña para usuario: ${userId}`);

        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        );

        if (passwordError) {
          console.error('❌ EF: Error actualizando contraseña:', passwordError);
          return new Response(
            JSON.stringify({ error: passwordError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`✅ EF: Contraseña actualizada exitosamente para: ${userId}`);
        return new Response(
          JSON.stringify({ success: true, message: 'Contraseña actualizada exitosamente' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Error in admin-user-management function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
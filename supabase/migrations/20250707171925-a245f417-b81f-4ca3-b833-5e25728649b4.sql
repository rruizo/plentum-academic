-- Crear usuarios de prueba para validación de roles
-- Nota: Estos son usuarios de prueba para auditoría de seguridad

-- Crear perfiles de usuarios de prueba directamente
-- (Los usuarios en auth.users se crearán manualmente desde el panel de Supabase)

-- Asegurar que existan los roles necesarios en el enum si no existe
-- Ya existe la tabla profiles con los roles como text

-- Insertar perfiles de prueba (los IDs se actualizarán después de crear los usuarios en auth)
-- Por ahora creamos los registros con IDs temporales que luego se pueden actualizar

INSERT INTO public.profiles (
  id, 
  full_name, 
  email, 
  company, 
  area, 
  section, 
  report_contact, 
  role,
  can_login,
  temp_password
) VALUES 
  -- Usuario Administrador de prueba
  ('00000000-0000-0000-0000-000000000001'::uuid, 
   'Admin Test User', 
   'admin_test@example.com', 
   'Test Company', 
   'IT Department', 
   'Administration', 
   'admin_test@example.com', 
   'admin',
   true,
   false),
   
  -- Usuario Profesor de prueba  
  ('00000000-0000-0000-0000-000000000002'::uuid,
   'Teacher Test User',
   'teacher_test@example.com',
   'Test Company',
   'Education Department', 
   'Teaching',
   'teacher_test@example.com',
   'teacher',
   true,
   false),
   
  -- Usuario Estudiante de prueba
  ('00000000-0000-0000-0000-000000000003'::uuid,
   'Student Test User', 
   'student_test@example.com',
   'Test Company',
   'Learning Department',
   'Students',
   'student_test@example.com',
   'student',
   true,
   false),
   
  -- Usuario Supervisor de prueba
  ('00000000-0000-0000-0000-000000000004'::uuid,
   'Supervisor Test User',
   'supervisor_test@example.com', 
   'Test Company',
   'Management Department',
   'Supervision',
   'supervisor_test@example.com',
   'supervisor',
   true,
   false)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  can_login = EXCLUDED.can_login;

-- Función helper para validar permisos durante testing
CREATE OR REPLACE FUNCTION public.validate_user_role_access(
  _user_id uuid,
  _expected_role text
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND role = _expected_role
  );
$$;

-- Vista para auditoría de usuarios de prueba
CREATE OR REPLACE VIEW public.test_users_audit AS
SELECT 
  id,
  email,
  role,
  full_name,
  can_login,
  created_at
FROM public.profiles 
WHERE email LIKE '%_test@example.com'
ORDER BY role;
-- Vista para auditoría de usuarios de prueba y validación de roles
CREATE OR REPLACE VIEW public.test_users_audit AS
SELECT 
  id,
  email,
  role,
  full_name,
  can_login,
  created_at,
  CASE 
    WHEN email LIKE '%_test@example.com' THEN 'TEST_USER'
    ELSE 'PRODUCTION_USER'
  END as user_type
FROM public.profiles 
ORDER BY role, email;

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

-- Función para generar reporte de auditoría de permisos
CREATE OR REPLACE FUNCTION public.generate_role_permissions_audit()
RETURNS TABLE(
  table_name text,
  policy_name text,
  policy_command text,
  policy_role text,
  description text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname || '.' || tablename as table_name,
    policyname as policy_name,
    cmd as policy_command,
    CASE 
      WHEN quals LIKE '%admin%' THEN 'admin'
      WHEN quals LIKE '%teacher%' THEN 'teacher' 
      WHEN quals LIKE '%student%' THEN 'student'
      WHEN quals LIKE '%supervisor%' THEN 'supervisor'
      ELSE 'general'
    END as policy_role,
    quals as description
  FROM pg_policies 
  WHERE schemaname = 'public'
  ORDER BY table_name, policy_name;
$$;
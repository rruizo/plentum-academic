-- Función segura para buscar perfil de usuario por email durante el proceso de login
-- Esta función es necesaria porque las políticas RLS de profiles requieren autenticación
CREATE OR REPLACE FUNCTION public.get_profile_by_email(p_email TEXT)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  company TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.company,
    p.role
  FROM public.profiles p
  WHERE p.email = p_email
  LIMIT 1;
END;
$$;
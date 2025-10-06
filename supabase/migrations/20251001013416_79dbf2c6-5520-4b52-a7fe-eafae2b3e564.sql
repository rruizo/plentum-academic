-- Primero eliminar el trigger, luego recrear la función con search_path correcto
DROP TRIGGER IF EXISTS update_credential_expiration_config_updated_at ON public.credential_expiration_config;

DROP FUNCTION IF EXISTS public.update_credential_config_updated_at();
CREATE OR REPLACE FUNCTION public.update_credential_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER update_credential_expiration_config_updated_at
BEFORE UPDATE ON public.credential_expiration_config
FOR EACH ROW
EXECUTE FUNCTION public.update_credential_config_updated_at();

-- Recrear función de validación con search_path correcto
DROP FUNCTION IF EXISTS public.validate_exam_credentials(TEXT, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.validate_exam_credentials(
  p_username TEXT,
  p_password TEXT,
  p_check_expiration BOOLEAN DEFAULT true
)
RETURNS TABLE(
  valid BOOLEAN,
  user_email TEXT,
  full_name TEXT,
  exam_id UUID,
  test_type TEXT,
  is_expired BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN ec.id IS NULL THEN false
      WHEN ec.is_used = true THEN false
      WHEN p_check_expiration AND ec.expires_at IS NOT NULL AND ec.expires_at < NOW() THEN false
      WHEN ec.password_hash = p_password THEN true
      ELSE false
    END as valid,
    ec.user_email,
    ec.full_name,
    ec.exam_id,
    ec.test_type,
    CASE 
      WHEN ec.expires_at IS NOT NULL AND ec.expires_at < NOW() THEN true
      ELSE false
    END as is_expired,
    ec.expires_at
  FROM public.exam_credentials ec
  WHERE ec.username = p_username
  LIMIT 1;
END;
$$;
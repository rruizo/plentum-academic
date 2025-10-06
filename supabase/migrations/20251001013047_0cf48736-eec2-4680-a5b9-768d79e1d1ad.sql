-- Crear tabla de configuración de expiración de credenciales
CREATE TABLE IF NOT EXISTS public.credential_expiration_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL UNIQUE,
  expiration_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_expiration_days CHECK (expiration_days > 0 AND expiration_days <= 365)
);

-- Habilitar RLS
ALTER TABLE public.credential_expiration_config ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admins pueden gestionar configuración
CREATE POLICY "Admins can manage credential expiration config"
ON public.credential_expiration_config
FOR ALL
USING (user_is_admin());

-- Policy: Todos los usuarios autenticados pueden ver configuración activa
CREATE POLICY "Authenticated users can view active config"
ON public.credential_expiration_config
FOR SELECT
USING (is_active = true);

-- Insertar configuraciones por defecto
INSERT INTO public.credential_expiration_config (test_type, expiration_days, is_active)
VALUES 
  ('reliability', 7, true),
  ('psychometric', 30, true),
  ('cognitive', 14, true)
ON CONFLICT (test_type) DO NOTHING;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_credential_config_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_credential_expiration_config_updated_at
BEFORE UPDATE ON public.credential_expiration_config
FOR EACH ROW
EXECUTE FUNCTION public.update_credential_config_updated_at();

-- Función para validar credenciales con expiración
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
SET search_path = public
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
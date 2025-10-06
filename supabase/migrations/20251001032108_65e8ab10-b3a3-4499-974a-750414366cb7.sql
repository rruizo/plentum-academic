-- Actualizar fechas de expiración de credenciales para pruebas
-- Actualizar todas las credenciales para que expiren en 7 días desde ahora
UPDATE public.exam_credentials
SET expires_at = NOW() + INTERVAL '7 days'
WHERE expires_at IS NOT NULL;

-- Log para verificar
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % credential expiration dates', updated_count;
END $$;
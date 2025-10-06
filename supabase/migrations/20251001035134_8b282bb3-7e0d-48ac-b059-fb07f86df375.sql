-- Función de desarrollo para resetear credenciales sin restricciones de auth
-- Esta función debe usarse solo en desarrollo para facilitar pruebas
CREATE OR REPLACE FUNCTION public.dev_reset_exam_credentials(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Resetear el flag is_used sin verificar permisos (solo para desarrollo)
  UPDATE public.exam_credentials
  SET is_used = false
  WHERE username = p_username
  RETURNING jsonb_build_object(
    'username', username,
    'user_email', user_email,
    'is_used', is_used,
    'expires_at', expires_at,
    'test_type', test_type
  ) INTO result;

  IF result IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Credenciales no encontradas con username: ' || p_username
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Credenciales reseteadas exitosamente',
    'data', result
  );
END;
$$;
-- Función para resetear credenciales de examen (útil para pruebas)
-- Solo admins pueden ejecutar esta función
CREATE OR REPLACE FUNCTION public.reset_exam_credentials(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verificar que el usuario es admin
  IF NOT public.user_is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo administradores pueden resetear credenciales'
    );
  END IF;

  -- Resetear el flag is_used
  UPDATE public.exam_credentials
  SET is_used = false
  WHERE username = p_username
  RETURNING jsonb_build_object(
    'username', username,
    'user_email', user_email,
    'is_used', is_used,
    'expires_at', expires_at
  ) INTO result;

  IF result IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Credenciales no encontradas'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', result
  );
END;
$$;
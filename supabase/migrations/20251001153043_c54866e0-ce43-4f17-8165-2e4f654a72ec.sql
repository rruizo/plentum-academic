-- Funciones SECURITY DEFINER para permitir inserts sin autenticación Auth

-- 1. Función para insertar consentimiento legal sin autenticación
CREATE OR REPLACE FUNCTION public.insert_legal_consent_log(
  p_user_id UUID,
  p_user_email TEXT,
  p_consent_type TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_consent_id UUID;
BEGIN
  -- Validar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  INSERT INTO public.legal_consent_log (
    user_id,
    user_email,
    consent_type,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_user_email,
    p_consent_type,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO new_consent_id;

  RETURN new_consent_id;
END;
$$;

-- 2. Función para insertar factores personales sin autenticación
CREATE OR REPLACE FUNCTION public.insert_personal_factors(
  p_user_id UUID,
  p_edad INTEGER,
  p_estado_civil TEXT,
  p_tiene_hijos BOOLEAN,
  p_situacion_habitacional TEXT,
  p_exam_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_factor_id UUID;
  ajuste_calculado NUMERIC;
BEGIN
  -- Validar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Calcular ajuste personal
  ajuste_calculado := public.calculate_personal_adjustment(
    p_estado_civil,
    p_tiene_hijos,
    p_situacion_habitacional,
    p_edad
  );

  -- Insertar factores personales
  INSERT INTO public.personal_factors (
    user_id,
    edad,
    estado_civil,
    tiene_hijos,
    situacion_habitacional,
    ajuste_total,
    exam_id,
    session_id
  ) VALUES (
    p_user_id,
    p_edad,
    p_estado_civil,
    p_tiene_hijos,
    p_situacion_habitacional,
    ajuste_calculado,
    p_exam_id,
    p_session_id
  )
  RETURNING id INTO new_factor_id;

  RETURN new_factor_id;
END;
$$;
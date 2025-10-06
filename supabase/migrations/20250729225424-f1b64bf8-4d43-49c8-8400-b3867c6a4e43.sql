-- Actualizar función para generar credenciales psicométricas con exam_id explícitamente NULL
CREATE OR REPLACE FUNCTION public.generate_psychometric_credentials_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  user_profile RECORD;
  new_username TEXT;
  new_password TEXT;
  test_name TEXT;
BEGIN
  -- Solo procesar asignaciones psicométricas
  IF NEW.test_type != 'psychometric' THEN
    RETURN NEW;
  END IF;

  -- Obtener información del usuario
  SELECT * INTO user_profile FROM public.profiles WHERE id = NEW.user_id;
  
  -- Obtener nombre del test psicométrico
  SELECT name INTO test_name FROM public.psychometric_tests WHERE id = NEW.psychometric_test_id;
  
  -- Generar credenciales únicas
  new_username := public.generate_unique_username();
  new_password := public.generate_random_password();
  
  -- Insertar credenciales para test psicométrico (con exam_id explícitamente NULL)
  INSERT INTO public.exam_credentials (
    exam_id,  -- Explícitamente NULL
    psychometric_test_id,
    test_type,
    user_email,
    username,
    password_hash,
    full_name,
    expires_at
  ) VALUES (
    NULL,  -- exam_id debe ser NULL para psicométricos
    NEW.psychometric_test_id,
    'psychometric',
    user_profile.email,
    new_username,
    new_password,
    user_profile.full_name,
    NOW() + INTERVAL '7 days'
  );
  
  RETURN NEW;
END;
$function$;
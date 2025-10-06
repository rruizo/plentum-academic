-- Fix remaining database functions with search_path security
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.user_has_admin_or_teacher_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.validar_respuesta_fija(respuesta text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = ''
AS $function$
BEGIN
  RETURN respuesta IN ('Nunca', 'Rara vez', 'A veces', 'Frecuentemente');
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_puntaje_respuesta(respuesta_texto text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path = ''
AS $function$
BEGIN
  CASE respuesta_texto
    WHEN 'Nunca' THEN RETURN 0;
    WHEN 'Rara vez' THEN RETURN 1;
    WHEN 'A veces' THEN RETURN 2;
    WHEN 'Frecuentemente' THEN RETURN 3;
    ELSE RETURN 0;
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.evaluar_riesgo(puntaje_total integer, total_preguntas integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path = ''
AS $function$
BEGIN
  IF puntaje_total >= total_preguntas * 2 THEN
    RETURN 'RIESGO ALTO';
  ELSIF puntaje_total >= total_preguntas * 1 THEN
    RETURN 'RIESGO MEDIO';
  ELSE
    RETURN 'RIESGO BAJO';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.detectar_simulacion(diferencia numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path = ''
AS $function$
BEGIN
  RETURN ABS(diferencia) > 5;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_preguntas_banco_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = now();
    NEW.fecha_ultima_modificacion = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.convertir_respuesta_a_numero(respuesta_texto text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path = ''
AS $function$
BEGIN
  CASE respuesta_texto
    WHEN 'Nunca' THEN RETURN 0;
    WHEN 'Rara vez' THEN RETURN 1;
    WHEN 'A veces' THEN RETURN 2;
    WHEN 'Frecuentemente' THEN RETURN 3;
    ELSE RETURN 0;
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.convertir_numero_a_respuesta(numero integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path = ''
AS $function$
BEGIN
  CASE numero
    WHEN 0 THEN RETURN 'Nunca';
    WHEN 1 THEN RETURN 'Rara vez';
    WHEN 2 THEN RETURN 'A veces';
    WHEN 3 THEN RETURN 'Frecuentemente';
    ELSE RETURN 'Nunca';
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_unique_username()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  new_username TEXT;
  username_exists BOOLEAN;
BEGIN
  LOOP
    new_username := upper(substring(md5(random()::text) from 1 for 8));
    
    SELECT EXISTS(SELECT 1 FROM public.exam_credentials WHERE username = new_username) INTO username_exists;
    
    IF NOT username_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_username;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_exam_valid(exam_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  exam_record RECORD;
BEGIN
  SELECT estado, fecha_cierre INTO exam_record
  FROM public.exams 
  WHERE id = exam_id;
  
  IF exam_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF exam_record.estado != 'activo' THEN
    RETURN FALSE;
  END IF;
  
  IF exam_record.fecha_cierre IS NOT NULL AND exam_record.fecha_cierre < now() THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_exam_credentials_on_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  user_profile RECORD;
  new_username TEXT;
  new_password TEXT;
BEGIN
  SELECT * INTO user_profile FROM public.profiles WHERE id = NEW.user_id;
  
  new_username := public.generate_unique_username();
  new_password := public.generate_random_password();
  
  INSERT INTO public.exam_credentials (
    exam_id,
    user_email,
    username,
    password_hash,
    full_name,
    expires_at
  ) VALUES (
    NEW.exam_id,
    user_profile.email,
    new_username,
    new_password,
    user_profile.full_name,
    NOW() + INTERVAL '7 days'
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_user_role_access(_user_id uuid, _expected_role text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND role = _expected_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.generate_role_permissions_audit()
 RETURNS TABLE(table_name text, policy_name text, policy_command text, policy_role text, description text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT 
    schemaname || '.' || tablename as table_name,
    policyname as policy_name,
    cmd as policy_command,
    CASE 
      WHEN qual LIKE '%admin%' THEN 'admin'
      WHEN qual LIKE '%teacher%' THEN 'teacher' 
      WHEN qual LIKE '%student%' THEN 'student'
      WHEN qual LIKE '%supervisor%' THEN 'supervisor'
      ELSE 'general'
    END as policy_role,
    qual as description
  FROM pg_policies 
  WHERE schemaname = 'public'
  ORDER BY table_name, policy_name;
$function$;

CREATE OR REPLACE FUNCTION public.update_personality_questions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
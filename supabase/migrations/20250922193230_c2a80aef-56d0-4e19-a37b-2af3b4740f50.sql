-- Corregir función handle_new_user para eliminar referencias a campos inexistentes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- SECURITY: Always force new user registrations to 'student' role
  -- Only admins can change roles after registration
  INSERT INTO public.profiles (id, full_name, email, company, area, section, report_contact, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'company', ''),
    COALESCE(new.raw_user_meta_data ->> 'area', ''),
    COALESCE(new.raw_user_meta_data ->> 'section', ''),
    COALESCE(new.raw_user_meta_data ->> 'report_contact', ''),
    'student' -- LOCKED: Always create as student, ignore any role sent from frontend
  );
  
  -- Log the user creation for security audit
  INSERT INTO public.user_activity_log (
    user_id,
    activity_type,
    activity_description,
    metadata
  ) VALUES (
    new.id,
    'user_registration',
    'New user registered as student',
    jsonb_build_object(
      'email', new.email,
      'registration_timestamp', NOW(),
      'forced_role', 'student'
    )
  );
  
  RETURN new;
END;
$function$;
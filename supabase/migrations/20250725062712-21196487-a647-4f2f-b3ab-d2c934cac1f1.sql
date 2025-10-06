-- Critical Security Fix 1: Prevent users from changing their own role
CREATE POLICY "Users cannot change their own role" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Only allow updates if the role is not being changed OR user is admin
  (auth.uid() = id AND OLD.role = NEW.role) OR 
  user_is_admin()
);

-- Critical Security Fix 2: Update all database functions to include search_path security
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, company, area, section, report_contact, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'company', ''),
    COALESCE(new.raw_user_meta_data ->> 'area', ''),
    COALESCE(new.raw_user_meta_data ->> 'section', ''),
    COALESCE(new.raw_user_meta_data ->> 'report_contact', ''),
    COALESCE(new.raw_user_meta_data ->> 'role', 'student')
  );
  RETURN new;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.generate_temp_password()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate stronger 12-character password
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
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

CREATE OR REPLACE FUNCTION public.generate_random_password()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  password TEXT := '';
  i INTEGER;
BEGIN
  -- Generate stronger 12-character password
  FOR i IN 1..12 LOOP
    password := password || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  RETURN password;
END;
$function$;

-- Critical Security Fix 3: Add audit trail for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT
);

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role change audit" 
ON public.role_change_audit 
FOR SELECT 
USING (user_is_admin());

-- Trigger to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF OLD.role != NEW.role THEN
    INSERT INTO public.role_change_audit (user_id, old_role, new_role, changed_by)
    VALUES (NEW.id, OLD.role, NEW.role, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER role_change_audit_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();
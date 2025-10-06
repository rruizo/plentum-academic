-- Critical Security Fix 1: Prevent users from changing their own role
DROP POLICY IF EXISTS "Users cannot change their own role" ON public.profiles;
CREATE POLICY "Users cannot change their own role" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Only allow updates if the role is not being changed OR user is admin
  CASE 
    WHEN user_is_admin() THEN true
    WHEN auth.uid() = id THEN true
    ELSE false
  END
)
WITH CHECK (
  -- Prevent role changes unless admin
  CASE 
    WHEN user_is_admin() THEN true
    WHEN auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) THEN true
    ELSE false
  END
);

-- Critical Security Fix 2: Update database functions with proper search_path
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

-- Update password generation functions for stronger security
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

-- Add better input validation function
CREATE OR REPLACE FUNCTION public.validate_email_format(email_input TEXT)
 RETURNS BOOLEAN
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = ''
AS $function$
BEGIN
  RETURN email_input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$function$;
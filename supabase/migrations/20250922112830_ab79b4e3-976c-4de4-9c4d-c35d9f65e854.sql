-- Enforce student-only registration at database level
-- This ensures that no matter what is sent from the frontend, only students can be created during registration

-- Update the handle_new_user function to always force role to 'student'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Add a check constraint to profiles table to prevent non-admin users from having elevated roles
-- during the registration process (this will be enforced by RLS policies for updates)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS check_valid_roles;

ALTER TABLE public.profiles 
ADD CONSTRAINT check_valid_roles 
CHECK (role IN ('student', 'teacher', 'admin', 'supervisor'));

-- Create a function to validate role changes (only admins can elevate roles)
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow role changes only if:
  -- 1. It's a new registration (OLD is NULL)
  -- 2. The current user is an admin
  -- 3. The user is not changing their own role to admin (prevent self-elevation)
  
  IF OLD IS NULL THEN
    -- New registration - always allow (will be forced to student anyway)
    RETURN NEW;
  END IF;
  
  -- Check if role is being changed
  IF OLD.role != NEW.role THEN
    -- Only admins can change roles
    IF NOT user_is_admin() THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
    
    -- Prevent self-elevation to admin (security measure)
    IF auth.uid() = NEW.id AND NEW.role = 'admin' AND OLD.role != 'admin' THEN
      RAISE EXCEPTION 'Users cannot elevate themselves to administrator';
    END IF;
    
    -- Log the role change for audit
    INSERT INTO public.user_activity_log (
      user_id,
      admin_id,
      activity_type,
      activity_description,
      previous_value,
      new_value,
      metadata
    ) VALUES (
      NEW.id,
      auth.uid(),
      'role_change',
      'User role changed by administrator',
      jsonb_build_object('previous_role', OLD.role),
      jsonb_build_object('new_role', NEW.role),
      jsonb_build_object(
        'changed_at', NOW(),
        'admin_email', (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for role change validation
DROP TRIGGER IF EXISTS validate_role_change_trigger ON public.profiles;
CREATE TRIGGER validate_role_change_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_role_change();
-- Remove the overly permissive anonymous policy that exposes user data
DROP POLICY IF EXISTS "Anonymous access to HTP assignments via access link" ON public.htp_assignments;

-- Create a security definer function to securely validate HTP access
-- This function only returns data if the exact access link matches and is valid
CREATE OR REPLACE FUNCTION public.validate_htp_assignment_access(p_access_link text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  assigned_by uuid,
  access_link text,
  status text,
  expires_at timestamp with time zone,
  email_sent boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ha.id,
    ha.user_id,
    ha.assigned_by,
    ha.access_link,
    ha.status,
    ha.expires_at,
    ha.email_sent,
    ha.created_at,
    ha.updated_at
  FROM htp_assignments ha
  WHERE ha.access_link = p_access_link
    AND ha.status = 'notified'
    AND (ha.expires_at IS NULL OR ha.expires_at > NOW())
  LIMIT 1;
$$;
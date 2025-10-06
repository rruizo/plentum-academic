-- Fix the HTP assignment access validation function
CREATE OR REPLACE FUNCTION public.validate_htp_assignment_access(p_access_link text)
 RETURNS TABLE(id uuid, user_id uuid, assigned_by uuid, access_link text, status text, expires_at timestamp with time zone, email_sent boolean, created_at timestamp with time zone, updated_at timestamp with time zone, user_full_name text, user_email text, user_company text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    ha.id,
    ha.user_id,
    ha.assigned_by,
    ha.access_link,
    ha.status,
    ha.expires_at,
    ha.email_sent,
    ha.created_at,
    ha.updated_at,
    p.full_name as user_full_name,
    p.email as user_email,
    p.company as user_company
  FROM htp_assignments ha
  INNER JOIN profiles p ON ha.user_id = p.id
  WHERE ha.access_link LIKE '%/htp-exam/' || p_access_link
    AND ha.status = 'notified'
    AND (ha.expires_at IS NULL OR ha.expires_at > NOW())
  LIMIT 1;
$function$;
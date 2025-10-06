-- Fix security vulnerability: Remove public access to HTP configuration
-- The htp_config table contains sensitive AI prompts and model configurations
-- that should only be accessible to authorized administrators and teachers

-- Drop the overly permissive policy that allows everyone to view HTP config
DROP POLICY IF EXISTS "Everyone can view HTP config" ON public.htp_config;

-- The existing "Admins can manage HTP config" policy already provides proper access control
-- for administrators and teachers using user_has_admin_or_teacher_role()
-- No additional policy needed since only authorized users should access this sensitive data
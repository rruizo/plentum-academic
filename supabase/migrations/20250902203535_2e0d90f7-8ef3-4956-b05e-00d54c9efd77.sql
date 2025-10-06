-- Fix security vulnerability: Remove public access to system_config table
-- Only admin users should have access to sensitive system configuration

-- Drop the insecure policies that allow public/general access
DROP POLICY IF EXISTS "Anyone can read system config" ON public.system_config;
DROP POLICY IF EXISTS "Authenticated users can manage system config" ON public.system_config;

-- The following admin-only policies should remain active:
-- 1. "Admin users can view system config" FOR SELECT USING (user_is_admin());
-- 2. "Admin users can insert system config" FOR INSERT WITH CHECK (user_is_admin()); 
-- 3. "Admin users can update system config" FOR UPDATE USING (user_is_admin());

-- Add DELETE policy for admins if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'system_config' 
    AND policyname = 'Admin users can delete system config'
  ) THEN
    CREATE POLICY "Admin users can delete system config" 
    ON public.system_config 
    FOR DELETE 
    USING (user_is_admin());
  END IF;
END $$;
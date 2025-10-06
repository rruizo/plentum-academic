-- Fix security vulnerability: Remove public access to system_config table
-- The 'Everyone can read system config' policy allows unauthorized access to sensitive
-- configuration data including OpenAI prompts, API settings, and system architecture details

-- Drop the overly permissive policy that allows everyone to read system config
DROP POLICY IF EXISTS "Everyone can read system config" ON public.system_config;

-- Ensure admin users can still access system config (this policy should already exist)
-- but let's make sure it's properly defined
DO $$
BEGIN
    -- Check if the admin read policy exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'system_config' 
        AND policyname = 'Admin users can view system config'
    ) THEN
        CREATE POLICY "Admin users can view system config"
        ON public.system_config
        FOR SELECT
        USING (user_is_admin());
    END IF;
END
$$;

-- Verify RLS is enabled on system_config table
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
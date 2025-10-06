
-- Create system_config table for storing system-wide configuration
CREATE TABLE public.system_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_name text NOT NULL DEFAULT 'Plentum Verify',
  logo_url text,
  contact_email text,
  support_email text,
  primary_color text DEFAULT '#3b82f6',
  secondary_color text DEFAULT '#1e40af',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create policy that allows admin users to read system config
CREATE POLICY "Admin users can view system config" 
  ON public.system_config 
  FOR SELECT 
  USING (user_is_admin());

-- Create policy that allows admin users to insert system config
CREATE POLICY "Admin users can insert system config" 
  ON public.system_config 
  FOR INSERT 
  WITH CHECK (user_is_admin());

-- Create policy that allows admin users to update system config
CREATE POLICY "Admin users can update system config" 
  ON public.system_config 
  FOR UPDATE 
  USING (user_is_admin());

-- Insert default configuration
INSERT INTO public.system_config (system_name, contact_email, support_email, primary_color, secondary_color)
VALUES ('Plentum Verify', 'admin@plentumverify.com', 'soporte@plentumverify.com', '#3b82f6', '#1e40af');

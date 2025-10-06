-- Añadir configuración de correo a system_config
ALTER TABLE public.system_config 
ADD COLUMN resend_from_email text,
ADD COLUMN resend_from_name text DEFAULT 'Plentum Verify';

-- Actualizar registros existentes
UPDATE public.system_config 
SET resend_from_email = 'onboarding@resend.dev',
    resend_from_name = 'Plentum Verify'
WHERE resend_from_email IS NULL;
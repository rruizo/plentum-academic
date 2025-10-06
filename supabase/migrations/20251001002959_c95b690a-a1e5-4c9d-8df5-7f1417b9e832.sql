-- Crear tabla para registro de consentimientos legales
CREATE TABLE IF NOT EXISTS public.legal_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  consent_type TEXT NOT NULL DEFAULT 'login', -- 'login', 'exam_start', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.legal_consent_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins pueden ver todos los consentimientos
CREATE POLICY "Admins can view all consent logs"
ON public.legal_consent_log
FOR SELECT
TO authenticated
USING (user_has_admin_or_teacher_role());

-- Policy: Sistema puede insertar consentimientos
CREATE POLICY "System can insert consent logs"
ON public.legal_consent_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Índice para búsquedas rápidas
CREATE INDEX idx_legal_consent_user_email ON public.legal_consent_log(user_email);
CREATE INDEX idx_legal_consent_user_id ON public.legal_consent_log(user_id);
CREATE INDEX idx_legal_consent_accepted_at ON public.legal_consent_log(accepted_at DESC);
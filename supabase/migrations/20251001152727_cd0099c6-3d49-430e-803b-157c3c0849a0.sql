-- Corregir políticas RLS para permitir login con credenciales de examen sin autenticación Auth

-- 1. Actualizar política de legal_consent_log para permitir inserts sin autenticación
DROP POLICY IF EXISTS "System can insert consent logs" ON public.legal_consent_log;
CREATE POLICY "Allow unauthenticated consent logging"
ON public.legal_consent_log
FOR INSERT
WITH CHECK (
  -- Permitir si hay autenticación O si se proporciona user_id y user_email
  auth.uid() IS NOT NULL OR (user_id IS NOT NULL AND user_email IS NOT NULL)
);

-- 2. Actualizar política de personal_factors para permitir inserts sin autenticación
DROP POLICY IF EXISTS "Users can insert their own personal factors" ON public.personal_factors;
CREATE POLICY "Allow authenticated and validated users to insert personal factors"
ON public.personal_factors
FOR INSERT
WITH CHECK (
  -- Permitir si el usuario está autenticado Y coincide el user_id
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR
  -- O si no hay autenticación pero se proporciona un user_id válido que existe en profiles
  (auth.uid() IS NULL AND user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id
  ))
  OR
  -- O si hay session_id válido
  (session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.exam_sessions es 
    WHERE es.id = session_id
  ))
  OR
  -- O si hay exam_id válido
  (exam_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.exams e 
    WHERE e.id = exam_id
  ))
);
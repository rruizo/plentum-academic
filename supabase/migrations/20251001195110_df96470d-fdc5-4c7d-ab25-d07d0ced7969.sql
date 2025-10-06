-- Políticas RLS para exam_sessions: permitir acceso completo a sesiones propias
-- Esto asegura que los usuarios puedan ver/crear/actualizar sus propias sesiones

-- 1. Drop políticas existentes si existen
DROP POLICY IF EXISTS "Users can view their own exam sessions" ON public.exam_sessions;
DROP POLICY IF EXISTS "Users can create their own exam sessions" ON public.exam_sessions;
DROP POLICY IF EXISTS "Users can update their own exam sessions" ON public.exam_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON public.exam_sessions;

-- 2. Habilitar RLS
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Política para SELECT: permitir ver sesiones propias (por UUID o email)
CREATE POLICY "Users can view their own exam sessions"
ON public.exam_sessions
FOR SELECT
USING (
  -- Permitir si user_id coincide con el UUID del usuario autenticado
  user_id = auth.uid()::text
  OR
  -- O si user_id es el email del usuario autenticado
  user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- O si el usuario es admin/teacher
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'teacher', 'supervisor')
  )
);

-- 4. Política para INSERT: permitir crear sesiones propias
CREATE POLICY "Users can create their own exam sessions"
ON public.exam_sessions
FOR INSERT
WITH CHECK (
  -- Permitir si user_id coincide con el UUID del usuario autenticado
  user_id = auth.uid()::text
  OR
  -- O si user_id es el email del usuario autenticado
  user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- O si el usuario es admin/teacher (puede crear para otros)
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'teacher', 'supervisor')
  )
);

-- 5. Política para UPDATE: permitir actualizar sesiones propias
CREATE POLICY "Users can update their own exam sessions"
ON public.exam_sessions
FOR UPDATE
USING (
  user_id = auth.uid()::text
  OR
  user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'teacher', 'supervisor')
  )
);

-- 6. Política especial para service role (funciones RPC)
CREATE POLICY "Service role can manage all sessions"
ON public.exam_sessions
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
-- Actualizar la tabla personal_factors para manejar tanto session_id como exam_id
-- y asegurar que al menos uno de ellos esté presente

-- Primero, hacer session_id nullable si no lo es ya
ALTER TABLE public.personal_factors 
ALTER COLUMN session_id DROP NOT NULL;

-- Agregar exam_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personal_factors' 
    AND column_name = 'exam_id'
  ) THEN
    ALTER TABLE public.personal_factors 
    ADD COLUMN exam_id UUID REFERENCES public.exams(id);
  END IF;
END $$;

-- Crear constraint para asegurar que al menos uno esté presente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'personal_factors_session_or_exam_check' 
    AND table_name = 'personal_factors'
  ) THEN
    ALTER TABLE public.personal_factors 
    ADD CONSTRAINT personal_factors_session_or_exam_check 
    CHECK (session_id IS NOT NULL OR exam_id IS NOT NULL);
  END IF;
END $$;

-- Actualizar las políticas RLS para exam_id también
DROP POLICY IF EXISTS "Users can insert their own personal factors" ON public.personal_factors;

CREATE POLICY "Users can insert their own personal factors" 
ON public.personal_factors 
FOR INSERT 
WITH CHECK (
  (user_id = auth.uid()) OR 
  (session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM exam_sessions es
    WHERE es.id = personal_factors.session_id 
    AND es.user_id = (auth.uid())::text
  )) OR
  (exam_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM exam_attempts ea
    WHERE ea.exam_id = personal_factors.exam_id 
    AND ea.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can view their own personal factors" ON public.personal_factors;

CREATE POLICY "Users can view their own personal factors" 
ON public.personal_factors 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR 
  (session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM exam_sessions es
    WHERE es.id = personal_factors.session_id 
    AND es.user_id = (auth.uid())::text
  )) OR
  (exam_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM exam_attempts ea
    WHERE ea.exam_id = personal_factors.exam_id 
    AND ea.user_id = auth.uid()
  ))
);
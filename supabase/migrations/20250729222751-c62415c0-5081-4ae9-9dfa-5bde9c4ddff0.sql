-- Migración: Extensión de tablas para tests psicométricos con enlaces únicos
-- Objetivo: Reutilizar infraestructura de exámenes de confiabilidad para tests psicométricos

-- 1. Agregar columna para tipo de test en exam_sessions
ALTER TABLE public.exam_sessions 
ADD COLUMN IF NOT EXISTS test_type TEXT NOT NULL DEFAULT 'reliability';

-- Añadir constraint para validar tipos permitidos
ALTER TABLE public.exam_sessions 
ADD CONSTRAINT check_test_type 
CHECK (test_type IN ('reliability', 'psychometric'));

-- 2. Agregar columna para tipo de test en exam_assignments
ALTER TABLE public.exam_assignments 
ADD COLUMN IF NOT EXISTS test_type TEXT NOT NULL DEFAULT 'reliability';

-- Añadir constraint para validar tipos permitidos
ALTER TABLE public.exam_assignments 
ADD CONSTRAINT check_assignment_test_type 
CHECK (test_type IN ('reliability', 'psychometric'));

-- 3. Agregar referencia opcional a psychometric_tests en exam_assignments
ALTER TABLE public.exam_assignments 
ADD COLUMN IF NOT EXISTS psychometric_test_id UUID REFERENCES public.psychometric_tests(id);

-- 4. Agregar referencia opcional a psychometric_tests en exam_sessions  
ALTER TABLE public.exam_sessions 
ADD COLUMN IF NOT EXISTS psychometric_test_id UUID REFERENCES public.psychometric_tests(id);

-- 5. Agregar columna para tipo de test en exam_credentials
ALTER TABLE public.exam_credentials 
ADD COLUMN IF NOT EXISTS test_type TEXT NOT NULL DEFAULT 'reliability';

-- Añadir constraint para validar tipos permitidos
ALTER TABLE public.exam_credentials 
ADD CONSTRAINT check_credentials_test_type 
CHECK (test_type IN ('reliability', 'psychometric'));

-- 6. Agregar referencia opcional a psychometric_tests en exam_credentials
ALTER TABLE public.exam_credentials 
ADD COLUMN IF NOT EXISTS psychometric_test_id UUID REFERENCES public.psychometric_tests(id);

-- 7. Crear índices para optimizar consultas por tipo de test
CREATE INDEX IF NOT EXISTS idx_exam_sessions_test_type ON public.exam_sessions(test_type);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_test_type ON public.exam_assignments(test_type);
CREATE INDEX IF NOT EXISTS idx_exam_credentials_test_type ON public.exam_credentials(test_type);

-- 8. Crear índices para las referencias a psychometric_tests
CREATE INDEX IF NOT EXISTS idx_exam_sessions_psychometric_test_id ON public.exam_sessions(psychometric_test_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_psychometric_test_id ON public.exam_assignments(psychometric_test_id);
CREATE INDEX IF NOT EXISTS idx_exam_credentials_psychometric_test_id ON public.exam_credentials(psychometric_test_id);

-- 9. Agregar constraint para asegurar que solo un tipo de referencia esté presente
-- Para exam_assignments: solo exam_id O psychometric_test_id, no ambos
ALTER TABLE public.exam_assignments 
ADD CONSTRAINT check_single_test_reference_assignments
CHECK (
  (exam_id IS NOT NULL AND psychometric_test_id IS NULL AND test_type = 'reliability') OR
  (exam_id IS NULL AND psychometric_test_id IS NOT NULL AND test_type = 'psychometric')
);

-- Para exam_sessions: solo exam_id O psychometric_test_id, no ambos  
ALTER TABLE public.exam_sessions 
ADD CONSTRAINT check_single_test_reference_sessions
CHECK (
  (exam_id IS NOT NULL AND psychometric_test_id IS NULL AND test_type = 'reliability') OR
  (exam_id IS NULL AND psychometric_test_id IS NOT NULL AND test_type = 'psychometric')
);

-- Para exam_credentials: solo exam_id O psychometric_test_id, no ambos
ALTER TABLE public.exam_credentials 
ADD CONSTRAINT check_single_test_reference_credentials
CHECK (
  (exam_id IS NOT NULL AND psychometric_test_id IS NULL AND test_type = 'reliability') OR
  (exam_id IS NULL AND psychometric_test_id IS NOT NULL AND test_type = 'psychometric')
);

-- 10. Actualizar las políticas RLS existentes para incluir ambos tipos de test
-- Las políticas actuales siguen funcionando, pero agregamos nuevas para psychometric

-- Política para exam_assignments con tests psicométricos
CREATE POLICY "Instructors and admins can manage psychometric assignments" 
ON public.exam_assignments 
FOR ALL 
USING (
  test_type = 'psychometric' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  )
);

-- Política para exam_sessions con tests psicométricos
CREATE POLICY "Admins and teachers can manage psychometric sessions" 
ON public.exam_sessions 
FOR ALL 
USING (
  test_type = 'psychometric' AND 
  user_has_admin_or_teacher_role()
);

-- Política para exam_credentials con tests psicométricos
CREATE POLICY "Admins and teachers can manage psychometric credentials" 
ON public.exam_credentials 
FOR ALL 
USING (
  test_type = 'psychometric' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  )
);

-- Política para acceso público a sesiones psicométricas (necesario para enlaces únicos)
CREATE POLICY "Allow public access to psychometric sessions for authentication" 
ON public.exam_sessions 
FOR SELECT 
USING (test_type = 'psychometric');

-- 11. Actualizar función de generación de credenciales para incluir tests psicométricos
CREATE OR REPLACE FUNCTION public.generate_psychometric_credentials_on_assignment()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
DECLARE
  user_profile RECORD;
  new_username TEXT;
  new_password TEXT;
  test_name TEXT;
BEGIN
  -- Solo procesar asignaciones psicométricas
  IF NEW.test_type != 'psychometric' THEN
    RETURN NEW;
  END IF;

  -- Obtener información del usuario
  SELECT * INTO user_profile FROM public.profiles WHERE id = NEW.user_id;
  
  -- Obtener nombre del test psicométrico
  SELECT name INTO test_name FROM public.psychometric_tests WHERE id = NEW.psychometric_test_id;
  
  -- Generar credenciales únicas
  new_username := public.generate_unique_username();
  new_password := public.generate_random_password();
  
  -- Insertar credenciales para test psicométrico
  INSERT INTO public.exam_credentials (
    psychometric_test_id,
    test_type,
    user_email,
    username,
    password_hash,
    full_name,
    expires_at
  ) VALUES (
    NEW.psychometric_test_id,
    'psychometric',
    user_profile.email,
    new_username,
    new_password,
    user_profile.full_name,
    NOW() + INTERVAL '7 days'
  );
  
  RETURN NEW;
END;
$$;

-- 12. Crear trigger para generación automática de credenciales psicométricas
CREATE TRIGGER trigger_generate_psychometric_credentials
  AFTER INSERT ON public.exam_assignments
  FOR EACH ROW
  WHEN (NEW.test_type = 'psychometric')
  EXECUTE FUNCTION public.generate_psychometric_credentials_on_assignment();

-- 13. Comentarios para documentación
COMMENT ON COLUMN public.exam_sessions.test_type IS 'Tipo de test: reliability para exámenes de confiabilidad, psychometric para tests psicométricos';
COMMENT ON COLUMN public.exam_assignments.test_type IS 'Tipo de test asignado';
COMMENT ON COLUMN public.exam_credentials.test_type IS 'Tipo de test para las credenciales';
COMMENT ON COLUMN public.exam_assignments.psychometric_test_id IS 'Referencia al test psicométrico cuando test_type = psychometric';
COMMENT ON COLUMN public.exam_sessions.psychometric_test_id IS 'Referencia al test psicométrico cuando test_type = psychometric';
COMMENT ON COLUMN public.exam_credentials.psychometric_test_id IS 'Referencia al test psicométrico cuando test_type = psychometric';
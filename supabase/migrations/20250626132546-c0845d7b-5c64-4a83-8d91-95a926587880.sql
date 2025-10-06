
-- Agregar campos para controlar el acceso de usuarios evaluados
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exam_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_login BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS temp_password BOOLEAN DEFAULT false;

-- Crear tabla para asignación de exámenes a usuarios
CREATE TABLE IF NOT EXISTS exam_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'completed')),
  access_link TEXT,
  UNIQUE(exam_id, user_id)
);

-- Habilitar RLS para exam_assignments
ALTER TABLE exam_assignments ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver sus exámenes asignados
CREATE POLICY "Users can view their assigned exams" ON exam_assignments
  FOR SELECT USING (user_id = auth.uid());

-- Política para que instructores y admins puedan gestionar asignaciones
CREATE POLICY "Instructors and admins can manage assignments" ON exam_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'teacher')
    )
  );

-- Función para generar contraseñas temporales automáticamente
CREATE OR REPLACE FUNCTION generate_temp_password()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para validar fechas de examen
CREATE OR REPLACE FUNCTION is_exam_valid(exam_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  exam_record RECORD;
BEGIN
  SELECT estado, fecha_cierre INTO exam_record
  FROM exams 
  WHERE id = exam_id;
  
  IF exam_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar que esté activo
  IF exam_record.estado != 'activo' THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar fecha de cierre (si existe)
  IF exam_record.fecha_cierre IS NOT NULL AND exam_record.fecha_cierre < now() THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

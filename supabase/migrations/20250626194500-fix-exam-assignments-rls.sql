
-- Habilitar RLS en exam_assignments si no está habilitado
ALTER TABLE exam_assignments ENABLE ROW LEVEL SECURITY;

-- Permitir a los usuarios ver sus propias asignaciones de examen
CREATE POLICY "Users can view their own exam assignments" 
  ON exam_assignments 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Permitir a administradores y teachers ver todas las asignaciones
CREATE POLICY "Admin and teachers can view all exam assignments" 
  ON exam_assignments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'teacher', 'supervisor')
    )
  );

-- Permitir a administradores y teachers crear asignaciones
CREATE POLICY "Admin and teachers can create exam assignments" 
  ON exam_assignments 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'teacher', 'supervisor')
    )
  );

-- Permitir a administradores y teachers actualizar asignaciones
CREATE POLICY "Admin and teachers can update exam assignments" 
  ON exam_assignments 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'teacher', 'supervisor')
    )
  );

-- Permitir a administradores y teachers eliminar asignaciones
CREATE POLICY "Admin and teachers can delete exam assignments" 
  ON exam_assignments 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'teacher', 'supervisor')
    )
  );

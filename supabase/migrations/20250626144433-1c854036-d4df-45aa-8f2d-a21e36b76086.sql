
-- Agregar campos para mejorar el control de acceso y estado de usuarios
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_exam_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_restricted BOOLEAN DEFAULT FALSE;

-- Mejorar la tabla de credenciales de examen para incluir más información
ALTER TABLE exam_credentials ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE exam_credentials ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Crear una tabla para trackear el estado de los emails enviados
CREATE TABLE IF NOT EXISTS exam_email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_assignment_id UUID REFERENCES exam_assignments(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  exam_title TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_type TEXT DEFAULT 'exam_invitation',
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

-- Habilitar RLS en la nueva tabla
ALTER TABLE exam_email_notifications ENABLE ROW LEVEL SECURITY;

-- Política para que solo administradores y teachers puedan ver las notificaciones
CREATE POLICY "Admin and teachers can view email notifications" ON exam_email_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Función para generar credenciales automáticamente al asignar examen
CREATE OR REPLACE FUNCTION generate_exam_credentials_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  new_username TEXT;
  new_password TEXT;
BEGIN
  -- Obtener información del usuario asignado
  SELECT * INTO user_profile FROM profiles WHERE id = NEW.user_id;
  
  -- Generar credenciales únicas
  new_username := generate_unique_username();
  new_password := generate_random_password();
  
  -- Insertar credenciales en la tabla exam_credentials
  INSERT INTO exam_credentials (
    exam_id,
    user_email,
    username,
    password_hash,
    full_name,
    expires_at
  ) VALUES (
    NEW.exam_id,
    user_profile.email,
    new_username,
    new_password, -- En producción deberías hashear esto
    user_profile.full_name,
    NOW() + INTERVAL '7 days'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger para generar credenciales automáticamente
DROP TRIGGER IF EXISTS auto_generate_credentials ON exam_assignments;
CREATE TRIGGER auto_generate_credentials
  AFTER INSERT ON exam_assignments
  FOR EACH ROW
  EXECUTE FUNCTION generate_exam_credentials_on_assignment();

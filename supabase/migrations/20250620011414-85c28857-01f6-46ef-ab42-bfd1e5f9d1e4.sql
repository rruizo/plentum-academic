
-- Agregar campos adicionales a la configuración del sistema para logos y datos de empresa
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS footer_text TEXT;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS social_facebook TEXT;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS social_linkedin TEXT;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS social_twitter TEXT;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS social_youtube TEXT;

-- Crear tabla para configuración de reportes
CREATE TABLE IF NOT EXISTS report_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  include_sections JSONB DEFAULT '{"personal_info": true, "category_scores": true, "risk_analysis": true, "recommendations": true}'::jsonb,
  font_family TEXT DEFAULT 'Arial',
  font_size INTEGER DEFAULT 12,
  header_logo_url TEXT,
  footer_logo_url TEXT,
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para credenciales de examen
CREATE TABLE IF NOT EXISTS exam_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  user_email TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para asignación de supervisores
CREATE TABLE IF NOT EXISTS supervisor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(supervisor_id, assigned_user_id)
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE report_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para report_config
CREATE POLICY "Admins and teachers can manage report configs" ON report_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Políticas RLS para exam_credentials
CREATE POLICY "Admins and teachers can manage exam credentials" ON exam_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Políticas RLS para supervisor_assignments
CREATE POLICY "Admins can manage supervisor assignments" ON supervisor_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Supervisors can view their assignments" ON supervisor_assignments
  FOR SELECT USING (supervisor_id = auth.uid());

-- Función para generar credenciales únicas
CREATE OR REPLACE FUNCTION generate_unique_username()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_username TEXT;
  username_exists BOOLEAN;
BEGIN
  LOOP
    -- Generar username de 8 caracteres alfanuméricos
    new_username := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM exam_credentials WHERE username = new_username) INTO username_exists;
    
    -- Si no existe, salir del loop
    IF NOT username_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_username;
END;
$$;

-- Función para generar contraseña aleatoria
CREATE OR REPLACE FUNCTION generate_random_password()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  password TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    password := password || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  RETURN password;
END;
$$;

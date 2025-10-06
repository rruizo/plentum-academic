
-- Crear políticas RLS para la tabla exam_email_notifications
-- Permitir a usuarios autenticados insertar notificaciones de correo
CREATE POLICY "Allow authenticated users to insert email notifications" 
  ON public.exam_email_notifications 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Permitir a usuarios autenticados ver las notificaciones de correo
CREATE POLICY "Allow authenticated users to view email notifications" 
  ON public.exam_email_notifications 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Habilitar RLS en la tabla
ALTER TABLE public.exam_email_notifications ENABLE ROW LEVEL SECURITY;

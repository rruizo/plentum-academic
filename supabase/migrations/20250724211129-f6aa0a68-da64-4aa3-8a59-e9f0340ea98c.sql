-- Agregar política RLS para permitir UPDATE en exam_email_notifications
CREATE POLICY "Allow authenticated users to update email notifications" 
ON exam_email_notifications 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);
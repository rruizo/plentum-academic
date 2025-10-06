-- Verificar restricciones de la tabla exam_email_notifications
SELECT constraint_name, check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%exam_email_notifications%';

-- Eliminar y recrear la restricción para incluir el nuevo estado
ALTER TABLE public.exam_email_notifications 
DROP CONSTRAINT IF EXISTS exam_email_notifications_status_check;

-- Agregar la nueva restricción con todos los estados válidos
ALTER TABLE public.exam_email_notifications 
ADD CONSTRAINT exam_email_notifications_status_check 
CHECK (status IN ('pending', 'sent', 'failed', 'requires_manual_delivery'));
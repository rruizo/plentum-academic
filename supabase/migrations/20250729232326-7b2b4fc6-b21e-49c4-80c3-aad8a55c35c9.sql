-- Actualizar el constraint para permitir el valor 'notified'
ALTER TABLE public.exam_assignments 
DROP CONSTRAINT exam_assignments_status_check;

ALTER TABLE public.exam_assignments 
ADD CONSTRAINT exam_assignments_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'assigned'::text, 'started'::text, 'completed'::text, 'notified'::text]));
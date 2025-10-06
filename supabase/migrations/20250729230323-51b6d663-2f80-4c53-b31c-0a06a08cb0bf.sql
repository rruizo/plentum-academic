-- Verificar la restricción que está causando problemas y eliminarla
-- Primero vemos qué restricciones existen en exam_credentials
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.exam_credentials'::regclass;

-- Eliminar la restricción problemática
ALTER TABLE public.exam_credentials 
DROP CONSTRAINT IF EXISTS check_single_test_reference_credentials;

-- Crear una nueva restricción que permita correctamente tests psicométricos
ALTER TABLE public.exam_credentials 
ADD CONSTRAINT check_single_test_reference_credentials 
CHECK (
  (exam_id IS NOT NULL AND psychometric_test_id IS NULL AND test_type = 'reliability') OR
  (exam_id IS NULL AND psychometric_test_id IS NOT NULL AND test_type = 'psychometric')
);
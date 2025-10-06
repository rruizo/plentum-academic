-- Eliminar completamente la restricción problemática
ALTER TABLE public.exam_credentials 
DROP CONSTRAINT IF EXISTS check_single_test_reference_credentials;
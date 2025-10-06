-- Eliminar la constraint antigua que no permite 'turnover'
ALTER TABLE public.exam_credentials 
DROP CONSTRAINT IF EXISTS check_credentials_test_type;

-- Agregar nueva constraint que permite 'turnover'
ALTER TABLE public.exam_credentials 
ADD CONSTRAINT check_credentials_test_type 
CHECK (test_type IN ('reliability', 'psychometric', 'turnover'));
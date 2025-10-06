-- Expandir constraint check_test_type para incluir todos los tipos de test válidos
-- Actualmente solo permite 'reliability' y 'psychometric', falta 'turnover', 'cognitive', 'htp', 'other'

-- 1. Actualizar constraint en exam_sessions
ALTER TABLE public.exam_sessions 
DROP CONSTRAINT IF EXISTS check_test_type;

ALTER TABLE public.exam_sessions 
ADD CONSTRAINT check_test_type 
CHECK (test_type IN ('reliability', 'psychometric', 'turnover', 'cognitive', 'htp', 'other'));

-- 2. Actualizar constraint en exam_assignments
ALTER TABLE public.exam_assignments 
DROP CONSTRAINT IF EXISTS check_assignment_test_type;

ALTER TABLE public.exam_assignments 
ADD CONSTRAINT check_assignment_test_type 
CHECK (test_type IN ('reliability', 'psychometric', 'turnover', 'cognitive', 'htp', 'other'));

-- 3. Actualizar constraint en exam_credentials (si existe)
ALTER TABLE public.exam_credentials 
DROP CONSTRAINT IF EXISTS check_credential_test_type;

ALTER TABLE public.exam_credentials 
ADD CONSTRAINT check_credential_test_type 
CHECK (test_type IN ('reliability', 'psychometric', 'turnover', 'cognitive', 'htp', 'other'));
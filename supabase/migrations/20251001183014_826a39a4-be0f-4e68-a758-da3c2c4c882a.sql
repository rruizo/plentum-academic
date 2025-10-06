-- Hacer constraints más flexibles para permitir casos especiales
-- donde las credenciales puedan existir sin exam_id/psychometric_test_id

-- Para exam_sessions: permitir flexibility en referencias
ALTER TABLE public.exam_sessions 
DROP CONSTRAINT IF EXISTS check_single_test_reference_sessions;

ALTER TABLE public.exam_sessions 
ADD CONSTRAINT check_single_test_reference_sessions
CHECK (
  -- Reliability/turnover/cognitive pueden tener exam_id o no
  (test_type IN ('reliability', 'turnover', 'cognitive') AND psychometric_test_id IS NULL) OR
  -- Psychometric debe tener psychometric_test_id
  (test_type = 'psychometric' AND exam_id IS NULL AND psychometric_test_id IS NOT NULL) OR
  -- HTP y otros no requieren referencias
  (test_type IN ('htp', 'other') AND exam_id IS NULL AND psychometric_test_id IS NULL)
);

-- Para exam_assignments: similar lógica flexible
ALTER TABLE public.exam_assignments 
DROP CONSTRAINT IF EXISTS check_single_test_reference_assignments;

ALTER TABLE public.exam_assignments 
ADD CONSTRAINT check_single_test_reference_assignments
CHECK (
  -- Reliability/turnover/cognitive pueden tener exam_id o no
  (test_type IN ('reliability', 'turnover', 'cognitive') AND psychometric_test_id IS NULL) OR
  -- Psychometric debe tener psychometric_test_id
  (test_type = 'psychometric' AND exam_id IS NULL AND psychometric_test_id IS NOT NULL) OR
  -- HTP y otros no requieren referencias
  (test_type IN ('htp', 'other') AND exam_id IS NULL AND psychometric_test_id IS NULL)
);

-- Para exam_credentials: similar lógica flexible
ALTER TABLE public.exam_credentials 
DROP CONSTRAINT IF EXISTS check_single_test_reference_credentials;

ALTER TABLE public.exam_credentials 
ADD CONSTRAINT check_single_test_reference_credentials
CHECK (
  -- Reliability/turnover/cognitive pueden tener exam_id o no
  (test_type IN ('reliability', 'turnover', 'cognitive') AND psychometric_test_id IS NULL) OR
  -- Psychometric debe tener psychometric_test_id
  (test_type = 'psychometric' AND exam_id IS NULL AND psychometric_test_id IS NOT NULL) OR
  -- HTP y otros no requieren referencias
  (test_type IN ('htp', 'other') AND exam_id IS NULL AND psychometric_test_id IS NULL)
);
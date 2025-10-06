
-- Primero, eliminar el constraint que solo permite 'reliability' y 'psychometric'
ALTER TABLE public.exam_assignments 
DROP CONSTRAINT IF EXISTS check_assignment_test_type;

-- Agregar nuevo constraint que incluye 'turnover'
ALTER TABLE public.exam_assignments
ADD CONSTRAINT check_assignment_test_type 
CHECK (test_type IN ('reliability', 'psychometric', 'turnover'));

-- Eliminar el constraint que requiere exam_id o psychometric_test_id
ALTER TABLE public.exam_assignments 
DROP CONSTRAINT IF EXISTS check_single_test_reference_assignments;

-- Agregar nuevo constraint que permite 'turnover' sin referencias
ALTER TABLE public.exam_assignments
ADD CONSTRAINT check_single_test_reference_assignments
CHECK (
  -- reliability: requiere exam_id
  (test_type = 'reliability' AND exam_id IS NOT NULL AND psychometric_test_id IS NULL)
  OR
  -- psychometric: requiere psychometric_test_id
  (test_type = 'psychometric' AND exam_id IS NULL AND psychometric_test_id IS NOT NULL)
  OR
  -- turnover: ambos IDs NULL
  (test_type = 'turnover' AND exam_id IS NULL AND psychometric_test_id IS NULL)
);

-- Crear índice para mejorar rendimiento de búsqueda de asignaciones de turnover
CREATE INDEX IF NOT EXISTS idx_exam_assignments_turnover 
ON public.exam_assignments(user_id, test_type) 
WHERE test_type = 'turnover';

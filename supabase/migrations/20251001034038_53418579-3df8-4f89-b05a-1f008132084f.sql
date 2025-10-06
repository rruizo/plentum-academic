-- Eliminar constraint que requiere session_id o exam_id en personal_factors
-- Esto permite que los estudiantes guarden sus datos personales antes de iniciar un examen
-- Las políticas RLS ya controlan el acceso adecuadamente

ALTER TABLE public.personal_factors
DROP CONSTRAINT IF EXISTS personal_factors_session_or_exam_check;
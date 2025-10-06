-- Crear función segura para obtener asignaciones de un usuario validado
CREATE OR REPLACE FUNCTION public.get_user_exam_assignments(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  exam_id uuid,
  psychometric_test_id uuid,
  test_type text,
  status text,
  assigned_at timestamp with time zone,
  exam_title text,
  exam_description text,
  exam_duracion_minutos integer,
  exam_fecha_cierre timestamp with time zone,
  exam_fecha_apertura timestamp with time zone,
  exam_estado text,
  psychometric_name text,
  psychometric_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id,
    ea.exam_id,
    ea.psychometric_test_id,
    ea.test_type,
    ea.status,
    ea.assigned_at,
    e.title as exam_title,
    e.description as exam_description,
    e.duracion_minutos as exam_duracion_minutos,
    e.fecha_cierre as exam_fecha_cierre,
    e.fecha_apertura as exam_fecha_apertura,
    e.estado as exam_estado,
    pt.name as psychometric_name,
    pt.description as psychometric_description
  FROM public.exam_assignments ea
  LEFT JOIN public.exams e ON ea.exam_id = e.id
  LEFT JOIN public.psychometric_tests pt ON ea.psychometric_test_id = pt.id
  WHERE ea.user_id = p_user_id
    AND ea.status IN ('pending', 'notified', 'started')
  ORDER BY ea.assigned_at DESC;
END;
$$;

-- Crear función segura para obtener credenciales de examen
CREATE OR REPLACE FUNCTION public.get_exam_credentials_for_user(p_user_email text, p_test_type text, p_exam_id uuid DEFAULT NULL, p_psychometric_test_id uuid DEFAULT NULL)
RETURNS TABLE (
  expires_at timestamp with time zone,
  is_used boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.expires_at,
    ec.is_used
  FROM public.exam_credentials ec
  WHERE ec.user_email = p_user_email
    AND ec.test_type = p_test_type
    AND (
      (p_test_type = 'reliability' AND ec.exam_id = p_exam_id) OR
      (p_test_type = 'psychometric' AND ec.psychometric_test_id = p_psychometric_test_id) OR
      (p_test_type NOT IN ('reliability', 'psychometric'))
    )
  LIMIT 1;
END;
$$;
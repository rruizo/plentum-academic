-- 1. RPC para obtener sesiones sin requerir auth.uid() (soluciona problema de autenticación)
CREATE OR REPLACE FUNCTION public.get_exam_session_by_id(p_session_id uuid)
RETURNS TABLE(
  id uuid,
  user_id text,
  exam_id uuid,
  psychometric_test_id uuid,
  test_type text,
  status text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  attempts_taken integer,
  max_attempts integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  company_id uuid,
  exam_title text,
  exam_description text,
  exam_duracion_minutos integer,
  psychometric_name text,
  psychometric_description text,
  user_full_name text,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.id,
    es.user_id,
    es.exam_id,
    es.psychometric_test_id,
    es.test_type,
    es.status,
    es.start_time,
    es.end_time,
    es.attempts_taken,
    es.max_attempts,
    es.created_at,
    es.updated_at,
    es.company_id,
    e.title as exam_title,
    e.description as exam_description,
    e.duracion_minutos as exam_duracion_minutos,
    pt.name as psychometric_name,
    pt.description as psychometric_description,
    p.full_name as user_full_name,
    p.email as user_email
  FROM exam_sessions es
  LEFT JOIN exams e ON es.exam_id = e.id
  LEFT JOIN psychometric_tests pt ON es.psychometric_test_id = pt.id
  LEFT JOIN profiles p ON (es.user_id = p.id::text OR es.user_id = p.email)
  WHERE es.id = p_session_id;
END;
$$;

-- 2. Actualizar get_user_exam_assignments para incluir examen de rotación
CREATE OR REPLACE FUNCTION public.get_user_exam_assignments(p_user_id uuid)
RETURNS TABLE(
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Asignaciones de exámenes regulares y psicométricos
  WITH exam_assignments_data AS (
    SELECT 
      ea.id,
      ea.exam_id,
      ea.psychometric_test_id,
      ea.test_type,
      ea.status,
      ea.assigned_at,
      COALESCE(e.title, 
        CASE 
          WHEN ea.test_type = 'turnover' THEN 'Examen de Rotación de Personal'
          ELSE 'Examen sin título'
        END
      ) as exam_title,
      COALESCE(e.description,
        CASE 
          WHEN ea.test_type = 'turnover' THEN 'Evaluación de factores de riesgo de rotación de personal'
          ELSE NULL
        END
      ) as exam_description,
      COALESCE(e.duracion_minutos, 30) as exam_duracion_minutos,
      e.fecha_cierre as exam_fecha_cierre,
      e.fecha_apertura as exam_fecha_apertura,
      COALESCE(e.estado, 'activo') as exam_estado,
      pt.name as psychometric_name,
      pt.description as psychometric_description,
      ROW_NUMBER() OVER (PARTITION BY ea.test_type ORDER BY ea.assigned_at DESC) as rn
    FROM public.exam_assignments ea
    LEFT JOIN public.exams e ON ea.exam_id = e.id
    LEFT JOIN public.psychometric_tests pt ON ea.psychometric_test_id = pt.id
    WHERE ea.user_id = p_user_id
      AND ea.status IN ('pending', 'notified', 'started')
  ),
  -- Asignaciones HTP
  htp_assignments_data AS (
    SELECT 
      ha.id,
      NULL::uuid as exam_id,
      NULL::uuid as psychometric_test_id,
      'htp'::text as test_type,
      ha.status,
      ha.created_at as assigned_at,
      'Test HTP (Casa-Árbol-Persona)'::text as exam_title,
      'Test proyectivo psicológico Casa-Árbol-Persona'::text as exam_description,
      60 as exam_duracion_minutos,
      ha.expires_at as exam_fecha_cierre,
      ha.created_at as exam_fecha_apertura,
      'activo'::text as exam_estado,
      NULL::text as psychometric_name,
      NULL::text as psychometric_description,
      ROW_NUMBER() OVER (ORDER BY ha.created_at DESC) as rn
    FROM public.htp_assignments ha
    WHERE ha.user_id = p_user_id
      AND ha.status IN ('pending', 'notified')
      AND (ha.expires_at IS NULL OR ha.expires_at > NOW())
  )
  -- Combinar y retornar solo 1 de cada tipo
  SELECT 
    ead.id,
    ead.exam_id,
    ead.psychometric_test_id,
    ead.test_type,
    ead.status,
    ead.assigned_at,
    ead.exam_title,
    ead.exam_description,
    ead.exam_duracion_minutos,
    ead.exam_fecha_cierre,
    ead.exam_fecha_apertura,
    ead.exam_estado,
    ead.psychometric_name,
    ead.psychometric_description
  FROM exam_assignments_data ead
  WHERE ead.rn = 1
  UNION ALL
  SELECT 
    had.id,
    had.exam_id,
    had.psychometric_test_id,
    had.test_type,
    had.status,
    had.assigned_at,
    had.exam_title,
    had.exam_description,
    had.exam_duracion_minutos,
    had.exam_fecha_cierre,
    had.exam_fecha_apertura,
    had.exam_estado,
    had.psychometric_name,
    had.psychometric_description
  FROM htp_assignments_data had
  WHERE had.rn = 1
  ORDER BY assigned_at DESC;
END;
$$;
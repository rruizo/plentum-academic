-- Eliminar función anterior y recrear con lógica mejorada
DROP FUNCTION IF EXISTS public.get_user_exam_assignments(uuid);

-- Función mejorada que obtiene todas las asignaciones (reliability, psychometric, HTP)
-- y filtra correctamente para mostrar solo 1 de cada tipo
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
  -- Obtener asignaciones de exámenes (reliability y psychometric)
  WITH exam_assignments_data AS (
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
      pt.description as psychometric_description,
      ROW_NUMBER() OVER (PARTITION BY ea.test_type ORDER BY ea.assigned_at DESC) as rn
    FROM public.exam_assignments ea
    LEFT JOIN public.exams e ON ea.exam_id = e.id
    LEFT JOIN public.psychometric_tests pt ON ea.psychometric_test_id = pt.id
    WHERE ea.user_id = p_user_id
      AND ea.status IN ('pending', 'notified', 'started')
  ),
  -- Obtener asignaciones HTP
  htp_assignments_data AS (
    SELECT 
      ha.id,
      NULL::uuid as exam_id,
      NULL::uuid as psychometric_test_id,
      'htp'::text as test_type,
      ha.status,
      ha.created_at as assigned_at,
      'Test HTP'::text as exam_title,
      'Test Casa-Árbol-Persona (HTP)'::text as exam_description,
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
  -- Combinar y retornar solo 1 de cada tipo (row_number = 1)
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

-- Función para iniciar una sesión de examen de manera segura
CREATE OR REPLACE FUNCTION public.start_exam_session(
  p_user_id uuid,
  p_exam_id uuid DEFAULT NULL,
  p_psychometric_test_id uuid DEFAULT NULL,
  p_test_type text DEFAULT 'reliability',
  p_assignment_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id uuid;
  v_existing_session uuid;
BEGIN
  -- Buscar sesión existente pendiente
  SELECT id INTO v_existing_session
  FROM public.exam_sessions
  WHERE user_id = p_user_id::text
    AND test_type = p_test_type
    AND status IN ('pending', 'started')
    AND (
      (p_test_type = 'reliability' AND exam_id = p_exam_id) OR
      (p_test_type = 'psychometric' AND psychometric_test_id = p_psychometric_test_id) OR
      (p_test_type NOT IN ('reliability', 'psychometric'))
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_session IS NOT NULL THEN
    -- Usar sesión existente
    v_session_id := v_existing_session;
  ELSE
    -- Crear nueva sesión
    INSERT INTO public.exam_sessions (
      user_id,
      exam_id,
      psychometric_test_id,
      test_type,
      status
    ) VALUES (
      p_user_id::text,
      p_exam_id,
      p_psychometric_test_id,
      p_test_type,
      'pending'
    )
    RETURNING id INTO v_session_id;
  END IF;

  -- Actualizar estado de la asignación si se proporcionó
  IF p_assignment_id IS NOT NULL THEN
    UPDATE public.exam_assignments
    SET status = 'started'
    WHERE id = p_assignment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
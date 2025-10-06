-- Crear función Edge para completar examen automáticamente
-- Esta será llamada cuando se complete un exam_attempt

-- Crear trigger para disparar análisis automático cuando se completa un examen
CREATE OR REPLACE FUNCTION public.trigger_ai_analysis_on_exam_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    session_id_var UUID;
BEGIN
    -- Solo disparar análisis si el examen se acaba de completar (completed_at cambió de NULL a una fecha)
    IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
        -- Buscar si existe una sesión asociada con este intento
        SELECT es.id INTO session_id_var
        FROM exam_sessions es
        WHERE es.exam_id = NEW.exam_id 
        AND (es.user_id = NEW.user_id::text OR es.user_id = (SELECT email FROM profiles WHERE id = NEW.user_id))
        AND es.status != 'completed'
        ORDER BY es.created_at DESC
        LIMIT 1;

        -- Si existe una sesión, completarla
        IF session_id_var IS NOT NULL THEN
            UPDATE exam_sessions 
            SET status = 'completed', 
                end_time = COALESCE(end_time, NOW()),
                updated_at = NOW()
            WHERE id = session_id_var;
        END IF;

        -- Log para debugging
        INSERT INTO exam_analysis_cache (
            exam_session_id, 
            analysis_type, 
            analysis_input, 
            analysis_result,
            created_at
        ) VALUES (
            COALESCE(session_id_var, gen_random_uuid()), 
            'auto_completion_log', 
            jsonb_build_object(
                'exam_attempt_id', NEW.id,
                'exam_id', NEW.exam_id,
                'user_id', NEW.user_id,
                'completed_at', NEW.completed_at,
                'session_found', session_id_var IS NOT NULL
            ),
            jsonb_build_object('status', 'exam_completed', 'timestamp', NOW()),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Crear el trigger en exam_attempts
DROP TRIGGER IF EXISTS exam_completion_trigger ON exam_attempts;
CREATE TRIGGER exam_completion_trigger
    AFTER UPDATE ON exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_ai_analysis_on_exam_completion();

-- Función auxiliar para obtener datos completos del examen para análisis
CREATE OR REPLACE FUNCTION public.get_exam_analysis_data(attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'exam_attempt', jsonb_build_object(
            'id', ea.id,
            'exam_id', ea.exam_id,
            'user_id', ea.user_id,
            'questions', ea.questions,
            'answers', ea.answers,
            'started_at', ea.started_at,
            'completed_at', ea.completed_at
        ),
        'exam_details', jsonb_build_object(
            'id', e.id,
            'title', e.title,
            'description', e.description,
            'duracion_minutos', e.duracion_minutos
        ),
        'user_profile', jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'email', p.email,
            'company', p.company,
            'area', p.area,
            'section', p.section,
            'role', p.role
        )
    ) INTO result
    FROM exam_attempts ea
    LEFT JOIN exams e ON ea.exam_id = e.id
    LEFT JOIN profiles p ON ea.user_id = p.id
    WHERE ea.id = attempt_id;
    
    RETURN result;
END;
$$;
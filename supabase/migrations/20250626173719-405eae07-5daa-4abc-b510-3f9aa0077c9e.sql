
-- Limpiar datos problemáticos de asignaciones de exámenes
-- Corregir tipos de datos en las comparaciones

-- Ver asignaciones recientes que podrían estar marcadas incorrectamente
SELECT 
    ea.id,
    ea.status,
    ea.assigned_at,
    p.full_name,
    p.email,
    e.title as exam_title
FROM exam_assignments ea
JOIN profiles p ON ea.user_id = p.id
JOIN exams e ON ea.exam_id = e.id
WHERE ea.assigned_at >= NOW() - INTERVAL '1 day'
ORDER BY ea.assigned_at DESC;

-- Ver notificaciones de email recientes
SELECT 
    een.id,
    een.status,
    een.user_email,
    een.user_name,
    een.exam_title,
    een.sent_at
FROM exam_email_notifications een
WHERE een.sent_at >= NOW() - INTERVAL '1 day'
ORDER BY een.sent_at DESC;

-- Resetear el estado de asignaciones recientes problemáticas
-- Corregir la comparación de tipos: ambos deben ser UUID
UPDATE exam_assignments 
SET status = 'pending'
WHERE status IN ('sent', 'completed') 
AND assigned_at >= NOW() - INTERVAL '1 day'
AND id IN (
    SELECT ea.id 
    FROM exam_assignments ea
    LEFT JOIN exam_email_notifications een ON een.exam_assignment_id = ea.id
    WHERE een.id IS NULL OR een.status = 'failed'
);

-- Eliminar registros de notificaciones fallidas para permitir reenvío
DELETE FROM exam_email_notifications
WHERE status = 'failed' 
AND sent_at >= NOW() - INTERVAL '1 day';

-- Eliminar notificaciones marcadas como enviadas pero que realmente no se enviaron
DELETE FROM exam_email_notifications
WHERE status = 'sent' 
AND sent_at >= NOW() - INTERVAL '1 day'
AND exam_assignment_id IN (
    SELECT id 
    FROM exam_assignments 
    WHERE status = 'pending'
);

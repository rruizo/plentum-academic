
-- Eliminar asignaciones duplicadas o problemáticas
-- Mantener solo las asignaciones más recientes para cada usuario/examen

-- Primero, identificar las asignaciones duplicadas
WITH duplicates AS (
  SELECT 
    id,
    exam_id,
    user_id,
    assigned_at,
    ROW_NUMBER() OVER (
      PARTITION BY exam_id, user_id 
      ORDER BY assigned_at DESC
    ) as rn
  FROM exam_assignments
)
-- Eliminar todas las asignaciones duplicadas excepto la más reciente
DELETE FROM exam_assignments 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Eliminar notificaciones huérfanas (sin asignación correspondiente)
DELETE FROM exam_email_notifications 
WHERE exam_assignment_id NOT IN (
  SELECT id FROM exam_assignments
);

-- Eliminar credenciales huérfanas para usuarios que ya no tienen asignaciones
DELETE FROM exam_credentials 
WHERE user_email NOT IN (
  SELECT p.email 
  FROM exam_assignments ea 
  JOIN profiles p ON ea.user_id = p.id
);

-- Verificar el estado después de la limpieza
SELECT 
  COUNT(*) as total_assignments,
  COUNT(DISTINCT CONCAT(exam_id, '-', user_id)) as unique_combinations
FROM exam_assignments;

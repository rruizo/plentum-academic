-- Verificar el constraint actual en exam_assignments.status
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public' 
AND constraint_name LIKE '%exam_assignments%status%';
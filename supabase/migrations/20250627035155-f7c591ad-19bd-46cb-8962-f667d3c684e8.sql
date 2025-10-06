
-- Check the current constraint on exam_assignments status
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'exam_assignments'::regclass 
AND contype = 'c';

-- Drop the existing check constraint
ALTER TABLE exam_assignments DROP CONSTRAINT IF EXISTS exam_assignments_status_check;

-- Add the correct check constraint with 'assigned' as a valid status
ALTER TABLE exam_assignments ADD CONSTRAINT exam_assignments_status_check 
CHECK (status IN ('pending', 'assigned', 'started', 'completed'));

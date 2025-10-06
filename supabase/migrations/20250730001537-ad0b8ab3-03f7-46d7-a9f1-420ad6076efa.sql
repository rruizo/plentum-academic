-- Add max_attempts column to psychometric_tests table
ALTER TABLE public.psychometric_tests 
ADD COLUMN max_attempts integer NOT NULL DEFAULT 2;

-- Update existing psychometric tests to have 2 attempts by default
UPDATE public.psychometric_tests 
SET max_attempts = 2 
WHERE max_attempts IS NULL;
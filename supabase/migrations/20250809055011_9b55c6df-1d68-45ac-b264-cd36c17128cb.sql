-- Add AI analysis storage columns to exam_attempts table
ALTER TABLE exam_attempts 
ADD COLUMN IF NOT EXISTS ai_analysis jsonb,
ADD COLUMN IF NOT EXISTS ai_analysis_generated_at timestamp with time zone;

-- Add AI analysis storage columns to personality_results table  
ALTER TABLE personality_results 
ADD COLUMN IF NOT EXISTS ai_analysis_generated_at timestamp with time zone;
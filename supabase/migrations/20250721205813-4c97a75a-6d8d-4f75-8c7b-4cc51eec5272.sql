-- Add columns to exam_assignments table for manual delivery tracking
ALTER TABLE exam_assignments 
ADD COLUMN IF NOT EXISTS manual_delivery boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notified_at timestamp with time zone;
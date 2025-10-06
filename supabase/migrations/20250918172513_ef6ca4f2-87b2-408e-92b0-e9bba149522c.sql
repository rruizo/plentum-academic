-- Add template fields to report_config table
ALTER TABLE public.report_config 
ADD COLUMN IF NOT EXISTS custom_template TEXT,
ADD COLUMN IF NOT EXISTS template_name TEXT;
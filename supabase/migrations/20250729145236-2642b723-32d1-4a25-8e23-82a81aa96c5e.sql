-- Add missing favicon_url column to system_config table
ALTER TABLE public.system_config ADD COLUMN favicon_url TEXT;
-- Hacer que exam_id sea nullable en exam_sessions para permitir tests psicométricos
ALTER TABLE public.exam_sessions 
ALTER COLUMN exam_id DROP NOT NULL;
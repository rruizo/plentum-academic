-- Permitir exam_id null para tests psicométricos
ALTER TABLE exam_assignments ALTER COLUMN exam_id DROP NOT NULL;
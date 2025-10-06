
-- Agregar la columna explicacion a la tabla question_categories
ALTER TABLE public.question_categories 
ADD COLUMN IF NOT EXISTS explicacion TEXT;

-- Actualizar el comentario de la tabla para documentar el nuevo campo
COMMENT ON COLUMN public.question_categories.explicacion IS 'Explicación detallada de la categoría';

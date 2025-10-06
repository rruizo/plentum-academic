-- Añadir columna type a la tabla exams para diferenciar tipos de examen
ALTER TABLE public.exams 
ADD COLUMN type TEXT NOT NULL DEFAULT 'confiabilidad';

-- Añadir comentario para documentar los valores permitidos
COMMENT ON COLUMN public.exams.type IS 'Tipo de examen: confiabilidad o psicometrico';

-- Añadir columna opcional para vincular tests psicométricos específicos
ALTER TABLE public.exams 
ADD COLUMN psychometric_test_id UUID;

-- Añadir foreign key constraint para psychometric_test_id
ALTER TABLE public.exams 
ADD CONSTRAINT fk_exams_psychometric_test 
FOREIGN KEY (psychometric_test_id) REFERENCES public.psychometric_tests(id);

-- Crear índice para mejorar performance en consultas por tipo
CREATE INDEX idx_exams_type ON public.exams(type);

-- Crear índice para psychometric_test_id
CREATE INDEX idx_exams_psychometric_test_id ON public.exams(psychometric_test_id);
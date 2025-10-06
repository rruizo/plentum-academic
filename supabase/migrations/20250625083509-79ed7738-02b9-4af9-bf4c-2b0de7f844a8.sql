
-- Agregar la clave foránea que falta entre examen_aplicante y profiles
ALTER TABLE public.examen_aplicante 
ADD CONSTRAINT fk_examen_aplicante_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Agregar la clave foránea entre examen_aplicante y exams
ALTER TABLE public.examen_aplicante 
ADD CONSTRAINT fk_examen_aplicante_examen_id 
FOREIGN KEY (examen_id) REFERENCES public.exams(id) ON DELETE CASCADE;

-- Agregar la clave foránea entre respuesta_aplicante y examen_aplicante
ALTER TABLE public.respuesta_aplicante 
ADD CONSTRAINT fk_respuesta_aplicante_examen_aplicante_id 
FOREIGN KEY (examen_aplicante_id) REFERENCES public.examen_aplicante(id) ON DELETE CASCADE;

-- Agregar la clave foránea entre respuesta_aplicante y questions
ALTER TABLE public.respuesta_aplicante 
ADD CONSTRAINT fk_respuesta_aplicante_pregunta_id 
FOREIGN KEY (pregunta_id) REFERENCES public.questions(id) ON DELETE CASCADE;

-- Agregar la clave foránea entre resultado_categoria y examen_aplicante
ALTER TABLE public.resultado_categoria 
ADD CONSTRAINT fk_resultado_categoria_examen_aplicante_id 
FOREIGN KEY (examen_aplicante_id) REFERENCES public.examen_aplicante(id) ON DELETE CASCADE;

-- Agregar la clave foránea entre resultado_categoria y question_categories
ALTER TABLE public.resultado_categoria 
ADD CONSTRAINT fk_resultado_categoria_categoria_id 
FOREIGN KEY (categoria_id) REFERENCES public.question_categories(id) ON DELETE CASCADE;

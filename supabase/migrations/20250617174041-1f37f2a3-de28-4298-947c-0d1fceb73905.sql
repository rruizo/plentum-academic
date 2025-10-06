
-- Actualizar la tabla questions para que media_poblacional_pregunta use las opciones fijas
ALTER TABLE public.questions 
DROP COLUMN IF EXISTS media_poblacional_pregunta;

ALTER TABLE public.questions 
ADD COLUMN media_poblacional_pregunta text 
CHECK (media_poblacional_pregunta IN ('Nunca', 'Rara vez', 'A veces', 'Frecuentemente'));

-- Actualizar la tabla question_categories para que national_average también use las opciones fijas
ALTER TABLE public.question_categories 
DROP COLUMN IF EXISTS national_average;

ALTER TABLE public.question_categories 
ADD COLUMN national_average text 
CHECK (national_average IN ('Nunca', 'Rara vez', 'A veces', 'Frecuentemente'));

-- Actualizar la tabla resultado_categoria para que media_poblacional_total use las opciones fijas
ALTER TABLE public.resultado_categoria 
DROP COLUMN IF EXISTS media_poblacional_total;

ALTER TABLE public.resultado_categoria 
ADD COLUMN media_poblacional_total text 
CHECK (media_poblacional_total IN ('Nunca', 'Rara vez', 'A veces', 'Frecuentemente'));

-- Limpiar datos existentes en las tablas relacionadas para evitar inconsistencias
TRUNCATE TABLE public.questions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.question_categories RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.resultado_categoria RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.respuesta_aplicante RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.examen_aplicante RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.examen_configuracion_categoria RESTART IDENTITY CASCADE;

-- Actualizar las funciones para trabajar con texto en lugar de números
CREATE OR REPLACE FUNCTION public.convertir_respuesta_a_numero(respuesta_texto text)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  CASE respuesta_texto
    WHEN 'Nunca' THEN RETURN 0;
    WHEN 'Rara vez' THEN RETURN 1;
    WHEN 'A veces' THEN RETURN 2;
    WHEN 'Frecuentemente' THEN RETURN 3;
    ELSE RETURN 0;
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.convertir_numero_a_respuesta(numero integer)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  CASE numero
    WHEN 0 THEN RETURN 'Nunca';
    WHEN 1 THEN RETURN 'Rara vez';
    WHEN 2 THEN RETURN 'A veces';
    WHEN 3 THEN RETURN 'Frecuentemente';
    ELSE RETURN 'Nunca';
  END CASE;
END;
$function$;

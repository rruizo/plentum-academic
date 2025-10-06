-- Actualizar función para manejar estado civil separado (divorciado y viudo)
CREATE OR REPLACE FUNCTION public.calculate_personal_adjustment(
  p_estado_civil text, 
  p_tiene_hijos boolean, 
  p_situacion_habitacional text, 
  p_edad integer
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $function$
DECLARE
  ajuste_estado_civil NUMERIC := 0;
  ajuste_hijos NUMERIC := 0;
  ajuste_habitacional NUMERIC := 0;
  ajuste_edad NUMERIC := 0;
  ajuste_total NUMERIC := 0;
BEGIN
  -- Ajuste por estado civil
  CASE p_estado_civil
    WHEN 'casado' THEN ajuste_estado_civil := -0.05;
    WHEN 'soltero', 'divorciado', 'viudo' THEN ajuste_estado_civil := 0.05;
  END CASE;
  
  -- Ajuste por hijos
  IF p_tiene_hijos THEN
    ajuste_hijos := -0.05;
  ELSE
    ajuste_hijos := 0.05;
  END IF;
  
  -- Ajuste por situación habitacional
  CASE p_situacion_habitacional
    WHEN 'casa_propia' THEN ajuste_habitacional := -0.05;
    WHEN 'rentando', 'vive_con_familiares' THEN ajuste_habitacional := 0.05;
  END CASE;
  
  -- Ajuste por edad
  IF p_edad BETWEEN 35 AND 55 THEN
    ajuste_edad := -0.05;
  ELSIF p_edad BETWEEN 25 AND 34 THEN
    ajuste_edad := 0;
  ELSE
    ajuste_edad := 0.05;
  END IF;
  
  -- Calcular ajuste total y limitar al rango [-0.15, +0.15]
  ajuste_total := ajuste_estado_civil + ajuste_hijos + ajuste_habitacional + ajuste_edad;
  ajuste_total := GREATEST(-0.15, LEAST(0.15, ajuste_total));
  
  RETURN ajuste_total;
END;
$function$;
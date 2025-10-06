-- Crear tabla para factores personales
CREATE TABLE public.personal_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID,
  estado_civil TEXT NOT NULL CHECK (estado_civil IN ('casado', 'soltero', 'divorciado_viudo')),
  tiene_hijos BOOLEAN NOT NULL,
  situacion_habitacional TEXT NOT NULL CHECK (situacion_habitacional IN ('casa_propia', 'rentando', 'vive_con_familiares')),
  edad INTEGER NOT NULL CHECK (edad > 0 AND edad < 120),
  ajuste_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar campos de ajuste a exam_attempts
ALTER TABLE public.exam_attempts 
ADD COLUMN score_base NUMERIC,
ADD COLUMN personal_adjustment NUMERIC DEFAULT 0,
ADD COLUMN score_adjusted NUMERIC;

-- Agregar campos de ajuste a personality_results
ALTER TABLE public.personality_results 
ADD COLUMN scores_base JSONB,
ADD COLUMN personal_adjustment NUMERIC DEFAULT 0,
ADD COLUMN scores_adjusted JSONB;

-- Crear función para calcular ajuste total
CREATE OR REPLACE FUNCTION public.calculate_personal_adjustment(
  p_estado_civil TEXT,
  p_tiene_hijos BOOLEAN,
  p_situacion_habitacional TEXT,
  p_edad INTEGER
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
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
    WHEN 'soltero', 'divorciado_viudo' THEN ajuste_estado_civil := 0.05;
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
$$;

-- Trigger para actualizar updated_at en personal_factors
CREATE TRIGGER update_personal_factors_updated_at
  BEFORE UPDATE ON public.personal_factors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas RLS para personal_factors
ALTER TABLE public.personal_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own personal factors"
ON public.personal_factors FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM exam_sessions es 
    WHERE es.id = personal_factors.session_id 
    AND es.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert their own personal factors"
ON public.personal_factors FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM exam_sessions es 
    WHERE es.id = personal_factors.session_id 
    AND es.user_id = auth.uid()::text
  )
);

CREATE POLICY "Admins and teachers can manage personal factors"
ON public.personal_factors FOR ALL
USING (user_has_admin_or_teacher_role());
-- Crear tabla para cache de análisis de IA
CREATE TABLE public.ai_analysis_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_id UUID NULL,
  psychometric_test_id UUID NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('ocean', 'reliability')),
  input_data_hash TEXT NOT NULL, -- Hash de los datos de entrada para detectar cambios
  input_data JSONB NOT NULL, -- Datos originales usados para el análisis
  ai_analysis_result JSONB NOT NULL, -- Resultado completo del análisis de OpenAI
  tokens_used INTEGER NULL, -- Número de tokens consumidos
  model_used TEXT NULL, -- Modelo de IA utilizado
  requested_by UUID NOT NULL, -- Usuario que solicitó el análisis
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NULL, -- Fecha de expiración del cache
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_ai_analysis_cache_user_type ON public.ai_analysis_cache(user_id, analysis_type);
CREATE INDEX idx_ai_analysis_cache_exam_id ON public.ai_analysis_cache(exam_id) WHERE exam_id IS NOT NULL;
CREATE INDEX idx_ai_analysis_cache_psychometric_id ON public.ai_analysis_cache(psychometric_test_id) WHERE psychometric_test_id IS NOT NULL;
CREATE INDEX idx_ai_analysis_cache_hash ON public.ai_analysis_cache(input_data_hash);
CREATE INDEX idx_ai_analysis_cache_generated_at ON public.ai_analysis_cache(generated_at);

-- Crear índice único para evitar duplicados
CREATE UNIQUE INDEX idx_ai_analysis_cache_unique ON public.ai_analysis_cache(user_id, analysis_type, input_data_hash) WHERE is_active = TRUE;

-- Habilitar RLS
ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins and teachers can manage AI analysis cache" 
ON public.ai_analysis_cache 
FOR ALL 
USING (user_has_admin_or_teacher_role());

CREATE POLICY "Users can view their own AI analysis cache" 
ON public.ai_analysis_cache 
FOR SELECT 
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_ai_analysis_cache_updated_at
  BEFORE UPDATE ON public.ai_analysis_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para limpiar cache expirado
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_analysis_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Marcar como inactivos los análisis expirados
  UPDATE public.ai_analysis_cache 
  SET is_active = FALSE, 
      updated_at = NOW()
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_active = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Función para generar hash de datos de entrada
CREATE OR REPLACE FUNCTION public.generate_analysis_input_hash(input_data JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  -- Generar hash MD5 de los datos de entrada normalizados
  RETURN md5(input_data::text);
END;
$$;

-- Función para obtener análisis cacheado
CREATE OR REPLACE FUNCTION public.get_cached_ai_analysis(
  p_user_id UUID,
  p_analysis_type TEXT,
  p_input_data JSONB,
  p_max_age_hours INTEGER DEFAULT 720 -- 30 días por defecto
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  input_hash TEXT;
  cached_result JSONB;
BEGIN
  -- Generar hash de los datos de entrada
  input_hash := public.generate_analysis_input_hash(p_input_data);
  
  -- Buscar análisis cacheado válido
  SELECT ai_analysis_result INTO cached_result
  FROM public.ai_analysis_cache
  WHERE user_id = p_user_id
    AND analysis_type = p_analysis_type
    AND input_data_hash = input_hash
    AND is_active = TRUE
    AND generated_at > (NOW() - (p_max_age_hours || ' hours')::INTERVAL)
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY generated_at DESC
  LIMIT 1;
  
  RETURN cached_result;
END;
$$;

-- Función para guardar análisis en cache
CREATE OR REPLACE FUNCTION public.save_ai_analysis_cache(
  p_user_id UUID,
  p_exam_id UUID,
  p_psychometric_test_id UUID,
  p_analysis_type TEXT,
  p_input_data JSONB,
  p_ai_analysis_result JSONB,
  p_tokens_used INTEGER DEFAULT NULL,
  p_model_used TEXT DEFAULT NULL,
  p_requested_by UUID DEFAULT NULL,
  p_expires_hours INTEGER DEFAULT 720 -- 30 días por defecto
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  input_hash TEXT;
  cache_id UUID;
  requester_id UUID;
BEGIN
  -- Determinar quien solicitó el análisis
  requester_id := COALESCE(p_requested_by, auth.uid());
  
  -- Generar hash de los datos de entrada
  input_hash := public.generate_analysis_input_hash(p_input_data);
  
  -- Desactivar análisis existentes para este usuario y tipo
  UPDATE public.ai_analysis_cache 
  SET is_active = FALSE, 
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND analysis_type = p_analysis_type
    AND input_data_hash = input_hash
    AND is_active = TRUE;
  
  -- Insertar nuevo análisis en cache
  INSERT INTO public.ai_analysis_cache (
    user_id,
    exam_id,
    psychometric_test_id,
    analysis_type,
    input_data_hash,
    input_data,
    ai_analysis_result,
    tokens_used,
    model_used,
    requested_by,
    expires_at
  ) VALUES (
    p_user_id,
    p_exam_id,
    p_psychometric_test_id,
    p_analysis_type,
    input_hash,
    p_input_data,
    p_ai_analysis_result,
    p_tokens_used,
    p_model_used,
    requester_id,
    CASE WHEN p_expires_hours IS NOT NULL 
         THEN NOW() + (p_expires_hours || ' hours')::INTERVAL 
         ELSE NULL END
  ) RETURNING id INTO cache_id;
  
  RETURN cache_id;
END;
$$;
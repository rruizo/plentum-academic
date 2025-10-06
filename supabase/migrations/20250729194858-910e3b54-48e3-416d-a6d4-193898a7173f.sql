-- Crear tabla de caché para análisis de OpenAI
CREATE TABLE public.exam_analysis_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_session_id UUID REFERENCES public.exam_sessions(id) NOT NULL,
  analysis_type TEXT NOT NULL,
  analysis_input JSONB,
  analysis_result JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  re_analysis_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_exam_analysis_cache_session_type ON public.exam_analysis_cache(exam_session_id, analysis_type);

-- Crear índice único para evitar duplicados
CREATE UNIQUE INDEX idx_exam_analysis_cache_unique ON public.exam_analysis_cache(exam_session_id, analysis_type);

-- Habilitar RLS
ALTER TABLE public.exam_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Admins and teachers can manage analysis cache"
ON public.exam_analysis_cache
FOR ALL
USING (user_has_admin_or_teacher_role());

CREATE POLICY "Users can view their own analysis cache"
ON public.exam_analysis_cache
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    WHERE es.id = exam_session_id 
    AND es.user_id = auth.uid()::text
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_exam_analysis_cache_updated_at
BEFORE UPDATE ON public.exam_analysis_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
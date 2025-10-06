-- Crear bucket para almacenar PDFs generados
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-reports', 'generated-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Política para que los usuarios puedan acceder a sus propios reportes
CREATE POLICY "Users can access their own reports" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'generated-reports' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para que admins y teachers puedan acceder a todos los reportes
CREATE POLICY "Admins and teachers can access all reports" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'generated-reports' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'teacher', 'supervisor')
  )
);

-- Política para insertar reportes (solo edge functions)
CREATE POLICY "Service role can insert reports" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'generated-reports');

-- Tabla para registrar PDFs generados
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  psychometric_test_id UUID REFERENCES public.psychometric_tests(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('reliability', 'ocean', 'custom')),
  template_name TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  storage_bucket TEXT DEFAULT 'generated-reports',
  generation_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_generated_reports_user_id ON public.generated_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_exam_id ON public.generated_reports(exam_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_psychometric_test_id ON public.generated_reports(psychometric_test_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_report_type ON public.generated_reports(report_type);

-- RLS para la tabla de reportes generados
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios vean solo sus reportes
CREATE POLICY "Users can view their own generated reports" 
ON public.generated_reports FOR SELECT 
USING (user_id = auth.uid());

-- Política para que admins vean todos los reportes
CREATE POLICY "Admins can view all generated reports" 
ON public.generated_reports FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'teacher', 'supervisor')
  )
);

-- Política para insertar reportes (solo sistema)
CREATE POLICY "System can insert generated reports" 
ON public.generated_reports FOR INSERT 
WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_generated_reports_updated_at
  BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
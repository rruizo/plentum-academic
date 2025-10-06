-- Crear tabla generated_reports si no existe
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  psychometric_test_id UUID REFERENCES public.psychometric_tests(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL DEFAULT 'custom',
  template_name TEXT NOT NULL DEFAULT 'Reporte personalizado',
  file_path TEXT NOT NULL,
  file_size BIGINT,
  generation_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_generated_reports_user_id ON public.generated_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_exam_id ON public.generated_reports(exam_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_report_type ON public.generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON public.generated_reports(created_at);

-- Habilitar RLS
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver sus propios reportes
CREATE POLICY IF NOT EXISTS "Users can view their own generated reports" 
ON public.generated_reports 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para que admins, teachers y supervisors puedan ver todos los reportes
CREATE POLICY IF NOT EXISTS "Admins and teachers can view all generated reports" 
ON public.generated_reports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'supervisor')
  )
);

-- Política para insertar reportes (por el sistema)
CREATE POLICY IF NOT EXISTS "System can insert generated reports" 
ON public.generated_reports 
FOR INSERT 
WITH CHECK (true);

-- Política para que admins puedan eliminar reportes
CREATE POLICY IF NOT EXISTS "Admins can delete generated reports" 
ON public.generated_reports 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para actualizar updated_at
CREATE OR REPLACE TRIGGER update_generated_reports_updated_at
  BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
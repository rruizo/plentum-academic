-- 1. Crear tabla companies para gestionar empresas
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. Añadir company_id a la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 3. Crear una empresa por defecto para usuarios existentes
INSERT INTO public.companies (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Principal')
ON CONFLICT (id) DO NOTHING;

-- 4. Asignar empresa por defecto a usuarios existentes sin company_id
UPDATE public.profiles 
SET company_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 5. Añadir company_id a exam_sessions para filtrado
ALTER TABLE public.exam_sessions 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 6. Añadir company_id a exams para filtrado
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 7. Crear función para obtener company_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 8. Habilitar RLS en companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 9. Políticas RLS para companies - admin ve todo, otros solo su empresa
CREATE POLICY "Admins can view all companies" 
ON public.companies 
FOR SELECT 
USING (user_is_admin());

CREATE POLICY "Users can view their own company" 
ON public.companies 
FOR SELECT 
USING (id = get_current_user_company_id());

-- 10. Políticas RLS para profiles - filtrar por empresa (excepto admin)
CREATE POLICY "Admins can view all profiles across companies" 
ON public.profiles 
FOR SELECT 
USING (user_is_admin());

CREATE POLICY "Supervisors and teachers can view profiles from their company" 
ON public.profiles 
FOR SELECT 
USING (
  (get_current_user_role() IN ('supervisor', 'teacher')) 
  AND (company_id = get_current_user_company_id())
);

-- 11. Políticas RLS para exams - filtrar por empresa (excepto admin)
CREATE POLICY "Admins can view all exams across companies" 
ON public.exams 
FOR SELECT 
USING (user_is_admin());

CREATE POLICY "Users can view exams from their company" 
ON public.exams 
FOR SELECT 
USING (
  (company_id = get_current_user_company_id()) 
  OR (company_id IS NULL) -- Para compatibilidad con exámenes existentes
);

-- 12. Políticas RLS para exam_sessions - filtrar por empresa (excepto admin)
CREATE POLICY "Admins can view all exam sessions across companies" 
ON public.exam_sessions 
FOR SELECT 
USING (user_is_admin());

CREATE POLICY "Users can view exam sessions from their company" 
ON public.exam_sessions 
FOR SELECT 
USING (
  (company_id = get_current_user_company_id()) 
  OR (company_id IS NULL) -- Para compatibilidad con sesiones existentes
);

-- 13. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_exams_company_id ON public.exams(company_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_company_id ON public.exam_sessions(company_id);

-- 14. Trigger para actualizar updated_at en companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
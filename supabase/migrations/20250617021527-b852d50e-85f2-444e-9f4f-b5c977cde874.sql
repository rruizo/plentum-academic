
-- Primero, eliminar la política problemática
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Crear función de seguridad definer para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recrear la política usando la función de seguridad definer
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');

-- También necesitamos arreglar las otras políticas que tienen el mismo problema
DROP POLICY IF EXISTS "Admins and teachers can manage question categories" ON public.question_categories;
DROP POLICY IF EXISTS "Admins and teachers can manage questions" ON public.questions;
DROP POLICY IF EXISTS "Admins and teachers can manage exams" ON public.exams;
DROP POLICY IF EXISTS "Admins and teachers can view all exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;

-- Crear función para verificar si el usuario tiene rol de admin o teacher
CREATE OR REPLACE FUNCTION public.user_has_admin_or_teacher_role()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Crear función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recrear las políticas usando las funciones de seguridad definer
CREATE POLICY "Admins and teachers can manage question categories" ON public.question_categories
  FOR ALL USING (public.user_has_admin_or_teacher_role());

CREATE POLICY "Admins and teachers can manage questions" ON public.questions
  FOR ALL USING (public.user_has_admin_or_teacher_role());

CREATE POLICY "Admins and teachers can manage exams" ON public.exams
  FOR ALL USING (public.user_has_admin_or_teacher_role());

CREATE POLICY "Admins and teachers can view all exam attempts" ON public.exam_attempts
  FOR SELECT USING (public.user_has_admin_or_teacher_role());

CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL USING (public.user_is_admin());

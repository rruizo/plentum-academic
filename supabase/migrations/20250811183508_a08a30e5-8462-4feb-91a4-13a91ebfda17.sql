-- Restrict access to cognitive scoring norms: remove public SELECT, allow only authorized professionals
BEGIN;

-- Remove overly permissive public read policy on baremo_cognitivo
DROP POLICY IF EXISTS "Everyone can view active cognitive norms" ON public.baremo_cognitivo;

-- Add targeted SELECT policy for authorized assessment professionals only
CREATE POLICY "Authorized professionals can view cognitive norms"
ON public.baremo_cognitivo
FOR SELECT
USING (
  -- Only admins and teachers (authorized assessment professionals) can view scoring norms
  user_has_admin_or_teacher_role()
  AND activo = true
);

COMMIT;
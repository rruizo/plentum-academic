-- Fix RLS policy for htp_submissions to allow admins and teachers to create submissions for other users
DROP POLICY IF EXISTS "Users can create their own HTP submissions" ON public.htp_submissions;

-- Create new policy allowing users to create their own submissions OR admins/teachers to create for others
CREATE POLICY "Users and authorized personnel can create HTP submissions" 
ON public.htp_submissions 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_has_admin_or_teacher_role() AND user_id IS NOT NULL)
);
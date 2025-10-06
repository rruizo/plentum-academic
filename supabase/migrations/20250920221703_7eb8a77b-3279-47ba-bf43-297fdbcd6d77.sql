-- Add policy for anonymous access to HTP assignments via access link
CREATE POLICY "Anonymous access to HTP assignments via access link" 
ON public.htp_assignments 
FOR SELECT 
USING (
  -- Allow access if the assignment status is 'notified' and hasn't expired
  status = 'notified' AND 
  (expires_at IS NULL OR expires_at > NOW())
);
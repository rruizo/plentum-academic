
-- Create a table for psychometric tests
CREATE TABLE public.psychometric_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('personality', 'cognitive', 'leadership', 'stress', 'motivation')),
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT false,
  questions_count INTEGER NOT NULL DEFAULT 30,
  interpretation_template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to ensure proper access control
ALTER TABLE public.psychometric_tests ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view active tests
CREATE POLICY "Users can view active psychometric tests" 
  ON public.psychometric_tests 
  FOR SELECT 
  USING (is_active = true OR auth.uid() IS NOT NULL);

-- Create policy that allows admins to manage tests
CREATE POLICY "Admins can manage psychometric tests" 
  ON public.psychometric_tests 
  FOR ALL 
  USING (public.user_is_admin());

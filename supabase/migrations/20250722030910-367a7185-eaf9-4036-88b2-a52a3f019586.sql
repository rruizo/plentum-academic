-- Create exam_sessions table for managing individual exam sessions and attempts
CREATE TABLE public.exam_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  attempts_taken INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'completed', 'expired', 'attempt_limit_reached')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one active session per user per exam
  UNIQUE(user_id, exam_id)
);

-- Enable RLS
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and teachers can manage all exam sessions"
ON public.exam_sessions
FOR ALL
USING (user_has_admin_or_teacher_role());

CREATE POLICY "Users can view their own exam sessions"
ON public.exam_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam sessions"
ON public.exam_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_exam_sessions_updated_at
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
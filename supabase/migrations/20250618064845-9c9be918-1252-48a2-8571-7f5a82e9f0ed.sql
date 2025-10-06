
-- Enable RLS on exams table if not already enabled
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Create policy that allows authenticated users to insert their own exams
CREATE POLICY "Users can create their own exams" 
  ON public.exams 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

-- Create policy that allows users to view their own exams
CREATE POLICY "Users can view their own exams" 
  ON public.exams 
  FOR SELECT 
  USING (auth.uid() = created_by);

-- Create policy that allows users to update their own exams
CREATE POLICY "Users can update their own exams" 
  ON public.exams 
  FOR UPDATE 
  USING (auth.uid() = created_by);

-- Create policy that allows users to delete their own exams
CREATE POLICY "Users can delete their own exams" 
  ON public.exams 
  FOR DELETE 
  USING (auth.uid() = created_by);

-- Also add RLS policies for examen_configuracion_categoria table
ALTER TABLE public.examen_configuracion_categoria ENABLE ROW LEVEL SECURITY;

-- Allow users to create category configurations for their own exams
CREATE POLICY "Users can create category configs for their exams" 
  ON public.examen_configuracion_categoria 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE id = examen_id AND created_by = auth.uid()
    )
  );

-- Allow users to view category configurations for their own exams
CREATE POLICY "Users can view category configs for their exams" 
  ON public.examen_configuracion_categoria 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE id = examen_id AND created_by = auth.uid()
    )
  );

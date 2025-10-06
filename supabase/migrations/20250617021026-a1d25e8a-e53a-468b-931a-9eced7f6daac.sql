
-- Crear tabla de perfiles de usuario con campos adicionales requeridos
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  area TEXT NOT NULL,
  section TEXT NOT NULL,
  report_contact TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Crear tabla de categorías para preguntas (jerarquía)
CREATE TABLE public.question_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.question_categories(id),
  national_average DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de preguntas
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.question_categories(id),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'scale')),
  options JSONB NOT NULL, -- Para almacenar las opciones de respuesta
  correct_answer TEXT,
  weight DECIMAL(3,2) DEFAULT 1.0,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  national_average DECIMAL(5,2),
  metadata JSONB,
  is_control_question BOOLEAN DEFAULT false, -- Para preguntas de detección de inconsistencia
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de exámenes
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_randomized BOOLEAN DEFAULT true,
  questions_per_category JSONB, -- Configuración de cuántas preguntas por categoría
  simulation_threshold DECIMAL(5,2) DEFAULT 5.0, -- Umbral para detectar simulación
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de intentos de examen
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  questions JSONB NOT NULL, -- Preguntas específicas para este intento
  answers JSONB, -- Respuestas del usuario
  score DECIMAL(5,2),
  risk_analysis JSONB, -- Análisis de riesgo por categoría
  simulation_alert BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de cursos
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de inscripciones a cursos
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS para categorías de preguntas (solo admins y profesores pueden crear/editar)
CREATE POLICY "Everyone can view question categories" ON public.question_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins and teachers can manage question categories" ON public.question_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Políticas RLS para preguntas
CREATE POLICY "Everyone can view questions" ON public.questions
  FOR SELECT USING (true);

CREATE POLICY "Admins and teachers can manage questions" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Políticas RLS para exámenes
CREATE POLICY "Everyone can view exams" ON public.exams
  FOR SELECT USING (true);

CREATE POLICY "Admins and teachers can manage exams" ON public.exams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Políticas RLS para intentos de examen
CREATE POLICY "Users can view their own exam attempts" ON public.exam_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exam attempts" ON public.exam_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam attempts" ON public.exam_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins and teachers can view all exam attempts" ON public.exam_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Políticas RLS para cursos
CREATE POLICY "Everyone can view active courses" ON public.courses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Instructors can manage their courses" ON public.courses
  FOR ALL USING (auth.uid() = instructor_id);

CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS para inscripciones
CREATE POLICY "Users can view their own enrollments" ON public.course_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves" ON public.course_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructors can view enrollments for their courses" ON public.course_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND instructor_id = auth.uid()
    )
  );

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, company, area, section, report_contact, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'company', ''),
    COALESCE(new.raw_user_meta_data ->> 'area', ''),
    COALESCE(new.raw_user_meta_data ->> 'section', ''),
    COALESCE(new.raw_user_meta_data ->> 'report_contact', ''),
    COALESCE(new.raw_user_meta_data ->> 'role', 'student')
  );
  RETURN new;
END;
$$;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insertar algunas categorías de ejemplo
INSERT INTO public.question_categories (name, description, national_average) VALUES
('Habilidades Cognitivas', 'Evaluación de capacidades cognitivas generales', 2.1),
('Razonamiento Lógico', 'Problemas de lógica y razonamiento', 1.8),
('Inteligencia Emocional', 'Evaluación de competencias emocionales', 2.3),
('Liderazgo', 'Habilidades de liderazgo y gestión', 2.0),
('Trabajo en Equipo', 'Capacidades de colaboración', 2.2);

-- Insertar subcategorías
INSERT INTO public.question_categories (name, description, parent_id, national_average) 
SELECT 
  'Problemas Matemáticos', 
  'Resolución de problemas matemáticos básicos',
  id,
  1.9
FROM public.question_categories WHERE name = 'Razonamiento Lógico';

-- Insertar preguntas de ejemplo
INSERT INTO public.questions (category_id, question_text, question_type, options, correct_answer, national_average, is_control_question)
SELECT 
  id,
  '¿Con qué frecuencia resuelves problemas complejos de manera efectiva?',
  'scale',
  '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb,
  null,
  2.1,
  false
FROM public.question_categories WHERE name = 'Habilidades Cognitivas'
LIMIT 1;

-- Insertar pregunta de control
INSERT INTO public.questions (category_id, question_text, question_type, options, correct_answer, national_average, is_control_question)
SELECT 
  id,
  '¿Qué tan seguido enfrentas desafíos complejos con éxito?',
  'scale',
  '["Nunca", "Rara vez", "A veces", "Frecuentemente"]'::jsonb,
  null,
  2.1,
  true
FROM public.question_categories WHERE name = 'Habilidades Cognitivas'
LIMIT 1;

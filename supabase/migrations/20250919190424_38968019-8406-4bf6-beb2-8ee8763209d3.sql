-- Crear tablas para el sistema HTP (House-Tree-Person)

-- Tabla para configuración de exámenes HTP
CREATE TABLE public.htp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_words INTEGER NOT NULL DEFAULT 200,
  max_words INTEGER NOT NULL DEFAULT 2000,
  openai_model TEXT NOT NULL DEFAULT 'gpt-4.1-mini-2025-04-14',
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  system_prompt TEXT NOT NULL DEFAULT 'Eres un psicólogo experto en técnicas proyectivas (HTP) y grafología. Tu tarea es analizar el material y elaborar un informe psicológico amplio y profesional, enfocado en personalidad, emociones, relaciones interpersonales, estabilidad laboral y confiabilidad.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para aviso legal editable
CREATE TABLE public.legal_notice (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'AVISO LEGAL Y CONSENTIMIENTO INFORMADO PARA LA APLICACIÓN DE EXAMEN DE CONFIABILIDAD',
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para asignaciones de HTP
CREATE TABLE public.htp_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  access_link TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para submissions de HTP
CREATE TABLE public.htp_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.htp_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  image_filename TEXT NOT NULL,
  image_size INTEGER,
  explanation_text TEXT,
  legal_consent BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analysis_generated BOOLEAN NOT NULL DEFAULT false,
  analysis_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para análisis de HTP generados
CREATE TABLE public.htp_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.htp_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  analysis_content JSONB NOT NULL,
  openai_model_used TEXT NOT NULL,
  tokens_used INTEGER,
  word_count INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para consentimientos legales (para todos los exámenes)
CREATE TABLE public.user_consent_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  exam_type TEXT NOT NULL, -- 'htp', 'reliability', 'psychometric'
  exam_id UUID,
  consent_given BOOLEAN NOT NULL,
  consent_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  legal_notice_version UUID REFERENCES public.legal_notice(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar configuración HTP por defecto
INSERT INTO public.htp_config (min_words, max_words, openai_model, temperature, system_prompt) 
VALUES (
  200, 
  2000, 
  'gpt-4.1-mini-2025-04-14', 
  0.7,
  'Eres un psicólogo experto en técnicas proyectivas (HTP) y grafología. Tu tarea es analizar el material y elaborar un informe psicológico amplio y profesional, enfocado en personalidad, emociones, relaciones interpersonales, estabilidad laboral y confiabilidad.'
);

-- Insertar aviso legal por defecto
INSERT INTO public.legal_notice (content) 
VALUES (
  'AVISO LEGAL Y CONSENTIMIENTO INFORMADO PARA LA APLICACIÓN DE EXAMEN DE CONFIABILIDAD

[Nombre del usuario], identificado mediante los datos proporcionados en esta plataforma, declara haber sido informado de manera clara, suficiente y comprensible sobre los alcances, propósito y condiciones de aplicación del presente Examen de Evaluación de Confiabilidad, Honestidad e Integridad Laboral, que forma parte del proceso de diagnóstico, selección, permanencia, promoción o validación interna de la empresa que solicitó la aplicación de la evaluación.

Este examen es voluntario, no punitivo y no médico, y su propósito exclusivo es generar indicadores de riesgo psicosocial, conductual y ético que ayuden a la empresa a tomar decisiones organizacionales bajo principios de legalidad, confidencialidad, no discriminación y equidad.

INFORMACIÓN FUNDAMENTAL
- La aplicación de este examen es completamente voluntaria.
- En caso de NO aceptar su aplicación, el proceso de evaluación o selección correspondiente se dará por concluido de forma inmediata.
- Al aceptar, usted manifiesta que comprende, consiente y autoriza libremente el tratamiento de sus datos y resultados.
- La información será utilizada única y exclusivamente por el área responsable de Recursos Humanos, Control de Calidad y/o Cumplimiento (Compliance), y estará protegida conforme a lo dispuesto en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).

DESCARGO DE RESPONSABILIDAD Y PROTECCIÓN LEGAL
Al aceptar la presente evaluación, usted exime de cualquier tipo de responsabilidad civil, administrativa o penal tanto a la empresa solicitante como a la empresa desarrolladora del software (AVSEC Trust) respecto al contenido de las respuestas, el resultado del análisis y sus eventuales decisiones organizacionales.
El instrumento no tiene carácter médico, jurídico ni vinculante por sí solo, y es solo un insumo para la toma de decisiones internas.
Usted declara que su participación no ha sido coaccionada, que actúa de manera libre y consciente, y que comprende que la negativa a participar no generará represalia, pero sí implicará la conclusión automática del proceso de evaluación.

PROTECCIÓN DE CONTENIDO Y DERECHOS DE AUTOR
Queda estrictamente prohibido copiar, replicar, distribuir, fotografiar, capturar, grabar o sustraer total o parcialmente cualquier pantalla, pregunta, estructura o contenido de esta evaluación sin la autorización expresa y por escrito del titular de los derechos.
El sistema, su configuración, código fuente, estructura de preguntas y contexto de aplicación se encuentran debidamente registrados ante el Instituto Mexicano de la Propiedad Industrial (IMPI) y el Instituto Nacional del Derecho de Autor (INDAUTOR), quedando estrictamente prohibida su reproducción, distribución o uso no autorizado en cualquier forma.
Este software está protegido por las disposiciones de propiedad intelectual nacionales e internacionales, y cuenta con sistemas de detección automatizada de intentos de copia o extracción no autorizada, así como identificadores únicos por usuario, sesión y dispositivo.
Cualquier intento de reproducción, filtración o mal uso del contenido podrá ser sancionado conforme a lo dispuesto en la Ley Federal del Derecho de Autor y demás ordenamientos legales aplicables, y será motivo de cancelación inmediata del proceso de evaluación, además de posibles acciones legales.

Para continuar con el examen, seleccione una opción:
□ ACEPTO voluntariamente realizar esta evaluación bajo los términos y condiciones aquí descritos.
□ NO ACEPTO realizar esta evaluación, y comprendo que con ello concluye mi participación en este proceso.'
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.htp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_notice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.htp_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.htp_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.htp_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consent_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para htp_config
CREATE POLICY "Admins can manage HTP config" ON public.htp_config
FOR ALL USING (user_has_admin_or_teacher_role());

CREATE POLICY "Everyone can view HTP config" ON public.htp_config
FOR SELECT USING (true);

-- Políticas RLS para legal_notice
CREATE POLICY "Admins can manage legal notice" ON public.legal_notice
FOR ALL USING (user_has_admin_or_teacher_role());

CREATE POLICY "Everyone can view active legal notice" ON public.legal_notice
FOR SELECT USING (is_active = true);

-- Políticas RLS para htp_assignments
CREATE POLICY "Admins and teachers can manage HTP assignments" ON public.htp_assignments
FOR ALL USING (user_has_admin_or_teacher_role());

CREATE POLICY "Users can view their own HTP assignments" ON public.htp_assignments
FOR SELECT USING (user_id = auth.uid());

-- Políticas RLS para htp_submissions
CREATE POLICY "Admins and teachers can view all HTP submissions" ON public.htp_submissions
FOR SELECT USING (user_has_admin_or_teacher_role());

CREATE POLICY "Users can create and view their own HTP submissions" ON public.htp_submissions
FOR ALL USING (user_id = auth.uid());

-- Políticas RLS para htp_analysis
CREATE POLICY "Admins and teachers can view all HTP analysis" ON public.htp_analysis
FOR SELECT USING (user_has_admin_or_teacher_role());

CREATE POLICY "Users can view their own HTP analysis" ON public.htp_analysis
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert HTP analysis" ON public.htp_analysis
FOR INSERT WITH CHECK (true);

-- Políticas RLS para user_consent_log
CREATE POLICY "Admins can view all consent logs" ON public.user_consent_log
FOR SELECT USING (user_is_admin());

CREATE POLICY "Users can insert their own consent" ON public.user_consent_log
FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_htp_config_updated_at
  BEFORE UPDATE ON public.htp_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_notice_updated_at
  BEFORE UPDATE ON public.legal_notice
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_htp_assignments_updated_at
  BEFORE UPDATE ON public.htp_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_htp_submissions_updated_at
  BEFORE UPDATE ON public.htp_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_htp_analysis_updated_at
  BEFORE UPDATE ON public.htp_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
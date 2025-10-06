-- PASO 1 CORREGIDO: Crear las nuevas tablas según especificación del sistema de Evaluación Cognitiva Integral

-- 1. Tabla principal de preguntas cognitivas (banco de preguntas estilo Moodle)
CREATE TABLE public.preguntas_cognitivas_banco (
    id_pregunta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_cognitiva VARCHAR(100) NOT NULL,
    sub_area_tipo VARCHAR(150) NOT NULL,
    nivel_dificultad VARCHAR(20) NOT NULL CHECK (nivel_dificultad IN ('facil', 'medio', 'dificil')),
    texto_instruccion TEXT,
    enunciado_pregunta TEXT,
    recurso_visual_url TEXT,
    tipo_respuesta_interaccion VARCHAR(50) NOT NULL DEFAULT 'seleccion_multiple_texto' 
        CHECK (tipo_respuesta_interaccion IN ('seleccion_multiple_texto', 'seleccion_multiple_imagen', 'entrada_numerica', 'arrastrar_soltar')),
    opciones_respuesta_json JSONB NOT NULL,
    respuesta_correcta_id UUID,
    valor_respuesta_correcta_numerica NUMERIC,
    explicacion_respuesta_interna TEXT,
    tiempo_limite_segundos INTEGER,
    estado_validacion VARCHAR(30) NOT NULL DEFAULT 'pendiente_revision' 
        CHECK (estado_validacion IN ('pendiente_revision', 'aprobada', 'rechazada', 'inactiva')),
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    fecha_ultima_modificacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    aprobado_por_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabla de sesiones de evaluación para aspirantes
CREATE TABLE public.sesiones_evaluacion_aspirante (
    id_sesion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_aspirante UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tipo_evaluacion VARCHAR(50) NOT NULL DEFAULT 'Cognitiva' 
        CHECK (tipo_evaluacion IN ('Cognitiva', 'OCEAN', 'Competencias', 'Integral')),
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    fecha_fin TIMESTAMP WITH TIME ZONE,
    estado_sesion VARCHAR(30) NOT NULL DEFAULT 'iniciada' 
        CHECK (estado_sesion IN ('iniciada', 'completada', 'abandonada', 'pausada')),
    puntuacion_general_cognitiva NUMERIC,
    url_reporte_pdf TEXT,
    configuracion_evaluacion JSONB,
    tiempo_total_segundos INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabla de respuestas de preguntas por aspirante (reemplaza respuestas_cognitivas)
CREATE TABLE public.respuestas_preguntas_aspirante (
    id_respuesta_aspirante UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_sesion UUID NOT NULL REFERENCES public.sesiones_evaluacion_aspirante(id_sesion) ON DELETE CASCADE,
    id_pregunta UUID NOT NULL REFERENCES public.preguntas_cognitivas_banco(id_pregunta),
    tipo_pregunta_evaluacion VARCHAR(50) NOT NULL DEFAULT 'Cognitiva',
    id_opcion_seleccionada UUID,
    respuesta_texto_numerica TEXT,
    tiempo_respuesta_ms INTEGER NOT NULL,
    es_correcta BOOLEAN,
    puntuacion_obtenida NUMERIC DEFAULT 0,
    fecha_respuesta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata_respuesta JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Verificar y actualizar tabla baremo_cognitivo (ya existe, verificar estructura)
-- La tabla ya existe, agregar campos si son necesarios
ALTER TABLE public.baremo_cognitivo 
ADD COLUMN IF NOT EXISTS rango_edad VARCHAR(20),
ADD COLUMN IF NOT EXISTS nivel_educativo VARCHAR(50),
ADD COLUMN IF NOT EXISTS percentil_5 NUMERIC,
ADD COLUMN IF NOT EXISTS percentil_10 NUMERIC,
ADD COLUMN IF NOT EXISTS percentil_25 NUMERIC,
ADD COLUMN IF NOT EXISTS percentil_50 NUMERIC,
ADD COLUMN IF NOT EXISTS percentil_75 NUMERIC,
ADD COLUMN IF NOT EXISTS percentil_90 NUMERIC,
ADD COLUMN IF NOT EXISTS percentil_95 NUMERIC,
ADD COLUMN IF NOT EXISTS media NUMERIC,
ADD COLUMN IF NOT EXISTS desviacion_estandar NUMERIC;

-- 5. Migrar datos existentes de preguntas_cognitivas a preguntas_cognitivas_banco (CORREGIDO)
INSERT INTO public.preguntas_cognitivas_banco (
    id_pregunta,
    area_cognitiva,
    sub_area_tipo,
    nivel_dificultad,
    texto_instruccion,
    enunciado_pregunta,
    recurso_visual_url,
    tipo_respuesta_interaccion,
    opciones_respuesta_json,
    respuesta_correcta_id,
    explicacion_respuesta_interna,
    tiempo_limite_segundos,
    estado_validacion,
    fecha_creacion,
    fecha_ultima_modificacion
)
SELECT 
    id,
    area_cognitiva,
    COALESCE(area_cognitiva, 'General'), -- sub_area_tipo basado en area_cognitiva
    CASE 
        WHEN nivel_dificultad = 'fácil' THEN 'facil'
        WHEN nivel_dificultad = 'difícil' THEN 'dificil'
        ELSE COALESCE(nivel_dificultad, 'medio')
    END,
    texto_instruccion,
    texto_pregunta, -- CORREGIDO: usar solo texto_pregunta que existe en la tabla origen
    recurso_visual_url,
    CASE 
        WHEN tipo_formato_interaccion = 'multiple_choice' THEN 'seleccion_multiple_texto'
        ELSE COALESCE(tipo_formato_interaccion, 'seleccion_multiple_texto')
    END,
    opciones_respuestas,
    respuesta_correcta_id,
    explicacion_respuesta,
    tiempo_limite_segundos,
    CASE 
        WHEN estado = 'activa' THEN 'aprobada'
        WHEN estado = 'inactiva' THEN 'inactiva'
        ELSE 'pendiente_revision'
    END,
    fecha_creacion,
    updated_at
FROM public.preguntas_cognitivas;

-- 6. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_preguntas_banco_area_cognitiva ON public.preguntas_cognitivas_banco(area_cognitiva);
CREATE INDEX IF NOT EXISTS idx_preguntas_banco_nivel_dificultad ON public.preguntas_cognitivas_banco(nivel_dificultad);
CREATE INDEX IF NOT EXISTS idx_preguntas_banco_estado ON public.preguntas_cognitivas_banco(estado_validacion);
CREATE INDEX IF NOT EXISTS idx_sesiones_aspirante ON public.sesiones_evaluacion_aspirante(id_aspirante, tipo_evaluacion);
CREATE INDEX IF NOT EXISTS idx_respuestas_sesion ON public.respuestas_preguntas_aspirante(id_sesion);
CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta ON public.respuestas_preguntas_aspirante(id_pregunta);

-- 7. Crear trigger para actualizar timestamps
CREATE OR REPLACE FUNCTION update_preguntas_banco_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.fecha_ultima_modificacion = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_preguntas_banco_updated_at
    BEFORE UPDATE ON public.preguntas_cognitivas_banco
    FOR EACH ROW
    EXECUTE FUNCTION update_preguntas_banco_updated_at();

CREATE TRIGGER trigger_update_sesiones_updated_at
    BEFORE UPDATE ON public.sesiones_evaluacion_aspirante
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Habilitar RLS en las nuevas tablas
ALTER TABLE public.preguntas_cognitivas_banco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_evaluacion_aspirante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_preguntas_aspirante ENABLE ROW LEVEL SECURITY;

-- 9. Crear políticas RLS para preguntas_cognitivas_banco
CREATE POLICY "Admins y teachers pueden gestionar banco de preguntas" 
ON public.preguntas_cognitivas_banco 
FOR ALL 
TO authenticated 
USING (user_has_admin_or_teacher_role());

CREATE POLICY "Usuarios pueden ver preguntas aprobadas" 
ON public.preguntas_cognitivas_banco 
FOR SELECT 
TO authenticated 
USING (estado_validacion = 'aprobada');

-- 10. Crear políticas RLS para sesiones_evaluacion_aspirante
CREATE POLICY "Usuarios pueden gestionar sus propias sesiones" 
ON public.sesiones_evaluacion_aspirante 
FOR ALL 
TO authenticated 
USING (auth.uid() = id_aspirante);

CREATE POLICY "Admins y teachers pueden ver todas las sesiones" 
ON public.sesiones_evaluacion_aspirante 
FOR SELECT 
TO authenticated 
USING (user_has_admin_or_teacher_role());

-- 11. Crear políticas RLS para respuestas_preguntas_aspirante
CREATE POLICY "Usuarios pueden gestionar sus propias respuestas" 
ON public.respuestas_preguntas_aspirante 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.sesiones_evaluacion_aspirante 
        WHERE id_sesion = respuestas_preguntas_aspirante.id_sesion 
        AND id_aspirante = auth.uid()
    )
);

CREATE POLICY "Admins y teachers pueden ver todas las respuestas" 
ON public.respuestas_preguntas_aspirante 
FOR SELECT 
TO authenticated 
USING (user_has_admin_or_teacher_role());
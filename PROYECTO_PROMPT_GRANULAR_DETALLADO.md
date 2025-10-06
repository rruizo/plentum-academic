# PROYECTO PROMPT GRANULAR DETALLADO
## Sistema de Evaluación Psicométrica y Confiabilidad - Guía Completa para Replicación Optimizada

### TABLA DE CONTENIDOS
1. [Arquitectura y Stack Técnico](#arquitectura-y-stack-técnico)
2. [Base de Datos Optimizada](#base-de-datos-optimizada)
3. [Edge Functions Críticas](#edge-functions-críticas)
4. [Componentes React Optimizados](#componentes-react-optimizados)
5. [Hooks Personalizados](#hooks-personalizados)
6. [Sistema de Autenticación y Autorización](#sistema-de-autenticación-y-autorización)
7. [Optimizaciones de Performance](#optimizaciones-de-performance)
8. [Sistema de Testing Automatizado](#sistema-de-testing-automatizado)
9. [Configuración de CI/CD](#configuración-de-cicd)
10. [Monitoreo y Observabilidad](#monitoreo-y-observabilidad)
11. [Patrones de Diseño Implementados](#patrones-de-diseño-implementados)
12. [Consideraciones de Escalabilidad](#consideraciones-de-escalabilidad)
13. [Mejoras Sustanciales Propuestas](#mejoras-sustanciales-propuestas)

---

## 1. ARQUITECTURA Y STACK TÉCNICO

### Stack Principal
```typescript
// Frontend Stack
- React 18 + TypeScript (Strict mode)
- Vite 5.x (Build tool optimizado)
- Tailwind CSS 3.x + shadcn/ui
- React Query v5 (Estado servidor)
- React Router v6 (Navegación)
- React Hook Form + Zod (Validación)
- Recharts (Visualización de datos)

// Backend Stack
- Supabase (PostgreSQL + Edge Functions)
- Row Level Security (RLS) estricto
- OpenAI GPT-4 (Análisis psicométrico)
- Deno 1.x (Edge Functions runtime)

// Herramientas de Desarrollo
- ESLint + Prettier (Linting)
- Husky + lint-staged (Git hooks)
- Playwright (E2E testing)
- Vitest (Unit testing)
- TypeScript strict mode
```

### Principios Arquitectónicos
1. **Separation of Concerns**: Cada módulo tiene responsabilidad única
2. **Domain-Driven Design**: Estructura basada en dominios de negocio
3. **CQRS Pattern**: Separación entre comandos y consultas
4. **Event-Driven Architecture**: Comunicación via eventos
5. **Inmutabilidad**: Estado inmutable con Immer
6. **Error Boundaries**: Manejo granular de errores

---

## 2. BASE DE DATOS OPTIMIZADA

### Esquema Principal con Optimizaciones

```sql
-- TABLAS PRINCIPALES CON ÍNDICES OPTIMIZADOS

-- 1. Tabla de Usuarios (profiles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  role public.user_role NOT NULL DEFAULT 'student',
  area TEXT,
  position TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices críticos para performance
CREATE INDEX CONCURRENTLY idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX CONCURRENTLY idx_profiles_company_role ON public.profiles(company_id, role);
CREATE INDEX CONCURRENTLY idx_profiles_email_active ON public.profiles(email, is_active);
CREATE INDEX CONCURRENTLY idx_profiles_last_activity ON public.profiles(last_activity) WHERE is_active = true;

-- 2. Tabla de Exámenes con Particionado
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type public.exam_type NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  instructor_id UUID REFERENCES public.profiles(id),
  company_id UUID REFERENCES public.companies(id),
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_questions INTEGER DEFAULT 0,
  passing_score DECIMAL(5,2) DEFAULT 70.00,
  max_attempts INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  instructions TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Particiones por mes para optimizar consultas
CREATE TABLE public.exams_2024_01 PARTITION OF public.exams
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Índices en tabla particionada
CREATE INDEX CONCURRENTLY idx_exams_company_type ON public.exams(company_id, type);
CREATE INDEX CONCURRENTLY idx_exams_active_dates ON public.exams(is_active, start_date, end_date);
CREATE INDEX CONCURRENTLY idx_exams_instructor ON public.exams(instructor_id);

-- 3. Tabla de Intentos con Optimización para Consultas Frecuentes
CREATE TABLE public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status public.attempt_status NOT NULL DEFAULT 'in_progress',
  score DECIMAL(5,2),
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  ip_address INET,
  user_agent TEXT,
  personal_factors JSONB DEFAULT '{}',
  ai_analysis JSONB,
  is_simulation_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(exam_id, user_id, attempt_number)
);

-- Índices críticos para analytics y reportes
CREATE INDEX CONCURRENTLY idx_attempts_exam_status ON public.exam_attempts(exam_id, status);
CREATE INDEX CONCURRENTLY idx_attempts_user_date ON public.exam_attempts(user_id, started_at);
CREATE INDEX CONCURRENTLY idx_attempts_company_analytics ON public.exam_attempts(exam_id, submitted_at) 
  WHERE status = 'completed';

-- 4. Tabla de Respuestas Optimizada
CREATE TABLE public.exam_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.question_options(id),
  response_text TEXT,
  is_correct BOOLEAN,
  points_awarded DECIMAL(5,2) DEFAULT 0,
  response_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(attempt_id, question_id)
);

-- Índice compuesto para análisis de respuestas
CREATE INDEX CONCURRENTLY idx_responses_attempt_question ON public.exam_responses(attempt_id, question_id);
CREATE INDEX CONCURRENTLY idx_responses_analytics ON public.exam_responses(question_id, is_correct, points_awarded);
```

### Funciones PostgreSQL Críticas

```sql
-- 1. Función para cálculo de puntuación ajustada
CREATE OR REPLACE FUNCTION calculate_adjusted_score(
  p_attempt_id UUID,
  p_personal_factors JSONB DEFAULT '{}'
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  base_score DECIMAL(5,2);
  adjustment_factor DECIMAL(3,2) := 1.0;
  final_score DECIMAL(5,2);
BEGIN
  -- Obtener puntuación base
  SELECT 
    COALESCE(
      (SUM(points_awarded) / COUNT(*)) * 100, 
      0
    ) INTO base_score
  FROM exam_responses
  WHERE attempt_id = p_attempt_id;
  
  -- Aplicar factores de ajuste personal
  IF (p_personal_factors->>'stress_level')::INTEGER > 7 THEN
    adjustment_factor := adjustment_factor + 0.05;
  END IF;
  
  IF (p_personal_factors->>'sleep_hours')::INTEGER < 6 THEN
    adjustment_factor := adjustment_factor + 0.03;
  END IF;
  
  final_score := base_score * adjustment_factor;
  final_score := LEAST(final_score, 100.0); -- Cap at 100%
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para detección de simulación
CREATE OR REPLACE FUNCTION detect_response_simulation(
  p_attempt_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  avg_response_time DECIMAL;
  consistent_pattern_count INTEGER;
  is_simulation BOOLEAN := false;
BEGIN
  -- Calcular tiempo promedio de respuesta
  SELECT AVG(response_time_seconds) INTO avg_response_time
  FROM exam_responses
  WHERE attempt_id = p_attempt_id;
  
  -- Contar patrones consistentes sospechosos
  SELECT COUNT(*) INTO consistent_pattern_count
  FROM exam_responses
  WHERE attempt_id = p_attempt_id
    AND response_time_seconds < 5; -- Respuestas muy rápidas
  
  -- Lógica de detección
  IF avg_response_time < 10 OR consistent_pattern_count > 5 THEN
    is_simulation := true;
  END IF;
  
  RETURN is_simulation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Vista materializada para analytics optimizado
CREATE MATERIALIZED VIEW mv_exam_analytics AS
SELECT 
  e.id as exam_id,
  e.title as exam_title,
  e.type as exam_type,
  c.name as company_name,
  COUNT(DISTINCT ea.user_id) as total_participants,
  AVG(ea.score) as average_score,
  STDDEV(ea.score) as score_deviation,
  COUNT(CASE WHEN ea.status = 'completed' THEN 1 END) as completed_attempts,
  COUNT(CASE WHEN ea.is_simulation_detected THEN 1 END) as simulation_detected,
  DATE_TRUNC('day', ea.started_at) as exam_date
FROM exams e
LEFT JOIN exam_attempts ea ON e.id = ea.exam_id
LEFT JOIN companies c ON e.company_id = c.id
WHERE ea.status = 'completed'
GROUP BY e.id, e.title, e.type, c.name, DATE_TRUNC('day', ea.started_at);

-- Refresh automático cada hora
CREATE OR REPLACE FUNCTION refresh_analytics_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_exam_analytics;
END;
$$ LANGUAGE plpgsql;

-- Cron job para refresh automático
SELECT cron.schedule('refresh-analytics', '0 * * * *', 'SELECT refresh_analytics_mv();');
```

### Políticas RLS Granulares

```sql
-- RLS para profiles con control granular
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para lectura basada en rol y empresa
CREATE POLICY "profiles_read_policy" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id OR
  (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
        AND (
          p.role IN ('admin', 'supervisor') OR
          (p.role = 'instructor' AND p.company_id = profiles.company_id)
        )
    )
  )
);

-- Política para actualizaciones
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'supervisor')
  )
);

-- RLS para exam_attempts con optimización
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attempts_comprehensive_policy" ON public.exam_attempts
FOR ALL USING (
  -- El usuario puede ver sus propios intentos
  user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  -- Los instructores pueden ver intentos de sus exámenes
  EXISTS (
    SELECT 1 FROM public.exams e
    JOIN public.profiles p ON e.instructor_id = p.id
    WHERE e.id = exam_attempts.exam_id 
      AND p.user_id = auth.uid()
  ) OR
  -- Supervisores y admins pueden ver todo de su empresa
  EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.user_id = auth.uid() 
      AND p1.role IN ('admin', 'supervisor')
      AND p2.id = exam_attempts.user_id
  )
);
```

---

## 3. EDGE FUNCTIONS CRÍTICAS

### Función de Generación de Reportes Optimizada

```typescript
// supabase/functions/generate-optimized-report/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ReportRequest {
  attemptId: string;
  reportType: 'reliability' | 'ocean' | 'comprehensive';
  includeAIAnalysis: boolean;
  format: 'html' | 'pdf';
  language: 'es' | 'en';
}

interface ProcessedData {
  attempt: any;
  responses: any[];
  scores: {
    raw: number;
    adjusted: number;
    percentile: number;
  };
  aiAnalysis?: string;
  metadata: {
    processingTime: number;
    cacheHit: boolean;
    version: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = performance.now();
    
    // Validate request
    const requestData: ReportRequest = await req.json();
    if (!requestData.attemptId) {
      throw new Error('attemptId is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const cacheKey = `report_${requestData.attemptId}_${requestData.reportType}`;
    const { data: cachedReport } = await supabase
      .from('ai_analysis_cache')
      .select('analysis_result, created_at')
      .eq('cache_key', cacheKey)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24h cache
      .single();

    let processedData: ProcessedData;

    if (cachedReport) {
      console.log('Cache hit for report:', cacheKey);
      processedData = JSON.parse(cachedReport.analysis_result);
      processedData.metadata.cacheHit = true;
    } else {
      console.log('Processing new report for:', requestData.attemptId);
      processedData = await processReportData(supabase, requestData);
      processedData.metadata.cacheHit = false;
      
      // Cache the result
      await supabase
        .from('ai_analysis_cache')
        .upsert({
          cache_key: cacheKey,
          analysis_result: JSON.stringify(processedData),
          attempt_id: requestData.attemptId,
          analysis_type: requestData.reportType
        });
    }

    // Generate final report
    const report = await generateFinalReport(processedData, requestData);
    
    processedData.metadata.processingTime = performance.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        data: report,
        metadata: processedData.metadata
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function processReportData(
  supabase: any, 
  request: ReportRequest
): Promise<ProcessedData> {
  // Optimized query with joins
  const { data: attemptData, error } = await supabase
    .from('exam_attempts')
    .select(`
      *,
      exam:exams(*),
      user:profiles(*),
      responses:exam_responses(
        *,
        question:questions(*),
        selected_option:question_options(*)
      )
    `)
    .eq('id', request.attemptId)
    .single();

  if (error) throw new Error(`Failed to fetch attempt data: ${error.message}`);

  // Calculate scores using PostgreSQL function
  const { data: adjustedScore } = await supabase
    .rpc('calculate_adjusted_score', {
      p_attempt_id: request.attemptId,
      p_personal_factors: attemptData.personal_factors || {}
    });

  // Calculate percentile against similar exams
  const { data: percentileData } = await supabase
    .from('exam_attempts')
    .select('score')
    .eq('exam_id', attemptData.exam_id)
    .eq('status', 'completed')
    .not('score', 'is', null);

  const percentile = calculatePercentile(adjustedScore, percentileData.map(d => d.score));

  const processedData: ProcessedData = {
    attempt: attemptData,
    responses: attemptData.responses,
    scores: {
      raw: attemptData.score,
      adjusted: adjustedScore,
      percentile: percentile
    },
    metadata: {
      processingTime: 0,
      cacheHit: false,
      version: '2.0.0'
    }
  };

  // Generate AI analysis if requested
  if (request.includeAIAnalysis) {
    processedData.aiAnalysis = await generateAIAnalysis(processedData, request.reportType);
  }

  return processedData;
}

async function generateAIAnalysis(data: ProcessedData, reportType: string): Promise<string> {
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIKey) throw new Error('OpenAI API key not configured');

  const prompt = buildAnalysisPrompt(data, reportType);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

function buildAnalysisPrompt(data: ProcessedData, reportType: string): string {
  const baseContext = `
    Analiza los siguientes datos de evaluación psicométrica:
    - Tipo de examen: ${reportType}
    - Puntuación bruta: ${data.scores.raw}%
    - Puntuación ajustada: ${data.scores.adjusted}%
    - Percentil: ${data.scores.percentile}
    - Total de respuestas: ${data.responses.length}
  `;

  const typeSpecificPrompts = {
    reliability: `
      ${baseContext}
      Enfócate en el análisis de confiabilidad y consistencia en las respuestas.
      Evalúa patrones de respuesta y detecta posibles inconsistencias.
    `,
    ocean: `
      ${baseContext}
      Realiza un análisis de personalidad basado en el modelo Big Five (OCEAN).
      Proporciona insights detallados sobre cada dimensión de personalidad.
    `,
    comprehensive: `
      ${baseContext}
      Realiza un análisis integral que combine aspectos de confiabilidad y personalidad.
      Proporciona recomendaciones específicas para desarrollo personal y profesional.
    `
  };

  return typeSpecificPrompts[reportType] || typeSpecificPrompts.comprehensive;
}

function calculatePercentile(score: number, allScores: number[]): number {
  if (allScores.length === 0) return 50;
  
  const sortedScores = allScores.sort((a, b) => a - b);
  const lowerCount = sortedScores.filter(s => s < score).length;
  return Math.round((lowerCount / sortedScores.length) * 100);
}

async function generateFinalReport(data: ProcessedData, request: ReportRequest): Promise<string> {
  if (request.format === 'pdf') {
    return generatePDFReport(data, request);
  } else {
    return generateHTMLReport(data, request);
  }
}

function generateHTMLReport(data: ProcessedData, request: ReportRequest): string {
  return `
    <!DOCTYPE html>
    <html lang="${request.language}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte ${data.attempt.exam.title}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
            .score-card { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #007bff; }
            .analysis { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .metadata { font-size: 0.9em; color: #6c757d; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Reporte de Evaluación - ${data.attempt.exam.title}</h1>
            <p>Participante: ${data.attempt.user.full_name}</p>
            <p>Fecha: ${new Date(data.attempt.started_at).toLocaleDateString()}</p>
        </div>
        
        <div class="score-card">
            <h2>Puntuaciones</h2>
            <p><strong>Puntuación Bruta:</strong> ${data.scores.raw}%</p>
            <p><strong>Puntuación Ajustada:</strong> ${data.scores.adjusted}%</p>
            <p><strong>Percentil:</strong> ${data.scores.percentile}</p>
        </div>
        
        ${data.aiAnalysis ? `
        <div class="analysis">
            <h2>Análisis Psicométrico</h2>
            <div>${data.aiAnalysis.replace(/\n/g, '<br>')}</div>
        </div>` : ''}
        
        <div class="metadata">
            <p>Reporte generado en ${data.metadata.processingTime.toFixed(2)}ms</p>
            <p>Cache: ${data.metadata.cacheHit ? 'Utilizado' : 'Nuevo procesamiento'}</p>
            <p>Versión: ${data.metadata.version}</p>
        </div>
    </body>
    </html>
  `;
}

function generatePDFReport(data: ProcessedData, request: ReportRequest): string {
  // Implementar generación PDF usando Puppeteer o similar
  return generateHTMLReport(data, request); // Fallback temporal
}
```

---

## 4. COMPONENTES REACT OPTIMIZADOS

### Hook de Examen Optimizado

```typescript
// src/hooks/useOptimizedExamManagement.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExamFilters {
  companyId?: string;
  type?: 'reliability' | 'ocean';
  status?: 'active' | 'inactive';
  dateRange?: { start: Date; end: Date };
}

interface ExamMetrics {
  totalExams: number;
  activeExams: number;
  completedAttempts: number;
  averageScore: number;
  participationRate: number;
}

export const useOptimizedExamManagement = (filters: ExamFilters = {}) => {
  const queryClient = useQueryClient();

  // Optimized query with select and enabled conditions
  const {
    data: exams = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['exams', filters],
    queryFn: async () => {
      let query = supabase
        .from('exams')
        .select(`
          *,
          category:categories(name),
          instructor:profiles!instructor_id(full_name),
          company:companies(name),
          _count:exam_attempts(count)
        `);

      // Apply filters
      if (filters.companyId) {
        query = query.eq('company_id', filters.companyId);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('is_active', filters.status === 'active');
      }
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Metrics query with separate caching
  const { data: metrics } = useQuery({
    queryKey: ['exam-metrics', filters],
    queryFn: async (): Promise<ExamMetrics> => {
      const { data, error } = await supabase
        .rpc('get_exam_metrics', { filter_params: filters });
      
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!exams.length,
  });

  // Optimistic mutations
  const createExamMutation = useMutation({
    mutationFn: async (examData: any) => {
      const { data, error } = await supabase
        .from('exams')
        .insert(examData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async (newExam) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['exams'] });
      
      // Snapshot previous value
      const previousExams = queryClient.getQueryData(['exams', filters]);
      
      // Optimistically update
      queryClient.setQueryData(['exams', filters], (old: any[]) => [
        { ...newExam, id: 'temp-' + Date.now() },
        ...old
      ]);
      
      return { previousExams };
    },
    onError: (err, newExam, context) => {
      // Rollback on error
      queryClient.setQueryData(['exams', filters], context?.previousExams);
      toast.error('Error al crear examen: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Examen creado exitosamente');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam-metrics'] });
    },
  });

  const updateExamMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('exams')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (updatedExam) => {
      // Update specific exam in cache
      queryClient.setQueryData(['exams', filters], (old: any[]) =>
        old.map(exam => exam.id === updatedExam.id ? updatedExam : exam)
      );
      toast.success('Examen actualizado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar examen: ' + error.message);
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.setQueryData(['exams', filters], (old: any[]) =>
        old.filter(exam => exam.id !== deletedId)
      );
      toast.success('Examen eliminado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar examen: ' + error.message);
    },
  });

  // Memoized derived data
  const examsByStatus = useMemo(() => {
    return exams.reduce((acc, exam) => {
      const status = exam.is_active ? 'active' : 'inactive';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [exams]);

  const examsByType = useMemo(() => {
    return exams.reduce((acc, exam) => {
      acc[exam.type] = (acc[exam.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [exams]);

  // Callbacks
  const createExam = useCallback((examData: any) => {
    return createExamMutation.mutateAsync(examData);
  }, [createExamMutation]);

  const updateExam = useCallback((id: string, updates: any) => {
    return updateExamMutation.mutateAsync({ id, updates });
  }, [updateExamMutation]);

  const deleteExam = useCallback((id: string) => {
    return deleteExamMutation.mutateAsync(id);
  }, [deleteExamMutation]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['exams'] });
    queryClient.invalidateQueries({ queryKey: ['exam-metrics'] });
  }, [queryClient]);

  return {
    // Data
    exams,
    metrics,
    examsByStatus,
    examsByType,
    
    // States
    isLoading,
    error,
    isCreating: createExamMutation.isPending,
    isUpdating: updateExamMutation.isPending,
    isDeleting: deleteExamMutation.isPending,
    
    // Actions
    createExam,
    updateExam,
    deleteExam,
    refreshData,
    refetch,
  };
};
```

### Componente de Dashboard Optimizado

```typescript
// src/components/OptimizedDashboard.tsx
import React, { memo, Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOptimizedExamManagement } from '@/hooks/useOptimizedExamManagement';
import { useUserRole } from '@/hooks/useUserRole';

// Lazy loaded components for code splitting
const ExamMetricsChart = React.lazy(() => import('./charts/ExamMetricsChart'));
const RecentActivityFeed = React.lazy(() => import('./RecentActivityFeed'));
const QuickActions = React.lazy(() => import('./QuickActions'));

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ReactNode;
}

const MetricCard = memo<MetricCardProps>(({ title, value, change, icon }) => (
  <Card className="transition-all hover:shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className="h-4 w-4 text-muted-foreground">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p className={`text-xs mt-1 ${
          change.type === 'increase' ? 'text-green-600' : 'text-red-600'
        }`}>
          {change.type === 'increase' ? '+' : '-'}{change.value}% from last month
        </p>
      )}
    </CardContent>
  </Card>
));

const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <h3 className="text-red-800 font-semibold">Something went wrong</h3>
    <p className="text-red-600 text-sm mt-1">{error.message}</p>
    <button 
      onClick={resetErrorBoundary}
      className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
    >
      Try again
    </button>
  </div>
);

const LoadingSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-4 w-[100px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[60px]" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const OptimizedDashboard = memo(() => {
  const { role, companyId } = useUserRole();
  
  const filters = useMemo(() => ({
    companyId: role !== 'admin' ? companyId : undefined,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    }
  }), [role, companyId]);

  const {
    exams,
    metrics,
    examsByStatus,
    examsByType,
    isLoading,
    error
  } = useOptimizedExamManagement(filters);

  const dashboardMetrics = useMemo(() => {
    if (!metrics) return null;

    return [
      {
        title: "Total de Exámenes",
        value: metrics.totalExams,
        change: { value: 12, type: 'increase' as const },
        icon: <span>📊</span>
      },
      {
        title: "Exámenes Activos",
        value: metrics.activeExams,
        icon: <span>✅</span>
      },
      {
        title: "Intentos Completados",
        value: metrics.completedAttempts,
        change: { value: 8, type: 'increase' as const },
        icon: <span>🎯</span>
      },
      {
        title: "Puntuación Promedio",
        value: `${metrics.averageScore.toFixed(1)}%`,
        change: { value: 2.5, type: 'increase' as const },
        icon: <span>📈</span>
      }
    ];
  }, [metrics]);

  if (error) {
    return (
      <ErrorFallback 
        error={error} 
        resetErrorBoundary={() => window.location.reload()} 
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Última actualización: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Metrics Cards */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<LoadingSkeleton />}>
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {dashboardMetrics?.map((metric, index) => (
                <MetricCard key={index} {...metric} />
              ))}
            </div>
          )}
        </Suspense>
      </ErrorBoundary>

      {/* Charts and Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<Skeleton className="h-[400px]" />}>
            <ExamMetricsChart 
              data={{
                byStatus: examsByStatus,
                byType: examsByType,
                timeline: metrics?.timeline || []
              }}
            />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<Skeleton className="h-[400px]" />}>
            <RecentActivityFeed />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Quick Actions */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<Skeleton className="h-[200px]" />}>
          <QuickActions userRole={role} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
});

OptimizedDashboard.displayName = 'OptimizedDashboard';
```

---

## 5. OPTIMIZACIONES DE PERFORMANCE

### Configuración de React Query Optimizada

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache optimizations
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry for 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Performance optimizations
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      refetchOnReconnect: 'always',
      
      // Error handling
      onError: (error: any) => {
        console.error('Query error:', error);
        if (error?.message !== 'canceled') {
          toast.error(`Error: ${error.message}`);
        }
      },
    },
    mutations: {
      // Global mutation error handling
      onError: (error: any) => {
        console.error('Mutation error:', error);
        toast.error(`Error: ${error.message}`);
      },
      
      // Retry for mutations
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Prefetch critical data
export const prefetchCriticalData = async () => {
  const promises = [
    queryClient.prefetchQuery({
      queryKey: ['user-profile'],
      queryFn: () => fetchUserProfile(),
      staleTime: 10 * 60 * 1000, // 10 minutes
    }),
    queryClient.prefetchQuery({
      queryKey: ['companies'],
      queryFn: () => fetchCompanies(),
      staleTime: 30 * 60 * 1000, // 30 minutes
    }),
  ];

  await Promise.allSettled(promises);
};
```

### Lazy Loading y Code Splitting

```typescript
// src/utils/lazyWithRetry.ts
import { ComponentType, lazy } from 'react';

interface RetryOptions {
  maxRetries?: number;
  delay?: number;
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: RetryOptions = {}
): React.LazyExoticComponent<T> {
  const { maxRetries = 3, delay = 1000 } = options;

  return lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      let retries = 0;

      const attemptImport = () => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (retries < maxRetries) {
              retries++;
              console.warn(`Import failed, retrying... (${retries}/${maxRetries})`);
              setTimeout(attemptImport, delay * retries);
            } else {
              reject(error);
            }
          });
      };

      attemptImport();
    });
  });
}

// Usage in route definitions
const Dashboard = lazyWithRetry(() => import('@/components/Dashboard'));
const ExamManagement = lazyWithRetry(() => import('@/components/ExamManagement'));
const Reports = lazyWithRetry(() => import('@/components/Reports'));
```

### Virtual Scrolling para Listas Grandes

```typescript
// src/components/VirtualizedExamList.tsx
import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent } from '@/components/ui/card';

interface ExamItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    exams: any[];
    onExamClick: (exam: any) => void;
  };
}

const ExamItem = memo<ExamItemProps>(({ index, style, data }) => {
  const exam = data.exams[index];
  
  return (
    <div style={style}>
      <Card 
        className="m-2 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => data.onExamClick(exam)}
      >
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg">{exam.title}</h3>
          <p className="text-muted-foreground">{exam.description}</p>
          <div className="flex justify-between mt-2 text-sm">
            <span>Tipo: {exam.type}</span>
            <span>Duración: {exam.duration_minutes}min</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

interface VirtualizedExamListProps {
  exams: any[];
  onExamClick: (exam: any) => void;
  height?: number;
}

export const VirtualizedExamList = memo<VirtualizedExamListProps>(({
  exams,
  onExamClick,
  height = 600
}) => {
  const itemData = useMemo(() => ({
    exams,
    onExamClick
  }), [exams, onExamClick]);

  if (!exams.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay exámenes disponibles
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={exams.length}
      itemSize={120}
      itemData={itemData}
      className="scrollbar-thin scrollbar-thumb-gray-300"
    >
      {ExamItem}
    </List>
  );
});

VirtualizedExamList.displayName = 'VirtualizedExamList';
```

---

## 6. SISTEMA DE TESTING AUTOMATIZADO

### Configuración de Testing

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signIn: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isLoading: false,
  })),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));
```

### Tests de Componentes

```typescript
// src/components/__tests__/ExamCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ExamCard } from '../ExamCard';

const mockExam = {
  id: '1',
  title: 'Test Exam',
  description: 'Test Description',
  type: 'reliability',
  duration_minutes: 60,
  is_active: true,
  total_questions: 10,
  created_at: new Date().toISOString(),
};

describe('ExamCard', () => {
  const mockOnClick = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exam information correctly', () => {
    render(
      <ExamCard
        exam={mockExam}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Exam')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('60 min')).toBeInTheDocument();
    expect(screen.getByText('10 preguntas')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    render(
      <ExamCard
        exam={mockExam}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /test exam/i }));
    expect(mockOnClick).toHaveBeenCalledWith(mockExam);
  });

  it('shows inactive badge for inactive exams', () => {
    const inactiveExam = { ...mockExam, is_active: false };
    
    render(
      <ExamCard
        exam={inactiveExam}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <ExamCard
        exam={mockExam}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(mockOnEdit).toHaveBeenCalledWith(mockExam);
    expect(mockOnClick).not.toHaveBeenCalled();
  });
});
```

### Tests de Hooks

```typescript
// src/hooks/__tests__/useOptimizedExamManagement.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { useOptimizedExamManagement } from '../useOptimizedExamManagement';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useOptimizedExamManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads exams successfully', async () => {
    const mockExams = [
      { id: '1', title: 'Exam 1', type: 'reliability' },
      { id: '2', title: 'Exam 2', type: 'ocean' },
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockExams, error: null }),
    } as any);

    const { result } = renderHook(() => useOptimizedExamManagement(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.exams).toEqual(mockExams);
  });

  it('handles exam creation with optimistic updates', async () => {
    const newExam = { title: 'New Exam', type: 'reliability' };
    
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { id: '3', ...newExam }, 
        error: null 
      }),
    } as any);

    const { result } = renderHook(() => useOptimizedExamManagement(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.createExam(newExam);

    expect(result.current.isCreating).toBe(true);
  });

  it('handles errors gracefully', async () => {
    const mockError = new Error('Database error');
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    } as any);

    const { result } = renderHook(() => useOptimizedExamManagement(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
    });
  });
});
```

### Tests E2E con Playwright

```typescript
// tests/e2e/exam-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Exam Management', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await page.goto('/auth');
    await page.fill('[data-testid="email"]', 'admin@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new exam', async ({ page }) => {
    await page.goto('/exams');
    await page.click('[data-testid="create-exam-button"]');
    
    // Fill exam form
    await page.fill('[data-testid="exam-title"]', 'E2E Test Exam');
    await page.fill('[data-testid="exam-description"]', 'Test Description');
    await page.selectOption('[data-testid="exam-type"]', 'reliability');
    await page.fill('[data-testid="exam-duration"]', '45');
    
    await page.click('[data-testid="create-exam-submit"]');
    
    // Verify exam was created
    await expect(page.locator('[data-testid="exam-card"]')).toContainText('E2E Test Exam');
    await expect(page.locator('.toast')).toContainText('Examen creado exitosamente');
  });

  test('should take an exam', async ({ page }) => {
    // Assume exam exists from previous test or setup
    await page.goto('/exams');
    await page.click('[data-testid="exam-card"]:first-child');
    await page.click('[data-testid="start-exam-button"]');
    
    // Wait for exam to load
    await expect(page.locator('[data-testid="exam-question"]')).toBeVisible();
    
    // Answer questions
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="option-1"]');
      await page.click('[data-testid="next-question-button"]');
    }
    
    // Submit exam
    await page.click('[data-testid="submit-exam-button"]');
    await page.click('[data-testid="confirm-submit-button"]');
    
    // Verify completion
    await expect(page.locator('[data-testid="exam-completion"]')).toBeVisible();
    await expect(page.locator('[data-testid="score"]')).toContainText('%');
  });

  test('should generate a report', async ({ page }) => {
    await page.goto('/reports');
    await page.selectOption('[data-testid="user-select"]', 'test-user-id');
    await page.selectOption('[data-testid="exam-select"]', 'test-exam-id');
    
    await page.click('[data-testid="generate-report-button"]');
    
    // Wait for report generation
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="ai-analysis"]')).toContainText('Análisis');
  });
});
```

---

## 7. CONFIGURACIÓN DE CI/CD

### GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '8'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
          
      - name: Get pnpm store directory
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV
        
      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-
            
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run type checking
        run: pnpm run type-check
        
      - name: Run linting
        run: pnpm run lint
        
      - name: Run unit tests
        run: pnpm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          
      - name: Run E2E tests
        run: pnpm run test:e2e
        env:
          CI: true
          
  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Build application
        run: pnpm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
          
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
          
  deploy-staging:
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    environment: staging
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/
          
      - name: Deploy to staging
        uses: supabase/setup-cli@v1
        with:
          version: latest
          
      - name: Deploy Edge Functions
        run: |
          supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
      - name: Run database migrations
        run: |
          supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
  deploy-production:
    needs: [test, build, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/
          
      - name: Deploy to production
        uses: supabase/setup-cli@v1
        with:
          version: latest
          
      - name: Deploy Edge Functions
        run: |
          supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF_PROD }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
      - name: Run database migrations
        run: |
          supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF_PROD }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
      - name: Notify deployment
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-type: application/json' \
            --data '{"text":"🚀 Production deployment completed successfully!"}'
```

---

## 8. MONITOREO Y OBSERVABILIDAD

### Configuración de Monitoreo

```typescript
// src/utils/monitoring.ts
interface ErrorLog {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  context?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  context?: Record<string, any>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private errorQueue: ErrorLog[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private flushInterval: number = 10000; // 10 seconds
  
  private constructor() {
    this.startPerformanceMonitoring();
    this.startErrorTracking();
    this.scheduleFlush();
  }
  
  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }
  
  logError(error: Error, context?: Record<string, any>) {
    const errorLog: ErrorLog = {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      level: 'error',
      context
    };
    
    this.errorQueue.push(errorLog);
    console.error('Error logged:', errorLog);
  }
  
  logPerformance(name: string, value: number, unit: string = 'ms', context?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      context
    };
    
    this.performanceQueue.push(metric);
  }
  
  private startPerformanceMonitoring() {
    // Core Web Vitals
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          this.logPerformance('LCP', entry.startTime, 'ms');
        }
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.name === 'first-input-delay') {
          this.logPerformance('FID', entry.processingStart - entry.startTime, 'ms');
        }
      });
    }).observe({ entryTypes: ['first-input'] });
    
    // Custom performance markers
    this.observeRouteChanges();
    this.observeAPICallDurations();
  }
  
  private startErrorTracking() {
    window.addEventListener('error', (event) => {
      this.logError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(event.reason), {
        type: 'unhandledrejection'
      });
    });
  }
  
  private observeRouteChanges() {
    let lastRoute = window.location.pathname;
    let routeStartTime = performance.now();
    
    const observer = new MutationObserver(() => {
      const currentRoute = window.location.pathname;
      if (currentRoute !== lastRoute) {
        const loadTime = performance.now() - routeStartTime;
        this.logPerformance('route-change', loadTime, 'ms', {
          from: lastRoute,
          to: currentRoute
        });
        
        lastRoute = currentRoute;
        routeStartTime = performance.now();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  private observeAPICallDurations() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0]?.toString() || 'unknown';
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.logPerformance('api-call', duration, 'ms', {
          url: url.replace(/\/[0-9a-f-]{36}/g, '/:id'), // Anonymize IDs
          status: response.status,
          method: args[1]?.method || 'GET'
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.logError(error as Error, {
          url,
          duration,
          type: 'api-error'
        });
        throw error;
      }
    };
  }
  
  private async scheduleFlush() {
    setInterval(async () => {
      await this.flush();
    }, this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }
  
  private async flush() {
    if (this.errorQueue.length === 0 && this.performanceQueue.length === 0) {
      return;
    }
    
    const payload = {
      errors: [...this.errorQueue],
      performance: [...this.performanceQueue],
      session: {
        sessionId: this.getSessionId(),
        userId: this.getUserId(),
        timestamp: new Date().toISOString()
      }
    };
    
    try {
      await fetch('/api/monitoring/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Clear queues after successful flush
      this.errorQueue = [];
      this.performanceQueue = [];
    } catch (error) {
      console.error('Failed to flush monitoring data:', error);
    }
  }
  
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('monitoring-session-id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('monitoring-session-id', sessionId);
    }
    return sessionId;
  }
  
  private getUserId(): string | undefined {
    // Get from auth context or local storage
    return localStorage.getItem('user-id') || undefined;
  }
}

export const monitoring = MonitoringService.getInstance();

// React Hook for component-level monitoring
export const useMonitoring = (componentName: string) => {
  const logComponentError = useCallback((error: Error, context?: Record<string, any>) => {
    monitoring.logError(error, { component: componentName, ...context });
  }, [componentName]);
  
  const logComponentPerformance = useCallback((actionName: string, duration: number) => {
    monitoring.logPerformance(`${componentName}.${actionName}`, duration, 'ms');
  }, [componentName]);
  
  return { logComponentError, logComponentPerformance };
};
```

### Edge Function para Colectar Métricas

```typescript
// supabase/functions/collect-monitoring-data/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface MonitoringPayload {
  errors: ErrorLog[];
  performance: PerformanceMetric[];
  session: {
    sessionId: string;
    userId?: string;
    timestamp: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: MonitoringPayload = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store errors
    if (payload.errors.length > 0) {
      const { error: errorInsertError } = await supabase
        .from('error_logs')
        .insert(
          payload.errors.map(err => ({
            ...err,
            session_id: payload.session.sessionId,
            user_id: payload.session.userId
          }))
        );

      if (errorInsertError) {
        console.error('Failed to insert error logs:', errorInsertError);
      }
    }

    // Store performance metrics
    if (payload.performance.length > 0) {
      const { error: perfInsertError } = await supabase
        .from('performance_metrics')
        .insert(
          payload.performance.map(metric => ({
            ...metric,
            session_id: payload.session.sessionId,
            user_id: payload.session.userId
          }))
        );

      if (perfInsertError) {
        console.error('Failed to insert performance metrics:', perfInsertError);
      }
    }

    // Check for critical errors and alert
    const criticalErrors = payload.errors.filter(err => 
      err.message.includes('ChunkLoadError') || 
      err.message.includes('Network Error') ||
      err.level === 'error'
    );

    if (criticalErrors.length > 0) {
      await alertCriticalErrors(criticalErrors, payload.session);
    }

    return new Response(
      JSON.stringify({ success: true, processed: payload.errors.length + payload.performance.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing monitoring data:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function alertCriticalErrors(errors: any[], session: any) {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!webhookUrl) return;

  const message = {
    text: `🚨 Critical errors detected in production`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Critical Errors Detected*\n\n${errors.map(err => 
            `• ${err.message}\n  URL: ${err.url}\n  User: ${session.userId || 'Anonymous'}`
          ).join('\n\n')}`
        }
      }
    ]
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}
```

---

## 9. MEJORAS SUSTANCIALES PROPUESTAS

### 1. Arquitectura Microservicios

```typescript
// Nueva estructura modular
src/
├── domains/                    # Domain-driven design
│   ├── authentication/        # Auth domain
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── examinations/          # Exam domain
│   ├── psychometrics/         # Psychometric domain
│   ├── reporting/             # Reporting domain
│   └── user-management/       # User management domain
├── shared/                    # Shared utilities
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
└── app/                       # App-level concerns
    ├── providers/
    ├── routing/
    └── store/
```

### 2. Estado Global Optimizado con Zustand

```typescript
// src/store/examStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface ExamState {
  // State
  exams: Exam[];
  currentExam: Exam | null;
  filters: ExamFilters;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  
  // Actions
  setExams: (exams: Exam[]) => void;
  addExam: (exam: Exam) => void;
  updateExam: (id: string, updates: Partial<Exam>) => void;
  removeExam: (id: string) => void;
  setCurrentExam: (exam: Exam | null) => void;
  setFilters: (filters: Partial<ExamFilters>) => void;
  
  // Async actions
  fetchExams: () => Promise<void>;
  createExam: (examData: CreateExamData) => Promise<void>;
}

export const useExamStore = create<ExamState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      exams: [],
      currentExam: null,
      filters: {},
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      
      // Synchronous actions
      setExams: (exams) => set({ exams }),
      
      addExam: (exam) => set((state) => {
        state.exams.unshift(exam);
      }),
      
      updateExam: (id, updates) => set((state) => {
        const index = state.exams.findIndex(e => e.id === id);
        if (index !== -1) {
          Object.assign(state.exams[index], updates);
        }
      }),
      
      removeExam: (id) => set((state) => {
        state.exams = state.exams.filter(e => e.id !== id);
      }),
      
      setCurrentExam: (exam) => set({ currentExam: exam }),
      
      setFilters: (filters) => set((state) => {
        state.filters = { ...state.filters, ...filters };
      }),
      
      // Async actions
      fetchExams: async () => {
        set({ isLoading: true });
        try {
          const exams = await examService.getExams(get().filters);
          set({ exams, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      createExam: async (examData) => {
        set({ isCreating: true });
        try {
          const newExam = await examService.createExam(examData);
          set((state) => {
            state.exams.unshift(newExam);
            state.isCreating = false;
          });
        } catch (error) {
          set({ isCreating: false });
          throw error;
        }
      },
    }))
  )
);

// Selectors for optimized re-renders
export const useExamsSelector = (selector: (state: ExamState) => any) =>
  useExamStore(selector);

export const useActiveExams = () =>
  useExamStore(state => state.exams.filter(e => e.is_active));

export const useExamsByType = (type: ExamType) =>
  useExamStore(state => state.exams.filter(e => e.type === type));
```

### 3. Caching Inteligente

```typescript
// src/services/cacheService.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheStrategy {
  ttl: number;
  maxSize?: number;
  persistToDisk?: boolean;
  refreshOnAccess?: boolean;
}

class IntelligentCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private strategies = new Map<string, CacheStrategy>();
  
  constructor() {
    this.setupDefaultStrategies();
    this.startCleanupSchedule();
  }
  
  private setupDefaultStrategies() {
    // User data - long cache, persist to disk
    this.strategies.set('user', {
      ttl: 30 * 60 * 1000, // 30 minutes
      persistToDisk: true,
      refreshOnAccess: true
    });
    
    // Exam results - very long cache
    this.strategies.set('exam-results', {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      persistToDisk: true
    });
    
    // Live data - short cache
    this.strategies.set('analytics', {
      ttl: 2 * 60 * 1000, // 2 minutes
      maxSize: 100
    });
    
    // Static content - very long cache
    this.strategies.set('static', {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      persistToDisk: true
    });
  }
  
  async get<T>(key: string, strategyName: string = 'default'): Promise<T | null> {
    const fullKey = `${strategyName}:${key}`;
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(fullKey);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      const strategy = this.strategies.get(strategyName);
      if (strategy?.refreshOnAccess) {
        memoryEntry.timestamp = Date.now();
      }
      return memoryEntry.data;
    }
    
    // Check disk cache if strategy allows
    const strategy = this.strategies.get(strategyName);
    if (strategy?.persistToDisk) {
      const diskEntry = await this.getDiskCache<T>(fullKey);
      if (diskEntry && !this.isExpired(diskEntry)) {
        // Restore to memory cache
        this.memoryCache.set(fullKey, diskEntry);
        return diskEntry.data;
      }
    }
    
    return null;
  }
  
  async set<T>(
    key: string, 
    data: T, 
    strategyName: string = 'default'
  ): Promise<void> {
    const strategy = this.strategies.get(strategyName) || { ttl: 5 * 60 * 1000 };
    const fullKey = `${strategyName}:${key}`;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: strategy.ttl,
      key: fullKey
    };
    
    // Store in memory cache
    this.memoryCache.set(fullKey, entry);
    
    // Enforce max size
    if (strategy.maxSize && this.memoryCache.size > strategy.maxSize) {
      this.evictOldest(strategyName);
    }
    
    // Store to disk if strategy allows
    if (strategy.persistToDisk) {
      await this.setDiskCache(fullKey, entry);
    }
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Memory cache invalidation
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Disk cache invalidation
    await this.invalidateDiskCache(pattern);
  }
  
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
  
  private evictOldest(strategyName: string): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (key.startsWith(strategyName) && entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }
  
  private async getDiskCache<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const stored = localStorage.getItem(`cache:${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  
  private async setDiskCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache to disk:', error);
    }
  }
  
  private async invalidateDiskCache(pattern: string): Promise<void> {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache:') && key.includes(pattern)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  private startCleanupSchedule(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  private cleanup(): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }
  
  // Analytics and debugging
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      strategies: Object.fromEntries(this.strategies.entries()),
      memoryKeys: Array.from(this.memoryCache.keys())
    };
  }
}

export const cacheService = new IntelligentCacheService();

// React hook for cached queries
export const useCachedQuery = <T>(
  key: string,
  queryFn: () => Promise<T>,
  strategy: string = 'default'
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Try cache first
        const cached = await cacheService.get<T>(key, strategy);
        if (cached) {
          setData(cached);
          setIsLoading(false);
          return;
        }
        
        // Fetch fresh data
        const freshData = await queryFn();
        await cacheService.set(key, freshData, strategy);
        setData(freshData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [key, strategy]);
  
  return { data, isLoading, error };
};
```

### 4. Optimización de Bundle y Lazy Loading Avanzado

```typescript
// src/utils/dynamicImports.ts
interface ModuleManifest {
  [key: string]: {
    path: string;
    dependencies: string[];
    size: number;
    critical: boolean;
  };
}

class AdvancedLazyLoader {
  private moduleManifest: ModuleManifest = {};
  private loadedModules = new Set<string>();
  private loadingPromises = new Map<string, Promise<any>>();
  private preloadQueue = new Set<string>();
  
  constructor() {
    this.initializeManifest();
    this.startPreloadScheduler();
  }
  
  private initializeManifest() {
    // This would be generated at build time
    this.moduleManifest = {
      'dashboard': {
        path: '/chunks/dashboard-[hash].js',
        dependencies: ['charts', 'analytics'],
        size: 45000,
        critical: true
      },
      'reports': {
        path: '/chunks/reports-[hash].js',
        dependencies: ['pdf-generator', 'charts'],
        size: 78000,
        critical: false
      },
      'exam-taking': {
        path: '/chunks/exam-taking-[hash].js',
        dependencies: ['timer', 'offline-storage'],
        size: 52000,
        critical: true
      }
    };
  }
  
  async loadModule<T = any>(moduleName: string): Promise<T> {
    if (this.loadedModules.has(moduleName)) {
      return this.getCachedModule<T>(moduleName);
    }
    
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }
    
    const loadPromise = this.performLoad<T>(moduleName);
    this.loadingPromises.set(moduleName, loadPromise);
    
    try {
      const module = await loadPromise;
      this.loadedModules.add(moduleName);
      this.loadingPromises.delete(moduleName);
      return module;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }
  
  private async performLoad<T>(moduleName: string): Promise<T> {
    const manifest = this.moduleManifest[moduleName];
    if (!manifest) {
      throw new Error(`Module ${moduleName} not found in manifest`);
    }
    
    // Load dependencies first
    await Promise.all(
      manifest.dependencies.map(dep => this.loadModule(dep))
    );
    
    // Load the actual module
    const moduleFactory = await this.importModule(manifest.path);
    return moduleFactory.default || moduleFactory;
  }
  
  private async importModule(path: string): Promise<any> {
    // In a real implementation, this would use the actual chunk paths
    switch (path) {
      case '/chunks/dashboard-[hash].js':
        return import('@/components/Dashboard');
      case '/chunks/reports-[hash].js':
        return import('@/components/Reports');
      case '/chunks/exam-taking-[hash].js':
        return import('@/components/ExamTaking');
      default:
        throw new Error(`Unknown module path: ${path}`);
    }
  }
  
  private getCachedModule<T>(moduleName: string): T {
    // In a real implementation, this would retrieve from module cache
    return {} as T;
  }
  
  preloadModule(moduleName: string): void {
    if (!this.loadedModules.has(moduleName) && !this.loadingPromises.has(moduleName)) {
      this.preloadQueue.add(moduleName);
    }
  }
  
  preloadCriticalModules(): void {
    Object.entries(this.moduleManifest)
      .filter(([_, manifest]) => manifest.critical)
      .forEach(([moduleName]) => this.preloadModule(moduleName));
  }
  
  private startPreloadScheduler(): void {
    // Preload during idle time
    if ('requestIdleCallback' in window) {
      const preloadNext = () => {
        if (this.preloadQueue.size > 0) {
          window.requestIdleCallback(() => {
            const nextModule = this.preloadQueue.values().next().value;
            if (nextModule) {
              this.preloadQueue.delete(nextModule);
              this.loadModule(nextModule).catch(console.error);
            }
            preloadNext();
          });
        }
      };
      preloadNext();
    }
  }
  
  // Route-based preloading
  preloadForRoute(route: string): void {
    const routeModules = this.getModulesForRoute(route);
    routeModules.forEach(module => this.preloadModule(module));
  }
  
  private getModulesForRoute(route: string): string[] {
    const routeMap: Record<string, string[]> = {
      '/dashboard': ['dashboard', 'charts', 'analytics'],
      '/exams': ['exam-management', 'exam-taking'],
      '/reports': ['reports', 'pdf-generator', 'charts'],
      '/users': ['user-management', 'bulk-operations']
    };
    
    return routeMap[route] || [];
  }
}

export const lazyLoader = new AdvancedLazyLoader();

// Enhanced lazy component with preloading
export const lazyWithPreload = <T extends ComponentType<any>>(
  moduleFactory: () => Promise<{ default: T }>,
  moduleName: string,
  preloadTriggers: string[] = []
) => {
  const LazyComponent = lazy(async () => {
    return lazyLoader.loadModule<{ default: T }>(moduleName);
  });
  
  // Setup preload triggers
  preloadTriggers.forEach(trigger => {
    if (trigger === 'hover') {
      // Preload on hover (for navigation items)
      document.addEventListener('mouseover', (e) => {
        const target = e.target as HTMLElement;
        if (target.dataset.preload === moduleName) {
          lazyLoader.preloadModule(moduleName);
        }
      });
    } else if (trigger === 'idle') {
      // Preload during idle time
      lazyLoader.preloadModule(moduleName);
    }
  });
  
  return LazyComponent;
};
```

---

## 10. CONSIDERACIONES FINALES

### Checklist de Implementación

```markdown
## Pre-desarrollo
- [ ] Configurar entorno de desarrollo con todas las herramientas
- [ ] Configurar base de datos con esquema optimizado
- [ ] Implementar CI/CD pipeline
- [ ] Configurar monitoreo y alertas

## Desarrollo - Fase 1 (Core)
- [ ] Sistema de autenticación y autorización
- [ ] Gestión de usuarios y roles
- [ ] CRUD básico de exámenes
- [ ] Sistema de preguntas y respuestas

## Desarrollo - Fase 2 (Avanzado)
- [ ] Pruebas psicométricas OCEAN
- [ ] Sistema de reportes con IA
- [ ] Asignación masiva de exámenes
- [ ] Análisis de detección de simulación

## Desarrollo - Fase 3 (Optimización)
- [ ] Implementar cache inteligente
- [ ] Optimizar performance y lazy loading
- [ ] Implementar testing automatizado
- [ ] Configurar monitoreo avanzado

## Deployment
- [ ] Deploy en staging con datos de prueba
- [ ] Testing E2E completo
- [ ] Performance testing y optimización
- [ ] Deploy en producción
- [ ] Configurar backup y disaster recovery

## Post-deployment
- [ ] Monitoreo de métricas de usuario
- [ ] Recolección de feedback
- [ ] Iteración basada en analytics
- [ ] Documentación para usuarios finales
```

### Métricas de Éxito

```typescript
interface SuccessMetrics {
  performance: {
    firstContentfulPaint: number; // < 1.5s
    largestContentfulPaint: number; // < 2.5s
    firstInputDelay: number; // < 100ms
    cumulativeLayoutShift: number; // < 0.1
  };
  
  reliability: {
    uptime: number; // > 99.9%
    errorRate: number; // < 0.1%
    averageResponseTime: number; // < 200ms
  };
  
  business: {
    userSatisfaction: number; // > 4.5/5
    examCompletionRate: number; // > 90%
    reportGenerationSuccess: number; // > 99%
    timeToFirstValue: number; // < 5 minutes
  };
  
  development: {
    testCoverage: number; // > 80%
    buildTime: number; // < 3 minutes
    deploymentFrequency: number; // > 1/day
    meanTimeToRecovery: number; // < 1 hour
  };
}
```

Este prompt granular proporciona una base sólida para replicar y mejorar sustancialmente el sistema de evaluación psicométrica, con enfoque en performance, escalabilidad, mantenibilidad y experiencia de usuario optimizada.
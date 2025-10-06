# ARCHIVOS PARA REVISIÓN MANUAL - SISTEMA DE REPORTES

## DATOS CONFIRMADOS DEL USUARIO DE PRUEBA

✅ **Usuario**: colaborador.semente@gmail.com (ID: e34e05f8-5454-4ad2-8a32-ef8731afee5d)  
✅ **Examen**: "Prueba corta" (ID: 766d0bba-fea9-47c5-b6ea-581f4653b156)  
✅ **Intento**: ID 29526275-26a5-400a-8722-d6fb4eebd311 (COMPLETADO)  
✅ **Respuestas**: 10 respuestas válidas guardadas  
✅ **Puntuación**: 15/30 puntos calculados  

---

## ARCHIVO 1: UserEvaluationReport.tsx (PANEL DE ADMIN)

**Ubicación**: `src/components/user-evaluation/UserEvaluationReport.tsx`

### Función Principal que Falla:
```typescript
// LÍNEAS 182-243
const generateReport = async (forceRegenerate = false) => {
  if (!selectedEvaluationId) {
    toast.error('Seleccione una evaluación para generar el reporte');
    return;
  }

  try {
    setGeneratingReport(true);
    console.log('=== GENERATE REPORT START ===');
    console.log('Selected evaluation ID:', selectedEvaluationId);
    console.log('Selected evaluation type:', selectedEvaluationType);
    console.log('Force regenerate:', forceRegenerate);

    let functionName = '';
    let bodyParams = {};

    // AQUÍ SE DECIDE QUÉ FUNCIÓN LLAMAR
    if (selectedEvaluationType === 'reliability') {
      functionName = 'generate-new-reliability-report';
      bodyParams = {
        examAttemptId: selectedEvaluationId, // 29526275-26a5-400a-8722-d6fb4eebd311
        includeCharts: true,
        includeAnalysis: true,
        forceRegenerate
      };
    } else {
      functionName = 'generate-ocean-personality-report';
      bodyParams = {
        personalityResultId: selectedEvaluationId,
        includeCharts: true,
        includeAnalysis: true,
        forceRegenerate
      };
    }

    console.log('Function to call:', functionName);
    console.log('Parameters:', JSON.stringify(bodyParams, null, 2));

    // LLAMADA CRÍTICA - AQUÍ PUEDE ESTAR EL PROBLEMA
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: bodyParams
    });

    console.log('Function response:', { data, error });

    if (error) {
      console.error('Error generating report:', error);
      toast.error('Error al generar el reporte: ' + error.message);
      return;
    }

    if (data?.html) {
      setReportHtml(data.html);
      toast.success('Reporte generado exitosamente');
    } else {
      toast.error('No se pudo generar el reporte HTML');
    }
  } catch (error) {
    console.error('Error:', error);
    toast.error('Error al generar el reporte');
  } finally {
    setGeneratingReport(false);
  }
};
```

### Variables de Estado Críticas:
```typescript
// LÍNEAS 56-64
const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>('');
const [selectedEvaluationType, setSelectedEvaluationType] = useState<'reliability' | 'psychometric'>('reliability');
const [reportHtml, setReportHtml] = useState<string>('');
const [generatingReport, setGeneratingReport] = useState(false);
```

---

## ARCHIVO 2: generate-new-reliability-report/index.ts

**Ubicación**: `supabase/functions/generate-new-reliability-report/index.ts`

### Entrada y Validación:
```typescript
// LÍNEAS 23-44
serve(async (req) => {
  console.log('=== GENERATE-NEW-RELIABILITY-REPORT FUNCTION STARTED ===')
  console.log('Request method:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers')
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...')
    const requestBody = await req.json()
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    
    const { examAttemptId, includeCharts = true, includeAnalysis = true, forceRegenerate = false } = requestBody;
    
    // VALIDACIÓN CRÍTICA
    if (!examAttemptId) {
      return new Response(
        JSON.stringify({ error: 'examAttemptId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
```

### Obtención de Datos:
```typescript
// LÍNEAS 52-84
// 1. Obtener datos de la evaluación
const { data: examAttempt, error: attemptError } = await supabase
  .from('exam_attempts')
  .select('*')
  .eq('id', examAttemptId) // 29526275-26a5-400a-8722-d6fb4eebd311
  .single();

if (attemptError || !examAttempt) {
  console.error('Error fetching exam attempt:', attemptError);
  return new Response(
    JSON.stringify({ error: 'No se encontró el intento de examen' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// 1.1. Obtener datos del examen
const { data: examData, error: examError } = await supabase
  .from('exams')
  .select('title, description')
  .eq('id', examAttempt.exam_id) // 766d0bba-fea9-47c5-b6ea-581f4653b156
  .single();

// 1.2. Obtener datos del perfil
const { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .select('full_name, email, company, area, section')
  .eq('id', examAttempt.user_id) // e34e05f8-5454-4ad2-8a32-ef8731afee5d
  .single();
```

### Procesamiento de Datos:
```typescript
// LÍNEAS 320-500 (processReliabilityData)
function processReliabilityData(examAttempt: any) {
  const questions = examAttempt.questions || []; // 10 preguntas
  const rawAnswers = examAttempt.answers ?? []; // 10 respuestas
  
  // Normalizar respuestas a un mapa { [questionId]: answerString }
  const answersMap: Record<string, string> = (() => {
    const map: Record<string, string> = {};
    if (Array.isArray(rawAnswers)) {
      for (let i = 0; i < rawAnswers.length; i++) {
        const a: any = rawAnswers[i];
        const qid = a?.question_id || a?.questionId || a?.id || questions[i]?.id;
        const ans = a?.answer || a?.value || a?.selected_option || a?.selectedAnswer;
        if (qid && typeof ans === 'string') map[qid] = ans;
      }
    } else if (rawAnswers && typeof rawAnswers === 'object') {
      return rawAnswers as Record<string, string>;
    }
    return map;
  })();

  // AQUÍ SE PROCESAN LAS RESPUESTAS Y SE CALCULAN PUNTUACIONES
  console.log('Processing reliability data for', questions.length, 'questions');
  console.log('Answers received (normalized):', Object.keys(answersMap).length, 'answers');
  
  // Resto del procesamiento...
}
```

---

## ARCHIVO 3: Configuración CORS y Variables de Entorno

### CORS Headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Variables de Entorno Requeridas:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!; // https://popufimnleaubvlwyusb.supabase.co
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY'); // Para análisis IA
```

---

## PUNTOS CRÍTICOS PARA REVISAR

### 1. ¿La función está siendo llamada?
```javascript
// En console del navegador, verificar estos logs:
// "=== GENERATE REPORT START ==="
// "Function to call: generate-new-reliability-report"
// "Parameters: {...}"
```

### 2. ¿La Edge Function recibe la petición?
```javascript
// En logs de Supabase, verificar:
// "=== GENERATE-NEW-RELIABILITY-REPORT FUNCTION STARTED ==="
// "Request body: {...}"
```

### 3. ¿Los datos se encuentran correctamente?
```javascript
// Verificar que estos datos existan:
// - examAttemptId: "29526275-26a5-400a-8722-d6fb4eebd311"
// - examAttempt con questions y answers
// - examData con title
// - profileData con full_name
```

### 4. ¿El procesamiento de datos funciona?
```javascript
// Verificar logs de processReliabilityData:
// "Processing reliability data for 10 questions"
// "Answers received (normalized): 10 answers"
```

### 5. ¿La respuesta HTTP es correcta?
```javascript
// Verificar que la respuesta tenga:
// { html: "...", success: true, metadata: {...} }
```

---

## COMANDOS PARA DEPURACIÓN

### 1. Probar Edge Function directamente:
```javascript
// Desde consola del navegador en el admin panel
const result = await supabase.functions.invoke('generate-new-reliability-report', {
  body: {
    examAttemptId: '29526275-26a5-400a-8722-d6fb4eebd311',
    includeCharts: true,
    includeAnalysis: true,
    forceRegenerate: false
  }
});
console.log('Resultado directo:', result);
```

### 2. Verificar datos en base:
```sql
-- Verificar que el attempt existe
SELECT * FROM exam_attempts WHERE id = '29526275-26a5-400a-8722-d6fb4eebd311';

-- Verificar questions y answers
SELECT 
  jsonb_array_length(questions) as num_questions,
  jsonb_array_length(answers) as num_answers,
  questions,
  answers
FROM exam_attempts 
WHERE id = '29526275-26a5-400a-8722-d6fb4eebd311';
```

### 3. Network Requests en DevTools:
- Abrir DevTools → Network
- Filtrar por "invoke"
- Buscar POST a `/functions/v1/generate-new-reliability-report`
- Verificar status code, request payload y response

---

## ESCENARIOS DE ERROR MÁS PROBABLES

### Escenario 1: Error de CORS
**Síntoma**: Error de CORS en console del navegador  
**Solución**: Verificar corsHeaders en edge function  

### Escenario 2: Edge Function no deployada
**Síntoma**: 404 o "Function not found"  
**Solución**: Verificar que la función esté deployada en Supabase  

### Escenario 3: Error en processReliabilityData
**Síntoma**: Error 500, logs muestran problema en procesamiento  
**Solución**: Verificar estructura de questions y answers  

### Escenario 4: Variables de entorno faltantes
**Síntoma**: Error al conectar con Supabase o OpenAI  
**Solución**: Verificar SUPABASE_SERVICE_ROLE_KEY y OPENAI_API_KEY  

### Escenario 5: Timeout
**Síntoma**: Request se queda colgado  
**Solución**: Verificar loops infinitos o llamadas a APIs externa
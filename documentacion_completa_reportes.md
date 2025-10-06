# DOCUMENTACIÓN COMPLETA - SISTEMA DE REPORTES

## ESTADO ACTUAL DEL USUARIO DE PRUEBA

### Usuario: colaborador.semente@gmail.com
- **ID**: e34e05f8-5454-4ad2-8a32-ef8731afee5d
- **Estado**: Usuario válido registrado
- **Empresa**: Plentum
- **Área**: Administración
- **Sección**: RRHH
- **Rol**: student

### Examen: "Prueba corta"
- **ID**: 766d0bba-fea9-47c5-b6ea-581f4653b156
- **Tipo**: confiabilidad 
- **Estado**: activo
- **Duración**: 60 minutos
- **Fecha apertura**: 2025-09-01 06:00:00+00
- **Fecha cierre**: 2025-09-08 06:00:00+00

### Intento de Examen Completado
- **ID**: 29526275-26a5-400a-8722-d6fb4eebd311
- **Estado**: COMPLETADO
- **Fecha inicio**: 2025-09-02 03:49:32.925+00
- **Fecha completado**: 2025-09-02 03:49:32.925+00
- **Preguntas**: 10 preguntas válidas
- **Respuestas**: 10 respuestas válidas

#### Detalles de las Respuestas:
1. **Autocontrol verbal** - "¿Ha discutido en público...?" → Nunca (0 puntos)
2. **Manejo del personal** - "¿Ha omitido reportar fallas...?" → Rara vez (1 punto)
3. **Corrupción pasiva** - "¿Se ha hecho de la vista gorda...?" → A veces (2 puntos)
4. **Autocontrol verbal** - "¿Ha dicho cosas que luego...?" → Frecuentemente (3 puntos)
5. **Personalidad** - "¿Prefiere trabajar solo...?" → A veces (2 puntos)
6. **Corrupción pasiva** - "¿Ha aceptado indirectamente...?" → Rara vez (1 punto)
7. **Personalidad** - "¿Evita enfrentar a otros...?" → Nunca (0 puntos)
8. **Presión social / Ética** - "¿Cree que hay momentos...?" → Rara vez (1 punto)
9. **Manejo del personal** - "¿Ha favorecido a ciertos empleados...?" → A veces (2 puntos)
10. **Presión social / Ética** - "¿Alguna vez ha cambiado su versión...?" → Frecuentemente (3 puntos)

**TOTAL PUNTOS**: 15 puntos de 30 posibles

---

## ANÁLISIS DEL FLUJO DE GENERACIÓN DE REPORTES

### 1. COMPONENTE REACT: UserEvaluationReport.tsx

**Ubicación**: `src/components/user-evaluation/UserEvaluationReport.tsx`

**Función Principal**: `generateReport()`

```typescript
const generateReport = async (forceRegenerate = false) => {
  // Determina qué función llamar basado en el tipo
  if (selectedEvaluationType === 'reliability') {
    functionName = 'generate-new-reliability-report';
    bodyParams = {
      examAttemptId: selectedEvaluationId,
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
  
  // Llamada a Supabase Edge Function
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: bodyParams
  });
}
```

### 2. EDGE FUNCTIONS EN SUPABASE

#### A. generate-new-reliability-report
**Archivo**: `supabase/functions/generate-new-reliability-report/index.ts`
**Parámetros de entrada**:
- `examAttemptId`: ID del intento de examen
- `includeCharts`: boolean (default: true)
- `includeAnalysis`: boolean (default: true) 
- `forceRegenerate`: boolean (default: false)

**Proceso**:
1. Obtiene datos del exam_attempt por ID
2. Obtiene datos relacionados (examen, perfil, preguntas)
3. Procesa datos de categorías con `processReliabilityData()`
4. Genera análisis OpenAI (si está habilitado)
5. Genera HTML con `generateReliabilityReportHTML()`

#### B. generate-ocean-personality-report  
**Archivo**: `supabase/functions/generate-ocean-personality-report/index.ts`
**Parámetros de entrada**:
- `personalityResultId`: ID del resultado de personalidad
- `includeCharts`: boolean (default: true)
- `includeAnalysis`: boolean (default: true)
- `forceRegenerate`: boolean (default: false)

**Proceso**:
1. Obtiene datos del personality_result por ID
2. Obtiene datos relacionados (perfil, respuestas)
3. Procesa datos OCEAN con `processOceanData()`
4. Genera análisis OpenAI (si está habilitado)
5. Genera HTML con `generateOceanReportHTML()`

---

## PROBLEMA IDENTIFICADO

### Error Previo RESUELTO
- **Error anterior**: `SyntaxError: Unexpected reserved word at line 348:33` en `generate-new-reliability-report`
- **Causa**: Caracteres especiales en comentarios
- **Estado**: ✅ CORREGIDO

### Verificación de Logs
- **generate-new-reliability-report**: Sin errores en logs recientes
- **generate-ocean-personality-report**: Sin errores en logs recientes
- **Funciones**: Ambas tienen logging detallado agregado

### Datos del Usuario de Prueba
- ✅ Usuario existe y es válido
- ✅ Examen existe y está activo
- ✅ Intento completado con datos válidos
- ✅ 10 preguntas con respuestas válidas
- ✅ Estructura de datos correcta

---

## ARCHIVOS PARA REVISIÓN MANUAL

### 1. Archivos Frontend
```
src/components/user-evaluation/UserEvaluationReport.tsx
- Líneas 182-243: Función generateReport()
- Líneas 334-341: Selector de evaluación
- Líneas 402-442: Botones de acción
```

### 2. Edge Functions
```
supabase/functions/generate-new-reliability-report/index.ts
- Líneas 23-45: Validación de parámetros
- Líneas 52-84: Obtención de datos
- Líneas 158-281: Procesamiento y análisis IA
- Líneas 284-309: Generación de HTML

supabase/functions/generate-ocean-personality-report/index.ts  
- Líneas 19-31: Validación de parámetros
- Líneas 39-69: Obtención de datos
- Líneas 104-231: Procesamiento y análisis IA
- Líneas 233-257: Generación de HTML
```

### 3. Funciones de Procesamiento
```
generate-new-reliability-report/index.ts:
- Líneas 320-500: processReliabilityData()
- Líneas 580-800: generateOpenAIAnalysis()
- Líneas 900-1110: generateReliabilityReportHTML()

generate-ocean-personality-report/index.ts:
- Líneas 269-400: processOceanData()
- Líneas 457-700: generateOceanOpenAIAnalysis()
- Líneas 800-1098: generateOceanReportHTML()
```

---

## VARIABLES DE ENTORNO REQUERIDAS

```
SUPABASE_URL=https://popufimnleaubvlwyusb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[clave de servicio]
OPENAI_API_KEY=[clave OpenAI para análisis IA]
```

---

## TABLAS DE BASE DE DATOS INVOLUCRADAS

### Principales
- `exam_attempts`: Intentos de examen completados
- `personality_results`: Resultados de evaluaciones OCEAN
- `profiles`: Información de usuarios
- `exams`: Información de exámenes
- `questions`: Banco de preguntas
- `question_categories`: Categorías de preguntas

### Cache y Configuración
- `ai_analysis_cache`: Cache de análisis IA
- `system_config`: Configuración del sistema
- `report_config`: Configuración de reportes

---

## PASOS PARA DEPURACIÓN MANUAL

### 1. Verificar Logs en Tiempo Real
```bash
# Acceder a logs de Supabase Functions
https://supabase.com/dashboard/project/popufimnleaubvlwyusb/functions/generate-new-reliability-report/logs
https://supabase.com/dashboard/project/popufimnleaubvlwyusb/functions/generate-ocean-personality-report/logs
```

### 2. Probar Edge Function Directamente
```javascript
// Desde la consola del navegador
const { data, error } = await supabase.functions.invoke('generate-new-reliability-report', {
  body: {
    examAttemptId: '29526275-26a5-400a-8722-d6fb4eebd311',
    includeCharts: true,
    includeAnalysis: true,
    forceRegenerate: false
  }
});
console.log({ data, error });
```

### 3. Verificar Datos en Consola del Frontend
```javascript
// Los siguientes logs ya están agregados al código:
console.log('=== GENERATE REPORT START ===');
console.log('Selected evaluation ID:', selectedEvaluationId);
console.log('Selected evaluation type:', selectedEvaluationType);
console.log('Function to call:', functionName);
console.log('Parameters:', JSON.stringify(bodyParams, null, 2));
console.log('Function response:', { data, error });
```

### 4. Verificar Network Requests
- Abrir DevTools → Network
- Filtrar por "invoke" o "functions"
- Buscar llamadas a las edge functions
- Verificar status codes y responses

---

## PRÓXIMOS PASOS RECOMENDADOS

1. **Reproducir error**: Intentar generar reporte desde el panel
2. **Capturar logs**: Revisar console.log y network requests
3. **Verificar edge function**: Llamar directamente la función problem
4. **Revisar datos**: Confirmar que examAttemptId existe y es válido
5. **Probar sin IA**: Deshabilitar análisis OpenAI para aislar el problema

---

## CONTACTOS Y RECURSOS

- **Logs Edge Functions**: [Supabase Dashboard](https://supabase.com/dashboard/project/popufimnleaubvlwyusb/functions)
- **Base de datos**: [Supabase SQL Editor](https://supabase.com/dashboard/project/popufimnleaubvlwyusb/sql)
- **Código fuente**: Archivos listados en esta documentación
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { 
      task = "Generar preguntas para un banco de Evaluacion Cognitiva Integral",
      target_count_per_area = 30,
      areas_cognitivas = [
        "Razonamiento Verbal", 
        "Razonamiento Numérico", 
        "Razonamiento Abstracto", 
        "Memoria de Trabajo", 
        "Velocidad de Procesamiento", 
        "Atención Sostenida", 
        "Resolución de Problemas"
      ],
      niveles_dificultad = ["facil", "medio", "dificil"],
      area_especifica = null
    } = await req.json();

    // Definir tipos de preguntas específicos por área
    const tiposPreguntaEspecificos = {
      "Razonamiento Verbal": ["analogías verbales", "comprensión lectora", "sinónimos y antónimos", "completar oraciones"],
      "Razonamiento Numérico": ["series numéricas", "operaciones aritméticas", "problemas matemáticos", "proporciones"],
      "Razonamiento Abstracto": ["matrices de Raven", "series de figuras", "patrones geométricos", "analogías visuales"],
      "Memoria de Trabajo": ["secuencias de dígitos", "secuencias de letras", "matrices de símbolos", "retención espacial"],
      "Velocidad de Procesamiento": ["emparejamiento de símbolos", "detección de diferencias", "cancelación de ítems", "búsqueda visual"],
      "Atención Sostenida": ["seguimiento de estímulos", "detección de señales", "vigilancia continua", "cancelación selectiva"],
      "Resolución de Problemas": ["planificación espacial", "torre de Hanoi", "laberintos", "problemas lógicos"]
    };

    // Crear prompt específico para cada área o todas las áreas
    const areasAGenerar = area_especifica ? [area_especifica] : areas_cognitivas;
    const preguntasGeneradas: any[] = [];

    for (const area of areasAGenerar) {
      const tiposEspecificos = tiposPreguntaEspecificos[area as keyof typeof tiposPreguntaEspecificos] || ["preguntas generales"];
      
      const prompt = `
# GENERADOR DE PREGUNTAS COGNITIVAS - ÁREA: ${area}

## TAREA:
${task}

## ESPECIFICACIONES TÉCNICAS:
- Área Cognitiva: ${area}
- Cantidad objetivo: ${target_count_per_area} preguntas
- Niveles de dificultad: ${niveles_dificultad.join(', ')} (distribuir equitativamente)
- Tipos de pregunta específicos: ${tiposEspecificos.join(', ')}

## FORMATO DE SALIDA JSON REQUERIDO:
Genera un array JSON de preguntas con la siguiente estructura EXACTA:

[
  {
    "area_cognitiva": "${area}",
    "sub_area_tipo": "tipo específico (ej: series numéricas, analogías verbales)",
    "nivel_dificultad": "facil|medio|dificil",
    "texto_instruccion": "Instrucciones específicas para esta pregunta",
    "enunciado_pregunta": "Texto principal de la pregunta",
    "recurso_visual_url_placeholder": "DESCRIPCIÓN DETALLADA de la imagen requerida (si aplica)",
    "tipo_respuesta_interaccion": "seleccion_multiple_texto|seleccion_multiple_imagen|entrada_numerica",
    "opciones_respuesta_json": [
      {
        "id_opcion": "a",
        "texto_opcion": "Opción A",
        "es_correcta": false
      },
      {
        "id_opcion": "b", 
        "texto_opcion": "Opción B",
        "es_correcta": true
      },
      {
        "id_opcion": "c",
        "texto_opcion": "Opción C", 
        "es_correcta": false
      },
      {
        "id_opcion": "d",
        "texto_opcion": "Opción D",
        "es_correcta": false
      }
    ],
    "valor_respuesta_correcta_numerica": null,
    "explicacion_respuesta_interna": "Explicación de por qué esta es la respuesta correcta",
    "tiempo_limite_segundos": null
  }
]

## RESTRICCIONES DE CALIDAD:
1. Las preguntas deben ser originales y no copiadas
2. Cada pregunta debe tener una única respuesta correcta
3. Las opciones incorrectas deben ser plausibles pero claramente erróneas
4. Para preguntas visuales, describir detalladamente el contenido de la imagen requerida
5. Evitar sesgos culturales o de género
6. Usar lenguaje claro y profesional
7. Calibrar dificultad apropiadamente por nivel

## INSTRUCCIONES ESPECÍFICAS PARA ${area}:
${area === 'Razonamiento Verbal' ? `
- Incluir analogías del tipo "A es a B como C es a ?"
- Usar vocabulario apropiado para adultos profesionales
- Incluir preguntas de comprensión de texto breve
- Variar los tipos de relaciones semánticas` : ''}

${area === 'Razonamiento Numérico' ? `
- Incluir series numéricas con patrones claros
- Problemas de proporciones y porcentajes
- Operaciones con números enteros y decimales
- Problemas de lógica matemática básica` : ''}

${area === 'Razonamiento Abstracto' ? `
- Describir detalladamente patrones visuales para imágenes
- Usar progresiones lógicas en formas y símbolos
- Incluir rotaciones, reflexiones y transformaciones
- Especificar claramente los elementos gráficos necesarios` : ''}

${area === 'Memoria de Trabajo' ? `
- Secuencias de 4-8 elementos para recordar
- Combinar retención con procesamiento
- Incluir interferencia controlada
- Especificar tiempos de presentación` : ''}

${area === 'Velocidad de Procesamiento' ? `
- Tareas que requieren respuesta rápida (30-60 segundos)
- Discriminación visual fina
- Emparejamiento de símbolos
- Búsqueda sistemática en arrays` : ''}

${area === 'Atención Sostenida' ? `
- Tareas de vigilancia de 2-5 minutos
- Detección de estímulos objetivo
- Mantener concentración en tareas repetitivas
- Incluir distractores controlados` : ''}

${area === 'Resolución de Problemas' ? `
- Problemas que requieren planificación
- Múltiples pasos para llegar a la solución
- Situaciones que requieren flexibilidad cognitiva
- Escenarios realistas de toma de decisiones` : ''}

Genera exactamente ${Math.ceil(target_count_per_area / areasAGenerar.length)} preguntas para esta área, distribuyendo equitativamente los niveles de dificultad.

RESPONDE ÚNICAMENTE CON EL ARRAY JSON, SIN TEXTO ADICIONAL.
`;

      console.log(`Generando preguntas para área: ${area}`);
      
      // Agregar delay más largo entre llamadas para evitar rate limiting
      if (areasAGenerar.indexOf(area) > 0) {
        console.log('⏳ Esperando 3 segundos para evitar rate limiting...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Eres un experto en psicometría y evaluación cognitiva. Generas preguntas técnicamente precisas para bancos de evaluación profesional. Respondes únicamente con JSON válido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ OpenAI API error: ${response.status} - ${errorText}`);
        
        if (response.status === 429) {
          console.error('🚫 Rate limit exceeded. Deteniendo generación.');
          throw new Error(`Rate limit exceeded. Por favor intenta de nuevo en unos minutos. Status: ${response.status}`);
        }
        
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      console.log(`Respuesta de OpenAI para ${area}:`, content.substring(0, 500));
      
      try {
        // Limpiar respuesta y parsear JSON
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const preguntasArea = JSON.parse(cleanContent);
        
        if (Array.isArray(preguntasArea)) {
          preguntasGeneradas.push(...preguntasArea);
          console.log(`✅ Generadas ${preguntasArea.length} preguntas para ${area}`);
        } else {
          console.error(`❌ Respuesta no es array para ${area}:`, preguntasArea);
        }
      } catch (parseError) {
        console.error(`❌ Error parseando JSON para ${area}:`, parseError);
        console.log('Contenido que falló:', content);
      }

      // Pequeña pausa entre áreas para evitar rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`🎯 Total de preguntas generadas: ${preguntasGeneradas.length}`);

    return new Response(JSON.stringify({
      success: true,
      total_preguntas: preguntasGeneradas.length,
      areas_procesadas: areasAGenerar,
      preguntas: preguntasGeneradas,
      distribucion_por_area: areasAGenerar.reduce((acc: Record<string, number>, area: string) => {
        acc[area] = preguntasGeneradas.filter((p: any) => p.area_cognitiva === area).length;
        return acc;
      }, {} as Record<string, number>)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en generación de preguntas cognitivas:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Error generando preguntas cognitivas con LLM'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Clock, CheckCircle, Brain, ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Pregunta {
  id_pregunta: string;
  area_cognitiva: string;
  sub_area_tipo: string;
  nivel_dificultad: string;
  texto_instruccion?: string;
  enunciado_pregunta?: string;
  recurso_visual_url?: string;
  tipo_respuesta_interaccion: string;
  opciones_respuesta_json: any;
  tiempo_limite_segundos?: number;
}

interface SesionEvaluacion {
  id_sesion: string;
  id_aspirante: string;
  tipo_evaluacion: string;
  fecha_inicio: string;
  estado_sesion: string;
  configuracion_evaluacion?: any;
}

interface EvaluacionCognitivaIntegralProps {
  userRole?: string;
  onComplete?: () => void;
}

const EvaluacionCognitivaIntegral: React.FC<EvaluacionCognitivaIntegralProps> = ({ 
  userRole = 'student',
  onComplete 
}) => {
  const [currentPhase, setCurrentPhase] = useState<'instructions' | 'evaluation' | 'completed'>('instructions');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [respuestas, setRespuestas] = useState<{[key: string]: any}>({});
  const [sesionActual, setSesionActual] = useState<SesionEvaluacion | null>(null);
  const [tiempoRestante, setTiempoRestante] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  // Configuración según especificación: 210 preguntas (30 por cada área cognitiva)
  const distribucionPreguntas = {
    'Razonamiento Verbal': { min: 30, max: 30 },
    'Razonamiento Numérico': { min: 30, max: 30 },
    'Razonamiento Abstracto': { min: 30, max: 30 },
    'Memoria de Trabajo': { min: 30, max: 30 },
    'Velocidad de Procesamiento': { min: 30, max: 30 },
    'Atención Sostenida': { min: 30, max: 30 },
    'Resolución de Problemas': { min: 30, max: 30 }
  };

  // Cargar preguntas para la evaluación
  const cargarPreguntasEvaluacion = useCallback(async () => {
    try {
      setLoading(true);
      
      // Primero verificar si hay preguntas suficientes en la base de datos
      const { data: preguntasDisponibles, error: countError } = await supabase
        .from('preguntas_cognitivas_banco')
        .select('area_cognitiva', { count: 'exact', head: true })
        .eq('estado_validacion', 'aprobada');

      if (countError) {
        console.error('Error verificando preguntas disponibles:', countError);
      }

      // Si no hay preguntas, generar usando el edge function
      if (!preguntasDisponibles || preguntasDisponibles.length === 0) {
        console.log('No hay preguntas disponibles, generando con IA...');
        
        const { data: generationResult, error: genError } = await supabase.functions.invoke('generar-preguntas-cognitivas', {
          body: {
            task: "Generar preguntas para Evaluación Cognitiva Integral",
            target_count_per_area: 30,
            areas_cognitivas: Object.keys(distribucionPreguntas),
            niveles_dificultad: ["facil", "medio", "dificil"]
          }
        });

        if (genError) {
          console.error('Error generando preguntas:', genError);
          toast.error('Error generando preguntas con IA');
          return;
        }

        if (generationResult?.preguntas) {
          // Insertar preguntas generadas en la base de datos
          const { error: insertError } = await supabase
            .from('preguntas_cognitivas_banco')
            .insert(generationResult.preguntas.map((p: any) => ({
              area_cognitiva: p.area_cognitiva,
              sub_area_tipo: p.sub_area_tipo,
              nivel_dificultad: p.nivel_dificultad,
              texto_instruccion: p.texto_instruccion,
              enunciado_pregunta: p.enunciado_pregunta,
              recurso_visual_url: p.recurso_visual_url_placeholder ? null : p.recurso_visual_url,
              tipo_respuesta_interaccion: p.tipo_respuesta_interaccion,
              opciones_respuesta_json: p.opciones_respuesta_json,
              respuesta_correcta_id: p.opciones_respuesta_json.find((opt: any) => opt.es_correcta)?.id_opcion,
              explicacion_respuesta_interna: p.explicacion_respuesta_interna,
              tiempo_limite_segundos: p.tiempo_limite_segundos,
              estado_validacion: 'aprobada' // Auto-aprobar para este caso
            })));

          if (insertError) {
            console.error('Error insertando preguntas:', insertError);
            toast.error('Error guardando preguntas generadas');
            return;
          }

          toast.success(`Generadas ${generationResult.preguntas.length} preguntas con IA`);
        }
      }

      const preguntasSeleccionadas: Pregunta[] = [];
      
      // Seleccionar preguntas de cada área cognitiva según distribución
      for (const [area, config] of Object.entries(distribucionPreguntas)) {
        const cantidadPorArea = config.min; // Usar exactamente 30 preguntas por área
        
        const { data: preguntasArea, error } = await supabase
          .from('preguntas_cognitivas_banco')
          .select('*')
          .eq('area_cognitiva', area)
          .eq('estado_validacion', 'aprobada')
          .order('fecha_creacion', { ascending: false })
          .limit(cantidadPorArea);
        
        if (error) {
          console.error(`Error cargando preguntas de ${area}:`, error);
          continue;
        }
        
        if (preguntasArea && preguntasArea.length > 0) {
          // Aleatorizar y tomar la cantidad necesaria
          const preguntasAleatorizadas = preguntasArea
            .sort(() => 0.5 - Math.random())
            .slice(0, cantidadPorArea);
          
          preguntasSeleccionadas.push(...preguntasAleatorizadas);
        } else {
          console.warn(`No se encontraron preguntas para el área: ${area}`);
        }
      }
      
      // Aleatorizar orden final de todas las preguntas
      const preguntasFinales = preguntasSeleccionadas.sort(() => 0.5 - Math.random());
      
      console.log(`Evaluación preparada con ${preguntasFinales.length} preguntas distribuidas por áreas cognitivas`);
      setPreguntas(preguntasFinales);
      
    } catch (error) {
      console.error('Error preparando evaluación:', error);
      toast.error('Error al preparar la evaluación cognitiva');
    } finally {
      setLoading(false);
    }
  }, [distribucionPreguntas]);

  // Crear sesión de evaluación
  const crearSesionEvaluacion = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: sesion, error } = await supabase
        .from('sesiones_evaluacion_aspirante')
        .insert({
          id_aspirante: user.id,
          tipo_evaluacion: 'Cognitiva',
          estado_sesion: 'iniciada',
          configuracion_evaluacion: {
            total_preguntas: preguntas.length,
            distribucion_areas: distribucionPreguntas,
            fecha_configuracion: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      setSesionActual(sesion);
      return sesion;
      
    } catch (error) {
      console.error('Error creando sesión:', error);
      toast.error('Error al iniciar la evaluación');
      return null;
    }
  }, [preguntas.length, distribucionPreguntas]);

  // Guardar respuesta
  const guardarRespuesta = useCallback(async (respuesta: any) => {
    if (!sesionActual) return;
    
    const pregunta = preguntas[preguntaActual];
    const tiempoRespuesta = Date.now() - startTime;
    
    try {
      await supabase
        .from('respuestas_preguntas_aspirante')
        .insert({
          id_sesion: sesionActual.id_sesion,
          id_pregunta: pregunta.id_pregunta,
          tipo_pregunta_evaluacion: 'Cognitiva',
          id_opcion_seleccionada: respuesta.opcion_id || null,
          respuesta_texto_numerica: respuesta.texto || null,
          tiempo_respuesta_ms: tiempoRespuesta,
          metadata_respuesta: {
            area_cognitiva: pregunta.area_cognitiva,
            sub_area_tipo: pregunta.sub_area_tipo,
            nivel_dificultad: pregunta.nivel_dificultad
          }
        });

      // Actualizar estado local
      setRespuestas(prev => ({
        ...prev,
        [pregunta.id_pregunta]: respuesta
      }));
      
    } catch (error) {
      console.error('Error guardando respuesta:', error);
      toast.error('Error al guardar la respuesta');
    }
  }, [sesionActual, preguntas, preguntaActual, startTime]);

  // Avanzar a siguiente pregunta
  const siguientePregunta = useCallback(async () => {
    if (preguntaActual < preguntas.length - 1) {
      setPreguntaActual(prev => prev + 1);
      setStartTime(Date.now());
    } else {
      // Completar evaluación
      await completarEvaluacion();
    }
  }, [preguntaActual, preguntas.length]);

  // Completar evaluación
  const completarEvaluacion = useCallback(async () => {
    if (!sesionActual) return;
    
    try {
      await supabase
        .from('sesiones_evaluacion_aspirante')
        .update({
          estado_sesion: 'completada',
          fecha_fin: new Date().toISOString(),
          tiempo_total_segundos: Math.floor((Date.now() - new Date(sesionActual.fecha_inicio).getTime()) / 1000)
        })
        .eq('id_sesion', sesionActual.id_sesion);
      
      setCurrentPhase('completed');
      toast.success('Evaluación cognitiva completada exitosamente');
      
      if (onComplete) {
        onComplete();
      }
      
    } catch (error) {
      console.error('Error completando evaluación:', error);
      toast.error('Error al completar la evaluación');
    }
  }, [sesionActual, onComplete]);

  // Iniciar evaluación
  const iniciarEvaluacion = useCallback(async () => {
    await cargarPreguntasEvaluacion();
    const sesion = await crearSesionEvaluacion();
    if (sesion) {
      setCurrentPhase('evaluation');
      setPreguntaActual(0);
      setStartTime(Date.now());
    }
  }, [cargarPreguntasEvaluacion, crearSesionEvaluacion]);

  // Timer para preguntas con tiempo límite
  useEffect(() => {
    if (currentPhase === 'evaluation' && preguntas[preguntaActual]?.tiempo_limite_segundos) {
      setTiempoRestante(preguntas[preguntaActual].tiempo_limite_segundos!);
      
      const interval = setInterval(() => {
        setTiempoRestante(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            // Tiempo agotado, avanzar automáticamente
            siguientePregunta();
            return null;
          }
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [currentPhase, preguntaActual, preguntas, siguientePregunta]);

  // Pantalla de instrucciones
  if (currentPhase === 'instructions') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Brain className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-3xl">Evaluación Cognitiva Integral</CardTitle>
            <CardDescription className="text-lg">
              Evaluación completa de habilidades cognitivas y capacidad intelectual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Instrucciones importantes:</strong>
                 <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Esta evaluación incluye 210 preguntas de diferentes áreas cognitivas (30 por área)</li>
                  <li>Algunas preguntas tienen tiempo límite - un temporizador será visible cuando aplique</li>
                  <li>Responde lo más preciso y honesto posible</li>
                  <li>No podrás volver a preguntas anteriores una vez respondidas</li>
                  <li>La evaluación completa toma aproximadamente 90-120 minutos</li>
                  <li>Asegúrate de estar en un ambiente silencioso y sin distracciones</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Áreas que se evaluarán:</h3>
                <div className="space-y-2">
                  {Object.entries(distribucionPreguntas).map(([area, config]) => (
                    <div key={area} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm font-medium">{area}</span>
                      <Badge variant="outline">{config.min} preguntas</Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Tipos de preguntas:</h3>
                <ul className="text-sm space-y-1">
                  <li>• Analogías verbales y comprensión</li>
                  <li>• Series numéricas y cálculos</li>
                  <li>• Patrones abstractos y matrices</li>
                  <li>• Secuencias de memoria</li>
                  <li>• Tareas de velocidad cronometradas</li>
                  <li>• Ejercicios de atención sostenida</li>
                  <li>• Problemas de lógica y planificación</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <Button 
                onClick={iniciarEvaluacion}
                size="lg"
                disabled={loading}
                className="px-8 py-3"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Preparando evaluación...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Iniciar Evaluación Cognitiva
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de evaluación
  if (currentPhase === 'evaluation' && preguntas.length > 0) {
    const pregunta = preguntas[preguntaActual];
    const progreso = ((preguntaActual + 1) / preguntas.length) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header con progreso */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-4">
                <Badge variant="outline">
                  Pregunta {preguntaActual + 1} de {preguntas.length}
                </Badge>
                <Badge>
                  {pregunta.area_cognitiva}
                </Badge>
                <Badge variant="secondary">
                  {pregunta.nivel_dificultad}
                </Badge>
              </div>
              
              {tiempoRestante && (
                <div className="flex items-center space-x-2 text-orange-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-bold">
                    {Math.floor(tiempoRestante / 60)}:{(tiempoRestante % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
            
            <Progress value={progreso} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {progreso.toFixed(1)}% completado
            </p>
          </CardContent>
        </Card>

        {/* Pregunta actual */}
        <Card>
          <CardHeader>
            {pregunta.texto_instruccion && (
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>Instrucciones:</strong> {pregunta.texto_instruccion}
                </AlertDescription>
              </Alert>
            )}
            <CardTitle className="text-xl">
              {pregunta.enunciado_pregunta}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {pregunta.recurso_visual_url && (
              <div className="mb-6">
                <img 
                  src={pregunta.recurso_visual_url} 
                  alt="Recurso visual de la pregunta"
                  className="max-w-full h-auto mx-auto rounded border"
                />
              </div>
            )}

            {/* Opciones de respuesta */}
            <div className="space-y-3">
              {pregunta.opciones_respuesta_json?.map((opcion: any, index: number) => (
                <Button
                  key={opcion.id_opcion || index}
                  variant="outline"
                  className="w-full text-left justify-start p-4 h-auto"
                  onClick={() => {
                    guardarRespuesta({ opcion_id: opcion.id_opcion, texto: opcion.texto_opcion });
                    siguientePregunta();
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{opcion.texto_opcion}</span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de completado
  if (currentPhase === 'completed') {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex justify-center mb-6">
              <CheckCircle className="h-20 w-20 text-green-500" />
            </div>
            
            <h2 className="text-3xl font-bold mb-4">
              ¡Evaluación Completada!
            </h2>
            
            <p className="text-lg text-muted-foreground mb-6">
              Has completado exitosamente la Evaluación Cognitiva Integral. 
              Tus respuestas han sido registradas y procesadas.
            </p>
            
            <Alert>
              <AlertDescription>
                <strong>Próximos pasos:</strong> Los resultados de tu evaluación cognitiva 
                serán analizados y incluidos en tu reporte psicométrico completo junto con 
                las otras evaluaciones del sistema.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6">
              <Button onClick={() => window.location.reload()}>
                Volver al Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default EvaluacionCognitivaIntegral;
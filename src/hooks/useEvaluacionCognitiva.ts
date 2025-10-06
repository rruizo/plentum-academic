import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PreguntaCognitiva {
  id_pregunta: string;
  area_cognitiva: string;
  sub_area_tipo: string;
  nivel_dificultad: string;
  texto_instruccion?: string;
  enunciado_pregunta?: string;
  recurso_visual_url?: string;
  tipo_respuesta_interaccion: string;
  opciones_respuesta_json: any;
  respuesta_correcta_id?: string;
  valor_respuesta_correcta_numerica?: number;
  tiempo_limite_segundos?: number;
  estado_validacion: string;
}

export interface SesionEvaluacionCognitiva {
  id_sesion: string;
  id_aspirante: string;
  tipo_evaluacion: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado_sesion: string;
  puntuacion_general_cognitiva?: number;
  configuracion_evaluacion?: any;
  tiempo_total_segundos?: number;
}

export interface RespuestaCognitiva {
  id_respuesta_aspirante: string;
  id_sesion: string;
  id_pregunta: string;
  tipo_pregunta_evaluacion: string;
  id_opcion_seleccionada?: string;
  respuesta_texto_numerica?: string;
  tiempo_respuesta_ms: number;
  es_correcta?: boolean;
  puntuacion_obtenida: number;
  metadata_respuesta?: any;
}

export const useEvaluacionCognitiva = () => {
  const [preguntas, setPreguntas] = useState<PreguntaCognitiva[]>([]);
  const [sesionActual, setSesionActual] = useState<SesionEvaluacionCognitiva | null>(null);
  const [respuestas, setRespuestas] = useState<RespuestaCognitiva[]>([]);
  const [loading, setLoading] = useState(false);
  const [sesionesUsuario, setSesionesUsuario] = useState<SesionEvaluacionCognitiva[]>([]);

  // Cargar preguntas por área cognitiva
  const cargarPreguntasPorArea = useCallback(async (areaCognitiva: string, cantidad: number = 20) => {
    try {
      const { data, error } = await supabase
        .from('preguntas_cognitivas_banco')
        .select('*')
        .eq('area_cognitiva', areaCognitiva)
        .eq('estado_validacion', 'aprobada')
        .order('fecha_creacion', { ascending: false })
        .limit(cantidad * 2); // Tomar más para aleatorizar

      if (error) throw error;
      
      // Aleatorizar y tomar la cantidad solicitada
      const preguntasAleatorizadas = (data || [])
        .sort(() => 0.5 - Math.random())
        .slice(0, cantidad);
      
      return preguntasAleatorizadas;
    } catch (error) {
      console.error(`Error cargando preguntas de ${areaCognitiva}:`, error);
      return [];
    }
  }, []);

  // Crear banco de preguntas para evaluación integral
  const crearBancoEvaluacion = useCallback(async () => {
    setLoading(true);
    
    try {
      const distribucion = {
        'Razonamiento Verbal': 18,
        'Razonamiento Numérico': 18,
        'Razonamiento Abstracto': 18,
        'Memoria de Trabajo': 12,
        'Velocidad de Procesamiento': 25,
        'Atención Sostenida': 25,
        'Resolución de Problemas': 8
      };

      const bancoPreguntas: PreguntaCognitiva[] = [];
      
      for (const [area, cantidad] of Object.entries(distribucion)) {
        const preguntasArea = await cargarPreguntasPorArea(area, cantidad);
        bancoPreguntas.push(...preguntasArea);
      }
      
      // Aleatorizar orden final
      const bancoFinal = bancoPreguntas.sort(() => 0.5 - Math.random());
      
      setPreguntas(bancoFinal);
      console.log(`Banco de evaluación creado con ${bancoFinal.length} preguntas`);
      
      return bancoFinal;
    } catch (error) {
      console.error('Error creando banco de evaluación:', error);
      toast.error('Error al preparar la evaluación');
      return [];
    } finally {
      setLoading(false);
    }
  }, [cargarPreguntasPorArea]);

  // Crear nueva sesión de evaluación
  const crearSesion = useCallback(async (tipoEvaluacion: string = 'Cognitiva') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: sesion, error } = await supabase
        .from('sesiones_evaluacion_aspirante')
        .insert({
          id_aspirante: user.id,
          tipo_evaluacion: tipoEvaluacion,
          estado_sesion: 'iniciada',
          configuracion_evaluacion: {
            total_preguntas: preguntas.length,
            fecha_configuracion: new Date().toISOString(),
            distribucion_areas: {
              'Razonamiento Verbal': 18,
              'Razonamiento Numérico': 18,
              'Razonamiento Abstracto': 18,
              'Memoria de Trabajo': 12,
              'Velocidad de Procesamiento': 25,
              'Atención Sostenida': 25,
              'Resolución de Problemas': 8
            }
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
  }, [preguntas.length]);

  // Guardar respuesta
  const guardarRespuesta = useCallback(async (respuesta: Partial<RespuestaCognitiva>) => {
    if (!sesionActual) {
      throw new Error('No hay sesión activa');
    }

    try {
      const { data, error } = await supabase
        .from('respuestas_preguntas_aspirante')
        .insert({
          id_sesion: sesionActual.id_sesion,
          id_pregunta: respuesta.id_pregunta!,
          tipo_pregunta_evaluacion: respuesta.tipo_pregunta_evaluacion || 'Cognitiva',
          id_opcion_seleccionada: respuesta.id_opcion_seleccionada,
          respuesta_texto_numerica: respuesta.respuesta_texto_numerica,
          tiempo_respuesta_ms: respuesta.tiempo_respuesta_ms!,
          metadata_respuesta: respuesta.metadata_respuesta
        })
        .select()
        .single();

      if (error) throw error;
      
      // Actualizar estado local
      setRespuestas(prev => [...prev, data]);
      
      return data;
    } catch (error) {
      console.error('Error guardando respuesta:', error);
      toast.error('Error al guardar respuesta');
      throw error;
    }
  }, [sesionActual]);

  // Completar sesión
  const completarSesion = useCallback(async () => {
    if (!sesionActual) return null;

    try {
      const { data, error } = await supabase
        .from('sesiones_evaluacion_aspirante')
        .update({
          estado_sesion: 'completada',
          fecha_fin: new Date().toISOString(),
          tiempo_total_segundos: Math.floor(
            (Date.now() - new Date(sesionActual.fecha_inicio).getTime()) / 1000
          )
        })
        .eq('id_sesion', sesionActual.id_sesion)
        .select()
        .single();

      if (error) throw error;
      
      setSesionActual(data);
      toast.success('Evaluación completada exitosamente');
      
      return data;
    } catch (error) {
      console.error('Error completando sesión:', error);
      toast.error('Error al completar la evaluación');
      return null;
    }
  }, [sesionActual]);

  // Cargar sesiones del usuario
  const cargarSesionesUsuario = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sesiones_evaluacion_aspirante')
        .select('*')
        .eq('id_aspirante', user.id)
        .eq('tipo_evaluacion', 'Cognitiva')
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;
      
      setSesionesUsuario(data || []);
    } catch (error) {
      console.error('Error cargando sesiones:', error);
    }
  }, []);

  // Obtener estadísticas de la evaluación
  const obtenerEstadisticas = useCallback(async (idSesion: string) => {
    try {
      const { data: respuestas, error } = await supabase
        .from('respuestas_preguntas_aspirante')
        .select(`
          *,
          preguntas:preguntas_cognitivas_banco!respuestas_preguntas_aspirante_id_pregunta_fkey(
            area_cognitiva,
            nivel_dificultad,
            respuesta_correcta_id,
            valor_respuesta_correcta_numerica
          )
        `)
        .eq('id_sesion', idSesion);

      if (error) throw error;
      
      // Calcular estadísticas por área
      const estadisticasPorArea: { [key: string]: any } = {};
      let totalCorrectas = 0;
      let totalPreguntas = respuestas?.length || 0;
      
      respuestas?.forEach(respuesta => {
        const area = respuesta.preguntas?.area_cognitiva;
        if (!area) return;
        
        if (!estadisticasPorArea[area]) {
          estadisticasPorArea[area] = {
            total: 0,
            correctas: 0,
            tiempo_promedio: 0,
            tiempos: []
          };
        }
        
        estadisticasPorArea[area].total++;
        estadisticasPorArea[area].tiempos.push(respuesta.tiempo_respuesta_ms);
        
        // Verificar si es correcta
        const esCorrecta = respuesta.id_opcion_seleccionada === respuesta.preguntas?.respuesta_correcta_id ||
                          (respuesta.respuesta_texto_numerica && 
                           parseFloat(respuesta.respuesta_texto_numerica) === respuesta.preguntas?.valor_respuesta_correcta_numerica);
        
        if (esCorrecta) {
          estadisticasPorArea[area].correctas++;
          totalCorrectas++;
        }
      });
      
      // Calcular tiempos promedio
      Object.values(estadisticasPorArea).forEach((stats: any) => {
        stats.tiempo_promedio = stats.tiempos.reduce((a: number, b: number) => a + b, 0) / stats.tiempos.length;
        stats.porcentaje_acierto = (stats.correctas / stats.total) * 100;
      });
      
      return {
        porcentaje_general: (totalCorrectas / totalPreguntas) * 100,
        total_preguntas: totalPreguntas,
        total_correctas: totalCorrectas,
        estadisticas_por_area: estadisticasPorArea,
        respuestas_detalladas: respuestas
      };
      
    } catch (error) {
      console.error('Error calculando estadísticas:', error);
      return null;
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    cargarSesionesUsuario();
  }, [cargarSesionesUsuario]);

  return {
    // Estados
    preguntas,
    sesionActual,
    respuestas,
    loading,
    sesionesUsuario,
    
    // Acciones
    crearBancoEvaluacion,
    crearSesion,
    guardarRespuesta,
    completarSesion,
    cargarSesionesUsuario,
    cargarPreguntasPorArea,
    obtenerEstadisticas,
    
    // Utilidades
    setPreguntasManual: setPreguntas,
    setSesionActual,
    setRespuestas
  };
};
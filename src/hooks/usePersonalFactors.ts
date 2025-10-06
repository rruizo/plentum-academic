import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PersonalFactorsData {
  estado_civil: 'casado' | 'soltero' | 'divorciado_viudo';
  tiene_hijos: boolean;
  situacion_habitacional: 'casa_propia' | 'rentando' | 'vive_con_familiares';
  edad: number;
}

export const usePersonalFactors = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const savePersonalFactors = async (sessionId: string | null, examId: string | null, data: PersonalFactorsData) => {
    console.log('[usePersonalFactors] Saving personal factors for sessionId:', sessionId, 'examId:', examId, 'data:', data);
    setIsLoading(true);
    try {
      // Calcular el ajuste usando la función de la base de datos
      console.log('[usePersonalFactors] Calculating adjustment...');
      const adjustmentResponse = await supabase
        .rpc('calculate_personal_adjustment', {
          p_estado_civil: data.estado_civil,
          p_tiene_hijos: data.tiene_hijos,
          p_situacion_habitacional: data.situacion_habitacional,
          p_edad: data.edad
        });

      if (adjustmentResponse.error) {
        console.error('[usePersonalFactors] Error calculating adjustment:', adjustmentResponse.error);
        throw adjustmentResponse.error;
      }

      console.log('[usePersonalFactors] Adjustment calculated:', adjustmentResponse.data);

      // Obtener el usuario actual si está autenticado
      const userResponse = await supabase.auth.getUser();
      console.log('[usePersonalFactors] Current user:', userResponse.data.user?.id);

      // Insertar los factores personales - DEBE funcionar tanto para sessionId como examId
      const insertData: any = {
        estado_civil: data.estado_civil,
        tiene_hijos: data.tiene_hijos,
        situacion_habitacional: data.situacion_habitacional,
        edad: data.edad,
        ajuste_total: adjustmentResponse.data,
        user_id: userResponse.data.user?.id || null
      };

      // Solo agregar session_id si existe
      if (sessionId) {
        insertData.session_id = sessionId;
      }
      
      // Solo agregar exam_id si existe
      if (examId) {
        insertData.exam_id = examId;
      }

      console.log('[usePersonalFactors] Inserting personal factors:', insertData);

      const insertResponse = await supabase
        .from('personal_factors')
        .insert(insertData)
        .select()
        .single();

      if (insertResponse.error) {
        console.error('[usePersonalFactors] Error inserting personal factors:', insertResponse.error);
        throw insertResponse.error;
      }

      console.log('[usePersonalFactors] Personal factors saved successfully:', insertResponse.data);
      
      toast({
        title: 'Datos guardados',
        description: 'Sus datos personales han sido registrados correctamente.'
      });

      return {
        personalFactors: insertResponse.data,
        adjustment: adjustmentResponse.data as number
      };
    } catch (error) {
      console.error('[usePersonalFactors] Error saving personal factors:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los datos personales',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getPersonalFactors = async (sessionId: string | null, examId: string | null): Promise<any> => {
    try {
      console.log('[usePersonalFactors] Checking personal factors for sessionId:', sessionId, 'examId:', examId);
      
      let response;
      
      if (sessionId) {
        console.log('[usePersonalFactors] Querying by session_id:', sessionId);
        // @ts-ignore - Avoiding type complexity issues
        response = await supabase
          .from('personal_factors')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data
      } else if (examId) {
        console.log('[usePersonalFactors] Querying by exam_id:', examId);
        // @ts-ignore - Avoiding type complexity issues
        response = await supabase
          .from('personal_factors')
          .select('*')
          .eq('exam_id', examId)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data
      } else {
        console.log('[usePersonalFactors] No sessionId or examId provided');
        return null;
      }

      if (response.error) {
        console.error('[usePersonalFactors] Database error:', response.error);
        throw response.error;
      }
      
      console.log('[usePersonalFactors] Query result:', response.data);
      return response.data;
    } catch (error) {
      console.error('[usePersonalFactors] Error fetching personal factors:', error);
      return null;
    }
  };

  const calculateAdjustment = async (data: PersonalFactorsData): Promise<number> => {
    try {
      const response = await supabase
        .rpc('calculate_personal_adjustment', {
          p_estado_civil: data.estado_civil,
          p_tiene_hijos: data.tiene_hijos,
          p_situacion_habitacional: data.situacion_habitacional,
          p_edad: data.edad
        });

      if (response.error) {
        throw response.error;
      }

      return response.data as number;
    } catch (error) {
      console.error('Error calculating adjustment:', error);
      throw error;
    }
  };

  return {
    savePersonalFactors,
    getPersonalFactors,
    calculateAdjustment,
    isLoading
  };
};
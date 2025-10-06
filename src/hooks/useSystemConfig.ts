
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemConfig {
  id: string;
  system_name: string;
  logo_url?: string;
  favicon_url?: string;
  contact_email?: string;
  support_email?: string;
  primary_color?: string;
  secondary_color?: string;
  footer_text?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_linkedin?: string;
  social_twitter?: string;
  social_youtube?: string;
  resend_from_email?: string;
  resend_from_name?: string;
  openai_model?: string;
  // Configuración granular de OpenAI - Modelos y parámetros
  ocean_modelo?: string;
  ocean_temperatura?: number;
  ocean_max_tokens?: number;
  confiabilidad_analisis_modelo?: string;
  confiabilidad_analisis_temperatura?: number;
  confiabilidad_analisis_max_tokens?: number;
  confiabilidad_conclusiones_modelo?: string;
  confiabilidad_conclusiones_temperatura?: number;
  confiabilidad_conclusiones_max_tokens?: number;
  // Configuración granular de OpenAI - Prompts
  ocean_system_prompt?: string;
  ocean_user_prompt?: string;
  confiabilidad_analisis_system_prompt?: string;
  confiabilidad_analisis_user_prompt?: string;
  confiabilidad_conclusiones_system_prompt?: string;
  confiabilidad_conclusiones_user_prompt?: string;
  created_at: string;
  updated_at: string;
}

export const useSystemConfig = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      console.log('Fetching system config...');
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching system config:', error);
        // For non-critical errors, continue without config
        setConfig(null);
        setError(null); // Don't show error to user
      } else if (!data) {
        // No data found, create default config
        console.log('No config found, creating default...');
        try {
          const defaultConfig = await createDefaultConfig();
          setConfig(defaultConfig);
        } catch (createError: any) {
          console.error('Error creating default config:', createError);
          // Set minimal config to prevent app crash
          setConfig({
            id: 'temp',
            system_name: 'Plentum Verify',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as SystemConfig);
          setError(null);
        }
      } else {
        console.log('Config loaded:', data);
        setConfig(data as SystemConfig);
      }
    } catch (error: any) {
      console.error('Error in fetchConfig:', error);
      // Set minimal config to prevent app crash
      setConfig({
        id: 'temp',
        system_name: 'Plentum Verify',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as SystemConfig);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultConfig = async (): Promise<SystemConfig> => {
    try {
      const defaultData = {
        system_name: 'Plentum Verify',
        logo_url: '/lovable-uploads/688ca52e-d5b7-4cab-b25f-e7f916766599.png',
        favicon_url: '/lovable-uploads/99518379-e871-4367-9216-67ebb6fb5841.png',
        contact_email: 'admin@plentumverify.com',
        support_email: 'soporte@plentumverify.com',
        primary_color: '#1e40af',
        secondary_color: '#3b82f6',
        footer_text: '© 2024 Plentum Verify. Todos los derechos reservados.',
        social_facebook: '',
        social_instagram: '',
        social_linkedin: '',
        social_twitter: '',
        social_youtube: '',
        resend_from_email: 'onboarding@resend.dev',
        resend_from_name: 'Plentum Verify',
        openai_model: 'gpt-4.1-nano',
        // Configuración granular de OpenAI
        ocean_modelo: 'gpt-4.1-2025-04-14',
        ocean_temperatura: 0.7,
        ocean_max_tokens: 2000,
        confiabilidad_analisis_modelo: 'gpt-4.1-2025-04-14',
        confiabilidad_analisis_temperatura: 0.7,
        confiabilidad_analisis_max_tokens: 1500,
        confiabilidad_conclusiones_modelo: 'gpt-4.1-2025-04-14',
        confiabilidad_conclusiones_temperatura: 0.7,
        confiabilidad_conclusiones_max_tokens: 1000,
        // Prompts por defecto
        ocean_system_prompt: 'Eres un experto en psicología organizacional especializado en evaluaciones de personalidad OCEAN (Big Five). Proporciona análisis profesionales y objetivos basados en los datos de personalidad para aplicaciones en desarrollo organizacional y selección de personal.',
        ocean_user_prompt: 'Analiza los siguientes resultados de una evaluación de personalidad OCEAN (Big Five):\n\nCANDIDATO: ${userInfo.name}\nEMAIL: ${userInfo.email}\nPOSICIÓN: ${userInfo.area}\nEMPRESA: ${userInfo.company}\n\nANÁLISIS DE FACTORES:\n${factorAnalysis}\n\nPor favor proporciona:\n1. Un análisis detallado del perfil de personalidad OCEAN\n2. Fortalezas y áreas de desarrollo basadas en el perfil\n3. Recomendaciones para roles y ambientes de trabajo apropiados\n4. Estrategias de gestión y desarrollo personal\n\nResponde en español y de manera profesional, enfocándote en aplicaciones prácticas para el desarrollo laboral.',
        confiabilidad_analisis_system_prompt: 'Eres un experto en análisis de riesgo laboral y evaluación psicométrica. Tu especialidad es interpretar resultados de evaluaciones de confiabilidad y proporcionar análisis detallados y objetivos para la toma de decisiones en recursos humanos.',
        confiabilidad_analisis_user_prompt: 'Analiza los siguientes resultados de una evaluación de confiabilidad laboral:\n\nCANDIDATO: ${examAttempt.profiles?.full_name}\nÁREA: ${examAttempt.profiles?.area}\nEMPRESA: ${examAttempt.profiles?.company}\n\nRESULTADOS POR CATEGORÍA:\n${categoryData.categoryResults}\n\nEVALUACIÓN GENERAL:\n- Riesgo General: ${categoryData.overallRisk}\n- Puntaje Total: ${categoryData.totalScore}/${categoryData.totalQuestions}\n\nProporciona un análisis detallado que incluya:\n1. Interpretación de los resultados por categoría\n2. Identificación de fortalezas y áreas de riesgo\n3. Análisis del perfil de confiabilidad general\n4. Factores de riesgo específicos detectados\n\nResponde de manera profesional y objetiva, enfocándote en la evaluación de riesgo laboral.',
        confiabilidad_conclusiones_system_prompt: 'Eres un consultor especializado en recursos humanos con expertise en evaluaciones de confiabilidad. Tu función es proporcionar conclusiones prácticas y recomendaciones basadas en análisis de riesgo laboral.',
        confiabilidad_conclusiones_user_prompt: 'Basándote en el análisis de confiabilidad realizado:\n\nCANDIDATO: ${examAttempt.profiles?.full_name}\nANÁLISIS PREVIO: ${analysisResult}\n\nRESULTADOS GENERALES:\n- Riesgo General: ${categoryData.overallRisk}\n- Puntaje Total: ${categoryData.totalScore}/${categoryData.totalQuestions}\n\nProporciona conclusiones y recomendaciones que incluyan:\n1. Recomendación final sobre la confiabilidad del candidato\n2. Estrategias de mitigación de riesgos identificados\n3. Recomendaciones para el proceso de selección\n4. Sugerencias de seguimiento o evaluaciones adicionales\n\nMantén un enfoque práctico y orientado a la toma de decisiones en recursos humanos.'
      };

      console.log('Creating default config with:', defaultData);
      
      const { data, error } = await supabase
        .from('system_config')
        .update(defaultData)
        .eq('system_name', 'Plentum Verify')
        .select()
        .maybeSingle();
      
      if (!data) {
        // If no existing config, insert new one
        const { data: newData, error: insertError } = await supabase
          .from('system_config')
          .insert(defaultData)
          .select()
          .single();
        
        if (insertError) {
          // Si es un error de RLS o permisos, ignorar silenciosamente
          if (insertError.code === '42501' || insertError.message?.includes('row-level security')) {
            console.warn('No se pudo crear config por defecto (sin permisos), se usará valores por defecto');
            // Devolver config temporal sin guardar en BD
            return {
              ...defaultData,
              id: 'temp-config',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as SystemConfig;
          }
          console.error('Error creating default config:', insertError);
          throw insertError;
        }
        
        console.log('Default config created:', newData);
        return newData as SystemConfig;
      }
      
      if (error) {
        console.error('Error updating default config:', error);
        throw error;
      }
      
      console.log('Default config updated:', data);
      return data as SystemConfig;
    } catch (error) {
      console.error('Error in createDefaultConfig:', error);
      // No relanzar el error para evitar bloquear la UI
      // Devolver config temporal
      return {
        system_name: 'Plentum Verify',
        logo_url: '/lovable-uploads/688ca52e-d5b7-4cab-b25f-e7f916766599.png',
        favicon_url: '/lovable-uploads/99518379-e871-4367-9216-67ebb6fb5841.png',
        id: 'temp-config',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as SystemConfig;
    }
  };

  const updateConfig = async (updates: Partial<Omit<SystemConfig, 'id' | 'created_at' | 'updated_at'>>) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Updating config with:', updates);
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      let result;
      
      if (config?.id) {
        // Update existing config
        const { data, error } = await supabase
          .from('system_config')
          .update(updateData)
          .eq('id', config.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('system_config')
          .insert(updateData)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      }
      
      console.log('Config updated successfully:', result);
      setConfig(result as SystemConfig);
      
      // Update favicon dynamically
      if (updates.favicon_url) {
        updateFavicon(updates.favicon_url);
      }
      
      return result as SystemConfig;
    } catch (error: any) {
      console.error('Error updating system config:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateFavicon = (faviconUrl: string) => {
    // Remove existing favicon
    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon) {
      existingFavicon.remove();
    }
    
    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = faviconUrl;
    document.head.appendChild(link);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    fetchConfig,
    updateConfig
  };
};

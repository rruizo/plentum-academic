import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReportConfig, Exam } from '@/types/reportTypes';

export const useReportConfiguration = (propExamId?: string) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(propExamId || '');
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [config, setConfig] = useState<ReportConfig>({
    include_sections: {
      personal_info: true,
      category_scores: true,
      risk_analysis: true,
      recommendations: true,
      charts: true,
      detailed_breakdown: true,
      conclusion: true
    },
    font_family: 'Arial',
    font_size: 12,
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    custom_template: null,
    template_name: null
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAvailableExams = async () => {
    try {
      console.log('Fetching available exams...');
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, description')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching exams:', error);
        toast.error('Error al cargar los exámenes disponibles');
        return;
      }

      console.log('Available exams loaded:', data);
      setAvailableExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Error al cargar los exámenes');
    }
  };

  const fetchReportConfig = async () => {
    if (!selectedExamId) return;

    try {
      setLoading(true);
      console.log('Fetching report config for exam:', selectedExamId);
      
      const { data, error } = await supabase
        .from('report_config')
        .select('*')
        .eq('exam_id', selectedExamId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        console.log('Loaded report config:', data);
        
        const includeSections = data.include_sections as Record<string, boolean> | null;
        
        const loadedConfig: ReportConfig = {
          id: data.id,
          exam_id: data.exam_id,
          include_sections: {
            personal_info: includeSections?.personal_info ?? true,
            category_scores: includeSections?.category_scores ?? true,
            risk_analysis: includeSections?.risk_analysis ?? true,
            recommendations: includeSections?.recommendations ?? true,
            charts: includeSections?.charts ?? false,
            detailed_breakdown: includeSections?.detailed_breakdown ?? false,
            conclusion: includeSections?.conclusion ?? true
          },
          font_family: data.font_family || 'Arial',
          font_size: data.font_size || 12,
          header_logo_url: data.header_logo_url || '',
          footer_logo_url: data.footer_logo_url || '',
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          company_phone: data.company_phone || '',
          company_email: data.company_email || '',
          custom_template: (data as any).custom_template || null,
          template_name: (data as any).template_name || null
        };

        setConfig(loadedConfig);
        console.log('Config state updated:', loadedConfig);
      } else {
        console.log('No existing config found, using defaults');
        setConfig(prev => ({
          ...prev,
          id: undefined,
          exam_id: undefined
        }));
      }
    } catch (error) {
      console.error('Error fetching report config:', error);
      toast.error('Error al cargar la configuración del reporte');
    } finally {
      setLoading(false);
    }
  };

  const saveConfigToDatabase = async (showToast = true) => {
    if (!selectedExamId) {
      console.log('No examId provided, cannot save config');
      if (showToast) {
        toast.error('ID de examen requerido para guardar la configuración');
      }
      return null;
    }

    const configData = {
      exam_id: selectedExamId,
      include_sections: config.include_sections,
      font_family: config.font_family,
      font_size: config.font_size,
      header_logo_url: config.header_logo_url || null,
      footer_logo_url: config.footer_logo_url || null,
      company_name: config.company_name || null,
      company_address: config.company_address || null,
      company_phone: config.company_phone || null,
      company_email: config.company_email || null,
      custom_template: config.custom_template || null,
      template_name: config.template_name || null,
      updated_at: new Date().toISOString()
    };

    console.log('Saving config data:', configData);

    let result;
    if (config.id) {
      const { data, error } = await supabase
        .from('report_config')
        .update(configData)
        .eq('id', config.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating config:', error);
        throw error;
      }
      result = data;
      console.log('Config updated successfully:', result);
    } else {
      const { data, error } = await supabase
        .from('report_config')
        .insert(configData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating config:', error);
        throw error;
      }
      result = data;
      console.log('Config created successfully:', result);
    }

    setConfig(prevConfig => ({ ...prevConfig, ...result }));
    
    if (showToast) {
      toast.success('Configuración guardada exitosamente');
    }
    
    return result;
  };

  const handleSaveConfig = async (onSave?: (config: ReportConfig) => void) => {
    try {
      setSaving(true);
      console.log('Starting save config process...');
      const result = await saveConfigToDatabase(true);
      
      if (onSave && result) {
        onSave(result);
      }
      
      console.log('Save config process completed successfully');
    } catch (error) {
      console.error('Error saving report config:', error);
      toast.error('Error al guardar la configuración: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateSectionInclude = (section: keyof typeof config.include_sections, value: boolean) => {
    console.log(`Updating section ${section} to ${value}`);
    setConfig(prev => ({
      ...prev,
      include_sections: {
        ...prev.include_sections,
        [section]: value
      }
    }));
  };

  const updateConfigField = (field: keyof ReportConfig, value: any) => {
    console.log(`Updating field ${field} to:`, value);
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (type: 'header' | 'footer') => async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        if (type === 'header') {
          updateConfigField('header_logo_url', base64String);
        } else {
          updateConfigField('footer_logo_url', base64String);
        }
        toast.success('Logo cargado exitosamente');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al cargar el archivo');
    }
  };

  useEffect(() => {
    fetchAvailableExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchReportConfig();
    }
  }, [selectedExamId]);

  return {
    selectedExamId,
    setSelectedExamId,
    availableExams,
    config,
    loading,
    saving,
    handleSaveConfig,
    updateSectionInclude,
    updateConfigField,
    handleFileUpload
  };
};
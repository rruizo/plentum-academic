import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type PsychometricTest = Tables<'psychometric_tests'>;

export const usePsychometricTestManagement = () => {
  const [tests, setTests] = useState<PsychometricTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('psychometric_tests')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching psychometric tests:', error);
        toast.error('Error al cargar tests psicométricos');
        return;
      }

      setTests(data || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast.error('Error al cargar tests psicométricos');
    } finally {
      setLoading(false);
    }
  };

  const isTestValid = (test: PsychometricTest): boolean => {
    return test.is_active;
  };

  const getTestTypeColor = (type: string): string => {
    switch (type) {
      case 'personality': return 'bg-blue-100 text-blue-800';
      case 'cognitive': return 'bg-green-100 text-green-800';
      case 'leadership': return 'bg-purple-100 text-purple-800';
      case 'stress': return 'bg-orange-100 text-orange-800';
      case 'motivation': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTestTypeLabel = (type: string): string => {
    switch (type) {
      case 'personality': return 'Personalidad';
      case 'cognitive': return 'Cognitivo';
      case 'leadership': return 'Liderazgo';
      case 'stress': return 'Estrés';
      case 'motivation': return 'Motivacional';
      default: return 'General';
    }
  };

  return {
    tests,
    loading,
    fetchTests,
    isTestValid,
    getTestTypeColor,
    getTestTypeLabel
  };
};
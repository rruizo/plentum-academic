
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserAttempts = () => {
  const [userAttempts, setUserAttempts] = useState<any[]>([]);

  const fetchUserAttempts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserAttempts(data || []);
    } catch (error) {
      console.error('Error fetching user attempts:', error);
    }
  };

  useEffect(() => {
    fetchUserAttempts();
  }, []);

  const getAttemptForExam = (examId: string) => {
    return userAttempts.find(attempt => attempt.exam_id === examId);
  };

  return {
    userAttempts,
    fetchUserAttempts,
    getAttemptForExam
  };
};

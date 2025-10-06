
import { useState, useEffect } from 'react';
import ReportPreviewContent from './report/ReportPreviewContent';
import { generateSampleData, generateReportHtml } from '@/utils/reportHtmlGenerator';
import { supabase } from '@/integrations/supabase/client';
import type { ReportConfig, SampleData } from '@/types/reportTypes';

interface ReportPreviewProps {
  examId?: string;
  config: ReportConfig;
}

const ReportPreview = ({ examId, config }: ReportPreviewProps) => {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [realData, setRealData] = useState<SampleData | null>(null);

  // Función para obtener datos reales del examen
  const fetchExamData = async () => {
    if (!examId) {
      console.log('No examId provided, using sample data');
      setRealData(generateSampleData());
      return;
    }

    try {
      console.log('Fetching real exam data for examId:', examId);
      
      // Obtener el último intento de examen completado para este examen
      const { data: examAttempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (attemptError || !examAttempt) {
        console.log('No exam attempt found, using sample data');
        setRealData(generateSampleData());
        return;
      }

      // Obtener información del usuario
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, company, area, section')
        .eq('id', examAttempt.user_id)
        .single();

      // Obtener información del examen
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('title, description')
        .eq('id', examId)
        .single();

      // Obtener factores personales del usuario para el examen
      const { data: personalFactors } = await supabase
        .from('personal_factors')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', examAttempt.user_id)
        .single();

      console.log('Personal factors found:', personalFactors);

      // Procesar los datos para el reporte
      const questions = Array.isArray(examAttempt.questions) ? examAttempt.questions : [];
      const answers = Array.isArray(examAttempt.answers) ? examAttempt.answers : [];
      
      // Extraer puntuaciones por categoría del análisis de riesgo
      const riskAnalysis = typeof examAttempt.risk_analysis === 'object' && examAttempt.risk_analysis !== null 
        ? examAttempt.risk_analysis as any 
        : {};
      const categoryScores = Array.isArray(riskAnalysis.category_analysis) ? riskAnalysis.category_analysis : [];
      
      // Extraer preguntas detalladas
      const detailedQuestions = questions.map((q: any, index: number) => {
        const answer = answers[index] as any;
        return {
          question: q.question_text || q.texto_pregunta || `Pregunta ${index + 1}`,
          answer: answer?.answer || 'No respondida',
          category: q.category_name || 'General'
        };
      }).slice(0, 10); // Limitar a 10 preguntas

      // Obtener el ajuste personal si existe
      const personalAdjustment = personalFactors?.ajuste_total || 0;

      const processedData: SampleData = {
        candidate: {
          name: userProfile?.full_name || 'Candidato Anónimo',
          email: userProfile?.email || 'email@ejemplo.com',
          position: userProfile?.area || 'Posición no especificada',
          date: new Date(examAttempt.completed_at).toLocaleDateString('es-ES')
        },
        scores: categoryScores.map((cat: any) => {
          const baseScore = cat.total_score || cat.score || 0;
          const nationalAvg = cat.national_average || 1.5;
          const adjustedScore = Math.max(0, baseScore + (baseScore * personalAdjustment));
          
          return {
            category: cat.category_name || cat.name,
            score: baseScore,
            totalQuestions: cat.total_questions || 0,
            risk: cat.risk_level || 'RIESGO BAJO',
            nationalAverage: nationalAvg,
            difference: baseScore - nationalAvg,
            adjustedScore: adjustedScore,
            personalAdjustment: personalAdjustment
          };
        }),
        overallRisk: riskAnalysis.overall_risk || 'RIESGO BAJO',
        detailedQuestions
      };

      console.log('Processed real data:', processedData);
      setRealData(processedData);
    } catch (error) {
      console.error('Error fetching exam data:', error);
      setRealData(generateSampleData());
    }
  };

  // Cargar datos reales cuando el componente se monta o cambia el examId
  useEffect(() => {
    fetchExamData();
  }, [examId]);

  const generatePreview = () => {
    setLoading(true);
    
    console.log('Generating preview with config:', config);
    console.log('Using real data:', realData);
    
    const dataToUse = realData || generateSampleData();
    const html = generateReportHtml(config, dataToUse);

    setPreviewHtml(html);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <ReportPreviewContent
        config={config}
        previewHtml={previewHtml}
        loading={loading}
        onGeneratePreview={generatePreview}
      />
    </div>
  );
};

export default ReportPreview;


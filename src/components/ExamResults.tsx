
import { useState, useEffect } from 'react';
import { useExamData } from '@/hooks/useExamData';
import ExamResultsViewer from './ExamResultsViewer';

interface ExamResultsProps {
  examId: string;
  userRole: string;
}

const ExamResults = ({ examId, userRole }: ExamResultsProps) => {
  const { exams } = useExamData();
  const [examTitle, setExamTitle] = useState<string>('');

  useEffect(() => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      setExamTitle(exam.title);
    }
  }, [examId, exams]);

  const handleBack = () => {
    window.history.back();
  };

  return (
    <ExamResultsViewer
      examId={examId}
      examTitle={examTitle}
      userRole={userRole}
      onBack={handleBack}
    />
  );
};

export default ExamResults;

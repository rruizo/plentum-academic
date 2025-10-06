import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ExamData, ExamQuestion } from '@/services/examService';

interface ExamContextType {
  exam: ExamData | null;
  questions: ExamQuestion[];
  examStarted: boolean;
  examCompleted: boolean;
  currentUser: any;
  sessionData: any;
  examType: string;
  setExam: (exam: ExamData | null) => void;
  setQuestions: (questions: ExamQuestion[]) => void;
  setExamStarted: (started: boolean) => void;
  setExamCompleted: (completed: boolean) => void;
  setCurrentUser: (user: any) => void;
  setSessionData: (data: any) => void;
  setExamType: (type: string) => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export const useExamContext = () => {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error('useExamContext must be used within an ExamProvider');
  }
  return context;
};

interface ExamProviderProps {
  children: ReactNode;
}

export const ExamProvider: React.FC<ExamProviderProps> = ({ children }) => {
  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [examType, setExamType] = useState<string>('confiabilidad');

  const contextValue: ExamContextType = {
    exam,
    questions,
    examStarted,
    examCompleted,
    currentUser,
    sessionData,
    examType,
    setExam,
    setQuestions,
    setExamStarted,
    setExamCompleted,
    setCurrentUser,
    setSessionData,
    setExamType,
  };

  return (
    <ExamContext.Provider value={contextValue}>
      {children}
    </ExamContext.Provider>
  );
};
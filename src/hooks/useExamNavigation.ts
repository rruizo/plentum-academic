
import { useState } from 'react';

interface UserAnswer {
  questionId: string;
  answer: 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente';
}

export const useExamNavigation = (totalQuestions: number) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    const newAnswers = [...answers];
    const existingAnswerIndex = newAnswers.findIndex(a => a.questionId === questionId);
    
    if (existingAnswerIndex >= 0) {
      newAnswers[existingAnswerIndex].answer = answer as any;
    } else {
      newAnswers.push({
        questionId: questionId,
        answer: answer as any
      });
    }
    
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const getCurrentAnswer = (questionId: string) => {
    return answers.find(a => a.questionId === questionId)?.answer || '';
  };

  return {
    currentQuestionIndex,
    answers,
    handleAnswerChange,
    handleNextQuestion,
    handlePreviousQuestion,
    getCurrentAnswer
  };
};

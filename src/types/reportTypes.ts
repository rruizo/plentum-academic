export interface ReportConfig {
  id?: string;
  exam_id?: string;
  include_sections: {
    personal_info: boolean;
    category_scores: boolean;
    risk_analysis: boolean;
    recommendations: boolean;
    charts: boolean;
    detailed_breakdown: boolean;
    conclusion: boolean;
  };
  font_family: string;
  font_size: number;
  header_logo_url?: string;
  footer_logo_url?: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  custom_template?: string | null;
  template_name?: string | null;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
}

export interface SampleData {
  candidate: {
    name: string;
    email: string;
    position: string;
    date: string;
  };
  scores: Array<{
    category: string;
    score: number;
    percentage?: number;
    risk: string;
    nationalAverage?: number;
    totalQuestions?: number;
    totalScore?: number;
    difference?: number;
    adjustedScore?: number; // Nuevo campo para puntaje ajustado con factores personales
    personalAdjustment?: number; // Factor de ajuste aplicado
  }>;
  overallRisk: string;
  detailedQuestions: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
}
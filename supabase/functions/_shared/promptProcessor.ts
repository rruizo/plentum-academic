/**
 * Sistema centralizado de procesamiento de prompts para OpenAI
 * Maneja el reemplazo de variables y validación de datos
 */

export interface PromptVariables {
  // Variables para OCEAN
  userInfo?: {
    name?: string;
    email?: string;
    area?: string;
    company?: string;
  };
  factorAnalysis?: string;
  
  // Variables para Confiabilidad
  examAttempt?: {
    profiles?: {
      full_name?: string;
      area?: string;
      company?: string;
    };
  };
  categoryData?: {
    categoryResults?: string;
    overallRisk?: string;
    totalScore?: number;
    totalQuestions?: number;
  };
  analysisResult?: string;
}

export interface ValidationResult {
  isValid: boolean;
  missingVariables: string[];
  errors: string[];
}

/**
 * Reemplaza variables en un prompt usando el formato ${variable}
 */
export function replaceVariables(prompt: string, variables: PromptVariables): string {
  let processedPrompt = prompt;

  // Reemplazar variables de userInfo
  if (variables.userInfo) {
    processedPrompt = processedPrompt.replace(/\$\{userInfo\.name\}/g, variables.userInfo.name || 'No especificado');
    processedPrompt = processedPrompt.replace(/\$\{userInfo\.email\}/g, variables.userInfo.email || 'No especificado');
    processedPrompt = processedPrompt.replace(/\$\{userInfo\.area\}/g, variables.userInfo.area || 'No especificada');
    processedPrompt = processedPrompt.replace(/\$\{userInfo\.company\}/g, variables.userInfo.company || 'No especificada');
  }

  // Reemplazar factorAnalysis
  if (variables.factorAnalysis !== undefined) {
    processedPrompt = processedPrompt.replace(/\$\{factorAnalysis\}/g, variables.factorAnalysis);
  }

  // Reemplazar variables de examAttempt
  if (variables.examAttempt?.profiles) {
    processedPrompt = processedPrompt.replace(/\$\{examAttempt\.profiles\?\.full_name\}/g, variables.examAttempt.profiles.full_name || 'No especificado');
    processedPrompt = processedPrompt.replace(/\$\{examAttempt\.profiles\?\.area\}/g, variables.examAttempt.profiles.area || 'No especificada');
    processedPrompt = processedPrompt.replace(/\$\{examAttempt\.profiles\?\.company\}/g, variables.examAttempt.profiles.company || 'No especificada');
  }

  // Reemplazar variables de categoryData
  if (variables.categoryData) {
    processedPrompt = processedPrompt.replace(/\$\{categoryData\.categoryResults\}/g, variables.categoryData.categoryResults || 'No disponible');
    processedPrompt = processedPrompt.replace(/\$\{categoryData\.overallRisk\}/g, variables.categoryData.overallRisk || 'No calculado');
    processedPrompt = processedPrompt.replace(/\$\{categoryData\.totalScore\}/g, String(variables.categoryData.totalScore || 0));
    processedPrompt = processedPrompt.replace(/\$\{categoryData\.totalQuestions\}/g, String(variables.categoryData.totalQuestions || 0));
  }

  // Reemplazar analysisResult
  if (variables.analysisResult !== undefined) {
    processedPrompt = processedPrompt.replace(/\$\{analysisResult\}/g, variables.analysisResult);
  }

  return processedPrompt;
}

/**
 * Valida que todas las variables requeridas estén presentes para OCEAN
 */
export function validateOceanVariables(variables: PromptVariables): ValidationResult {
  const errors: string[] = [];
  const missingVariables: string[] = [];

  // Validaciones requeridas para OCEAN
  if (!variables.userInfo?.name || variables.userInfo.name.trim() === '') {
    missingVariables.push('userInfo.name');
    errors.push('Nombre del usuario es requerido');
  }

  if (!variables.factorAnalysis || variables.factorAnalysis.trim() === '') {
    missingVariables.push('factorAnalysis');
    errors.push('Análisis de factores es requerido');
  }

  return {
    isValid: errors.length === 0,
    missingVariables,
    errors
  };
}

/**
 * Valida que todas las variables requeridas estén presentes para Confiabilidad
 */
export function validateReliabilityVariables(variables: PromptVariables): ValidationResult {
  const errors: string[] = [];
  const missingVariables: string[] = [];

  // Validaciones requeridas para Confiabilidad
  if (!variables.examAttempt?.profiles?.full_name || variables.examAttempt.profiles.full_name.trim() === '') {
    missingVariables.push('examAttempt.profiles.full_name');
    errors.push('Nombre del candidato es requerido');
  }

  if (!variables.categoryData?.categoryResults || variables.categoryData.categoryResults.trim() === '') {
    missingVariables.push('categoryData.categoryResults');
    errors.push('Resultados por categoría son requeridos');
  }

  if (!variables.categoryData?.overallRisk || variables.categoryData.overallRisk.trim() === '') {
    missingVariables.push('categoryData.overallRisk');
    errors.push('Evaluación de riesgo general es requerida');
  }

  if (variables.categoryData?.totalQuestions === undefined || variables.categoryData.totalQuestions <= 0) {
    missingVariables.push('categoryData.totalQuestions');
    errors.push('Número total de preguntas es requerido');
  }

  return {
    isValid: errors.length === 0,
    missingVariables,
    errors
  };
}

/**
 * Procesa un prompt completo: validación + reemplazo de variables
 */
export function processPrompt(
  prompt: string, 
  variables: PromptVariables, 
  testType: 'ocean' | 'reliability_analysis' | 'reliability_conclusions'
): { processedPrompt: string; validation: ValidationResult } {
  
  let validation: ValidationResult;
  
  // Validar según el tipo de test
  switch (testType) {
    case 'ocean':
      validation = validateOceanVariables(variables);
      break;
    case 'reliability_analysis':
    case 'reliability_conclusions':
      validation = validateReliabilityVariables(variables);
      break;
    default:
      validation = { isValid: true, missingVariables: [], errors: [] };
  }

  // Si la validación falla, retornar el prompt sin procesar
  if (!validation.isValid) {
    return {
      processedPrompt: prompt,
      validation
    };
  }

  // Procesar el prompt con las variables
  const processedPrompt = replaceVariables(prompt, variables);

  return {
    processedPrompt,
    validation
  };
}
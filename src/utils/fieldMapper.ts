export interface FieldMapping {
  placeholder: string;
  expression: string;
  category?: string;
  description: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'html';
  section: string;
}

export interface FieldLocation {
  placeholder: string;
  coordinates?: {
    page: number;
    x: number;
    y: number;
  };
  boundingBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  fontInfo?: {
    size: number;
    family: string;
    weight: string;
  };
}

/**
 * Mapeo completo de campos disponibles para reportes
 */
export const availableFields: FieldMapping[] = [
  // Datos de la empresa
  {
    placeholder: '{{COMPANY_NAME}}',
    expression: "config.system_name || 'Avsec Trust'",
    description: 'Nombre de la empresa',
    dataType: 'string',
    section: 'company'
  },
  {
    placeholder: '{{COMPANY_LOGO}}',
    expression: 'config.logo_url',
    description: 'URL del logo de la empresa',
    dataType: 'string',
    section: 'company'
  },
  {
    placeholder: '{{COMPANY_ADDRESS}}',
    expression: "reportConfig.company_address || 'Dirección no disponible'",
    description: 'Dirección de la empresa',
    dataType: 'string',
    section: 'company'
  },
  {
    placeholder: '{{COMPANY_PHONE}}',
    expression: "reportConfig.company_phone || 'Teléfono no disponible'",
    description: 'Teléfono de la empresa',
    dataType: 'string',
    section: 'company'
  },
  {
    placeholder: '{{COMPANY_EMAIL}}',
    expression: 'config.contact_email || config.support_email',
    description: 'Email de contacto de la empresa',
    dataType: 'string',
    section: 'company'
  },

  // Datos del candidato
  {
    placeholder: '{{CANDIDATE_NAME}}',
    expression: 'profile.full_name',
    description: 'Nombre completo del candidato',
    dataType: 'string',
    section: 'candidate'
  },
  {
    placeholder: '{{CANDIDATE_EMAIL}}',
    expression: 'profile.email',
    description: 'Correo electrónico del candidato',
    dataType: 'string',
    section: 'candidate'
  },
  {
    placeholder: '{{CANDIDATE_COMPANY}}',
    expression: 'profile.company',
    description: 'Empresa del candidato',
    dataType: 'string',
    section: 'candidate'
  },
  {
    placeholder: '{{CANDIDATE_AREA}}',
    expression: 'profile.area',
    description: 'Área de trabajo del candidato',
    dataType: 'string',
    section: 'candidate'
  },
  {
    placeholder: '{{CANDIDATE_SECTION}}',
    expression: 'profile.section',
    description: 'Sección del candidato',
    dataType: 'string',
    section: 'candidate'
  },
  {
    placeholder: '{{EXAM_DATE}}',
    expression: "new Date(attempt.completed_at).toLocaleDateString('es-ES')",
    description: 'Fecha de realización del examen',
    dataType: 'date',
    section: 'candidate'
  },

  // Puntajes generales
  {
    placeholder: '{{OVERALL_SCORE}}',
    expression: 'processedData.overallScore.toFixed(1)',
    description: 'Puntaje general del examen',
    dataType: 'number',
    section: 'scores'
  },
  {
    placeholder: '{{RISK_LEVEL}}',
    expression: 'processedData.overallRiskLevel',
    description: 'Nivel de riesgo general',
    dataType: 'string',
    section: 'scores'
  },
  {
    placeholder: '{{RISK_LEVEL_CLASS}}',
    expression: 'getRiskClass(processedData.overallRiskLevel)',
    description: 'Clase CSS para el nivel de riesgo',
    dataType: 'string',
    section: 'scores'
  },
  {
    placeholder: '{{QUESTIONS_ANSWERED}}',
    expression: 'Object.keys(attempt.answers || {}).length',
    description: 'Número de preguntas respondidas',
    dataType: 'number',
    section: 'scores'
  },

  // Factores personales
  {
    placeholder: '{{MARITAL_STATUS}}',
    expression: "personalFactors.estado_civil || 'No especificado'",
    description: 'Estado civil del candidato',
    dataType: 'string',
    section: 'personal'
  },
  {
    placeholder: '{{HAS_CHILDREN}}',
    expression: "personalFactors.tiene_hijos ? 'Sí' : 'No'",
    description: 'Si tiene hijos',
    dataType: 'boolean',
    section: 'personal'
  },
  {
    placeholder: '{{HOUSING_STATUS}}',
    expression: "personalFactors.situacion_habitacional || 'No especificado'",
    description: 'Situación habitacional',
    dataType: 'string',
    section: 'personal'
  },
  {
    placeholder: '{{AGE}}',
    expression: "personalFactors.edad || 'No especificado'",
    description: 'Edad del candidato',
    dataType: 'number',
    section: 'personal'
  },
  {
    placeholder: '{{PERSONAL_ADJUSTMENT}}',
    expression: '(personalFactors.ajuste_total * 100).toFixed(1)',
    description: 'Ajuste personal (porcentaje)',
    dataType: 'number',
    section: 'personal'
  },

  // Análisis de IA
  {
    placeholder: '{{AI_DETAILED_ANALYSIS}}',
    expression: "aiAnalysis.analysis || 'Análisis no disponible'",
    description: 'Análisis detallado por IA',
    dataType: 'html',
    section: 'ai'
  },
  {
    placeholder: '{{AI_CONCLUSIONS}}',
    expression: "aiAnalysis.conclusions || 'Conclusiones no disponibles'",
    description: 'Conclusiones del análisis de IA',
    dataType: 'html',
    section: 'ai'
  },

  // Metadatos
  {
    placeholder: '{{GENERATION_DATE}}',
    expression: "new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })",
    description: 'Fecha de generación del reporte',
    dataType: 'date',
    section: 'metadata'
  },
  {
    placeholder: '{{COMPARISON_CHART}}',
    expression: "chartSvg || '[Gráfico no disponible]'",
    description: 'Gráfico de comparación SVG',
    dataType: 'html',
    section: 'charts'
  }
];

/**
 * Buscar campos por categoría o sección
 */
export function getFieldsBySection(section: string): FieldMapping[] {
  return availableFields.filter(field => field.section === section);
}

/**
 * Buscar campos por tipo de dato
 */
export function getFieldsByDataType(dataType: string): FieldMapping[] {
  return availableFields.filter(field => field.dataType === dataType);
}

/**
 * Buscar campo por placeholder
 */
export function getFieldByPlaceholder(placeholder: string): FieldMapping | undefined {
  return availableFields.find(field => field.placeholder === placeholder);
}

/**
 * Obtener todas las categorías dinámicas disponibles
 */
export function getDynamicCategoryFields(): FieldMapping[] {
  const categories = ['honestidad', 'sustancias', 'antisocial', 'agresion', 'seguridad', 'confiabilidad', 'robo', 'conducta', 'estres'];
  const fields: FieldMapping[] = [];

  categories.forEach(category => {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    
    fields.push(
      {
        placeholder: `{{${category.toUpperCase()}_SCORE}}`,
        expression: `processedData.categoryScores['${getCategoryDisplayName(category)}']?.average?.toFixed(1) || '0'`,
        category,
        description: `Puntaje de ${categoryName}`,
        dataType: 'number',
        section: 'category_scores'
      },
      {
        placeholder: `{{${category.toUpperCase()}_NATIONAL}}`,
        expression: `processedData.categoryScores['${getCategoryDisplayName(category)}']?.nationalAverage || '2.0'`,
        category,
        description: `Media nacional de ${categoryName}`,
        dataType: 'number',
        section: 'category_scores'
      },
      {
        placeholder: `{{${category.toUpperCase()}_PERCENTILE}}`,
        expression: `processedData.categoryScores['${getCategoryDisplayName(category)}']?.percentile || '50'`,
        category,
        description: `Percentil de ${categoryName}`,
        dataType: 'number',
        section: 'category_scores'
      },
      {
        placeholder: `{{${category.toUpperCase()}_RISK}}`,
        expression: `processedData.categoryScores['${getCategoryDisplayName(category)}']?.riskLevel || 'MEDIO'`,
        category,
        description: `Nivel de riesgo de ${categoryName}`,
        dataType: 'string',
        section: 'category_scores'
      },
      {
        placeholder: `{{${category.toUpperCase()}_RISK_CLASS}}`,
        expression: `getRiskClass(processedData.categoryScores['${getCategoryDisplayName(category)}']?.riskLevel)`,
        category,
        description: `Clase CSS para riesgo de ${categoryName}`,
        dataType: 'string',
        section: 'category_scores'
      }
    );
  });

  return fields;
}

/**
 * Mapear nombre de categoría a nombre de visualización
 */
function getCategoryDisplayName(category: string): string {
  const mapping: Record<string, string> = {
    'honestidad': 'Honestidad e Integridad',
    'sustancias': 'Consumo de Sustancias',
    'antisocial': 'Comportamiento Antisocial',
    'agresion': 'Agresión y Violencia',
    'seguridad': 'Seguridad en el Trabajo',
    'confiabilidad': 'Confiabilidad Laboral',
    'robo': 'Robo de Inventario',
    'conducta': 'Problemas de Conducta',
    'estres': 'Estrés Laboral'
  };
  
  return mapping[category] || category;
}

/**
 * Analizar template HTML y encontrar posiciones de placeholders
 */
export function analyzeTemplateFields(htmlTemplate: string): FieldLocation[] {
  const locations: FieldLocation[] = [];
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = placeholderRegex.exec(htmlTemplate)) !== null) {
    const placeholder = match[0];
    const fieldInfo = getFieldByPlaceholder(placeholder);
    
    if (fieldInfo) {
      locations.push({
        placeholder,
        // En un futuro se pueden agregar coordenadas reales mediante parsing del HTML
        coordinates: {
          page: 1,
          x: 0,
          y: 0
        }
      });
    }
  }

  return locations;
}

/**
 * Validar que todos los placeholders en el template sean válidos
 */
export function validateTemplate(htmlTemplate: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validPlaceholders: string[];
  invalidPlaceholders: string[];
} {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const matches = [...htmlTemplate.matchAll(placeholderRegex)];
  
  const validPlaceholders: string[] = [];
  const invalidPlaceholders: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Obtener todos los placeholders válidos (incluye dinámicos)
  const allValidFields = [...availableFields, ...getDynamicCategoryFields()];
  const validPlaceholderSet = new Set(allValidFields.map(f => f.placeholder));

  matches.forEach(match => {
    const placeholder = match[0];
    
    if (validPlaceholderSet.has(placeholder)) {
      validPlaceholders.push(placeholder);
    } else {
      invalidPlaceholders.push(placeholder);
      errors.push(`Placeholder inválido: ${placeholder}`);
    }
  });

  // Advertencias adicionales
  if (validPlaceholders.length === 0) {
    warnings.push('El template no contiene placeholders válidos');
  }

  if (invalidPlaceholders.length > 0) {
    warnings.push(`Se encontraron ${invalidPlaceholders.length} placeholders inválidos`);
  }

  return {
    isValid: invalidPlaceholders.length === 0,
    errors,
    warnings,
    validPlaceholders,
    invalidPlaceholders
  };
}
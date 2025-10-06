import { ReportConfig, SampleData } from '@/types/reportTypes';

// Importar el mapeo de campos desde el archivo JSON
import fieldMapping from '../../templates/field-mapping.json';

interface ProcessorContext {
  profile: any;
  examAttempt: any;
  exam: any;
  processedData: any;
  personalFactors: any;
  aiAnalysis: any;
  reportConfig: ReportConfig;
  config: any;
}

export class TemplateProcessor {
  private context: ProcessorContext;
  private fieldMapping: any;

  constructor(context: ProcessorContext) {
    this.context = context;
    this.fieldMapping = fieldMapping;
  }

  /**
   * Procesa un template de confiabilidad reemplazando los placeholders
   */
  processReliabilityTemplate(template: string): string {
    let processedTemplate = template;
    const mapping = this.fieldMapping.reliability_report_mapping;

    // Procesar datos de la empresa
    processedTemplate = this.processSection(processedTemplate, mapping.company_data);
    
    // Procesar datos del candidato
    processedTemplate = this.processSection(processedTemplate, mapping.candidate_data);
    
    // Procesar puntajes generales
    processedTemplate = this.processSection(processedTemplate, mapping.overall_scores);
    
    // Procesar puntajes por categoría
    processedTemplate = this.processCategoryScores(processedTemplate, mapping.category_scores);
    
    // Procesar factores personales
    processedTemplate = this.processSection(processedTemplate, mapping.personal_factors);
    
    // Procesar análisis de IA
    processedTemplate = this.processSection(processedTemplate, mapping.ai_analysis);
    
    // Procesar metadatos
    processedTemplate = this.processSection(processedTemplate, mapping.metadata);

    return processedTemplate;
  }

  /**
   * Procesa un template de OCEAN reemplazando los placeholders
   */
  processOceanTemplate(template: string): string {
    let processedTemplate = template;
    const mapping = this.fieldMapping.ocean_report_mapping;

    // Procesar datos de la empresa
    processedTemplate = this.processSection(processedTemplate, mapping.company_data);
    
    // Procesar datos del candidato
    processedTemplate = this.processSection(processedTemplate, mapping.candidate_data);
    
    // Procesar dimensiones OCEAN
    processedTemplate = this.processSection(processedTemplate, mapping.ocean_dimensions.openness);
    processedTemplate = this.processSection(processedTemplate, mapping.ocean_dimensions.conscientiousness);
    processedTemplate = this.processSection(processedTemplate, mapping.ocean_dimensions.extraversion);
    processedTemplate = this.processSection(processedTemplate, mapping.ocean_dimensions.agreeableness);
    processedTemplate = this.processSection(processedTemplate, mapping.ocean_dimensions.neuroticism);
    
    // Procesar motivaciones
    processedTemplate = this.processSection(processedTemplate, mapping.motivations);
    
    // Procesar factores personales
    processedTemplate = this.processSection(processedTemplate, mapping.personal_factors);
    
    // Procesar análisis de IA
    processedTemplate = this.processSection(processedTemplate, mapping.ai_analysis);
    
    // Procesar recomendaciones de perfil
    processedTemplate = this.processSection(processedTemplate, mapping.profile_recommendations);
    
    // Procesar metadatos
    processedTemplate = this.processSection(processedTemplate, mapping.metadata);

    return processedTemplate;
  }

  /**
   * Procesa una sección del mapeo reemplazando placeholders
   */
  private processSection(template: string, sectionMapping: any): string {
    let processedTemplate = template;

    for (const [placeholder, expression] of Object.entries(sectionMapping)) {
      if (typeof expression === 'string') {
        const value = this.evaluateExpression(expression as string);
        processedTemplate = processedTemplate.replace(
          new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
          value
        );
      }
    }

    return processedTemplate;
  }

  /**
   * Procesa los puntajes por categoría dinámicamente
   */
  private processCategoryScores(template: string, categoryMapping: any): string {
    let processedTemplate = template;

    // Procesar cada categoría disponible en los datos
    if (this.context.processedData?.categoryScores) {
      this.context.processedData.categoryScores.forEach((categoryData: any) => {
        const categoryName = categoryData.category.toLowerCase().replace(/\s+/g, '_');
        
        // Buscar mapeo para esta categoría
        const categoryKey = this.findCategoryKey(categoryName, categoryMapping);
        
        if (categoryKey && categoryMapping[categoryKey]) {
          const categoryPlaceholders = categoryMapping[categoryKey];
          
          for (const [placeholder, expression] of Object.entries(categoryPlaceholders)) {
            if (typeof expression === 'string') {
              const value = this.evaluateExpression(expression as string, categoryData);
              processedTemplate = processedTemplate.replace(
                new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
                value
              );
            }
          }
        }
      });
    }

    return processedTemplate;
  }

  /**
   * Encuentra la clave de categoría correspondiente en el mapeo
   */
  private findCategoryKey(categoryName: string, categoryMapping: any): string | null {
    const normalizedName = categoryName.toLowerCase();
    
    // Mapeo de nombres comunes
    const nameMap: Record<string, string> = {
      'honestidad_e_integridad': 'honestidad',
      'honestidad': 'honestidad',
      'consumo_de_sustancias': 'sustancias',
      'sustancias': 'sustancias',
      'comportamiento_antisocial': 'antisocial',
      'antisocial': 'antisocial',
      'agresión_y_violencia': 'agresion',
      'agresion': 'agresion',
      'seguridad_en_el_trabajo': 'seguridad',
      'seguridad': 'seguridad',
      'confiabilidad_laboral': 'confiabilidad',
      'confiabilidad': 'confiabilidad',
      'robo_de_inventario': 'robo',
      'robo': 'robo',
      'problemas_de_conducta': 'conducta',
      'conducta': 'conducta',
      'estrés_laboral': 'estres',
      'estres': 'estres'
    };

    return nameMap[normalizedName] || null;
  }

  /**
   * Evalúa una expresión del mapeo y devuelve el valor correspondiente
   */
  private evaluateExpression(expression: string, categoryData?: any): string {
    try {
      // Crear un contexto seguro para evaluación
      const safeContext = {
        // Datos del perfil
        profile: this.context.profile,
        
        // Datos del intento de examen
        attempt: this.context.examAttempt,
        
        // Datos del examen
        exam: this.context.exam,
        
        // Datos procesados
        processedData: this.context.processedData,
        
        // Factores personales
        personalFactors: this.context.personalFactors,
        
        // Análisis de IA
        aiAnalysis: this.context.aiAnalysis,
        
        // Configuración del reporte
        reportConfig: this.context.reportConfig,
        
        // Configuración del sistema
        config: this.context.config,
        
        // Datos de categoría específica (si aplica)
        categoryData: categoryData,
        
        // Funciones helper
        getRiskClass: this.getRiskClass,
        getOceanLevel: this.getOceanLevel,
        getOceanLevelClass: this.getOceanLevelClass,
        getMotivationLevel: this.getMotivationLevel,
        calculatePercentile: this.calculatePercentile,
        getOceanInterpretation: this.getOceanInterpretation,
        
        // Objetos globales seguros
        Date: Date,
        Math: Math
      };

      // Evaluación segura de la expresión
      const func = new Function('context', `
        with (context) {
          try {
            return ${expression};
          } catch (error) {
            console.warn('Error evaluating expression:', error);
            return 'N/A';
          }
        }
      `);

      const result = func(safeContext);
      return result !== null && result !== undefined ? String(result) : 'N/A';

    } catch (error) {
      console.warn('Error evaluating expression:', expression, error);
      return 'N/A';
    }
  }

  /**
   * Genera gráfico de comparación dinámico
   */
  generateComparisonChart(): string {
    if (!this.context.processedData?.categoryScores) {
      return '<p>No hay datos disponibles para generar el gráfico</p>';
    }

    const categories = this.context.processedData.categoryScores;
    const svgHeight = Math.max(400, categories.length * 60 + 100);

    let chartSvg = `
      <svg width="800" height="${svgHeight}" style="background: white; border: 1px solid #ccc;">
        <defs>
          <pattern id="gridPattern" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="800" height="${svgHeight}" fill="url(#gridPattern)"/>
        <g transform="translate(150, 50)">
    `;

    categories.forEach((category: any, index: number) => {
      const y = index * 50;
      const score = category.score || 0;
      const nationalAverage = category.nationalAverage || 1.5;
      const barWidth = Math.max(1, (score / 3) * 400);
      const avgLineX = Math.max(1, (nationalAverage / 3) * 400);

      chartSvg += `
        <text x="-10" y="${y + 15}" text-anchor="end" style="font-size: 12px; fill: #333;">
          ${category.category}
        </text>
        <rect x="0" y="${y}" width="${barWidth}" height="25" fill="#3b82f6" opacity="0.8"/>
        <text x="${barWidth + 10}" y="${y + 17}" style="font-size: 11px; fill: #333;">
          ${score.toFixed(2)}
        </text>
        <line x1="${avgLineX}" y1="${y - 5}" x2="${avgLineX}" y2="${y + 30}" stroke="red" stroke-width="2"/>
        <text x="${avgLineX + 5}" y="${y - 8}" style="font-size: 10px; fill: red; font-weight: bold;">
          ${nationalAverage.toFixed(2)}
        </text>
      `;
    });

    chartSvg += `
        </g>
        <!-- Legend -->
        <g transform="translate(550, 50)">
          <rect x="0" y="0" width="200" height="100" fill="white" stroke="#ccc"/>
          <text x="100" y="20" text-anchor="middle" style="font-size: 14px; font-weight: bold;">Leyenda</text>
          <rect x="20" y="35" width="15" height="15" fill="#3b82f6" opacity="0.8"/>
          <text x="45" y="47" style="font-size: 12px;">Puntaje Usuario</text>
          <line x1="20" y1="65" x2="35" y2="65" stroke="red" stroke-width="2"/>
          <text x="45" y="69" style="font-size: 12px;">Media Nacional</text>
        </g>
      </svg>
    `;

    return chartSvg;
  }

  // Funciones helper implementadas según el mapeo JSON
  private getRiskClass(riskLevel: string): string {
    switch (riskLevel) {
      case 'RIESGO ALTO': return 'risk-high';
      case 'RIESGO MEDIO': return 'risk-medium';
      case 'RIESGO BAJO': return 'risk-low';
      default: return 'risk-medium';
    }
  }

  private getOceanLevel(score: number): string {
    if (score >= 3.5) return 'Alto';
    if (score >= 2.5) return 'Medio';
    return 'Bajo';
  }

  private getOceanLevelClass(score: number): string {
    if (score >= 3.5) return 'high-score';
    if (score >= 2.5) return 'medium-score';
    return 'low-score';
  }

  private getMotivationLevel(score: number): string {
    if (score >= 3.5) return 'Alta';
    if (score >= 2.5) return 'Media';
    return 'Baja';
  }

  private calculatePercentile(score: number, dimension: string): number {
    const normalized = (score / 5) * 100;
    return Math.round(Math.min(100, Math.max(0, normalized)));
  }

  private getOceanInterpretation(dimension: string, score: number): string {
    // Implementación básica de interpretaciones OCEAN
    const level = this.getOceanLevel(score);
    
    const interpretations: Record<string, Record<string, string>> = {
      'openness': {
        'Alto': 'Persona creativa, imaginativa y abierta a nuevas experiencias.',
        'Medio': 'Equilibrio entre apertura y practicidad.',
        'Bajo': 'Persona práctica y enfocada en lo convencional.'
      },
      'conscientiousness': {
        'Alto': 'Muy organizado, responsable y orientado al logro.',
        'Medio': 'Moderadamente organizado y responsable.',
        'Bajo': 'Más flexible, menos estructurado en su enfoque.'
      },
      'extraversion': {
        'Alto': 'Persona sociable, enérgica y asertiva.',
        'Medio': 'Equilibrio entre sociabilidad e introspección.',
        'Bajo': 'Persona reservada y reflexiva.'
      },
      'agreeableness': {
        'Alto': 'Muy cooperativo, empático y considerado.',
        'Medio': 'Equilibrio entre cooperación e independencia.',
        'Bajo': 'Más competitivo y directo en sus relaciones.'
      },
      'neuroticism': {
        'Alto': 'Puede experimentar estrés y emociones negativas con frecuencia.',
        'Medio': 'Estabilidad emocional moderada.',
        'Bajo': 'Muy estable emocionalmente y resiliente.'
      }
    };

    return interpretations[dimension]?.[level] || 'Interpretación no disponible';
  }
}

/**
 * Función helper para procesar templates desde edge functions
 */
export function processTemplate(
  template: string,
  templateType: 'reliability' | 'ocean',
  context: ProcessorContext
): string {
  const processor = new TemplateProcessor(context);
  
  if (templateType === 'reliability') {
    return processor.processReliabilityTemplate(template);
  } else if (templateType === 'ocean') {
    return processor.processOceanTemplate(template);
  }
  
  return template;
}
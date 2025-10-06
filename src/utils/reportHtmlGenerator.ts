import { ReportConfig, SampleData } from '@/types/reportTypes';

export const generateSampleData = (): SampleData => ({
  candidate: {
    name: "Candidato Ejemplo",
    email: "ejemplo@empresa.com", 
    position: "Analista",
    date: new Date().toLocaleDateString('es-ES')
  },
  scores: [
    { category: "Acoso sexual", score: 0.00, totalQuestions: 2, risk: "RIESGO BAJO", nationalAverage: 1.5, difference: -1.50, adjustedScore: 0.00, personalAdjustment: 0.00 },
    { category: "Conflicto de intereses", score: 0.00, totalQuestions: 5, risk: "RIESGO BAJO", nationalAverage: 1.90, difference: -1.90, adjustedScore: 0.00, personalAdjustment: 0.00 },
    { category: "Cohecho", score: 0.00, totalQuestions: 2, risk: "RIESGO BAJO", nationalAverage: 1.00, difference: -1.00, adjustedScore: 0.00, personalAdjustment: 0.00 }
  ],
  overallRisk: "RIESGO BAJO",
  detailedQuestions: [
    { question: "¿Con qué frecuencia considera aceptable recibir regalos de proveedores?", answer: "Nunca", category: "Cohecho" },
    { question: "¿Consideraría usar información confidencial para beneficio personal?", answer: "Nunca", category: "Conflicto de intereses" }
  ]
});

export const generateChartSVG = (config: ReportConfig, sampleData: SampleData, nationalAverages?: any): string => {
  if (!sampleData.scores || sampleData.scores.length === 0) {
    return `<p style="text-align: center; color: #666; margin: 20px 0;">No hay datos de puntuación disponibles para generar el gráfico.</p>`;
  }

  return `
    <div style="width: 100%; margin: 20px 0; page-break-inside: avoid;">
      <h3 style="font-size: ${config.font_size + 2}pt; color: #3b82f6; margin: 15px 0; font-weight: bold;">Gráfico de Resultados</h3>
      
      <h4 style="font-size: ${config.font_size}pt; color: #333; margin: 10px 0; font-weight: bold;">Análisis de Confianza por Categoría</h4>
      <p style="font-size: ${Math.max(config.font_size - 1, 8)}pt; color: #666; margin: 5px 0;">Comparativa del Promedio de Respuestas del Candidato vs. Media del Público</p>
      
      <svg width="800" height="400" style="border: 1px solid #ccc; background: white;">
        <defs>
          <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="800" height="400" fill="url(#grid)"/>
        
        <!-- Chart area -->
        <g transform="translate(150, 30)">
          <!-- Y-axis -->
          <line x1="0" y1="0" x2="0" y2="${sampleData.scores.length * 100 + 20}" stroke="#333" stroke-width="2"/>
          
          <!-- Y-axis label -->
          <text x="-80" y="${(sampleData.scores.length * 100) / 2}" text-anchor="middle" style="font-size: 12px; font-weight: bold;" transform="rotate(-90, -80, ${(sampleData.scores.length * 100) / 2})">Categorías</text>
          
          ${sampleData.scores.map((score, index) => {
            const y = index * 100 + 20;
            const barWidth = Math.max(1, (score.score / 3) * 500); // Normalizar a escala 0-3
            const nationalLineX = Math.max(1, (score.nationalAverage / 3) * 500);
            
            return `
              <text x="-10" y="${y + 15}" text-anchor="end" style="font-size: 12px; fill: #333;">${score.category}</text>
              <rect x="0" y="${y}" width="${barWidth}" height="25" fill="#3b82f6" opacity="0.8"/>
              <text x="${barWidth + 10}" y="${y + 17}" style="font-size: 11px; fill: #333;">${score.score.toFixed(2)}</text>
              <line x1="${nationalLineX}" y1="${y - 5}" x2="${nationalLineX}" y2="${y + 30}" stroke="red" stroke-width="2"/>
              <text x="${nationalLineX + 5}" y="${y - 8}" style="font-size: 10px; fill: red; font-weight: bold;">${score.nationalAverage.toFixed(2)}</text>
            `;
          }).join('')}
          
          <!-- X-axis -->
          <line x1="0" y1="${sampleData.scores.length * 100 + 20}" x2="500" y2="${sampleData.scores.length * 100 + 20}" stroke="#333" stroke-width="2"/>
          
          <!-- X-axis labels -->
          <text x="0" y="${sampleData.scores.length * 100 + 40}" text-anchor="middle" style="font-size: 10px;">0.0</text>
          <text x="167" y="${sampleData.scores.length * 100 + 40}" text-anchor="middle" style="font-size: 10px;">1.0</text>
          <text x="333" y="${sampleData.scores.length * 100 + 40}" text-anchor="middle" style="font-size: 10px;">2.0</text>
          <text x="500" y="${sampleData.scores.length * 100 + 40}" text-anchor="middle" style="font-size: 10px;">3.0</text>
          
          <!-- X-axis title -->
          <text x="250" y="${sampleData.scores.length * 100 + 65}" text-anchor="middle" style="font-size: 12px; font-weight: bold;">Promedio de Respuestas (0.0-3.0)</text>
        </g>
        
        <!-- Legend -->
        <g transform="translate(550, 50)">
          <rect x="0" y="0" width="200" height="130" fill="white" stroke="#ccc" stroke-width="1"/>
          <text x="100" y="20" text-anchor="middle" style="font-size: 14px; font-weight: bold;">Leyenda</text>
          
          <rect x="20" y="35" width="15" height="15" fill="#3b82f6" opacity="0.8"/>
          <text x="45" y="47" style="font-size: 12px;">Promedio del Usuario</text>
          
          <line x1="20" y1="65" x2="35" y2="65" stroke="red" stroke-width="2"/>
          <text x="45" y="69" style="font-size: 12px;">Media del Público</text>
          
          <text x="20" y="90" style="font-size: 10px; color: #666;">Escala: 0=Nunca, 1=Rara vez,</text>
          <text x="20" y="102" style="font-size: 10px; color: #666;">2=A veces, 3=Frecuentemente</text>
          <text x="20" y="120" style="font-size: 10px; font-weight: bold; color: #666;">Promedio por Categoría</text>
          <text x="20" y="132" style="font-size: 10px; color: #666;">vs. Media Poblacional</text>
        </g>
      </svg>
    </div>
  `;
};

export const generateReportHtml = (config: ReportConfig, realData: SampleData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: "${config.font_family}", sans-serif; 
          font-size: ${config.font_size}pt; 
          margin: 40px;
          line-height: 1.6;
          color: #333;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #1e40af; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .header-logo {
          max-height: 80px;
          margin-bottom: 15px;
        }
        .company-info {
          text-align: right;
          margin-bottom: 20px;
          font-size: ${Math.max(config.font_size - 2, 8)}pt;
          color: #666;
          border-left: 3px solid #3b82f6;
          padding-left: 15px;
        }
        .section { 
          margin: 25px 0; 
          padding: 20px;
          border-left: 4px solid #3b82f6;
          background-color: #f8fafc;
          border-radius: 0 8px 8px 0;
        }
        .section h2 {
          color: #1e40af;
          margin-top: 0;
          font-size: ${config.font_size + 4}pt;
        }
        .section h3 {
          color: #3b82f6;
          font-size: ${config.font_size + 2}pt;
        }
        .risk-high { color: #dc2626; font-weight: bold; }
        .risk-medium { color: #f59e0b; font-weight: bold; }
        .risk-low { color: #16a34a; font-weight: bold; }
        .score-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: ${Math.max(config.font_size - 1, 8)}pt;
        }
        .score-table th, .score-table td {
          border: 1px solid #d1d5db;
          padding: 12px 15px;
          text-align: left;
        }
        .score-table th {
          background-color: #1e40af;
          color: white;
          font-weight: bold;
        }
        .score-table tr:nth-child(even) {
          background-color: #f1f5f9;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: ${Math.max(config.font_size - 2, 8)}pt;
          color: #666;
          border-top: 2px solid #e5e7eb;
          padding-top: 25px;
        }
        .footer-logo {
          max-height: 50px;
          margin-bottom: 15px;
        }
        .recommendations-list {
          list-style-type: none;
          padding-left: 0;
        }
        .recommendations-list li {
          margin: 10px 0;
          padding: 8px 15px;
          background: #e0f2fe;
          border-left: 3px solid #0284c7;
          border-radius: 0 4px 4px 0;
        }
        .detailed-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: ${Math.max(config.font_size - 1, 8)}pt;
        }
        .detailed-table th, .detailed-table td {
          border: 1px solid #d1d5db;
          padding: 10px;
          text-align: left;
        }
        .detailed-table th {
          background-color: #f1f5f9;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${config.header_logo_url ? `<img src="${config.header_logo_url}" alt="Logo" class="header-logo">` : ''}
        <h1 style="margin: 0; color: #1e40af; font-size: ${config.font_size + 8}pt;">Reporte de Evaluación de Confiabilidad</h1>
        <p style="margin: 5px 0 0 0; color: #666; font-size: ${config.font_size}pt;">Sistema de Evaluación Psicométrica</p>
      </div>

      ${(config.company_name || config.company_address || config.company_phone || config.company_email) ? `
      <div class="company-info">
        ${config.company_name ? `<strong style="font-size: ${config.font_size + 1}pt;">${config.company_name}</strong><br>` : ''}
        ${config.company_address ? `${config.company_address}<br>` : ''}
        ${config.company_phone || config.company_email ? `${config.company_phone || ''} ${config.company_phone && config.company_email ? '|' : ''} ${config.company_email || ''}` : ''}
      </div>
      ` : ''}

      ${config.include_sections.personal_info ? `
      <div class="section">
        <h2>Información del Candidato</h2>
        <img src="https://via.placeholder.com/120x150/3b82f6/ffffff?text=Foto" alt="Foto del candidato" style="float: right; margin: 0 0 15px 15px; max-width: 120px; max-height: 150px; border-radius: 8px; border: 2px solid #d1d5db; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="border: none; padding: 5px 0;"><strong>Nombre:</strong></td>
            <td style="border: none; padding: 5px 0;">${realData.candidate.name}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 5px 0;"><strong>Email:</strong></td>
            <td style="border: none; padding: 5px 0;">${realData.candidate.email}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 5px 0;"><strong>Posición:</strong></td>
            <td style="border: none; padding: 5px 0;">${realData.candidate.position}</td>
          </tr>
          <tr>
            <td style="border: none; padding: 5px 0;"><strong>Fecha de Evaluación:</strong></td>
            <td style="border: none; padding: 5px 0;">${realData.candidate.date}</td>
          </tr>
        </table>
        <div style="clear: both;"></div>
      </div>
      ` : ''}

      ${config.include_sections.category_scores ? `
      <div class="section">
        <h2>Puntuaciones por Categoría</h2>
        <table class="score-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Total Preguntas</th>
              <th>Puntaje Total</th>
              <th>Interpretación</th>
              <th>Media Poblacional</th>
              <th>Diferencia</th>
              <th>Puntaje Ajustado</th>
            </tr>
          </thead>
          <tbody>
            ${realData.scores.map(score => `
            <tr>
              <td>${score.category}</td>
              <td>${score.totalQuestions || 0}</td>
              <td>${(score.score || 0).toFixed(2)}</td>
              <td class="risk-${score.risk.includes('ALTO') ? 'high' : score.risk.includes('MEDIO') ? 'medium' : 'low'}">${score.risk}</td>
              <td>${score.nationalAverage ? score.nationalAverage.toFixed(2) : '0.00'}</td>
              <td>${score.difference ? score.difference.toFixed(2) : '0.00'}</td>
              <td style="font-weight: bold; color: #1e40af;">${score.adjustedScore ? score.adjustedScore.toFixed(2) : (score.score || 0).toFixed(2)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${config.include_sections.charts ? generateChartSVG(config, realData) : ''}

      ${config.include_sections.risk_analysis ? `
      <div class="section">
        <h2>Análisis de Riesgo</h2>
        <p><strong>Evaluación General:</strong> <span class="risk-${realData.overallRisk.includes('ALTO') ? 'high' : realData.overallRisk.includes('MEDIO') ? 'medium' : 'low'}">${realData.overallRisk}</span></p>
        
        ${realData.overallRisk === 'RIESGO BAJO' ? `
        <div style="background: #dcfce7; border: 1px solid #22c55e; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="color: #16a34a; margin-top: 0;">Perfil de Alta Confiabilidad</h3>
          <p>El candidato demuestra un perfil de alta confiabilidad e integridad. Los resultados sugieren que es una persona confiable y ética para el puesto evaluado.</p>
        </div>
        ` : ''}
        
        ${realData.overallRisk === 'RIESGO MEDIO' ? `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="color: #d97706; margin-top: 0;">Perfil Moderado</h3>
          <p>El candidato presenta algunas áreas que requieren atención. Se recomienda realizar entrevistas adicionales para profundizar en aspectos específicos.</p>
        </div>
        ` : ''}
        
        ${realData.overallRisk === 'RIESGO ALTO' ? `
        <div style="background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">Perfil de Precaución</h3>
          <p>Los resultados indican áreas de preocupación significativas. Se recomienda una evaluación más profunda antes de proceder con la selección.</p>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${config.include_sections.recommendations ? `
      <div class="section">
        <h2>Recomendaciones</h2>
        <ul class="recommendations-list">
          <li>Revisar las puntuaciones específicas por categoría para identificar fortalezas y áreas de mejora</li>
          <li>Considerar entrevistas de seguimiento para profundizar en los resultados obtenidos</li>
          <li>Evaluar la consistencia con otros métodos de evaluación utilizados en el proceso</li>
          <li>Documentar las decisiones tomadas basadas en estos resultados para futuras referencias</li>
          <li>Considerar programas de desarrollo si el candidato es seleccionado</li>
        </ul>
      </div>
      ` : ''}

      ${config.include_sections.detailed_breakdown ? `
      <div class="section">
        <h2>Desglose Detallado de Respuestas</h2>
        <table class="detailed-table">
          <thead>
            <tr>
              <th>Pregunta</th>
              <th>Respuesta</th>
              <th>Categoría</th>
            </tr>
          </thead>
          <tbody>
            ${realData.detailedQuestions.map(q => `
            <tr>
              <td>${q.question}</td>
              <td><strong>${q.answer}</strong></td>
              <td>${q.category}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${config.include_sections.conclusion ? `
      <div class="section">
        <h2>Conclusión</h2>
        <p>
          Este reporte de evaluación de confiabilidad ha sido generado como parte del proceso de selección de personal. 
          Los resultados deben considerarse junto con otros métodos de evaluación y no deben ser el único criterio 
          para la toma de decisiones de contratación.
        </p>
        <p>
          <strong>Recomendación Final:</strong> 
          <span class="risk-${realData.overallRisk.includes('ALTO') ? 'high' : realData.overallRisk.includes('MEDIO') ? 'medium' : 'low'}">
            ${realData.overallRisk === 'RIESGO BAJO' ? 'Candidato recomendado para continuar en el proceso' : 
              realData.overallRisk === 'RIESGO MEDIO' ? 'Proceder con evaluación adicional' : 
              'Revisar cuidadosamente antes de proceder'}
          </span>
        </p>
        <p style="font-size: ${Math.max(config.font_size - 2, 8)}pt; color: #666; margin-top: 20px;">
          <em>Este reporte es confidencial y debe ser tratado de acuerdo con las políticas de privacidad de la organización.</em>
        </p>
      </div>
      ` : ''}

      <div class="footer">
        ${config.footer_logo_url ? `<img src="${config.footer_logo_url}" alt="Logo" class="footer-logo">` : ''}
        <p>Reporte generado el ${new Date().toLocaleDateString('es-ES')} por el Sistema de Evaluación Psicométrica</p>
        <p>© ${new Date().getFullYear()} - Documento Confidencial</p>
      </div>
    </body>
    </html>
  `;
};
# Guía para Procesar Templates Dinámicos

## Cómo funciona el sistema de placeholders dinámicos

### Para Template de Confiabilidad

El placeholder `{{CATEGORY_ROWS}}` debe ser reemplazado por filas HTML generadas dinámicamente:

```javascript
// Ejemplo de procesamiento
const categories = [
  {
    name: "Honestidad e Integridad",
    score: 85.5,
    national: 72.3,
    percentile: 78,
    risk: "BAJO",
    riskClass: "risk-low"
  },
  // ... más categorías con datos
];

const categoryRows = categories.map(category => `
  <tr>
    <td>${category.name}</td>
    <td>${category.score}</td>
    <td>${category.national}</td>
    <td>${category.percentile}%</td>
    <td class="${category.riskClass}">${category.risk}</td>
  </tr>
`).join('');

// Reemplazar en el template
template = template.replace('{{CATEGORY_ROWS}}', categoryRows);
```

### Para Template OCEAN

#### Placeholder `{{OCEAN_DIMENSION_CARDS}}`
Genera las tarjetas visuales de las dimensiones OCEAN:

```javascript
const oceanDimensions = [
  {
    name: "Apertura a la Experiencia",
    score: 85.5,
    percentage: 85,
    percentile: 78,
    level: "ALTO",
    levelClass: "level-high"
  },
  // ... más dimensiones
];

const dimensionCards = oceanDimensions.map(dim => `
  <div class="dimension-card">
    <div class="dimension-title">${dim.name}</div>
    <div class="score-bar">
      <div class="score-fill ${dim.levelClass}" style="width: ${dim.percentage}%">
        <div class="score-text">${dim.score}</div>
      </div>
    </div>
    <div style="font-size: 10pt; color: #666;">
      Percentil: ${dim.percentile}% | Nivel: ${dim.level}
    </div>
  </div>
`).join('');
```

#### Placeholder `{{OCEAN_INTERPRETATIONS}}`
Genera las interpretaciones detalladas:

```javascript
const interpretations = oceanDimensions.map(dim => `
  <div class="interpretation-box">
    <div style="font-weight: bold; color: #6B46C1; margin-bottom: 8px;">
      ${dim.name} (${dim.score})
    </div>
    <div>${dim.interpretation}</div>
  </div>
`).join('');
```

## Ventajas de este enfoque

1. **Flexibilidad**: Solo muestra categorías/dimensiones que tienen datos
2. **Mantenibilidad**: Fácil agregar nuevas categorías sin modificar template
3. **Eficiencia**: Templates más pequeños y procesamiento más rápido  
4. **Escalabilidad**: Soporta cualquier cantidad de categorías (40+ para confiabilidad)

## Clases CSS disponibles

### Para niveles de riesgo (Confiabilidad):
- `risk-low` (verde)
- `risk-medium` (naranja)  
- `risk-high` (rojo)

### Para niveles de personalidad (OCEAN):
- `level-low` 
- `level-medium`
- `level-high`

## Gráficos Dinámicos

### Placeholder `{{COMPARISON_CHART}}`
Para el gráfico de comparación de puntajes por categoría:

```javascript
// Opción 1: Gráfico con Chart.js
function generateComparisonChart(categories) {
  const chartData = categories
    .filter(cat => cat.hasData)
    .map(cat => ({
      category: cat.name,
      userScore: cat.score,
      nationalAvg: cat.national
    }));
  
  return `
    <canvas id="comparisonChart" width="800" height="400"></canvas>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    <script>
      const ctx = document.getElementById('comparisonChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ${JSON.stringify(chartData.map(d => d.category))},
          datasets: [{
            label: 'Puntaje Obtenido',
            data: ${JSON.stringify(chartData.map(d => d.userScore))},
            backgroundColor: '#4A90E2'
          }, {
            label: 'Promedio Nacional',
            data: ${JSON.stringify(chartData.map(d => d.nationalAvg))},
            backgroundColor: '#95A5A6'
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true, max: 100 } }
        }
      });
    </script>
  `;
}

// Opción 2: Gráfico SVG simple
function generateSVGChart(categories) {
  const maxScore = 100;
  const chartWidth = 800;
  const chartHeight = 400;
  const barWidth = chartWidth / (categories.length * 2 + 1);
  
  const bars = categories
    .filter(cat => cat.hasData)
    .map((cat, index) => {
      const x = (index * 2 + 1) * barWidth;
      const userHeight = (cat.score / maxScore) * chartHeight;
      const nationalHeight = (cat.national / maxScore) * chartHeight;
      
      return `
        <g>
          <rect x="${x}" y="${chartHeight - userHeight}" 
                width="${barWidth * 0.8}" height="${userHeight}" 
                fill="#4A90E2" />
          <rect x="${x + barWidth * 0.8}" y="${chartHeight - nationalHeight}" 
                width="${barWidth * 0.8}" height="${nationalHeight}" 
                fill="#95A5A6" />
          <text x="${x + barWidth * 0.8}" y="${chartHeight + 15}" 
                font-size="10" text-anchor="middle">${cat.name.substring(0, 15)}...</text>
        </g>
      `;
    }).join('');
  
  return `
    <svg width="${chartWidth}" height="${chartHeight + 30}">
      ${bars}
      <g>
        <rect x="20" y="10" width="15" height="15" fill="#4A90E2"/>
        <text x="40" y="22" font-size="12">Puntaje Obtenido</text>
        <rect x="150" y="10" width="15" height="15" fill="#95A5A6"/>
        <text x="170" y="22" font-size="12">Promedio Nacional</text>
      </g>
    </svg>
  `;
}
```

### Placeholder `{{OCEAN_RADAR_CHART}}`
Para el gráfico radial de personalidad OCEAN:

```javascript
function generateOceanRadarChart(dimensions) {
  const angles = dimensions.map((_, i) => (i * 2 * Math.PI) / dimensions.length);
  const centerX = 200, centerY = 200, radius = 150;
  
  const points = dimensions.map((dim, i) => {
    const value = (dim.score / 100) * radius;
    const x = centerX + Math.cos(angles[i] - Math.PI/2) * value;
    const y = centerY + Math.sin(angles[i] - Math.PI/2) * value;
    return `${x},${y}`;
  }).join(' ');
  
  const labels = dimensions.map((dim, i) => {
    const labelRadius = radius + 30;
    const x = centerX + Math.cos(angles[i] - Math.PI/2) * labelRadius;
    const y = centerY + Math.sin(angles[i] - Math.PI/2) * labelRadius;
    return `<text x="${x}" y="${y}" text-anchor="middle" font-size="12">${dim.name}</text>`;
  }).join('');
  
  return `
    <svg width="400" height="400">
      <!-- Grid circles -->
      <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.2}" fill="none" stroke="#ddd"/>
      <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.4}" fill="none" stroke="#ddd"/>
      <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.6}" fill="none" stroke="#ddd"/>
      <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.8}" fill="none" stroke="#ddd"/>
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#ddd"/>
      
      <!-- Data polygon -->
      <polygon points="${points}" fill="#4A90E2" fill-opacity="0.3" stroke="#4A90E2" stroke-width="2"/>
      
      <!-- Labels -->
      ${labels}
    </svg>
  `;
}
```

## Ejemplo de uso completo

```javascript
function processReliabilityTemplate(template, data) {
  // Procesar categorías dinámicamente
  const categoryRows = data.categories
    .filter(cat => cat.hasData) // Solo categorías con datos
    .map(category => `
      <tr>
        <td>${category.name}</td>
        <td>${category.score}</td>
        <td>${category.national}</td>
        <td>${category.percentile}%</td>
        <td class="${category.riskClass}">${category.risk}</td>
      </tr>
    `).join('');
  
  // Generar gráfico de comparación
  const comparisonChart = generateSVGChart(data.categories.filter(cat => cat.hasData));
  
  return template
    .replace('{{CATEGORY_ROWS}}', categoryRows)
    .replace('{{COMPARISON_CHART}}', comparisonChart);
}

function processOceanTemplate(template, data) {
  // Procesar dimensiones OCEAN
  const dimensionCards = generateDimensionCards(data.dimensions);
  const interpretations = generateInterpretations(data.dimensions);
  const radarChart = generateOceanRadarChart(data.dimensions);
  
  return template
    .replace('{{OCEAN_DIMENSION_CARDS}}', dimensionCards)
    .replace('{{OCEAN_INTERPRETATIONS}}', interpretations)
    .replace('{{OCEAN_RADAR_CHART}}', radarChart);
}
```

Esto permite manejar desde 5 hasta 40+ categorías de manera eficiente con gráficos dinámicos.
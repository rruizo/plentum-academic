# Templates de Reportes - Guía de Uso

## Contenido de la Carpeta

- `reliability-report-template.html` - Template para Reporte de Confiabilidad
- `ocean-report-template.html` - Template para Reporte de Personalidad OCEAN
- `README_TEMPLATES.md` - Esta guía de uso

## Cómo Convertir HTML a Word

### Método 1: Abrir directamente en Word
1. Abre Microsoft Word
2. Ve a **Archivo > Abrir**
3. Selecciona el archivo HTML
4. Word automáticamente convertirá el HTML a formato Word
5. Guarda como `.docx`

### Método 2: Copiar y pegar
1. Abre el archivo HTML en tu navegador
2. Selecciona todo el contenido (Ctrl+A)
3. Copia (Ctrl+C)
4. Pega en un documento Word nuevo
5. Ajusta formato según necesites

### Método 3: Convertidores online
- Puedes usar convertidores como `zamzar.com` o `convertio.co`
- Sube el archivo HTML y descarga en formato Word

## Placeholders Incluidos

### **Reporte de Confiabilidad (45 campos):**

#### Información de Empresa:
- `{{COMPANY_NAME}}` - Nombre de la empresa
- `{{COMPANY_LOGO}}` - Logo del header
- `{{FOOTER_LOGO}}` - Logo del footer
- `{{COMPANY_ADDRESS}}` - Dirección de la empresa
- `{{COMPANY_PHONE}}` - Teléfono
- `{{COMPANY_EMAIL}}` - Email de contacto

#### Información del Candidato:
- `{{CANDIDATE_NAME}}` - Nombre completo
- `{{CANDIDATE_EMAIL}}` - Email del candidato
- `{{CANDIDATE_COMPANY}}` - Empresa del candidato
- `{{CANDIDATE_AREA}}` - Área de trabajo
- `{{CANDIDATE_SECTION}}` - Sección
- `{{EXAM_DATE}}` - Fecha del examen
- `{{EXAM_DURATION}}` - Duración en minutos
- `{{EXAM_STATUS}}` - Estado del examen

#### Puntajes Generales:
- `{{OVERALL_SCORE}}` - Puntaje general
- `{{RISK_LEVEL}}` - Nivel de riesgo
- `{{RISK_LEVEL_CLASS}}` - Clase CSS para colores
- `{{QUESTIONS_ANSWERED}}` - Preguntas respondidas

#### Puntajes por Categoría (9 categorías x 5 campos = 45):
Para cada categoría (HONESTIDAD, SUSTANCIAS, ANTISOCIAL, AGRESION, SEGURIDAD, CONFIABILIDAD, ROBO, CONDUCTA, ESTRES):
- `{{CATEGORIA_SCORE}}` - Puntaje obtenido
- `{{CATEGORIA_NATIONAL}}` - Promedio nacional  
- `{{CATEGORIA_PERCENTILE}}` - Percentil
- `{{CATEGORIA_RISK}}` - Nivel de riesgo
- `{{CATEGORIA_RISK_CLASS}}` - Clase CSS

#### Factores Personales:
- `{{MARITAL_STATUS}}` - Estado civil
- `{{HAS_CHILDREN}}` - Tiene hijos
- `{{HOUSING_STATUS}}` - Situación habitacional
- `{{AGE}}` - Edad
- `{{PERSONAL_ADJUSTMENT}}` - Ajuste personal

#### Análisis AI:
- `{{AI_DETAILED_ANALYSIS}}` - Análisis detallado
- `{{AI_CONCLUSIONS}}` - Conclusiones

#### Otros:
- `{{GENERATION_DATE}}` - Fecha de generación
- `{{COMPARISON_CHART}}` - Gráfico comparativo

### **Reporte OCEAN (35 campos):**

#### Información Base: (igual que confiabilidad)
- Empresa, candidato, fechas, etc.

#### Dimensiones OCEAN (5 x 5 campos = 25):
Para cada dimensión (OPENNESS, CONSCIENTIOUSNESS, EXTRAVERSION, AGREEABLENESS, NEUROTICISM):
- `{{DIMENSION_SCORE}}` - Puntaje
- `{{DIMENSION_PERCENTAGE}}` - Porcentaje para barra
- `{{DIMENSION_PERCENTILE}}` - Percentil
- `{{DIMENSION_LEVEL}}` - Nivel (Alto/Medio/Bajo)
- `{{DIMENSION_LEVEL_CLASS}}` - Clase CSS
- `{{DIMENSION_INTERPRETATION}}` - Interpretación

#### Motivaciones (6 campos):
- `{{ACHIEVEMENT_SCORE}}` - Logro
- `{{POWER_SCORE}}` - Poder
- `{{AFFILIATION_SCORE}}` - Afiliación
- `{{AUTONOMY_SCORE}}` - Autonomía
- `{{SECURITY_SCORE}}` - Seguridad
- `{{RECOGNITION_SCORE}}` - Reconocimiento

#### Análisis AI:
- `{{AI_PSYCHOLOGICAL_ANALYSIS}}` - Análisis psicológico
- `{{AI_DEVELOPMENT_RECOMMENDATIONS}}` - Recomendaciones

## Personalización del Template

### 1. Colores y Estilos:
- **Confiabilidad**: Azul (`#4A90E2`)
- **OCEAN**: Púrpura (`#6B46C1`)
- Puedes cambiar estos valores en la sección `<style>`

### 2. Estructura:
- Cada `<div class="section">` es una sección del reporte
- Puedes reordenar, eliminar o agregar secciones
- La clase `.page-break` fuerza un salto de página

### 3. Gráficos:
- Los placeholders `{{CHART}}` se pueden reemplazar por:
  - Imágenes generadas automáticamente
  - Gráficos SVG embebidos
  - Espacios para insertar manualmente

### 4. Logos:
- Los placeholders de logos pueden ser:
  - URLs de imágenes
  - Imágenes en base64
  - Rutas locales a archivos

## Implementación en el Sistema

Para usar estos templates en tu sistema:

1. **Almacenamiento**: Guarda los templates en la base de datos o sistema de archivos
2. **Mapeo**: Crea un servicio que mapee los datos a los placeholders
3. **Procesamiento**: Reemplaza todos los `{{PLACEHOLDER}}` con datos reales
4. **Conversión**: Genera PDF usando puppeteer, wkhtmltopdf, o similar

### Ejemplo de Procesamiento:
```javascript
function processTemplate(templateHtml, data) {
  let processedHtml = templateHtml;
  
  // Reemplazar placeholders
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key}}}`;
    processedHtml = processedHtml.replaceAll(placeholder, data[key] || '');
  });
  
  return processedHtml;
}
```

## Consideraciones para Word

### Elementos que funcionan bien:
- ✅ Texto formateado
- ✅ Tablas
- ✅ Listas
- ✅ Imágenes (con URLs)
- ✅ Colores de fondo
- ✅ Bordes y márgenes

### Elementos que necesitan ajuste:
- ⚠️ CSS Grid - Convertir a tablas
- ⚠️ Flexbox - Usar alineación de Word
- ⚠️ Posicionamiento absoluto - Usar cajas de texto
- ⚠️ Gráficos SVG - Convertir a imágenes

## Próximos Pasos

1. Descarga estos templates
2. Ábrelos en Word para ver cómo se ven
3. Ajusta el diseño según tus necesidades
4. Agrega/quita campos según tu modelo de datos
5. Implementa el sistema de mapeo en tu aplicación

¿Necesitas ayuda con algún paso específico?
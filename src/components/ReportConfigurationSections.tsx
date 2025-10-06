
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportSectionsProps {
  includeSections: {
    personal_info: boolean;
    category_scores: boolean;
    risk_analysis: boolean;
    recommendations: boolean;
    charts: boolean;
    detailed_breakdown: boolean;
    conclusion: boolean;
  };
  onSectionChange: (section: string, value: boolean) => void;
}

const ReportConfigurationSections = ({ includeSections, onSectionChange }: ReportSectionsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seleccionar Secciones del Reporte</CardTitle>
        <CardDescription>
          Elige qué secciones incluir en el reporte HTML generado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="personal_info">Información Personal</Label>
                <p className="text-sm text-muted-foreground">
                  Datos del evaluado y contexto de la evaluación
                </p>
              </div>
              <Switch
                id="personal_info"
                checked={includeSections.personal_info}
                onCheckedChange={(checked) => onSectionChange('personal_info', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="category_scores">Puntuaciones por Categoría</Label>
                <p className="text-sm text-muted-foreground">
                  Resultados detallados por cada categoría evaluada
                </p>
              </div>
              <Switch
                id="category_scores"
                checked={includeSections.category_scores}
                onCheckedChange={(checked) => onSectionChange('category_scores', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="risk_analysis">Análisis de Riesgo</Label>
                <p className="text-sm text-muted-foreground">
                  Evaluación del nivel de riesgo general
                </p>
              </div>
              <Switch
                id="risk_analysis"
                checked={includeSections.risk_analysis}
                onCheckedChange={(checked) => onSectionChange('risk_analysis', checked)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="recommendations">Recomendaciones</Label>
                <p className="text-sm text-muted-foreground">
                  Sugerencias basadas en los resultados
                </p>
              </div>
              <Switch
                id="recommendations"
                checked={includeSections.recommendations}
                onCheckedChange={(checked) => onSectionChange('recommendations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="charts">Gráficos y Visualizaciones</Label>
                <p className="text-sm text-muted-foreground">
                  Incluir gráficos de barras y visualizaciones
                </p>
              </div>
              <Switch
                id="charts"
                checked={includeSections.charts}
                onCheckedChange={(checked) => onSectionChange('charts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="detailed_breakdown">Análisis específico de respuestas sensibles</Label>
                <p className="text-sm text-muted-foreground">
                  Análisis pregunta por pregunta más relevantes
                </p>
              </div>
              <Switch
                id="detailed_breakdown"
                checked={includeSections.detailed_breakdown}
                onCheckedChange={(checked) => onSectionChange('detailed_breakdown', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="conclusion">Conclusión con IA</Label>
                <p className="text-sm text-muted-foreground">
                  Análisis generado por IA con comparativas
                </p>
              </div>
              <Switch
                id="conclusion"
                checked={includeSections.conclusion}
                onCheckedChange={(checked) => onSectionChange('conclusion', checked)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportConfigurationSections;

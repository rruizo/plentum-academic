import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, FileQuestion, BarChart3, Wrench } from 'lucide-react';
import TurnoverRiskConfig from './turnover/TurnoverRiskConfig';
import TurnoverRiskCategories from './turnover/TurnoverRiskCategories';
import TurnoverRiskQuestions from './turnover/TurnoverRiskQuestions';

const TurnoverRiskManagement = () => {
  const [activeTab, setActiveTab] = useState('config');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Gestión de Examen de Rotación de Personal
          </h2>
          <p className="text-muted-foreground">
            Configure el examen de evaluación de riesgo de rotación y análisis con IA
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuración IA
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FileQuestion className="h-4 w-4 mr-2" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="questions">
            <BarChart3 className="h-4 w-4 mr-2" />
            Preguntas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <TurnoverRiskConfig />
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <TurnoverRiskCategories />
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <TurnoverRiskQuestions />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TurnoverRiskManagement;

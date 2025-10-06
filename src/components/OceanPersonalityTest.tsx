import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, ArrowLeft } from 'lucide-react';
import PsychometricTestTaking from './PsychometricTestTaking';
import PersonalityResultsViewer from './PersonalityResultsViewer';

interface OceanPersonalityTestProps {
  onBack?: () => void;
}

const OceanPersonalityTest = ({ onBack }: OceanPersonalityTestProps) => {
  const [currentView, setCurrentView] = useState<'intro' | 'test' | 'results'>('intro');
  const [sessionId, setSessionId] = useState<string>('');

  const handleStartTest = () => {
    setCurrentView('test');
  };

  const handleTestComplete = (completedSessionId: string) => {
    setSessionId(completedSessionId);
    setCurrentView('results');
  };

  const handleBackToIntro = () => {
    setCurrentView('intro');
  };

  if (currentView === 'test') {
    return (
      <PsychometricTestTaking
        onComplete={handleTestComplete}
        onBack={handleBackToIntro}
      />
    );
  }

  if (currentView === 'results') {
    return (
      <PersonalityResultsViewer
        sessionId={sessionId}
        onBack={handleBackToIntro}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Evaluación de Personalidad OCEAN</CardTitle>
          </div>
          <p className="text-lg text-muted-foreground">
            Descubre tu perfil de personalidad según el modelo de los Cinco Grandes
          </p>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Descripción del test */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">¿Qué mide este test?</h3>
              <p className="text-muted-foreground">
                La evaluación OCEAN analiza cinco dimensiones fundamentales de la personalidad:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <strong>Apertura:</strong> Creatividad, imaginación y apertura a nuevas experiencias
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <strong>Responsabilidad:</strong> Organización, disciplina y orientación al logro
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <strong>Extraversión:</strong> Sociabilidad, energía y asertividad
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <strong>Amabilidad:</strong> Cooperación, confianza y empatía
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <strong>Neuroticismo:</strong> Estabilidad emocional y manejo del estrés
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Información del Test</h3>
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Preguntas:</span>
                  <span>125 preguntas</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Duración:</span>
                  <span>20-30 minutos</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Formato:</span>
                  <span>Escala Likert de 5 puntos</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Resultado:</span>
                  <span>Perfil detallado + gráficos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">
              Instrucciones Importantes
            </h3>
            <ul className="space-y-2 text-yellow-700 text-sm">
              <li>• Responde de manera honesta y espontánea</li>
              <li>• No hay respuestas correctas o incorrectas</li>
              <li>• Piensa en tu comportamiento habitual, no en situaciones específicas</li>
              <li>• Si no estás seguro, elige la opción que más se acerque a tu forma de ser</li>
              <li>• Puedes navegar entre preguntas antes de finalizar</li>
              <li>• Tus resultados son confidenciales y se guardan de forma segura</li>
            </ul>
          </div>

          {/* Aplicaciones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Desarrollo Personal</h4>
              <p className="text-sm text-muted-foreground">
                Conoce tus fortalezas y áreas de mejora
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Orientación Profesional</h4>
              <p className="text-sm text-muted-foreground">
                Identifica roles y entornos ideales
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Recursos Humanos</h4>
              <p className="text-sm text-muted-foreground">
                Evaluación para selección y desarrollo
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4 justify-center pt-4">
            {onBack && (
              <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            )}
            <Button 
              onClick={handleStartTest} 
              size="lg"
              className="px-8"
            >
              Comenzar Evaluación
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-muted-foreground text-center border-t pt-4">
            <p>
              Esta evaluación está basada en el modelo científicamente validado de los Cinco Grandes. 
              Los resultados son orientativos y no constituyen un diagnóstico psicológico profesional.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OceanPersonalityTest;
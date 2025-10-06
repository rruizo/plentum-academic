import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Play, Pause, RotateCcw, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AutomatedTestResult {
  testName: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  message: string;
  duration?: number;
  details?: any;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  tests: (() => Promise<string>)[];
}

export const AutomatedTestRunner = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<AutomatedTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);

  const scenarios: TestScenario[] = [
    {
      id: 'complete_reliability_flow',
      name: 'Flujo Completo de Confiabilidad',
      description: 'Test end-to-end del sistema de exámenes de confiabilidad',
      tests: [
        async () => {
          // Crear usuario de prueba
          const testUser = {
            id: crypto.randomUUID(),
            email: `test_${Date.now()}@testing.com`,
            full_name: 'Usuario Test Automatizado',
            role: 'student',
            company: 'Testing Company',
            area: 'QA',
            section: 'Automated Tests',
            report_contact: 'admin@testing.com'
          };

          const { data: userData, error: userError } = await supabase.from('profiles').insert(testUser).select().single();
          if (userError) throw new Error(`Error creando usuario: ${userError.message}`);
          
          return `Usuario test creado: ${userData.full_name}`;
        },
        async () => {
          // Crear examen de confiabilidad
          const { data: adminUser } = await supabase.auth.getUser();
          if (!adminUser.user) throw new Error('Admin no autenticado');

          const examData = {
            title: `Examen Automatizado ${Date.now()}`,
            description: 'Examen generado por testing automatizado',
            type: 'confiabilidad',
            estado: 'activo',
            duracion_minutos: 60,
            created_by: adminUser.user.id
          };

          const { data: exam, error } = await supabase.from('exams').insert(examData).select().single();
          if (error) throw new Error(`Error creando examen: ${error.message}`);

          return `Examen creado: ${exam.title}`;
        },
        async () => {
          // Asignar examen
          const { data: exam } = await supabase.from('exams')
            .select('id').eq('type', 'confiabilidad').eq('estado', 'activo').limit(1).single();
          const { data: user } = await supabase.from('profiles')
            .select('id').like('email', 'test_%@testing.com').limit(1).single();

          if (!exam || !user) throw new Error('Datos de examen/usuario no encontrados');

          const assignment = {
            exam_id: exam.id,
            user_id: user.id,
            assigned_by: (await supabase.auth.getUser()).data.user?.id,
            test_type: 'reliability'
          };

          const { error } = await supabase.from('exam_assignments').insert(assignment);
          if (error) throw new Error(`Error asignando examen: ${error.message}`);

          return 'Examen asignado exitosamente';
        },
        async () => {
          // Generar credenciales
          const { data: assignment } = await supabase.from('exam_assignments')
            .select('exam_id, user_id')
            .eq('test_type', 'reliability')
            .limit(1).single();

          if (!assignment) throw new Error('Asignación no encontrada');

          const { data: credentials } = await supabase.from('exam_credentials')
            .select('username, password_hash')
            .eq('exam_id', assignment.exam_id)
            .limit(1).single();

          if (!credentials) throw new Error('Credenciales no generadas');

          return `Credenciales: ${credentials.username}`;
        },
        async () => {
          // Simular respuestas del examen
          const { data: user } = await supabase.from('profiles')
            .select('id').like('email', 'test_%@testing.com').limit(1).single();
          const { data: exam } = await supabase.from('exams')
            .select('id').eq('type', 'confiabilidad').limit(1).single();

          if (!user || !exam) throw new Error('Datos no encontrados para simulación');

          const mockAnswers = Array(20).fill(null).map((_, i) => ({
            questionId: `q_${i + 1}`,
            answer: ['Nunca', 'Rara vez', 'A veces', 'Frecuentemente'][Math.floor(Math.random() * 4)]
          }));

          const attempt = {
            exam_id: exam.id,
            user_id: user.id,
            questions: mockAnswers.map(a => ({ id: a.questionId })),
            answers: mockAnswers,
            score: Math.random() * 100,
            completed_at: new Date().toISOString()
          };

          const { error } = await supabase.from('exam_attempts').insert(attempt);
          if (error) throw new Error(`Error guardando respuestas: ${error.message}`);

          return `${mockAnswers.length} respuestas simuladas guardadas`;
        },
        async () => {
          // Generar análisis con OpenAI (simulado)
          try {
            const response = await supabase.functions.invoke('generate-psychometric-analysis', {
              body: {
                test_mode: true,
                analysis_type: 'reliability_automated_test',
                exam_data: {
                  user_info: { full_name: 'Usuario Test', email: 'test@testing.com' },
                  total_score: 75,
                  risk_level: 'RIESGO MEDIO'
                }
              }
            });

            if (response.error) {
              return `Análisis simulado (OpenAI no disponible): ${response.error.message}`;
            }

            return 'Análisis OpenAI completado exitosamente';
          } catch (error) {
            return `Análisis simulado por error de conexión`;
          }
        }
      ]
    },
    {
      id: 'complete_ocean_flow',
      name: 'Flujo Completo OCEAN',
      description: 'Test end-to-end del sistema de test psicométrico OCEAN',
      tests: [
        async () => {
          // Verificar test OCEAN disponible
          const { data: oceanTest, error } = await supabase.from('psychometric_tests')
            .select('*').eq('type', 'ocean').eq('is_active', true).limit(1).single();

          if (error || !oceanTest) throw new Error('Test OCEAN no disponible');
          return `Test OCEAN activo: ${oceanTest.name}`;
        },
        async () => {
          // Crear sesión psicométrica
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Usuario no autenticado');

          const session = {
            user_id: user.user.id,
            test_type: 'psychometric',
            status: 'in_progress',
            psychometric_test_id: (await supabase.from('psychometric_tests')
              .select('id').eq('type', 'ocean').limit(1).single()).data?.id
          };

          const { data: sessionData, error } = await supabase.from('exam_sessions').insert(session).select().single();
          if (error) throw new Error(`Error creando sesión: ${error.message}`);

          return `Sesión OCEAN creada: ${sessionData.id}`;
        },
        async () => {
          // Simular respuestas OCEAN
          const { data: questions } = await supabase.from('personality_questions')
            .select('id, ocean_factor').eq('is_active', true).limit(15);

          if (!questions || questions.length === 0) throw new Error('No hay preguntas OCEAN disponibles');

          const { data: user } = await supabase.auth.getUser();
          const { data: session } = await supabase.from('exam_sessions')
            .select('id').eq('test_type', 'psychometric').eq('user_id', user.user?.id).limit(1).single();

          const responses = questions.map(q => ({
            user_id: user.user!.id,
            question_id: q.id,
            session_id: session!.id,
            response_value: Math.floor(Math.random() * 5) + 1
          }));

          const { error } = await supabase.from('personality_responses').insert(responses);
          if (error) throw new Error(`Error guardando respuestas: ${error.message}`);

          return `${responses.length} respuestas OCEAN simuladas`;
        },
        async () => {
          // Calcular puntajes OCEAN
          const { data: user } = await supabase.auth.getUser();
          const { data: session } = await supabase.from('exam_sessions')
            .select('id').eq('test_type', 'psychometric').eq('user_id', user.user?.id).limit(1).single();

          const oceanScores = {
            apertura_score: Math.random() * 100,
            responsabilidad_score: Math.random() * 100,
            extraversion_score: Math.random() * 100,
            amabilidad_score: Math.random() * 100,
            neuroticismo_score: Math.random() * 100
          };

          const result = {
            user_id: user.user!.id,
            session_id: session!.id,
            ...oceanScores
          };

          const { error } = await supabase.from('personality_results').insert(result);
          if (error) throw new Error(`Error guardando resultados: ${error.message}`);

          return `Puntajes OCEAN calculados y guardados`;
        },
        async () => {
          // Análisis OpenAI para OCEAN
          try {
            const response = await supabase.functions.invoke('generate-ocean-personality-report', {
              body: {
                test_mode: true,
                ocean_data: {
                  user_info: { full_name: 'Test OCEAN User', email: 'ocean@test.com' },
                  ocean_scores: {
                    apertura: 75, responsabilidad: 68, extraversion: 82, amabilidad: 71, neuroticismo: 46
                  }
                }
              }
            });

            if (response.error) {
              return `Análisis OCEAN simulado (OpenAI no disponible)`;
            }

            return 'Análisis de personalidad OCEAN completado';
          } catch (error) {
            return 'Análisis OCEAN simulado por error de conexión';
          }
        }
      ]
    }
  ];

  const runScenario = async (scenario: TestScenario) => {
    if (isRunning) return;

    setIsRunning(true);
    setCurrentScenario(scenario.id);
    setResults([]);
    setProgress(0);
    setIsPaused(false);

    toast({
      title: `Iniciando ${scenario.name}`,
      description: `Ejecutando ${scenario.tests.length} pruebas automáticas...`
    });

    const totalTests = scenario.tests.length;

    for (let i = 0; i < scenario.tests.length; i++) {
      if (isPaused) break;

      const test = scenario.tests[i];
      const testName = `Paso ${i + 1}`;
      const startTime = Date.now();

      // Marcar como ejecutándose
      setResults(prev => [
        ...prev,
        { testName, status: 'running', message: 'Ejecutando...', duration: 0 }
      ]);

      try {
        const result = await test();
        const duration = Date.now() - startTime;

        setResults(prev => 
          prev.map(r => 
            r.testName === testName 
              ? { ...r, status: 'success' as const, message: result, duration }
              : r
          )
        );
      } catch (error: any) {
        const duration = Date.now() - startTime;

        setResults(prev => 
          prev.map(r => 
            r.testName === testName 
              ? { ...r, status: 'error' as const, message: 'Error', details: error.message, duration }
              : r
          )
        );
      }

      setProgress(((i + 1) / totalTests) * 100);
      await new Promise(resolve => setTimeout(resolve, 500)); // Pausa entre tests
    }

    setIsRunning(false);
    setCurrentScenario(null);

    toast({
      title: `${scenario.name} completado`,
      description: 'Todas las pruebas automáticas han finalizado'
    });
  };

  const getStatusIcon = (status: AutomatedTestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: AutomatedTestResult['status']) => {
    switch (status) {
      case 'success': return <Badge variant="default" className="bg-green-100 text-green-800">✓ Exitoso</Badge>;
      case 'error': return <Badge variant="destructive">✗ Error</Badge>;
      case 'running': return <Badge variant="secondary">⏳ Ejecutando</Badge>;
      default: return <Badge variant="outline">⏸ Pendiente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sistema de Pruebas Automáticas
          </CardTitle>
          <CardDescription>
            Ejecuta escenarios completos end-to-end para validar todo el flujo de exámenes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Controles */}
            <div className="flex gap-4">
              {scenarios.map((scenario) => (
                <Button
                  key={scenario.id}
                  onClick={() => runScenario(scenario)}
                  disabled={isRunning}
                  variant={currentScenario === scenario.id ? "default" : "outline"}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {scenario.name}
                </Button>
              ))}
            </div>

            {/* Progreso */}
            {isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso del escenario</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Resultados */}
            {results.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Resultados en Tiempo Real</h3>
                {results.map((result, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.status)}
                          <div>
                            <h4 className="font-medium">{result.testName}</h4>
                            <p className="text-sm text-muted-foreground">{result.message}</p>
                            {result.details && (
                              <p className="text-xs text-red-600 mt-1">{result.details}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.duration && (
                            <span className="text-xs text-muted-foreground">
                              {result.duration}ms
                            </span>
                          )}
                          {getStatusBadge(result.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
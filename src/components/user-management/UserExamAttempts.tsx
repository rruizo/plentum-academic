import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Target, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ExamAttemptData {
  examId: string;
  examTitle: string;
  examType: 'reliability' | 'psychometric';
  attemptsTaken: number;
  maxAttempts: number;
  status: string;
  lastAttempt?: string;
}

interface UserExamAttemptsProps {
  userId: string;
}

const UserExamAttempts = ({ userId }: UserExamAttemptsProps) => {
  const [attempts, setAttempts] = useState<ExamAttemptData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && attempts.length === 0) {
      loadUserAttempts();
    }
  }, [isOpen, userId]);

  const loadUserAttempts = async () => {
    setLoading(true);
    try {
      // Obtener email del usuario
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const userEmail = userProfile.email;
      const attemptsData: ExamAttemptData[] = [];

      // Cargar sesiones de exámenes de confiabilidad
      const { data: reliabilitySessions, error: reliabilityError } = await supabase
        .from('exam_sessions')
        .select(`
          *,
          exams (
            id,
            title,
            type
          )
        `)
        .eq('test_type', 'reliability')
        .or(`user_id.eq.${userId},user_id.eq.${userEmail}`);

      if (reliabilityError) {
        console.warn('Error loading reliability sessions:', reliabilityError);
      } else {
        reliabilitySessions?.forEach(session => {
          if (session.exams) {
            attemptsData.push({
              examId: session.exam_id!,
              examTitle: session.exams.title,
              examType: 'reliability',
              attemptsTaken: session.attempts_taken || 0,
              maxAttempts: session.max_attempts || 2,
              status: session.status,
              lastAttempt: session.updated_at
            });
          }
        });
      }

      // Cargar sesiones de tests psicométricos
      const { data: psychometricSessions, error: psychometricError } = await supabase
        .from('exam_sessions')
        .select(`
          *,
          psychometric_tests (
            id,
            name,
            type
          )
        `)
        .eq('test_type', 'psychometric')
        .or(`user_id.eq.${userId},user_id.eq.${userEmail}`);

      if (psychometricError) {
        console.warn('Error loading psychometric sessions:', psychometricError);
      } else {
        psychometricSessions?.forEach(session => {
          if (session.psychometric_tests) {
            attemptsData.push({
              examId: session.psychometric_test_id!,
              examTitle: session.psychometric_tests.name,
              examType: 'psychometric',
              attemptsTaken: session.attempts_taken || 0,
              maxAttempts: session.max_attempts || 2,
              status: session.status,
              lastAttempt: session.updated_at
            });
          }
        });
      }

      setAttempts(attemptsData);
    } catch (error) {
      console.error('Error loading user attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, attemptsTaken: number, maxAttempts: number) => {
    if (attemptsTaken >= maxAttempts) {
      return <Badge variant="destructive">Agotado</Badge>;
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completado</Badge>;
      case 'started':
        return <Badge variant="secondary">En Progreso</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExamIcon = (type: 'reliability' | 'psychometric') => {
    return type === 'psychometric' ? 
      <Brain className="h-4 w-4 text-purple-600" /> : 
      <Target className="h-4 w-4 text-blue-600" />;
  };

  const totalAttempts = attempts.reduce((sum, attempt) => sum + attempt.attemptsTaken, 0);
  const totalAvailable = attempts.reduce((sum, attempt) => sum + attempt.maxAttempts, 0);

  return (
    <div className="text-center">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer hover:bg-muted/50 rounded p-2 transition-colors">
            <Badge variant="secondary" className="mb-1">
              Intentos: {totalAttempts}/{totalAvailable}
            </Badge>
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs text-muted-foreground">Ver detalles</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card className="mt-2 max-w-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Intentos por Examen</CardTitle>
              <CardDescription className="text-xs">
                Detalle de intentos realizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-xs text-muted-foreground">Cargando...</p>
                </div>
              ) : attempts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">Sin intentos registrados</p>
                </div>
              ) : (
                attempts.map((attempt) => (
                  <div key={`${attempt.examType}-${attempt.examId}`} className="flex items-center justify-between p-2 border rounded text-left">
                    <div className="flex items-center gap-2">
                      {getExamIcon(attempt.examType)}
                      <div>
                        <p className="text-xs font-medium truncate max-w-32" title={attempt.examTitle}>
                          {attempt.examTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attempt.examType === 'psychometric' ? 'OCEAN' : 'Confiabilidad'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">
                        {attempt.attemptsTaken}/{attempt.maxAttempts}
                      </p>
                      <div className="mt-1">
                        {getStatusBadge(attempt.status, attempt.attemptsTaken, attempt.maxAttempts)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default UserExamAttempts;
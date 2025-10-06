import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Calendar, 
  User, 
  Brain, 
  Eye, 
  Mail, 
  Clock,
  Filter,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PsychometricResultsViewer from './PsychometricResultsViewer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PsychometricSession {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  start_time: string;
  end_time: string;
  test_type: string;
  psychometric_test_id: string;
  psychometric_tests: {
    name: string;
    type: string;
  };
  personality_results: any[];
}

interface PsychometricResultsTabProps {
  selectedSessionId: string | null;
  onSessionSelect: (sessionId: string | null) => void;
}

const PsychometricResultsTab = ({ 
  selectedSessionId, 
  onSessionSelect 
}: PsychometricResultsTabProps) => {
  const [sessions, setSessions] = useState<PsychometricSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchPsychometricSessions();
  }, []);

  const fetchPsychometricSessions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('exam_sessions')
        .select(`
          id,
          user_id,
          status,
          created_at,
          start_time,
          end_time,
          test_type,
          psychometric_test_id,
          psychometric_tests!inner (
            name,
            type
          ),
          personality_results (
            id,
            apertura_score,
            responsabilidad_score,
            extraversion_score,
            amabilidad_score,
            neuroticismo_score,
            created_at
          )
        `)
        .eq('test_type', 'psychometric')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions((data as any) || []);
    } catch (error) {
      console.error('Error fetching psychometric sessions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las sesiones psicométricas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completado</Badge>;
      case 'started':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">En Progreso</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserDisplayName = (userId: string) => {
    if (userId.includes('@')) {
      // Es un email, extraer nombre
      const emailParts = userId.split('@')[0].split('.');
      return emailParts.map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
    }
    return 'Usuario';
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserDisplayName(session.user_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.psychometric_tests?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const hasResults = (session: PsychometricSession) => {
    return session.personality_results && session.personality_results.length > 0;
  };

  if (selectedSessionId) {
    return (
      <PsychometricResultsViewer 
        sessionId={selectedSessionId}
        onBack={() => onSessionSelect(null)}
      />
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando resultados psicométricos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header y filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Resultados de Evaluaciones Psicométricas
          </CardTitle>
          <p className="text-muted-foreground">
            Visualiza y analiza los resultados de las evaluaciones psicométricas completadas
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por usuario, email o test..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="completed">Completados</option>
                <option value="started">En Progreso</option>
                <option value="pending">Pendientes</option>
              </select>
              <Button onClick={fetchPsychometricSessions} variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de resultados */}
      <div className="grid gap-4">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{getUserDisplayName(session.user_id)}</span>
                      </div>
                      {getStatusBadge(session.status)}
                      {hasResults(session) && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          Con Resultados
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{session.user_id}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        <span>{session.psychometric_tests?.name || 'Test no encontrado'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(session.created_at), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                      {session.start_time && session.end_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {Math.round(
                              (new Date(session.end_time).getTime() - 
                               new Date(session.start_time).getTime()) / (1000 * 60)
                            )} min
                          </span>
                        </div>
                      )}
                    </div>

                    {hasResults(session) && session.personality_results[0] && (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-1">Vista previa de resultados:</div>
                        <div className="flex gap-4 text-xs">
                          <span>Apertura: {Math.round(session.personality_results[0].apertura_score)}</span>
                          <span>Responsabilidad: {Math.round(session.personality_results[0].responsabilidad_score)}</span>
                          <span>Extraversión: {Math.round(session.personality_results[0].extraversion_score)}</span>
                          <span>Amabilidad: {Math.round(session.personality_results[0].amabilidad_score)}</span>
                          <span>Neuroticismo: {Math.round(session.personality_results[0].neuroticismo_score)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {hasResults(session) && (
                      <Button
                        onClick={() => onSessionSelect(session.id)}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Análisis
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No se encontraron resultados' 
                  : 'No hay evaluaciones psicométricas completadas'
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Los resultados aparecerán aquí cuando los usuarios completen sus evaluaciones'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PsychometricResultsTab;
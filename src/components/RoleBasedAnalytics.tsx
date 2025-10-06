
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, FileText, TrendingUp, AlertTriangle, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

interface ExamResult {
  id: string;
  user_id: string;
  exam_id: string;
  score: number;
  completed_at: string;
  risk_analysis: any;
  user_profile: {
    full_name: string;
    email: string;
    company: string;
    area: string;
    section: string;
  } | null;
  exam: {
    title: string;
  } | null;
}

interface SupervisorAssignment {
  assigned_user_id: string;
  user_profile: {
    full_name: string;
    email: string;
    company: string;
    area: string;
    section: string;
  } | null;
}

const RoleBasedAnalytics = ({ userRole }: { userRole: string }) => {
  const { user } = useAuth();
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [supervisorAssignments, setSupervisorAssignments] = useState<SupervisorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');

  useEffect(() => {
    fetchAnalyticsData();
  }, [user, userRole]);

  const fetchAnalyticsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      if (userRole === 'supervisor') {
        // Obtener asignaciones del supervisor
        const { data: assignments, error: assignmentsError } = await supabase
          .from('supervisor_assignments')
          .select(`
            assigned_user_id,
            profiles!supervisor_assignments_assigned_user_id_fkey(
              full_name,
              email,
              company,
              area,
              section
            )
          `)
          .eq('supervisor_id', user.id);

        if (assignmentsError) throw assignmentsError;
        
        // Transformar los datos de asignaciones
        const transformedAssignments = assignments?.map(assignment => ({
          assigned_user_id: assignment.assigned_user_id,
          user_profile: assignment.profiles ? {
            full_name: assignment.profiles.full_name,
            email: assignment.profiles.email,
            company: assignment.profiles.company,
            area: assignment.profiles.area,
            section: assignment.profiles.section
          } : null
        })) || [];
        
        setSupervisorAssignments(transformedAssignments);

        // Obtener resultados solo de usuarios asignados
        const assignedUserIds = assignments?.map(a => a.assigned_user_id) || [];
        
        if (assignedUserIds.length > 0) {
          const { data: results, error: resultsError } = await supabase
            .from('exam_attempts')
            .select(`
              id,
              user_id,
              exam_id,
              score,
              completed_at,
              risk_analysis,
              exams!exam_attempts_exam_id_fkey(
                title
              )
            `)
            .in('user_id', assignedUserIds)
            .not('completed_at', 'is', null);

          if (resultsError) throw resultsError;

          // Obtener perfiles de usuarios por separado
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, company, area, section')
            .in('id', assignedUserIds);

          if (profilesError) throw profilesError;

          // Combinar los datos
          const transformedResults = results?.map(result => ({
            ...result,
            score: result.score || 0,
            user_profile: profiles?.find(p => p.id === result.user_id) || null,
            exam: result.exams || null
          })) || [];

          setExamResults(transformedResults);
        }
      } else {
        // Para admin y teacher, obtener todos los resultados
        const { data: results, error: resultsError } = await supabase
          .from('exam_attempts')
          .select(`
            id,
            user_id,
            exam_id,
            score,
            completed_at,
            risk_analysis,
            exams!exam_attempts_exam_id_fkey(
              title
            )
          `)
          .not('completed_at', 'is', null);

        if (resultsError) throw resultsError;

        // Obtener todos los perfiles de usuarios
        const userIds = results?.map(r => r.user_id) || [];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, company, area, section')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combinar los datos
        const transformedResults = results?.map(result => ({
          ...result,
          score: result.score || 0,
          user_profile: profiles?.find(p => p.id === result.user_id) || null,
          exam: result.exams || null
        })) || [];

        setExamResults(transformedResults);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Error al cargar los datos de análisis');
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = examResults.filter(result => {
    const matchesArea = selectedArea === 'all' || result.user_profile?.area === selectedArea;
    const matchesRisk = selectedRiskLevel === 'all' || getRiskLevel(result.risk_analysis) === selectedRiskLevel;
    return matchesArea && matchesRisk;
  });

  const getRiskLevel = (riskAnalysis: any): string => {
    if (!riskAnalysis) return 'bajo';
    // Implementar lógica para determinar nivel de riesgo
    const averageRisk = riskAnalysis.averageRisk || 0;
    if (averageRisk >= 70) return 'alto';
    if (averageRisk >= 40) return 'medio';
    return 'bajo';
  };

  const getUniqueAreas = () => {
    const areas = examResults
      .map(result => result.user_profile?.area)
      .filter(Boolean)
      .filter((area, index, self) => self.indexOf(area) === index);
    return areas;
  };

  const getRiskDistribution = () => {
    const distribution = { alto: 0, medio: 0, bajo: 0 };
    filteredResults.forEach(result => {
      const risk = getRiskLevel(result.risk_analysis);
      distribution[risk as keyof typeof distribution]++;
    });
    
    return [
      { name: 'Riesgo Alto', value: distribution.alto, color: '#ef4444' },
      { name: 'Riesgo Medio', value: distribution.medio, color: '#f59e0b' },
      { name: 'Riesgo Bajo', value: distribution.bajo, color: '#10b981' }
    ];
  };

  const getAreaDistribution = () => {
    const areaCount: { [key: string]: number } = {};
    filteredResults.forEach(result => {
      const area = result.user_profile?.area || 'Sin área';
      areaCount[area] = (areaCount[area] || 0) + 1;
    });

    return Object.entries(areaCount).map(([area, count]) => ({
      area,
      count
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando análisis...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Análisis de Datos</h2>
          <p className="text-muted-foreground">
            {userRole === 'supervisor' 
              ? 'Análisis de usuarios asignados' 
              : 'Análisis general del sistema'
            }
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Área</label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las áreas</SelectItem>
                  {getUniqueAreas().map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Nivel de Riesgo</label>
              <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  <SelectItem value="alto">Riesgo Alto</SelectItem>
                  <SelectItem value="medio">Riesgo Medio</SelectItem>
                  <SelectItem value="bajo">Riesgo Bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Evaluados</p>
                <p className="text-3xl font-bold">{filteredResults.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Riesgo Alto</p>
                <p className="text-3xl font-bold text-red-600">
                  {getRiskDistribution().find(d => d.name === 'Riesgo Alto')?.value || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Puntuación Promedio</p>
                <p className="text-3xl font-bold">
                  {filteredResults.length > 0 
                    ? Math.round(filteredResults.reduce((sum, r) => sum + (r.score || 0), 0) / filteredResults.length)
                    : 0
                  }
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Áreas Analizadas</p>
                <p className="text-3xl font-bold">{getUniqueAreas().length}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList>
          <TabsTrigger value="distribution">Distribución de Riesgo</TabsTrigger>
          <TabsTrigger value="areas">Por Áreas</TabsTrigger>
          <TabsTrigger value="detailed">Resultados Detallados</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Nivel de Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getRiskDistribution()}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {getRiskDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="areas">
          <Card>
            <CardHeader>
              <CardTitle>Evaluados por Área</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getAreaDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle>Resultados Detallados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredResults.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{result.user_profile?.full_name || 'Usuario desconocido'}</h4>
                        <p className="text-sm text-muted-foreground">{result.user_profile?.email || 'Email no disponible'}</p>
                      </div>
                      <Badge variant={
                        getRiskLevel(result.risk_analysis) === 'alto' ? 'destructive' :
                        getRiskLevel(result.risk_analysis) === 'medio' ? 'default' : 'secondary'
                      }>
                        Riesgo {getRiskLevel(result.risk_analysis)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Empresa:</span>
                        <p>{result.user_profile?.company || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Área:</span>
                        <p>{result.user_profile?.area || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Sección:</span>
                        <p>{result.user_profile?.section || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Puntuación:</span>
                        <p>{result.score || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="font-medium text-sm">Examen:</span>
                      <p className="text-sm">{result.exam?.title || 'N/A'}</p>
                    </div>
                    <div className="mt-2">
                      <span className="font-medium text-sm">Fecha de Completion:</span>
                      <p className="text-sm">
                        {result.completed_at 
                          ? new Date(result.completed_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                ))}
                
                {filteredResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No hay resultados que coincidan con los filtros seleccionados.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoleBasedAnalytics;

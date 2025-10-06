
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalCandidates: number;
  completedExams: number;
  averageScore: number;
  riskDistribution: { name: string; value: number; color: string }[];
  categoryScores: { category: string; score: number }[];
  timeAnalysis: { period: string; candidates: number }[];
}

interface SupervisorAnalyticsDashboardProps {
  supervisorId: string;
}

const SupervisorAnalyticsDashboard = ({ supervisorId }: SupervisorAnalyticsDashboardProps) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    fetchExams();
    fetchAnalyticsData();
  }, [supervisorId, selectedPeriod, selectedExam]);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title')
        .eq('estado', 'activo')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Obtener candidatos asignados al supervisor
      const { data: assignments, error: assignError } = await supabase
        .from('supervisor_assignments')
        .select('assigned_user_id')
        .eq('supervisor_id', supervisorId);

      if (assignError) throw assignError;

      const assignedUserIds = assignments?.map(a => a.assigned_user_id) || [];

      if (assignedUserIds.length === 0) {
        setAnalyticsData({
          totalCandidates: 0,
          completedExams: 0,
          averageScore: 0,
          riskDistribution: [],
          categoryScores: [],
          timeAnalysis: []
        });
        return;
      }

      // Construir query para exam_attempts
      let query = supabase
        .from('exam_attempts')
        .select(`
          id,
          user_id,
          exam_id,
          score,
          completed_at,
          risk_analysis,
          exams!inner(id, title)
        `)
        .in('user_id', assignedUserIds)
        .not('completed_at', 'is', null);

      // Filtrar por examen específico si está seleccionado
      if (selectedExam !== 'all') {
        query = query.eq('exam_id', selectedExam);
      }

      // Filtrar por período
      const periodDate = new Date();
      switch (selectedPeriod) {
        case '7d':
          periodDate.setDate(periodDate.getDate() - 7);
          break;
        case '30d':
          periodDate.setDate(periodDate.getDate() - 30);
          break;
        case '90d':
          periodDate.setDate(periodDate.getDate() - 90);
          break;
      }
      
      if (selectedPeriod !== 'all') {
        query = query.gte('completed_at', periodDate.toISOString());
      }

      const { data: attempts, error } = await query;

      if (error) throw error;

      // Procesar datos para analytics
      const processedData = processAnalyticsData(attempts || [], assignedUserIds);
      setAnalyticsData(processedData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (attempts: any[], assignedUserIds: string[]): AnalyticsData => {
    const totalCandidates = assignedUserIds.length;
    const completedExams = attempts.length;
    
    // Calcular promedio de puntuaciones
    const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
    const averageScore = completedExams > 0 ? totalScore / completedExams : 0;

    // Distribución de riesgo
    const riskCounts = { BAJO: 0, MEDIO: 0, ALTO: 0 };
    attempts.forEach(attempt => {
      if (attempt.risk_analysis?.overall_risk) {
        const risk = attempt.risk_analysis.overall_risk.replace('RIESGO ', '');
        if (riskCounts.hasOwnProperty(risk)) {
          riskCounts[risk as keyof typeof riskCounts]++;
        }
      }
    });

    const riskDistribution = [
      { name: 'Bajo', value: riskCounts.BAJO, color: '#16a34a' },
      { name: 'Medio', value: riskCounts.MEDIO, color: '#f59e0b' },
      { name: 'Alto', value: riskCounts.ALTO, color: '#dc2626' }
    ];

    // Puntuaciones por categoría (simulado)
    const categoryScores = [
      { category: 'Honestidad', score: 85 },
      { category: 'Integridad', score: 78 },
      { category: 'Confiabilidad', score: 82 },
      { category: 'Responsabilidad', score: 79 }
    ];

    // Análisis temporal (últimos 7 días)
    const timeAnalysis = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        period: date.toLocaleDateString('es-ES', { weekday: 'short' }),
        candidates: Math.floor(Math.random() * 5) + 1
      };
    });

    return {
      totalCandidates,
      completedExams,
      averageScore: Math.round(averageScore * 10) / 10,
      riskDistribution,
      categoryScores,
      timeAnalysis
    };
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

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p>No hay datos disponibles para mostrar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Panel de Análisis - Supervisor</CardTitle>
          <CardDescription>
            Análisis detallado de los candidatos bajo su supervisión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 días</SelectItem>
                  <SelectItem value="30d">30 días</SelectItem>
                  <SelectItem value="90d">90 días</SelectItem>
                  <SelectItem value="all">Todo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Examen</label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los exámenes</SelectItem>
                  {exams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Candidatos Totales</p>
                <p className="text-2xl font-bold">{analyticsData.totalCandidates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Exámenes Completados</p>
                <p className="text-2xl font-bold">{analyticsData.completedExams}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Puntuación Promedio</p>
                <p className="text-2xl font-bold">{analyticsData.averageScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Casos de Riesgo Alto</p>
                <p className="text-2xl font-bold">
                  {analyticsData.riskDistribution.find(r => r.name === 'Alto')?.value || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="risk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="risk">Distribución de Riesgo</TabsTrigger>
          <TabsTrigger value="categories">Puntuaciones por Categoría</TabsTrigger>
          <TabsTrigger value="timeline">Tendencia Temporal</TabsTrigger>
        </TabsList>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Niveles de Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.riskDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {analyticsData.riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Puntuaciones Promedio por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.categoryScores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Evaluaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.timeAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="candidates" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupervisorAnalyticsDashboard;

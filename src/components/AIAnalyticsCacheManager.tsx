import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Brain, Clock, User, Database, Trash2, BarChart3, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AnalysisCache {
  id: string;
  user_id: string;
  exam_id?: string;
  psychometric_test_id?: string;
  analysis_type: 'ocean' | 'reliability';
  tokens_used?: number;
  model_used?: string;
  requested_by: string;
  generated_at: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  // Datos relacionados
  user_name?: string;
  user_email?: string;
  exam_title?: string;
  test_name?: string;
  requester_name?: string;
}

interface CacheStats {
  total: number;
  ocean: number;
  reliability: number;
  active: number;
  expired: number;
  totalTokens: number;
}

const AIAnalyticsCacheManager = () => {
  const [cacheData, setCacheData] = useState<AnalysisCache[]>([]);
  const [stats, setStats] = useState<CacheStats>({
    total: 0,
    ocean: 0,
    reliability: 0,
    active: 0,
    expired: 0,
    totalTokens: 0
  });
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const fetchCacheData = async () => {
    try {
      setLoading(true);
      
      // Obtener datos del cache
      const { data: cacheResults, error } = await supabase
        .from('ai_analysis_cache')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) {
        console.error('Error fetching cache data:', error);
        toast.error('Error al cargar datos del cache');
        return;
      }

      // Obtener información adicional para cada registro
      const transformedData: AnalysisCache[] = [];
      
      for (const item of cacheResults || []) {
        // Obtener información del usuario
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', item.user_id)
          .single();

        // Obtener información del examen si existe
        let examTitle = '';
        if (item.exam_id) {
          const { data: examData } = await supabase
            .from('exams')
            .select('title')
            .eq('id', item.exam_id)
            .single();
          examTitle = examData?.title || '';
        }

        // Obtener información del test psicométrico si existe
        let testName = '';
        if (item.psychometric_test_id) {
          const { data: testData } = await supabase
            .from('psychometric_tests')
            .select('name')
            .eq('id', item.psychometric_test_id)
            .single();
          testName = testData?.name || '';
        }

        // Obtener información del solicitante
        const { data: requesterProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', item.requested_by)
          .single();

        transformedData.push({
          ...item,
          analysis_type: item.analysis_type as 'ocean' | 'reliability',
          user_name: userProfile?.full_name,
          user_email: userProfile?.email,
          exam_title: examTitle,
          test_name: testName,
          requester_name: requesterProfile?.full_name
        });
      }

      setCacheData(transformedData);

      // Calcular estadísticas
      const now = new Date();
      const newStats = transformedData.reduce((acc, item) => {
        acc.total++;
        if (item.analysis_type === 'ocean') acc.ocean++;
        if (item.analysis_type === 'reliability') acc.reliability++;
        if (item.is_active) acc.active++;
        if (item.expires_at && new Date(item.expires_at) < now) acc.expired++;
        if (item.tokens_used) acc.totalTokens += item.tokens_used;
        return acc;
      }, {
        total: 0,
        ocean: 0,
        reliability: 0,
        active: 0,
        expired: 0,
        totalTokens: 0
      });

      setStats(newStats);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar el cache de análisis');
    } finally {
      setLoading(false);
    }
  };

  const cleanExpiredCache = async () => {
    try {
      setCleaning(true);
      
      const { data, error } = await supabase
        .rpc('cleanup_expired_ai_analysis_cache');

      if (error) {
        console.error('Error cleaning cache:', error);
        toast.error('Error al limpiar cache expirado');
        return;
      }

      toast.success(`Cache limpiado: ${data || 0} registros marcados como inactivos`);
      await fetchCacheData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al limpiar cache');
    } finally {
      setCleaning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getTypeIcon = (type: string) => {
    return type === 'ocean' ? <Brain className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />;
  };

  const getTypeBadge = (type: string) => {
    const variant = type === 'ocean' ? 'default' : 'secondary';
    const label = type === 'ocean' ? 'OCEAN' : 'Confiabilidad';
    return <Badge variant={variant}>{label}</Badge>;
  };

  useEffect(() => {
    fetchCacheData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Cargando cache de análisis...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.ocean}</div>
            <div className="text-sm text-muted-foreground">OCEAN</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.reliability}</div>
            <div className="text-sm text-muted-foreground">Confiabilidad</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Activos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
            <div className="text-sm text-muted-foreground">Expirados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalTokens.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Tokens</div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gestión del Cache de Análisis IA
          </CardTitle>
          <CardDescription>
            Administra el cache de análisis generados por OpenAI para optimizar el consumo de tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={fetchCacheData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={cleaning}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {cleaning ? 'Limpiando...' : 'Limpiar Expirados'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Limpiar cache expirado?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción marcará como inactivos todos los análisis expirados. 
                    Los análisis no se eliminarán permanentemente, solo se desactivarán.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={cleanExpiredCache}>
                    Limpiar Cache
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Lista de análisis */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis en Cache</CardTitle>
          <CardDescription>
            Histórico de análisis generados y almacenados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
              <TabsTrigger value="ocean">OCEAN ({stats.ocean})</TabsTrigger>
              <TabsTrigger value="reliability">Confiabilidad ({stats.reliability})</TabsTrigger>
              <TabsTrigger value="expired">Expirados ({stats.expired})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {cacheData.map((item) => (
                <CacheItem key={item.id} item={item} />
              ))}
            </TabsContent>

            <TabsContent value="ocean" className="space-y-4 mt-4">
              {cacheData.filter(item => item.analysis_type === 'ocean').map((item) => (
                <CacheItem key={item.id} item={item} />
              ))}
            </TabsContent>

            <TabsContent value="reliability" className="space-y-4 mt-4">
              {cacheData.filter(item => item.analysis_type === 'reliability').map((item) => (
                <CacheItem key={item.id} item={item} />
              ))}
            </TabsContent>

            <TabsContent value="expired" className="space-y-4 mt-4">
              {cacheData.filter(item => isExpired(item.expires_at)).map((item) => (
                <CacheItem key={item.id} item={item} />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const CacheItem = ({ item }: { item: AnalysisCache }) => {
  const isItemExpired = item.expires_at && new Date(item.expires_at) < new Date();

  return (
    <Card className={`${!item.is_active || isItemExpired ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <Badge variant={item.analysis_type === 'ocean' ? 'default' : 'secondary'}>
                  {item.analysis_type === 'ocean' ? 'OCEAN' : 'Confiabilidad'}
                </Badge>
                {!item.is_active && <Badge variant="destructive">Inactivo</Badge>}
                {isItemExpired && <Badge variant="outline">Expirado</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  Usuario
                </div>
                <div className="font-medium">{item.user_name || 'Sin nombre'}</div>
                <div className="text-xs text-muted-foreground">{item.user_email}</div>
              </div>

              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <BarChart3 className="h-3 w-3" />
                  Evaluación
                </div>
                <div className="font-medium">
                  {item.exam_title || item.test_name || 'Sin título'}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Generado
                </div>
                <div className="font-medium">
                  {new Date(item.generated_at).toLocaleDateString('es-ES')}
                </div>
                <div className="text-xs text-muted-foreground">
                  por {item.requester_name || 'Sistema'}
                </div>
              </div>
            </div>

            {item.model_used && (
              <div className="text-xs text-muted-foreground">
                Modelo: {item.model_used}
                {item.tokens_used && ` • ${item.tokens_used.toLocaleString()} tokens`}
              </div>
            )}

            {item.expires_at && (
              <div className="text-xs text-muted-foreground">
                Expira: {new Date(item.expires_at).toLocaleDateString('es-ES')}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIAnalyticsCacheManager;
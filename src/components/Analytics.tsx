import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PsychometricResultsViewer from "./PsychometricResultsViewer";

interface AnalyticsProps {
  userRole: string;
}

interface EvaluatedUser {
  id: string;
  user_id: string;
  session_id: string;
  full_name: string;
  email: string;
  created_at: string;
}

const Analytics = ({ userRole }: AnalyticsProps) => {
  const [evaluatedUsers, setEvaluatedUsers] = useState<EvaluatedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvaluatedUsers();
  }, []);

  const fetchEvaluatedUsers = async () => {
    try {
      setLoading(true);

      // Obtener los resultados psicométricos únicos por usuario (el más reciente)
      const { data: results, error: resultsError } = await supabase
        .from('personality_results')
        .select(`
          id,
          user_id,
          session_id,
          apertura_score,
          responsabilidad_score,
          extraversion_score,
          amabilidad_score,
          neuroticismo_score,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (resultsError) throw resultsError;

      if (!results || results.length === 0) {
        setEvaluatedUsers([]);
        setLoading(false);
        return;
      }

      // Obtener los user_ids únicos
      const userIds = [...new Set(results.map(result => result.user_id))];

      // Obtener los perfiles de los usuarios
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combinar los datos y eliminar duplicados por usuario (mantener el más reciente)
      const userMap = new Map<string, EvaluatedUser>();
      
      results.forEach(result => {
        const profile = profiles?.find(p => p.id === result.user_id);
        if (profile && (!userMap.has(result.user_id) || 
            new Date(result.created_at) > new Date(userMap.get(result.user_id)!.created_at))) {
          userMap.set(result.user_id, {
            id: result.id,
            user_id: result.user_id,
            session_id: result.session_id,
            full_name: profile.full_name || 'Usuario sin nombre',
            email: profile.email || 'Sin email',
            created_at: result.created_at
          });
        }
      });

      const uniqueUsers = Array.from(userMap.values());
      setEvaluatedUsers(uniqueUsers);

      // Auto-seleccionar el usuario cecycastiyo@gmail.com si existe
      const ceciliaUser = uniqueUsers.find(user => user.email === 'cecycastiyo@gmail.com');
      if (ceciliaUser) {
        setSelectedUser(ceciliaUser.user_id);
        setSelectedSessionId(ceciliaUser.session_id);
      } else if (uniqueUsers.length > 0) {
        setSelectedUser(uniqueUsers[0].user_id);
        setSelectedSessionId(uniqueUsers[0].session_id);
      }

    } catch (error) {
      console.error('Error fetching evaluated users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios evaluados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (userId: string) => {
    const selectedUserData = evaluatedUsers.find(user => user.user_id === userId);
    if (selectedUserData) {
      setSelectedUser(userId);
      setSelectedSessionId(selectedUserData.session_id);
    }
  };

  const getSelectedUserInfo = () => {
    return evaluatedUsers.find(user => user.user_id === selectedUser);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando análisis psicométricos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Análisis Psicométrico para Selección de Personal</h1>
          <p className="text-muted-foreground">
            Evaluación integral de candidatos: personalidad, capacidades cognitivas y competencias laborales
          </p>
        </div>
      </div>

      {/* Selector de Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Seleccionar Candidato Evaluado
          </CardTitle>
          <CardDescription>
            Elige un candidato que haya completado la evaluación psicométrica para ver su análisis detallado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Candidato</label>
                <Select value={selectedUser} onValueChange={handleUserChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar candidato evaluado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {evaluatedUsers.length === 0 ? (
                      <SelectItem value="no-users" disabled>
                        No hay usuarios evaluados disponibles
                      </SelectItem>
                    ) : (
                      evaluatedUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.full_name} - {user.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedUser && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Información de la Evaluación</label>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Candidato:</strong> {getSelectedUserInfo()?.full_name}</p>
                    <p><strong>Email:</strong> {getSelectedUserInfo()?.email}</p>
                    <p><strong>Fecha:</strong> {getSelectedUserInfo()?.created_at ? new Date(getSelectedUserInfo()!.created_at).toLocaleDateString('es-ES') : 'No disponible'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mostrar resultados si hay usuario seleccionado */}
      {selectedUser && selectedSessionId ? (
        <PsychometricResultsViewer 
          sessionId={selectedSessionId}
        />
      ) : evaluatedUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay evaluaciones disponibles</h3>
            <p className="text-muted-foreground mb-4">
              Aún no hay candidatos que hayan completado evaluaciones psicométricas.
            </p>
            <p className="text-sm text-muted-foreground">
              Las evaluaciones aparecerán aquí una vez que los candidatos completen sus tests psicométricos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Selecciona un candidato</h3>
            <p className="text-muted-foreground">
              Selecciona un candidato evaluado de la lista anterior para ver su análisis psicométrico detallado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
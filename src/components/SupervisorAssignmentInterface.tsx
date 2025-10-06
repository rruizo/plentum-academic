
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, UserPlus, Users, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MassExamAssignment from './supervisor-assignment/MassExamAssignment';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  company: string;
  area: string;
  section: string;
  role: string;
}

interface Assignment {
  id: string;
  supervisor_id: string;
  assigned_user_id: string;
  supervisor_profile: Profile;
  assigned_profile: Profile;
}

const SupervisorAssignmentInterface = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch assignments with profile data
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('supervisor_assignments')
        .select(`
          id,
          supervisor_id,
          assigned_user_id,
          supervisor:profiles!supervisor_assignments_supervisor_id_fkey(
            id, full_name, email, company, area, section, role
          ),
          assigned:profiles!supervisor_assignments_assigned_user_id_fkey(
            id, full_name, email, company, area, section, role
          )
        `);

      if (assignmentsError) throw assignmentsError;

      // Transform the data
      const transformedAssignments = assignmentsData?.map(assignment => ({
        id: assignment.id,
        supervisor_id: assignment.supervisor_id,
        assigned_user_id: assignment.assigned_user_id,
        supervisor_profile: assignment.supervisor as Profile,
        assigned_profile: assignment.assigned as Profile
      })) || [];

      setAssignments(transformedAssignments);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedSupervisor || !selectedUser) {
      toast.error('Seleccione un supervisor y un usuario');
      return;
    }

    if (selectedSupervisor === selectedUser) {
      toast.error('Un usuario no puede ser supervisor de sí mismo');
      return;
    }

    // Check if assignment already exists
    const existingAssignment = assignments.find(
      a => a.supervisor_id === selectedSupervisor && a.assigned_user_id === selectedUser
    );

    if (existingAssignment) {
      toast.error('Esta asignación ya existe');
      return;
    }

    try {
      const { error } = await supabase
        .from('supervisor_assignments')
        .insert({
          supervisor_id: selectedSupervisor,
          assigned_user_id: selectedUser
        });

      if (error) throw error;

      toast.success('Asignación creada exitosamente');
      setSelectedSupervisor('');
      setSelectedUser('');
      fetchData();

    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Error al crear la asignación');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('supervisor_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Asignación eliminada exitosamente');
      fetchData();

    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Error al eliminar la asignación');
    }
  };

  const supervisors = profiles.filter(p => p.role === 'supervisor');
  const users = profiles.filter(p => p.role !== 'admin');

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando asignaciones...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Asignación de Supervisores</h2>
        <p className="text-muted-foreground">
          Asigne usuarios a supervisores y gestione exámenes masivos
        </p>
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments">
            <Users className="h-4 w-4 mr-2" />
            Asignaciones de Supervisores
          </TabsTrigger>
          <TabsTrigger value="mass-exams">
            <Send className="h-4 w-4 mr-2" />
            Asignación Masiva de Exámenes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-6">
          {/* Form to create new assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Nueva Asignación de Supervisor
              </CardTitle>
              <CardDescription>
                Seleccione un supervisor y un usuario para crear una nueva asignación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Supervisor</label>
                  <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map(supervisor => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.full_name} ({supervisor.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Usuario a Asignar</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter(user => user.id !== selectedSupervisor)
                        .map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                            <Badge variant="secondary" className="ml-2">
                              {user.role}
                            </Badge>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={handleCreateAssignment} className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Crear Asignación
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Asignaciones Actuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay asignaciones configuradas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{assignment.supervisor_profile.full_name}</p>
                          <p className="text-sm text-muted-foreground">{assignment.supervisor_profile.email}</p>
                          <Badge variant="outline" className="mt-1">Supervisor</Badge>
                        </div>
                        <div className="text-muted-foreground">→</div>
                        <div>
                          <p className="font-medium">{assignment.assigned_profile.full_name}</p>
                          <p className="text-sm text-muted-foreground">{assignment.assigned_profile.email}</p>
                          <Badge variant="secondary" className="mt-1">
                            {assignment.assigned_profile.role}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mass-exams">
          <MassExamAssignment />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupervisorAssignmentInterface;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Eye, Calendar, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as UserType } from '@/hooks/exam-assignment/types';

interface ExistingAssignment {
  id: string;
  exam_id?: string;
  psychometric_test_id?: string;
  test_type: string;
  status: string;
  assigned_at: string;
  notified_at?: string;
  manual_delivery: boolean;
  exam_title?: string;
  psychometric_test_name?: string;
  user_id: string;
  user_name: string;
  user_email: string;
}

interface ExistingAssignmentsManagerProps {
  users: UserType[];
  onRefresh: () => void;
}

const ExistingAssignmentsManager: React.FC<ExistingAssignmentsManagerProps> = ({ users, onRefresh }) => {
  const [assignments, setAssignments] = useState<ExistingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  useEffect(() => {
    loadExistingAssignments();
  }, [users]);

  const loadExistingAssignments = async () => {
    if (users.length === 0) return;
    
    setLoading(true);
    try {
      const userIds = users.map(u => u.id);
      
      // Obtener asignaciones de exámenes de confiabilidad
      const { data: examAssignments, error: examError } = await supabase
        .from('exam_assignments')
        .select(`
          id,
          exam_id,
          psychometric_test_id,
          test_type,
          status,
          assigned_at,
          notified_at,
          manual_delivery,
          user_id,
          exams(title),
          psychometric_tests(name)
        `)
        .in('user_id', userIds)
        .order('assigned_at', { ascending: false });

      if (examError) throw examError;

      // Obtener información de usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (usersError) throw usersError;

      const usersMap = (usersData || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, any>);

      const processedAssignments: ExistingAssignment[] = (examAssignments || []).map(assignment => {
        const userInfo = usersMap[assignment.user_id];
        return {
          id: assignment.id,
          exam_id: assignment.exam_id,
          psychometric_test_id: assignment.psychometric_test_id,
          test_type: assignment.test_type,
          status: assignment.status,
          assigned_at: assignment.assigned_at,
          notified_at: assignment.notified_at,
          manual_delivery: assignment.manual_delivery,
          exam_title: assignment.exams?.title,
          psychometric_test_name: assignment.psychometric_tests?.name,
          user_id: assignment.user_id,
          user_name: userInfo?.full_name || 'Usuario desconocido',
          user_email: userInfo?.email || 'Email desconocido'
        };
      });

      // Obtener asignaciones HTP
      const { data: htpAssignments, error: htpError } = await supabase
        .from('htp_assignments')
        .select(`
          id,
          status,
          created_at,
          user_id
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (htpError) throw htpError;

      const htpProcessedAssignments: ExistingAssignment[] = (htpAssignments || []).map(assignment => {
        const userInfo = usersMap[assignment.user_id];
        return {
          id: assignment.id,
          test_type: 'htp',
          status: assignment.status,
          assigned_at: assignment.created_at,
          manual_delivery: false,
          exam_title: 'HTP (House-Tree-Person)',
          user_id: assignment.user_id,
          user_name: userInfo?.full_name || 'Usuario desconocido',
          user_email: userInfo?.email || 'Email desconocido'
        };
      });

      setAssignments([...processedAssignments, ...htpProcessedAssignments]);
    } catch (error) {
      console.error('Error loading existing assignments:', error);
      toast.error('Error al cargar asignaciones existentes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string, testType: string) => {
    setDeleting(assignmentId);
    try {
      const tableName = testType === 'htp' ? 'htp_assignments' : 'exam_assignments';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Asignación eliminada exitosamente');
      loadExistingAssignments();
      onRefresh();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Error al eliminar la asignación');
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateStatus = async (assignmentId: string, newStatus: string, testType: string) => {
    setEditingStatus(assignmentId);
    try {
      const tableName = testType === 'htp' ? 'htp_assignments' : 'exam_assignments';
      
      const updateData: any = { status: newStatus };
      if (newStatus === 'notified') {
        updateData.notified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Estado actualizado exitosamente');
      loadExistingAssignments();
      onRefresh();
    } catch (error) {
      console.error('Error updating assignment status:', error);
      toast.error('Error al actualizar el estado');
    } finally {
      setEditingStatus(null);
    }
  };

  const getStatusBadge = (status: string, manualDelivery: boolean) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>;
      case 'notified':
        return <Badge className={manualDelivery ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}>
          {manualDelivery ? 'Entrega Manual' : 'Notificado'}
        </Badge>;
      case 'started':
        return <Badge className="bg-blue-100 text-blue-800">Iniciado</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTestTypeLabel = (testType: string, examTitle?: string, psychometricName?: string) => {
    if (testType === 'htp') return 'HTP (House-Tree-Person)';
    if (testType === 'psychometric') return psychometricName || 'Test Psicométrico';
    if (testType === 'reliability') return examTitle || 'Examen de Confiabilidad';
    return examTitle || psychometricName || 'Examen';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Asignaciones Existentes
          </CardTitle>
          <CardDescription>
            Los usuarios seleccionados no tienen asignaciones previas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            No se encontraron asignaciones existentes para los usuarios seleccionados
          </p>
        </CardContent>
      </Card>
    );
  }

  const groupedAssignments = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.user_id]) {
      acc[assignment.user_id] = {
        user: { name: assignment.user_name, email: assignment.user_email },
        assignments: []
      };
    }
    acc[assignment.user_id].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { user: { name: string; email: string }, assignments: ExistingAssignment[] }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Asignaciones Existentes ({assignments.length})
        </CardTitle>
        <CardDescription>
          Gestiona las asignaciones actuales de los usuarios seleccionados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedAssignments).map(([userId, userData]) => (
            <div key={userId} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4" />
                <div>
                  <p className="font-medium">{userData.user.name}</p>
                  <p className="text-sm text-muted-foreground">{userData.user.email}</p>
                </div>
              </div>
              
              <div className="grid gap-2">
                {userData.assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {getTestTypeLabel(assignment.test_type, assignment.exam_title, assignment.psychometric_test_name)}
                        </span>
                        {getStatusBadge(assignment.status, assignment.manual_delivery)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Asignado: {new Date(assignment.assigned_at).toLocaleDateString('es-ES')}
                        </span>
                        {assignment.notified_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Notificado: {new Date(assignment.notified_at).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        value={assignment.status}
                        onValueChange={(newStatus) => handleUpdateStatus(assignment.id, newStatus, assignment.test_type)}
                        disabled={editingStatus === assignment.id}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="notified">Notificado</SelectItem>
                          <SelectItem value="started">Iniciado</SelectItem>
                          <SelectItem value="completed">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={deleting === assignment.id}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que deseas eliminar esta asignación? 
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAssignment(assignment.id, assignment.test_type)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExistingAssignmentsManager;
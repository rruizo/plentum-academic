import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckSquare, Users, Mail, AlertTriangle, TestTube, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User } from '@/hooks/useUserManagement';
import ExistingAssignmentsManager from '@/components/exam-assignment/ExistingAssignmentsManager';

interface BulkExamAssignmentProps {
  users: User[];
  selectedUsers: string[];
  onSelectionChange: (userIds: string[]) => void;
}

interface Exam {
  id: string;
  title: string;
  estado: string;
  type: string;
}

const BulkExamAssignment = ({ users, selectedUsers, onSelectionChange }: BulkExamAssignmentProps) => {
  const [open, setOpen] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [assigningExams, setAssigningExams] = useState(false);
  const [showExistingAssignments, setShowExistingAssignments] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [includeTurnoverExam, setIncludeTurnoverExam] = useState(false);
  const [turnoverExam, setTurnoverExam] = useState<Exam | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [usersAlreadyAssigned, setUsersAlreadyAssigned] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchExams();
    }
  }, [open]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      // Obtener exámenes de confiabilidad
      const { data: confiabilidadData, error: confiabilidadError } = await supabase
        .from('exams')
        .select('id, title, estado, type')
        .eq('type', 'confiabilidad')
        .order('created_at', { ascending: false });

      if (confiabilidadError) throw confiabilidadError;
      
      setExams(confiabilidadData || []);
      
      // Verificar si existen preguntas de rotación de personal activas
      const { data: turnoverQuestions, error: turnoverError } = await supabase
        .from('turnover_risk_questions')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (!turnoverError && turnoverQuestions && turnoverQuestions.length > 0) {
        // Marcar que hay evaluación de turnover disponible
        setTurnoverExam({
          id: null, // No hay ID de examen real
          title: 'Evaluación de Rotación de Personal',
          estado: 'activo',
          type: 'turnover'
        });
      } else {
        setTurnoverExam(null);
      }
    } catch (error: any) {
      console.error('Error fetching exámenes:', error);
      toast.error('Error al cargar exámenes');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique companies from users
  const companies = Array.from(new Set(users.map(user => user.company).filter(c => c && c.trim() !== '')));
  
  // Filter users by company
  const filteredUsers = companyFilter === 'all' 
    ? users 
    : users.filter(user => user.company === companyFilter);

  const handleSelectAll = () => {
    const currentFilteredIds = filteredUsers.map(user => user.id);
    if (selectedUsers.length === currentFilteredIds.length && 
        currentFilteredIds.every(id => selectedUsers.includes(id))) {
      onSelectionChange([]);
    } else {
      onSelectionChange(currentFilteredIds);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUsers, userId]);
    } else {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleBulkAssign = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecciona al menos un usuario');
      return;
    }

    setAssigningExams(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('Usuario no autenticado');
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      let alreadyAssignedCount = 0;
      const usersToNotify: string[] = [];

      // Procesar cada usuario individualmente
      for (const userId of selectedUsers) {
        let userHasNewAssignments = false;
        
        try {
          // 1. Asignar examen de confiabilidad seleccionado (si se seleccionó uno)
          if (selectedExam && selectedExam !== 'none') {
            const { data: existingAssignment } = await supabase
              .from('exam_assignments')
              .select('id')
              .eq('user_id', userId)
              .eq('exam_id', selectedExam)
              .eq('test_type', 'reliability')
              .maybeSingle();

            if (!existingAssignment) {
              const { error: reliabilityError } = await supabase
                .from('exam_assignments')
                .insert({
                  user_id: userId,
                  exam_id: selectedExam,
                  assigned_by: currentUser.id,
                  test_type: 'reliability',
                  status: 'pending'
                });

              if (reliabilityError) {
                throw reliabilityError;
              }
              userHasNewAssignments = true;
            } else {
              console.log(`Usuario ${userId} ya tiene asignado el examen de confiabilidad`);
            }
          }

          // 2. Asignar examen de rotación de personal si está seleccionado
          if (includeTurnoverExam) {
            const { data: existingTurnover } = await supabase
              .from('exam_assignments')
              .select('id')
              .eq('user_id', userId)
              .eq('test_type', 'turnover')
              .is('exam_id', null)
              .maybeSingle();

            if (!existingTurnover) {
              const { error: turnoverError } = await supabase
                .from('exam_assignments')
                .insert({
                  user_id: userId,
                  exam_id: null,
                  assigned_by: currentUser.id,
                  test_type: 'turnover',
                  status: 'pending'
                });

              if (turnoverError) {
                console.error('Error asignando turnover:', turnoverError);
                throw turnoverError;
              }
              userHasNewAssignments = true;
            } else {
              console.log(`Usuario ${userId} ya tiene asignado el examen de turnover`);
            }
          }

          // 3. Asignar automáticamente Ocean Five
          const { data: oceanTest } = await supabase
            .from('psychometric_tests')
            .select('id')
            .eq('name', 'Ocean Five')
            .limit(1)
            .maybeSingle();

          if (oceanTest) {
            const { data: existingPsychometric } = await supabase
              .from('exam_assignments')
              .select('id')
              .eq('user_id', userId)
              .eq('psychometric_test_id', oceanTest.id)
              .eq('test_type', 'psychometric')
              .maybeSingle();

            if (!existingPsychometric) {
              const { error: oceanError } = await supabase
                .from('exam_assignments')
                .insert({
                  user_id: userId,
                  psychometric_test_id: oceanTest.id,
                  assigned_by: currentUser.id,
                  test_type: 'psychometric',
                  status: 'pending'
                });

              if (oceanError) {
                throw oceanError;
              }
              userHasNewAssignments = true;
            } else {
              console.log(`Usuario ${userId} ya tiene asignado Ocean Five`);
            }
          }

          // 4. Asignar HTP automáticamente
          const { data: existingHtp } = await supabase
            .from('htp_assignments')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (!existingHtp) {
            const { error: htpError } = await supabase
              .from('htp_assignments')
              .insert({
                user_id: userId,
                assigned_by: currentUser.id,
                access_link: `${window.location.origin}/htp-exam/${crypto.randomUUID()}`,
                status: 'pending',
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              });

            if (htpError) {
              throw htpError;
            }
            userHasNewAssignments = true;
          } else {
            console.log(`Usuario ${userId} ya tiene asignado HTP`);
          }

          if (userHasNewAssignments) {
            successCount++;
            usersToNotify.push(userId);
          } else {
            alreadyAssignedCount++;
          }
        } catch (userError: any) {
          console.error(`Error assigning exams to user ${userId}:`, userError);
          errorCount++;
        }
      }

      // Enviar correos electrónicos con credenciales
      if (usersToNotify.length > 0) {
        toast.info('Enviando notificaciones por correo electrónico...');
        
        try {
          const { error: emailError } = await supabase.functions.invoke('send-exam-notifications', {
            body: { 
              userIds: usersToNotify,
              examId: selectedExam !== 'none' ? selectedExam : null,
              includesTurnover: includeTurnoverExam
            }
          });

          if (emailError) {
            console.error('Error enviando notificaciones:', emailError);
            toast.warning('Asignaciones creadas pero error al enviar algunos correos');
          }
        } catch (emailError) {
          console.error('Error en función de correos:', emailError);
          toast.warning('Asignaciones creadas pero error al enviar correos');
        }
      }

      // Mostrar resultados
      if (successCount > 0) {
        const assignedExams = [];
        if (selectedExam && selectedExam !== 'none') assignedExams.push('Confiabilidad');
        if (includeTurnoverExam) assignedExams.push('Rotación de Personal');
        assignedExams.push('Ocean Five', 'HTP');
        
        toast.success(
          `Exámenes asignados a ${successCount} usuario(s). ${alreadyAssignedCount > 0 ? `${alreadyAssignedCount} ya tenían asignaciones.` : ''}`
        );
        toast.info(`Asignados: ${assignedExams.join(', ')}`);
        setOpen(false);
        onSelectionChange([]);
      } else if (alreadyAssignedCount > 0) {
        // Todos los usuarios ya tienen asignaciones, preguntar si desea reenviar
        setUsersAlreadyAssigned(selectedUsers);
        setShowResendConfirm(true);
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} asignaciones fallaron. Revisa la consola para más detalles.`);
      }
      
    } catch (error: any) {
      console.error('Error assigning exams:', error);
      toast.error('Error crítico al asignar exámenes');
    } finally {
      setAssigningExams(false);
    }
  };

  const handleResendWithNewCredentials = async () => {
    setShowResendConfirm(false);
    setAssigningExams(true);

    try {
      // Eliminar credenciales existentes para estos usuarios
      const usersData = users.filter(u => usersAlreadyAssigned.includes(u.id));
      const userEmails = usersData.map(u => u.email);

      // Eliminar credenciales antiguas
      const { error: deleteError } = await supabase
        .from('exam_credentials')
        .delete()
        .in('user_email', userEmails);

      if (deleteError) {
        console.error('Error eliminando credenciales antiguas:', deleteError);
      }

      // Enviar correos con nuevas credenciales
      toast.info('Generando nuevas credenciales y enviando correos...');

      const { error: emailError } = await supabase.functions.invoke('send-exam-notifications', {
        body: { 
          userIds: usersAlreadyAssigned,
          examId: selectedExam !== 'none' ? selectedExam : null,
          includesTurnover: includeTurnoverExam
        }
      });

      if (emailError) {
        console.error('Error enviando notificaciones:', emailError);
        toast.error('Error al enviar correos con nuevas credenciales');
      } else {
        toast.success(`Correos reenviados con nuevas credenciales a ${usersAlreadyAssigned.length} usuario(s)`);
        setOpen(false);
        onSelectionChange([]);
      }
    } catch (error) {
      console.error('Error reenviando credenciales:', error);
      toast.error('Error al generar nuevas credenciales');
    } finally {
      setAssigningExams(false);
      setUsersAlreadyAssigned([]);
    }
  };

  const handleCancelResend = () => {
    setShowResendConfirm(false);
    setUsersAlreadyAssigned([]);
    setAssigningExams(false);
  };

  const getExamStatusBadge = (estado: string) => {
    if (estado === 'activo') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Activo</Badge>;
    }
    return <Badge variant="outline" className="bg-red-100 text-red-800">Inactivo</Badge>;
  };

  const getExamTypeBadge = (type: string) => {
    if (type === 'turnover') {
      return <Badge variant="secondary" className="ml-2">Rotación</Badge>;
    }
    return <Badge variant="outline" className="ml-2">Confiabilidad</Badge>;
  };

  return (
    <>
      <AlertDialog open={showResendConfirm} onOpenChange={setShowResendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuarios con exámenes ya asignados</AlertDialogTitle>
            <AlertDialogDescription>
              Todos los usuarios seleccionados ({usersAlreadyAssigned.length}) ya tienen los exámenes asignados.
              <br /><br />
              <strong>¿Desea enviarles el correo nuevamente con nuevas credenciales?</strong>
              <br /><br />
              <span className="text-yellow-600">
                Nota: Esto generará nuevas credenciales de acceso y las anteriores dejarán de funcionar.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelResend} disabled={assigningExams}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResendWithNewCredentials} disabled={assigningExams}>
              {assigningExams ? 'Enviando...' : 'Sí, enviar con nuevas credenciales'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <TestTube className="h-4 w-4" />
          Asignación Múltiple de Exámenes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Asignación Múltiple de Exámenes
          </DialogTitle>
          <DialogDescription>
            Asigna exámenes de confiabilidad, rotación de personal, Ocean Five y HTP a múltiples usuarios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Botón para ver asignaciones existentes */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Gestión de Exámenes</h3>
              <p className="text-sm text-muted-foreground">Asignar nuevos exámenes o gestionar asignaciones existentes</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowExistingAssignments(!showExistingAssignments)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {showExistingAssignments ? 'Ocultar' : 'Ver'} Asignaciones
            </Button>
          </div>

          {/* Mostrar asignaciones existentes si está habilitado */}
          {showExistingAssignments && (
            <ExistingAssignmentsManager 
              users={users.map(user => ({
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                company: user.company,
                area: user.area,
                section: user.section,
                role: user.role,
                can_login: user.can_login,
                access_restricted: false // Por defecto false para este contexto
              }))}
              onRefresh={() => {}} // Aquí puedes agregar lógica de refresh si es necesario
            />
          )}

          {/* Selección de Examen de Confiabilidad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Seleccionar Examen de Confiabilidad (Opcional)</CardTitle>
              <CardDescription>
                Selecciona un examen de confiabilidad para asignar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedExam} onValueChange={setSelectedExam} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin examen de confiabilidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin examen de confiabilidad</SelectItem>
                  {exams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="flex-1">{exam.title}</span>
                        {getExamStatusBadge(exam.estado)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Selección de Examen de Rotación de Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Examen de Rotación de Personal (Opcional)</CardTitle>
              <CardDescription>
                Incluir examen de rotación de personal en las asignaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {turnoverExam ? (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id="turnover-exam"
                      checked={includeTurnoverExam}
                      onCheckedChange={(checked) => setIncludeTurnoverExam(checked as boolean)}
                    />
                    <label
                      htmlFor="turnover-exam"
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{turnoverExam.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Examen de Rotación de Personal
                      </div>
                    </label>
                    {getExamStatusBadge(turnoverExam.estado)}
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No hay exámenes de Rotación de Personal disponibles
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Asignaciones Automáticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Asignaciones Automáticas</CardTitle>
              <CardDescription>
                Los siguientes exámenes se asignarán automáticamente a todos los usuarios seleccionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-green-600" />
                  <span>Ocean Five (Test de Personalidad)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-green-600" />
                  <span>HTP (House-Tree-Person)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selección de Usuarios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                4. Selección de Usuarios ({selectedUsers.length} seleccionados)
              </CardTitle>
              <CardDescription>
                Selecciona los usuarios que recibirán las asignaciones de examen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filtro por empresa */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filtrar por Empresa</label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las empresas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las empresas</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="font-medium">
                    Seleccionar todos {companyFilter !== 'all' ? `(${filteredUsers.length} en ${companyFilter})` : `(${filteredUsers.length} usuarios)`}
                  </span>
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-2 border rounded">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email} • {user.company} • {user.area}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de HTP */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Instrucciones para el Examen HTP:</p>
                <p className="text-sm">
                  Los usuarios recibirán las siguientes instrucciones específicas para el examen HTP:
                </p>
                <div className="text-sm ml-4 space-y-1">
                  <p>• Dibujar una persona bajo la lluvia en hoja blanca tamaño carta</p>
                  <p>• Escribir una breve explicación del dibujo</p>
                  <p>• Escribir el texto de compromiso con su puño y letra</p>
                  <p>• Firmar al final</p>
                  <p>• Tomar una foto clara y subirla (máximo 4MB, PNG o JPG)</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkAssign} 
              disabled={selectedUsers.length === 0 || assigningExams}
              className="gap-2"
            >
              {assigningExams ? (
                <>Asignando...</>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Asignar Exámenes ({selectedUsers.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default BulkExamAssignment;
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send,
  Users,
  BookOpen,
  Search,
  Eye,
  Mail,
  CheckCircle,
  AlertTriangle,
  X,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// Aunque no se usan en este componente, se mantienen los imports originales
import { processExamAssignment, handleAssignmentResults } from '@/hooks/exam-assignment/assignmentProcessor';
import ManualDeliveryDialog from '@/components/exam-assignment/ManualDeliveryDialog';
import CsvUpload from '@/components/exam-assignment/CsvUpload';
import type { User } from '@/hooks/exam-assignment/types';

// Definiciones de tipos (movidas fuera del componente para claridad)
interface Exam {
  id: string;
  title: string;
  description: string;
  estado: string;
  fecha_cierre: string;
  duracion_minutos: number;
  type: string; // Tipo de examen: confiabilidad, turnover, etc.
}

interface EmailPreview {
  subject: string;
  content: string;
  from: string;
}

interface AssignmentProgress {
  total: number;
  completed: number;
  currentUser?: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
}

// ------------------------------------------------
// HOOK PERSONALIZADO: Lógica de Carga de Datos
// ------------------------------------------------
const useExamData = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Obtener usuarios evaluados
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .eq('can_login', true)
        .eq('access_restricted', false)
        .order('full_name');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // 2. Obtener exámenes activos de la tabla exams
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .eq('estado', 'activo')
        .order('title');

      if (examsError) throw examsError;
      
      // 3. Agregar exámenes especiales que no están en la tabla exams
      const specialExams: Exam[] = [
        {
          id: 'OCEAN_EXAM_SPECIAL',
          title: 'Test de Personalidad OCEAN (Big Five)',
          description: 'Evaluación de rasgos de personalidad basada en el modelo Big Five',
          estado: 'activo',
          fecha_cierre: '',
          duracion_minutos: 30,
          type: 'psychometric'
        },
        {
          id: 'HTP_EXAM_SPECIAL',
          title: 'Test HTP (Casa-Árbol-Persona)',
          description: 'Test proyectivo psicológico Casa-Árbol-Persona',
          estado: 'activo',
          fecha_cierre: '',
          duracion_minutos: 60,
          type: 'htp'
        },
        {
          id: 'TURNOVER_EXAM_SPECIAL',
          title: 'Examen de Rotación de Personal',
          description: 'Evaluación de riesgo de rotación de personal',
          estado: 'activo',
          fecha_cierre: '',
          duracion_minutos: 30,
          type: 'turnover'
        }
      ];
      
      setExams([...(examsData || []), ...specialExams]);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos: ' + (error.message || 'Desconocido'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { users, exams, loading, fetchData };
};

// ------------------------------------------------
// HOOK PERSONALIZADO: Lógica de Asignación Masiva
// ------------------------------------------------
const useMassAssignment = (selectedExam: string, usersToProcess: User[] | string[]) => {
  const [sending, setSending] = useState(false);
  const [assignmentProgress, setAssignmentProgress] = useState<AssignmentProgress>({
    total: 0,
    completed: 0,
    status: 'idle'
  });

  const handleMassAssignment = useCallback(async (onSuccess: () => void) => {
    if (usersToProcess.length === 0) {
      toast.error('Selecciona usuarios o agrega correos electrónicos');
      return;
    }

    if (!selectedExam) {
      toast.error('Selecciona un examen para asignar');
      return;
    }

    setSending(true);
    setAssignmentProgress({
      total: usersToProcess.length,
      completed: 0,
      status: 'processing'
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No estás autenticado');
        return;
      }

      // Lógica para obtener solo IDs válidos
      let userIds: string[] = [];
      if (typeof usersToProcess[0] === 'string') {
        userIds = usersToProcess as string[]; // Asume que selectedUsers son IDs
      } else {
        // Asume que csvUsers son objetos y filtra por IDs válidos (mantiene la limitación original)
        userIds = (usersToProcess as User[])
          .filter(user => user.id && !user.id.startsWith('email-'))
          .map(user => user.id);

        if (userIds.length === 0) {
          toast.error('No se encontraron usuarios válidos y registrados para procesar');
          return;
        }
      }

      // *************************************************************************
      // LLAMADA A LA EDGE FUNCTION DE SUPABASE (Lógica inalterada)
      // *************************************************************************
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-mass-exam-assignments', {
        body: {
          userIds: userIds,
          examId: selectedExam,
          assignedBy: session.user.id
        }
      });

      if (emailError) {
        console.error('Error enviando correos:', emailError);
        throw new Error(emailError.message);
      } else {
        toast.success(`Exámenes asignados y correos enviados exitosamente a ${userIds.length} usuario(s)`);
      }

      setAssignmentProgress(prev => ({ ...prev, completed: userIds.length, status: 'completed' }));
      onSuccess();

    } catch (error: any) {
      console.error('Error en asignación masiva:', error);
      toast.error('Error en la asignación masiva: ' + (error.message || 'Desconocido'));
      setAssignmentProgress(prev => ({ ...prev, status: 'error' }));
    } finally {
      setSending(false);
      setTimeout(() => {
        setAssignmentProgress({ total: 0, completed: 0, status: 'idle' });
      }, 3000);
    }
  }, [usersToProcess, selectedExam]);

  return { sending, assignmentProgress, handleMassAssignment };
};


// ------------------------------------------------
// COMPONENTE PRINCIPAL
// ------------------------------------------------
const MassExamAssignment = () => {
  // Estados y Data Hooks
  const { users, exams, loading, fetchData } = useExamData();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  
  // Estados para métodos alternativos de selección
  const [csvUsers, setCsvUsers] = useState<User[]>([]); // Usamos el tipo User[] para ser más explícitos
  const [usesCsv, setUsesCsv] = useState(false);
  const [emailList, setEmailList] = useState('');
  
  // Estados para UI
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailPreview>({
    subject: '',
    content: '',
    from: ''
  });
  
  // Estados para entrega manual (ManualDeliveryDialog)
  const [showManualDelivery, setShowManualDelivery] = useState(false);
  const [manualDeliveryUsers, setManualDeliveryUsers] = useState<{
    instructions: string;
    userName: string;
    userEmail: string;
    assignmentId: string;
  }[]>([]);


  // ** Lógica de Filtrado y Selección **
  const filteredUsers = useMemo(() => users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company.toLowerCase().includes(searchTerm.toLowerCase())
  ), [users, searchTerm]);

  const usersToProcess = useMemo(() => usesCsv ? csvUsers : selectedUsers, [usesCsv, csvUsers, selectedUsers]);
  const totalSelectedUsers = usersToProcess.length;

  // Hook de Asignación Masiva
  const { sending, assignmentProgress, handleMassAssignment: processAssignment } = useMassAssignment(selectedExam, usersToProcess);

  // ** Handlers para métodos alternativos **
  const handleCsvUsersLoaded = useCallback((newUsers: any[]) => {
    setCsvUsers(newUsers);
    setUsesCsv(true);
    setSelectedUsers([]);
    setEmailList('');
  }, []);

  const handleClearCsv = useCallback(() => {
    setCsvUsers([]);
    setUsesCsv(false);
    setSelectedUsers([]);
  }, []);

  const handleEmailListParse = useCallback(() => {
    if (!emailList.trim()) return;

    // Parsear emails
    const emails = emailList
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    // Crear objetos de usuario ficticios para emails (manteniendo el tipo User)
    const emailUsers: User[] = emails.map((email, index) => ({
      id: `email-${index}`, // ID ficticio para diferenciar
      email,
      full_name: email.split('@')[0],
      company: 'N/A',
      area: 'N/A',
      section: 'N/A',
      role: 'student',
      can_login: true,
      access_restricted: false
    }));

    handleCsvUsersLoaded(emailUsers);
    toast.success(`${emails.length} correos electrónicos agregados`);
  }, [emailList, handleCsvUsersLoaded]);

  // ** Handlers de Selección Manual **
  const handleUserSelection = useCallback((userId: string, checked: boolean) => {
    setSelectedUsers(prev => checked ? [...prev, userId] : prev.filter(id => id !== userId));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  }, [selectedUsers.length, filteredUsers]);

  // ** Lógica Principal de Asignación (Wrapper) **
  const onMassAssignment = () => {
    // Función de limpieza y recarga para pasar al hook
    const onSuccess = () => {
      setSelectedUsers([]);
      setSelectedExam('');
      setEmailList('');
      if (usesCsv) {
        handleClearCsv();
      }
      fetchData();
    };

    // La función `handleMassAssignment` original se convierte en `processAssignment` del hook
    processAssignment(onSuccess);
  };
  
  // ** Handlers de Dialogs / UI **
  const generateEmailPreview = useCallback(() => {
    const selectedExamData = exams.find(e => e.id === selectedExam);
    // ... (lógica de preview inalterada)
    if (!selectedExamData) return;

    setEmailPreview({
      subject: `Invitación para realizar: ${selectedExamData.title}`,
      content: `
        <h2>Evaluación de Confiabilidad - ${selectedExamData.title}</h2>
        <p>Estimado(a) evaluado(a),</p>
        <p>Ha sido seleccionado(a) para participar en una evaluación de confiabilidad. Los detalles son:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Examen:</strong> ${selectedExamData.title}<br>
          <strong>Descripción:</strong> ${selectedExamData.description}<br>
          <strong>Duración:</strong> ${selectedExamData.duracion_minutos} minutos<br>
          ${selectedExamData.fecha_cierre ? `<strong>Fecha límite:</strong> ${new Date(selectedExamData.fecha_cierre).toLocaleDateString('es-ES')}<br>` : ''}
        </div>
        <p>Para acceder al examen, utilice el enlace que recibirá en el correo de notificación.</p>
        <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
        <p>Atentamente,<br>
        El equipo de evaluación</p>
      `,
      from: 'Sistema de Evaluación <noreply@evaluacion.com>'
    });
    setShowEmailPreview(true);
  }, [exams, selectedExam]);


  const handleConfirmManualDelivery = useCallback(async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('exam_assignments')
        .update({
          status: 'notified',
          manual_delivery: true,
          notified_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('Error updating manual delivery status:', error);
        toast.error('Error al confirmar entrega manual');
        return;
      }

      setManualDeliveryUsers(prev => prev.filter(user => user.assignmentId !== assignmentId));

      if (manualDeliveryUsers.length <= 1) {
        setShowManualDelivery(false);
        setManualDeliveryUsers([]);
        await fetchData();
      }
    } catch (error: any) {
      console.error('Error in handleConfirmManualDelivery:', error);
      toast.error('Error al confirmar entrega manual: ' + (error.message || 'Desconocido'));
    }
  }, [fetchData, manualDeliveryUsers.length]);


  // ** Renderizado de Carga **
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Cargando datos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ** Renderizado Principal (JSX inalterado) **
  return (
    <>
      <div className="space-responsive">
        <Card className="card-mobile sm:p-0">
          <CardHeader className="padding-responsive">
            <CardTitle className="text-responsive-lg flex items-center gap-2">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate-responsive">Asignación Masiva de Exámenes</span>
            </CardTitle>
            <CardDescription className="text-responsive-base">
              Selecciona usuarios y asigna un examen a múltiples evaluados
            </CardDescription>
          </CardHeader>
          <CardContent className="padding-responsive pt-0 space-responsive">
            {/* Sección de Selección de Examen */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Seleccionar Examen
              </label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un examen para asignar" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-1 sm:gap-2">
                        <span className="truncate">{exam.title}</span>
                        <Badge variant="outline" className="text-xs shrink-0 self-start sm:self-center">
                          {exam.duracion_minutos} min
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedExam && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateEmailPreview}
                    className="flex items-center gap-2 button-mobile sm:px-3 sm:py-2 sm:text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Vista Previa Email</span>
                    <span className="sm:hidden">Vista</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Tabs para métodos de selección */}
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users" className="text-xs sm:text-sm">Usuarios</TabsTrigger>
                <TabsTrigger value="emails" className="text-xs sm:text-sm">Emails</TabsTrigger>
                <TabsTrigger value="csv" className="text-xs sm:text-sm">CSV</TabsTrigger>
              </TabsList>

              {/* Selección por usuarios existentes */}
              <TabsContent value="users" className="space-responsive">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuarios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 input-mobile sm:px-3 sm:py-2 sm:text-sm"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleSelectAll}
                      className="shrink-0 button-mobile sm:px-3 sm:py-2 sm:text-sm"
                    >
                      <span className="hidden sm:inline">
                        {selectedUsers.length === filteredUsers.length ? 'Deseleccionar' : 'Seleccionar'} Todo
                      </span>
                      <span className="sm:hidden">
                        {selectedUsers.length === filteredUsers.length ? 'Desmarcar' : 'Marcar'} Todo
                      </span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{filteredUsers.length} usuarios disponibles</span>
                    {selectedUsers.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedUsers.length} seleccionados
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="max-h-64 sm:max-h-80 overflow-y-auto space-y-2 border rounded-lg p-2 sm:p-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm truncate">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="inline sm:hidden">
                            {user.company.substring(0, 15)}...
                          </span>
                          <span className="hidden sm:inline">
                            {user.company} - {user.area} - {user.section}
                          </span>
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">Evaluado</Badge>
                    </div>
                  ))}

                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Selección por lista de emails */}
              <TabsContent value="emails" className="space-responsive">
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Lista de Correos Electrónicos
                  </label>
                  <Textarea
                    placeholder="Ingrese los correos electrónicos separados por coma, punto y coma o nueva línea..."
                    value={emailList}
                    onChange={(e) => setEmailList(e.target.value)}
                    className="min-h-20 sm:min-h-24 resize-none input-mobile sm:px-3 sm:py-2 sm:text-sm"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={handleEmailListParse}
                      disabled={!emailList.trim()}
                      className="flex items-center gap-2 button-mobile sm:px-3 sm:py-2 sm:text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Emails
                    </Button>
                    {csvUsers.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEmailList('');
                          handleClearCsv();
                        }}
                        className="flex items-center gap-2 button-mobile sm:px-3 sm:py-2 sm:text-sm"
                      >
                        <X className="h-4 w-4" />
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Carga CSV */}
              <TabsContent value="csv" className="space-responsive">
                <CsvUpload
                  onUsersLoaded={handleCsvUsersLoaded}
                  onClear={handleClearCsv}
                  uploadedUsers={csvUsers}
                />
              </TabsContent>
            </Tabs>

            {/* Resumen de usuarios seleccionados */}
            {(usesCsv && csvUsers.length > 0) && (
              <Card className="bg-muted/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Usuarios Cargados</h4>
                    <Badge variant="secondary">{csvUsers.length} usuarios</Badge>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {csvUsers.slice(0, 5).map((user, index) => (
                      <div key={index} className="text-xs text-muted-foreground flex justify-between">
                        <span className="truncate mr-2">{user.full_name || user.email}</span>
                        <span className="text-xs">{user.email}</span>
                      </div>
                    ))}
                    {csvUsers.length > 5 && (
                      <p className="text-xs text-muted-foreground italic">
                        ... y {csvUsers.length - 5} más
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progreso de envío */}
            {assignmentProgress.status === 'processing' && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Enviando invitaciones...</span>
                      <span>{assignmentProgress.completed} de {assignmentProgress.total}</span>
                    </div>
                    <Progress
                      value={(assignmentProgress.completed / assignmentProgress.total) * 100}
                      className="h-2"
                    />
                    {assignmentProgress.currentUser && (
                      <p className="text-xs text-muted-foreground truncate">
                        Procesando: {assignmentProgress.currentUser}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botón de Asignación */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={totalSelectedUsers === 0 || !selectedExam || sending}
                className="flex-1"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                <span className="truncate">
                  {sending
                    ? 'Procesando...'
                    : `Asignar y Notificar (${totalSelectedUsers})`
                  }
                </span>
              </Button>
            </div>

            {/* Mensajes de estado */}
            {exams.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No hay exámenes activos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Crea y activa exámenes para poder asignarlos
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogos (JSX inalterado) */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="dialog-responsive max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-responsive-lg">
              <Mail className="h-5 w-5" />
              Vista Previa del Email
            </DialogTitle>
            <DialogDescription className="text-responsive-base">
              Así se verá el correo de invitación que recibirán los usuarios
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-lg p-3 sm:p-4 bg-muted/30">
              <div className="text-xs sm:text-sm space-y-2">
                <div><strong>De:</strong> {emailPreview.from}</div>
                <div><strong>Asunto:</strong> {emailPreview.subject}</div>
              </div>
            </div>

            <div className="border rounded-lg p-3 sm:p-4 bg-white">
              <div
                className="prose prose-xs sm:prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: emailPreview.content }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailPreview(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="dialog-responsive">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-responsive-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirmar Asignación Masiva
            </DialogTitle>
            <DialogDescription className="text-responsive-base">
              ¿Estás seguro de que deseas asignar el examen a {totalSelectedUsers} usuario(s)?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-muted/30 p-3 rounded-lg text-sm">
              <div><strong>Examen:</strong> {exams.find(e => e.id === selectedExam)?.title}</div>
              <div><strong>Usuarios:</strong> {totalSelectedUsers}</div>
              <div><strong>Método:</strong> {usesCsv ? 'CSV/Email' : 'Selección manual'}</div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground">
              Se enviará una invitación por correo electrónico a cada usuario con las instrucciones para acceder al examen.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={onMassAssignment} className="w-full sm:w-auto">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManualDeliveryDialog
        open={showManualDelivery}
        onOpenChange={setShowManualDelivery}
        manualDeliveryUsers={manualDeliveryUsers}
        onConfirmDelivery={handleConfirmManualDelivery}
      />
    </>
  );
};

export default MassExamAssignment;
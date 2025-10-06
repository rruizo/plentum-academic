import { useState, useEffect } from 'react';
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
  Brain, 
  Upload, 
  Search, 
  Eye, 
  Mail, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  X,
  Plus,
  Clock,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ManualDeliveryDialog from './exam-assignment/ManualDeliveryDialog';
import CsvUpload from './exam-assignment/CsvUpload';
import type { User } from '@/hooks/exam-assignment/types';
import type { Tables } from '@/integrations/supabase/types';

type PsychometricTest = Tables<'psychometric_tests'>;

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

const MassPsychometricAssignment = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tests, setTests] = useState<PsychometricTest[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Estados para entrega manual
  const [showManualDelivery, setShowManualDelivery] = useState(false);
  const [manualDeliveryUsers, setManualDeliveryUsers] = useState<{
    instructions: string;
    userName: string;
    userEmail: string;
    assignmentId: string;
  }[]>([]);
  
  // Estados para CSV upload
  const [csvUsers, setCsvUsers] = useState<any[]>([]);
  const [usesCsv, setUsesCsv] = useState(false);
  
  // Estados para nuevas funcionalidades
  const [emailList, setEmailList] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailPreview>({
    subject: '',
    content: '',
    from: ''
  });
  const [assignmentProgress, setAssignmentProgress] = useState<AssignmentProgress>({
    total: 0,
    completed: 0,
    status: 'idle'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Obtener usuarios evaluados
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .eq('can_login', true)
        .eq('access_restricted', false)
        .order('full_name');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Obtener tests psicométricos activos
      const { data: testsData, error: testsError } = await supabase
        .from('psychometric_tests')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (testsError) throw testsError;
      setTests(testsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuarios por búsqueda
  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCsvUsersLoaded = (newUsers: any[]) => {
    setCsvUsers(newUsers);
    setUsesCsv(true);
    setSelectedUsers([]);
    setEmailList('');
  };

  const handleClearCsv = () => {
    setCsvUsers([]);
    setUsesCsv(false);
    setSelectedUsers([]);
  };

  const handleEmailListParse = () => {
    if (!emailList.trim()) return;
    
    // Parsear emails separados por coma, punto y coma o nueva línea
    const emails = emailList
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));
    
    // Crear objetos de usuario ficticios para emails
    const emailUsers = emails.map((email, index) => ({
      id: `email-${index}`,
      email,
      full_name: email.split('@')[0],
      company: 'N/A',
      area: 'N/A',
      section: 'N/A',
      role: 'student'
    }));
    
    setCsvUsers(emailUsers);
    setUsesCsv(true);
    setSelectedUsers([]);
    toast.success(`${emails.length} correos electrónicos agregados`);
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const generateEmailPreview = () => {
    const selectedTestData = tests.find(t => t.id === selectedTest);
    if (!selectedTestData) return;

    setEmailPreview({
      subject: `Invitación para evaluación de personalidad: ${selectedTestData.name}`,
      content: `
        <h2>Evaluación de Personalidad - ${selectedTestData.name}</h2>
        
        <p>Estimado(a) evaluado(a),</p>
        
        <p>Ha sido seleccionado(a) para participar en una evaluación de personalidad. Los detalles son:</p>
        
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Evaluación:</strong> ${selectedTestData.name}<br>
          <strong>Descripción:</strong> ${selectedTestData.description}<br>
          <strong>Duración:</strong> ${selectedTestData.duration_minutes} minutos<br>
          <strong>Preguntas:</strong> ${selectedTestData.questions_count}<br>
          <strong>Tipo:</strong> Evaluación de personalidad<br>
        </div>
        
        <p>Para acceder a la evaluación, utilice el enlace y credenciales que recibirá en el correo de notificación.</p>
        
        <p>Esta evaluación es importante para conocer su perfil de personalidad. Por favor, tómese el tiempo necesario para completarla con honestidad.</p>
        
        <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
        
        <p>Atentamente,<br>
        El equipo de evaluación de personalidad</p>
      `,
      from: 'Sistema de Evaluación de Personalidad <noreply@evaluacion.com>'
    });
    setShowEmailPreview(true);
  };

  const processPsychometricAssignment = async (
    testId: string,
    testTitle: string,
    userEmails: string[],
    allUsers: any[],
    assignedById: string
  ) => {
    const results = [];
    
    for (const userEmail of userEmails) {
      try {
        let user = allUsers.find(u => u.email === userEmail || u.id === userEmail);
        
        // Si no encontramos el usuario por ID, buscar por email
        if (!user && !userEmail.includes('@')) {
          user = allUsers.find(u => u.id === userEmail);
        }
        
        // Si es un email y no está en usuarios registrados, crear usuario temporal
        if (!user && userEmail.includes('@')) {
          user = {
            id: `temp-${Date.now()}-${Math.random()}`,
            email: userEmail,
            full_name: userEmail.split('@')[0],
            company: 'Usuario Externo',
            area: 'N/A',
            section: 'N/A',
            role: 'student'
          };
        }

        if (!user) {
          results.push({
            success: false,
            userId: userEmail,
            userName: 'Usuario no encontrado',
            userEmail: userEmail,
            error: 'Usuario no encontrado'
          });
          continue;
        }

        // 1. Limpiar asignaciones existentes
        await supabase
          .from('exam_assignments')
          .delete()
          .eq('psychometric_test_id', testId)
          .eq('user_id', user.id)
          .eq('test_type', 'psychometric');

        // 2. Crear nueva asignación
        const { data: assignment, error: assignmentError } = await supabase
          .from('exam_assignments')
          .insert({
            exam_id: null, // Nullable para tests psicométricos
            psychometric_test_id: testId,
            user_id: user.id,
            assigned_by: assignedById,
            test_type: 'psychometric',
            status: 'pending',
            access_link: `${window.location.origin}/exam-access?type=psychometric&test=${testId}&user=${user.id}`
          } as any)
          .select()
          .single();

        if (assignmentError) throw assignmentError;

        // 3. Crear sesión
        const { data: session, error: sessionError } = await supabase
          .from('exam_sessions')
          .upsert({
            exam_id: null, // Nullable para tests psicométricos
            psychometric_test_id: testId,
            user_id: user.email,
            test_type: 'psychometric',
            status: 'pending',
            max_attempts: 1
          } as any)
          .select()
          .single();

        if (sessionError) throw sessionError;

        // 4. Esperar generación de credenciales
        await new Promise(resolve => setTimeout(resolve, 200));

        // 5. Obtener credenciales
        const { data: credentials } = await supabase
          .from('exam_credentials')
          .select('username, password_hash')
          .eq('psychometric_test_id', testId)
          .eq('user_email', user.email)
          .eq('test_type', 'psychometric')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // 6. Enviar invitación
        try {
          const { error: emailError } = await supabase.functions.invoke('send-exam-notifications', {
            body: {
              emails: [user.email],
              subject: `Invitación para evaluación de personalidad: ${testTitle}`,
              message: `Ha sido invitado a realizar una evaluación de personalidad: ${testTitle}`,
              examDetails: {
                title: testTitle,
                testType: 'psychometric',
                testId: testId
              },
              credentials: credentials ? {
                username: credentials.username,
                password: credentials.password_hash
              } : undefined,
              sessionLink: `${window.location.origin}/exam-access?session=${session.id}&type=psychometric`
            }
          });

          if (emailError) throw emailError;

          // Marcar como notificado
          await supabase
            .from('exam_assignments')
            .update({ 
              status: 'notified',
              notified_at: new Date().toISOString()
            })
            .eq('id', assignment.id);

          results.push({
            success: true,
            userId: user.id,
            userName: user.full_name,
            userEmail: user.email,
            assignmentId: assignment.id
          });

        } catch (emailError) {
          // Marcar para entrega manual
          results.push({
            success: true,
            userId: user.id,
            userName: user.full_name,
            userEmail: user.email,
            assignmentId: assignment.id,
            requiresManualDelivery: true,
            manualDeliveryInstructions: `
              Error en envío automático de evaluación de personalidad.
              
              Evaluación: ${testTitle}
              Usuario: ${credentials?.username || 'Ver en sistema'}
              Contraseña: ${credentials?.password_hash || 'Ver en sistema'}
              Enlace: ${session ? `${window.location.origin}/exam-access?session=${session.id}&type=psychometric` : 'Ver en sistema'}
              
              Motivo: ${emailError instanceof Error ? emailError.message : 'Error desconocido'}
            `
          });
        }

      } catch (error) {
        console.error('Error processing psychometric assignment:', error);
        const userData = allUsers.find(u => u.email === userEmail || u.id === userEmail);
        results.push({
          success: false,
          userId: userEmail,
          userName: userData?.full_name || 'Desconocido',
          userEmail: userData?.email || userEmail,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return results;
  };

  const handleMassAssignment = async () => {
    const usersToProcess = usesCsv ? csvUsers : selectedUsers;
    
    if (usersToProcess.length === 0) {
      toast.error('Selecciona usuarios o agrega correos electrónicos');
      return;
    }

    if (!selectedTest) {
      toast.error('Selecciona un test psicométrico para asignar');
      return;
    }

    setShowConfirmDialog(false);
    setSending(true);
    setAssignmentProgress({
      total: usersToProcess.length,
      completed: 0,
      status: 'processing'
    });

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('Usuario no autenticado');
        return;
      }

      const selectedTestData = tests.find(t => t.id === selectedTest);
      if (!selectedTestData) {
        toast.error('Test psicométrico no encontrado');
        return;
      }

      const usersToAssign = usesCsv ? csvUsers.map(u => u.email) : selectedUsers;
      const usersList = usesCsv ? csvUsers : users;

      const results = await processPsychometricAssignment(
        selectedTest,
        selectedTestData.name,
        usersToAssign,
        usersList,
        currentUser.id
      );

      setAssignmentProgress(prev => ({ ...prev, status: 'completed' }));
      
      // Manejar resultados
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const manualDelivery = results.filter(r => r.requiresManualDelivery);

      if (successful.length > 0) {
        toast.success(`${successful.length} evaluación(es) de personalidad asignada(s) exitosamente`);
      }

      if (manualDelivery.length > 0) {
        toast.warning(`${manualDelivery.length} asignación(es) requieren entrega manual`);
      }

      if (failed.length > 0) {
        toast.error(`${failed.length} asignación(es) fallaron`);
      }

      // Verificar entregas manuales
      if (manualDelivery.length > 0) {
        const manualUsers = manualDelivery.map(result => ({
          instructions: result.manualDeliveryInstructions || '',
          userName: result.userName,
          userEmail: result.userEmail,
          assignmentId: result.assignmentId || ''
        }));
        setManualDeliveryUsers(manualUsers);
        setShowManualDelivery(true);
      }

      // Limpiar selecciones si hubo éxitos
      if (successful.length > 0) {
        setSelectedUsers([]);
        setSelectedTest('');
        setEmailList('');
        if (usesCsv) {
          handleClearCsv();
        }
        await fetchData();
      }

    } catch (error) {
      console.error('Error en asignación masiva psicométrica:', error);
      toast.error('Error en la asignación masiva de evaluaciones de personalidad');
      setAssignmentProgress(prev => ({ ...prev, status: 'error' }));
    } finally {
      setSending(false);
      setTimeout(() => {
        setAssignmentProgress({ total: 0, completed: 0, status: 'idle' });
      }, 3000);
    }
  };

  const handleConfirmManualDelivery = async (assignmentId: string) => {
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
    } catch (error) {
      console.error('Error in handleConfirmManualDelivery:', error);
      toast.error('Error al confirmar entrega manual');
    }
  };

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

  const totalSelectedUsers = usesCsv ? csvUsers.length : selectedUsers.length;

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Asignación Masiva de Tests Psicométricos
            </CardTitle>
            <CardDescription>
              Selecciona usuarios y asigna un test psicométrico a múltiples evaluados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selección de Test */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Seleccionar Test Psicométrico
              </label>
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un test psicométrico para asignar" />
                </SelectTrigger>
                <SelectContent>
                  {tests.map(test => (
                    <SelectItem key={test.id} value={test.id}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-1 sm:gap-2">
                        <span className="truncate">{test.name}</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {test.duration_minutes} min
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {test.type}
                          </Badge>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTest && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateEmailPreview}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Vista Previa Email
                  </Button>
                </div>
              )}
            </div>

            {/* Tabs para métodos de selección */}
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">Usuarios</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="csv">CSV</TabsTrigger>
              </TabsList>

              {/* Selección por usuarios existentes */}
              <TabsContent value="users" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuarios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleSelectAll}
                      className="shrink-0"
                    >
                      {selectedUsers.length === filteredUsers.length ? 'Deseleccionar' : 'Seleccionar'} Todo
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{filteredUsers.length} usuarios disponibles</span>
                    {selectedUsers.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedUsers.length} seleccionados
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.company} - {user.area} - {user.section}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">Evaluado</Badge>
                    </div>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No se encontraron usuarios</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Selección por emails */}
              <TabsContent value="emails" className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Lista de Correos Electrónicos</label>
                  <Textarea
                    placeholder="Ingresa emails separados por coma, punto y coma o nueva línea..."
                    value={emailList}
                    onChange={(e) => setEmailList(e.target.value)}
                    rows={6}
                  />
                  <Button 
                    onClick={handleEmailListParse}
                    className="w-full"
                    disabled={!emailList.trim()}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Procesar Lista de Emails
                  </Button>
                </div>
              </TabsContent>

              {/* Selección por CSV */}
              <TabsContent value="csv" className="space-y-4">
                <CsvUpload 
                  onUsersLoaded={handleCsvUsersLoaded} 
                  onClear={handleClearCsv}
                  uploadedUsers={csvUsers}
                />
                {usesCsv && csvUsers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-sm">
                        {csvUsers.length} usuarios cargados desde CSV
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearCsv}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Limpiar CSV
                      </Button>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
                      {csvUsers.map((user, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 border rounded text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="flex-1">
                            <span className="font-medium">{user.full_name}</span>
                            <span className="text-muted-foreground ml-2">{user.email}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={totalSelectedUsers === 0 || !selectedTest || sending}
                className="flex-1"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Procesando...' : `Asignar Test a ${totalSelectedUsers} Usuario(s)`}
              </Button>
            </div>

            {/* Progreso de asignación */}
            {assignmentProgress.status === 'processing' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Procesando asignaciones...</span>
                  <span>{assignmentProgress.completed}/{assignmentProgress.total}</span>
                </div>
                <Progress 
                  value={(assignmentProgress.completed / assignmentProgress.total) * 100} 
                  className="w-full" 
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Asignación Masiva</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas asignar el test psicométrico a {totalSelectedUsers} usuario(s)?
              Se enviarán invitaciones por correo electrónico automáticamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMassAssignment}>
              Confirmar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de vista previa de email */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista Previa del Email</DialogTitle>
            <DialogDescription>
              Así se verá el email que recibirán los usuarios seleccionados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">De:</label>
              <p className="text-sm text-muted-foreground">{emailPreview.from}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Asunto:</label>
              <p className="text-sm">{emailPreview.subject}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Contenido:</label>
              <div 
                className="text-sm border rounded-lg p-4 bg-muted/50 max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: emailPreview.content }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowEmailPreview(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de entrega manual */}
      <ManualDeliveryDialog
        open={showManualDelivery}
        onOpenChange={setShowManualDelivery}
        manualDeliveryUsers={manualDeliveryUsers}
        onConfirmDelivery={handleConfirmManualDelivery}
      />
    </>
  );
};

export default MassPsychometricAssignment;
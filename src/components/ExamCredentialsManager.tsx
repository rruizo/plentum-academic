
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Key, Users, Send, Copy, RefreshCw, Download, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface ExamCredential {
  id: string;
  username: string;
  password_hash: string;
  user_email: string;
  is_used: boolean;
  expires_at: string | null;
  created_at: string;
}

interface ExamCredentialsManagerProps {
  examId: string;
  examTitle: string;
}

const ExamCredentialsManager = ({ examId, examTitle }: ExamCredentialsManagerProps) => {
  const [credentials, setCredentials] = useState<ExamCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);

  useEffect(() => {
    fetchCredentials();
  }, [examId]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exam_credentials')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Error al cargar las credenciales');
    } finally {
      setLoading(false);
    }
  };

  const generateSingleCredential = async () => {
    if (!newUserEmail.trim()) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    try {
      setGenerating(true);
      
      // Generar credenciales únicas
      const { data: usernameData, error: usernameError } = await supabase
        .rpc('generate_unique_username');
      
      if (usernameError) throw usernameError;
      
      const { data: passwordData, error: passwordError } = await supabase
        .rpc('generate_random_password');
      
      if (passwordError) throw passwordError;

      // Crear hash de la contraseña (en producción usar bcrypt)
      const passwordHash = btoa(passwordData); // Simplificado para demo

      const { data, error } = await supabase
        .from('exam_credentials')
        .insert({
          exam_id: examId,
          username: usernameData,
          password_hash: passwordHash,
          user_email: newUserEmail.trim(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
        })
        .select()
        .single();

      if (error) throw error;

      setCredentials(prev => [data, ...prev]);
      setNewUserEmail('');
      toast.success('Credenciales generadas exitosamente');
      
      // Enviar email automáticamente
      await sendCredentialEmail(data, passwordData);
      
    } catch (error) {
      console.error('Error generating credentials:', error);
      toast.error('Error al generar credenciales');
    } finally {
      setGenerating(false);
    }
  };

  const generateBulkCredentials = async () => {
    const emails = bulkEmails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (emails.length === 0) {
      toast.error('Por favor ingresa al menos un email válido');
      return;
    }

    try {
      setGenerating(true);
      const newCredentials = [];

      for (const email of emails) {
        // Generar credenciales únicas para cada email
        const { data: usernameData } = await supabase.rpc('generate_unique_username');
        const { data: passwordData } = await supabase.rpc('generate_random_password');
        
        const passwordHash = btoa(passwordData);

        const { data, error } = await supabase
          .from('exam_credentials')
          .insert({
            exam_id: examId,
            username: usernameData,
            password_hash: passwordHash,
            user_email: email,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error(`Error generating credentials for ${email}:`, error);
          continue;
        }

        newCredentials.push(data);
        
        // Enviar email
        await sendCredentialEmail(data, passwordData);
      }

      setCredentials(prev => [...newCredentials, ...prev]);
      setBulkEmails('');
      toast.success(`${newCredentials.length} credenciales generadas y enviadas`);
      
    } catch (error) {
      console.error('Error generating bulk credentials:', error);
      toast.error('Error al generar credenciales masivas');
    } finally {
      setGenerating(false);
    }
  };

  const sendCredentialEmail = async (credential: ExamCredential, plainPassword: string) => {
    try {
      // En un ambiente real, esto sería una función edge de Supabase
      console.log('Sending email to:', credential.user_email);
      console.log('Credentials:', {
        username: credential.username,
        password: plainPassword,
        examUrl: `${window.location.origin}/exam/${examId}`
      });
      
      // Simular envío de email
      // Aquí implementarías la lógica real de envío de emails
      
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const exportCredentials = () => {
    const csvData = credentials.map(cred => ({
      Email: cred.user_email,
      Usuario: cred.username,
      // No incluir contraseña por seguridad
      Usado: cred.is_used ? 'Sí' : 'No',
      'Fecha de Creación': new Date(cred.created_at).toLocaleDateString(),
      'Fecha de Expiración': cred.expires_at ? new Date(cred.expires_at).toLocaleDateString() : 'Sin expiración'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `credenciales_${examTitle.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCredentialsStats = () => {
    const total = credentials.length;
    const used = credentials.filter(c => c.is_used).length;
    const expired = credentials.filter(c => 
      c.expires_at && new Date(c.expires_at) < new Date()
    ).length;
    
    return { total, used, available: total - used - expired, expired };
  };

  const stats = getCredentialsStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Gestión de Credenciales</h3>
          <p className="text-muted-foreground">
            Administra el acceso al examen: {examTitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCredentials} disabled={credentials.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={fetchCredentials} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Key className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disponibles</p>
                <p className="text-2xl font-bold text-green-600">{stats.available}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usadas</p>
                <p className="text-2xl font-bold text-blue-600">{stats.used}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiradas</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <Users className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generar Credenciales</TabsTrigger>
          <TabsTrigger value="manage">Gestionar Existentes</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Credencial Individual
                </CardTitle>
                <CardDescription>
                  Genera credenciales para un usuario específico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email del Usuario</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <Button 
                  onClick={generateSingleCredential} 
                  disabled={generating}
                  className="w-full"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {generating ? 'Generando...' : 'Generar y Enviar'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Credenciales Masivas
                </CardTitle>
                <CardDescription>
                  Genera credenciales para múltiples usuarios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bulk-emails">Emails (uno por línea)</Label>
                  <Textarea
                    id="bulk-emails"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder="usuario1@empresa.com&#10;usuario2@empresa.com&#10;usuario3@empresa.com"
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={generateBulkCredentials} 
                  disabled={generating}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {generating ? 'Generando...' : 'Generar y Enviar Todo'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Credenciales Existentes</CardTitle>
              <CardDescription>
                Administra las credenciales ya generadas para este examen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Cargando credenciales...</p>
                </div>
              ) : credentials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay credenciales generadas para este examen</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credentials.map((credential) => (
                      <TableRow key={credential.id}>
                        <TableCell className="font-mono">
                          {credential.username}
                        </TableCell>
                        <TableCell>{credential.user_email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            credential.is_used ? 'default' :
                            credential.expires_at && new Date(credential.expires_at) < new Date() ? 'destructive' :
                            'secondary'
                          }>
                            {credential.is_used ? 'Usado' :
                             credential.expires_at && new Date(credential.expires_at) < new Date() ? 'Expirado' :
                             'Disponible'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(credential.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {credential.expires_at 
                            ? new Date(credential.expires_at).toLocaleDateString()
                            : 'Sin expiración'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(credential.username)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Mail className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reenviar Credenciales</DialogTitle>
                                  <DialogDescription>
                                    ¿Estás seguro de que quieres reenviar las credenciales a {credential.user_email}?
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline">Cancelar</Button>
                                  <Button disabled>
                                    <Send className="h-4 w-4 mr-2" />
                                    Reenviar
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExamCredentialsManager;

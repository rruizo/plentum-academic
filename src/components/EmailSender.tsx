
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EmailSenderProps {
  examId: string;
  examTitle: string;
}

const EmailSender = ({ examId, examTitle }: EmailSenderProps) => {
  const [emailList, setEmailList] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [subject, setSubject] = useState(`Invitación a examen: ${examTitle}`);
  const [message, setMessage] = useState(`
Estimado/a candidato/a,

Ha sido invitado/a a presentar el examen de confiabilidad: ${examTitle}

Sus credenciales de acceso serán enviadas en un correo separado.

Atentamente,
Equipo de Recursos Humanos
  `);
  const [sending, setSending] = useState(false);

  const addEmail = () => {
    if (!currentEmail) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentEmail)) {
      toast.error('Formato de email inválido');
      return;
    }

    if (emailList.includes(currentEmail)) {
      toast.error('Este email ya está en la lista');
      return;
    }

    setEmailList(prev => [...prev, currentEmail]);
    setCurrentEmail('');
  };

  const removeEmail = (email: string) => {
    setEmailList(prev => prev.filter(e => e !== email));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const emails = content
        .split(/[\n,;]/)
        .map(email => email.trim())
        .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      
      const newEmails = emails.filter(email => !emailList.includes(email));
      setEmailList(prev => [...prev, ...newEmails]);
      
      toast.success(`${newEmails.length} emails agregados`);
    };
    reader.readAsText(file);
  };

  const sendEmails = async () => {
    if (emailList.length === 0) {
      toast.error('Agregue al menos un email');
      return;
    }

    setSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-exam-notifications', {
        body: {
          emails: emailList,
          subject: subject,
          message: message,
          examTitle: examTitle,
          examId: examId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${data.sent} emails enviados exitosamente`);
        if (data.failed > 0) {
          toast.warning(`${data.failed} emails fallaron al enviarse`);
        }
        setEmailList([]);
      } else {
        throw new Error('Error en el envío de emails');
      }
      
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Error al enviar los emails. Verifique su configuración de Resend.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Envío de Invitaciones
        </CardTitle>
        <CardDescription>
          Envíe invitaciones por email para el examen: {examTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="email">Agregar Email</Label>
            <Input
              id="email"
              type="email"
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              onKeyPress={(e) => e.key === 'Enter' && addEmail()}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addEmail} size="sm">
              Agregar
            </Button>
          </div>
        </div>

        {/* File upload */}
        <div>
          <Label htmlFor="file">Cargar lista desde archivo</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file"
              type="file"
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file')?.click()}
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Seleccionar archivo
            </Button>
            <span className="text-sm text-muted-foreground">
              Formatos: .txt, .csv
            </span>
          </div>
        </div>

        {/* Email list */}
        {emailList.length > 0 && (
          <div>
            <Label>Emails a enviar ({emailList.length})</Label>
            <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
              {emailList.map((email, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeEmail(email)}
                >
                  {email} ×
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Subject */}
        <div>
          <Label htmlFor="subject">Asunto</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Message */}
        <div>
          <Label htmlFor="message">Mensaje</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
          />
        </div>

        {/* Send button */}
        <Button
          onClick={sendEmails}
          disabled={emailList.length === 0 || sending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {sending ? 'Enviando...' : `Enviar a ${emailList.length} destinatarios`}
        </Button>

        {/* Help text */}
        <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
          <p className="font-medium mb-1">Configuración requerida:</p>
          <p>Para enviar emails reales, configure la API key de Resend en los secretos del proyecto.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailSender;

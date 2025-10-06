
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface ImportUser {
  full_name: string;
  email: string;
  company: string;
  area: string;
  section: string;
  report_contact: string;
  role: string;
}

interface BulkImportDialogProps {
  showImportDialog: boolean;
  setShowImportDialog: (show: boolean) => void;
  onUsersImported: () => void;
  generateTempPassword: () => string;
}

const BulkImportDialog = ({ 
  showImportDialog, 
  setShowImportDialog, 
  onUsersImported,
  generateTempPassword 
}: BulkImportDialogProps) => {
  const [importUsers, setImportUsers] = useState<ImportUser[]>([]);
  const [importing, setImporting] = useState(false);

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: "Administrador", variant: "default" as const },
      teacher: { label: "Usuario Instructor", variant: "secondary" as const },
      student: { label: "Usuario Evaluado", variant: "outline" as const },
      supervisor: { label: "Supervisor", variant: "destructive" as const }
    };
    return roleConfig[role as keyof typeof roleConfig] || { label: role, variant: "outline" as const };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Leer el archivo con encabezados
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, // Usar índices numéricos
          defval: '' // Valor por defecto para celdas vacías
        });

        // Skip empty rows and get headers
        const rows = jsonData.filter((row: any) => row && row.length > 0) as any[][];
        
        if (rows.length < 2) {
          toast.error('El archivo debe contener al menos una fila de encabezados y una fila de datos');
          return;
        }

        const headers = rows[0] as string[];
        const dataRows = rows.slice(1);

        console.log('Headers found:', headers);
        console.log('Data rows:', dataRows.length);

        // Función para mapear roles a los valores del sistema
        const mapRole = (roleText: string): string => {
          const normalizedRole = roleText.toLowerCase().trim();
          
          if (normalizedRole.includes('admin') || normalizedRole.includes('administrador')) {
            return 'admin';
          }
          if (normalizedRole.includes('teacher') || normalizedRole.includes('instructor') || normalizedRole.includes('profesor')) {
            return 'teacher';
          }
          if (normalizedRole.includes('supervisor')) {
            return 'supervisor';
          }
          // Por defecto, cualquier otro rol se mapea a student
          return 'student';
        };

        const processedUsers: ImportUser[] = dataRows.map((row: any[], index: number) => {
          const user: ImportUser = {
            full_name: '',
            email: '',
            company: '',
            area: '',
            section: '',
            report_contact: '',
            role: 'student'
          };

          // Mapear por posición según el orden esperado
          if (row[0]) user.full_name = String(row[0]).trim();
          if (row[1]) user.email = String(row[1]).trim();
          if (row[2]) user.company = String(row[2]).trim();
          if (row[3]) user.area = String(row[3]).trim();
          if (row[4]) user.section = String(row[4]).trim();
          if (row[5]) user.report_contact = String(row[5]).trim();
          if (row[6]) user.role = mapRole(String(row[6]));

          console.log(`Row ${index + 1}:`, user);
          return user;
        });

        const validUsers = processedUsers.filter(user => {
          const hasValidEmail = user.email && user.email.includes('@') && user.email.length > 5;
          const hasValidName = user.full_name && user.full_name.length > 2;
          return hasValidEmail && hasValidName;
        });
        
        console.log('Valid users:', validUsers.length, 'out of', processedUsers.length);
        
        if (validUsers.length === 0) {
          toast.error('No se encontraron usuarios válidos. Verifique que el archivo tenga email y nombre válidos');
          return;
        }

        setImportUsers(validUsers);
        setShowImportDialog(true);
        toast.success(`${validUsers.length} usuarios cargados para importar`);
        
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Error al procesar el archivo. Verifica el formato.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImport = async () => {
    if (importUsers.length === 0) return;
    
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const user of importUsers) {
      try {
        // Verificar si el usuario ya existe
        const { data: existingUser, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', user.email)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error(`Error checking user ${user.email}:`, profileError);
          errorCount++;
          continue;
        }

        if (existingUser) {
          console.log(`✓ Usuario ${user.email} ya existe en el sistema`);
          skippedCount++;
          continue;
        }

        const tempPassword = generateTempPassword();

        // Obtener sesión actual para usar Edge Function
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('❌ No hay sesión autenticada');
          errorCount++;
          continue;
        }

        // Usar Edge Function admin-user-management para crear usuarios de forma segura
        const response = await supabase.functions.invoke('admin-user-management', {
          body: {
            action: 'createUser',
            email: user.email,
            password: tempPassword,
            full_name: user.full_name,
            role: user.role || 'student',
            company: user.company || '',
            area: user.area || '',
            section: user.section || '',
            report_contact: user.report_contact || ''
          }
        });

        if (response.error) {
          console.error(`❌ Error creando usuario ${user.email}:`, response.error);
          errorCount++;
        } else {
          successCount++;
          console.log(`✅ Usuario ${user.email} pre-registrado exitosamente con contraseña temporal: ${tempPassword}`);
        }

        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        console.error(`❌ Error procesando usuario ${user.email}:`, error);
        errorCount++;
      }
    }

    setImporting(false);
    setShowImportDialog(false);
    setImportUsers([]);
    
    // Mostrar resultados detallados
    if (successCount > 0) {
      toast.success(`✅ ${successCount} evaluados pre-registrados exitosamente`, {
        description: "Ahora pueden ser asignados a exámenes automáticamente"
      });
    }
    if (skippedCount > 0) {
      toast.info(`ℹ️ ${skippedCount} usuarios ya existían en el sistema`, {
        description: "No se duplicaron registros"
      });
    }
    if (errorCount > 0) {
      toast.error(`❌ ${errorCount} usuarios no pudieron ser procesados`, {
        description: "Revise el formato del archivo o contacte soporte"
      });
    }

    // Actualizar lista de usuarios
    setTimeout(() => {
      onUsersImported();
    }, 2000);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Nombre Completo': 'Juan Pérez García',
        'Correo electrónico': 'juan@ejemplo.com',
        'Empresa': 'ACME Corp',
        'Área': 'Producción',
        'Sección': 'Línea A',
        'Contacto de Reporte': 'Supervisor ABC',
        'Rol': 'student'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
    XLSX.writeFile(workbook, 'plantilla_usuarios.xlsx');
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Descargar Plantilla
        </Button>
        <label htmlFor="file-upload">
          <Button variant="outline" asChild>
            <div>
              <Upload className="h-4 w-4 mr-2" />
              Importar Usuarios
            </div>
          </Button>
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl">
        <DialogHeader>
            <DialogTitle>Importación Masiva de Usuarios</DialogTitle>
            <DialogDescription>
              Se han cargado {importUsers.length} usuarios para registrar en el sistema.
              Una vez registrados, podrán acceder al sistema y ser asignados a exámenes.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {importUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{user.full_name}</span>
                    <span className="text-muted-foreground ml-2">({user.email})</span>
                  </div>
                  <Badge>{getRoleBadge(user.role).label}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleBulkImport} disabled={importing} className="flex-1">
              {importing ? 'Importando...' : `Importar ${importUsers.length} Usuarios`}
            </Button>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkImportDialog;

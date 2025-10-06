import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, X, Users } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface CsvData {
  email: string;
  full_name: string;
  company?: string;
  area?: string;
  section?: string;
}

interface CsvUploadProps {
  onUsersLoaded: (users: CsvData[]) => void;
  onClear: () => void;
  uploadedUsers: CsvData[];
}

const CsvUpload = ({ onUsersLoaded, onClear, uploadedUsers }: CsvUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo CSV válido');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const validUsers: CsvData[] = [];
          const errors: string[] = [];

          results.data.forEach((row: any, index: number) => {
            // Homologar con la estructura de "Descargar Plantilla" 
            const email = row['Correo electrónico']?.trim() || row.email?.trim();
            const full_name = row['Nombre Completo']?.trim() || row.full_name?.trim() || row.nombre?.trim();

            if (!email || !full_name) {
              errors.push(`Fila ${index + 1}: Email y nombre son requeridos`);
              return;
            }

            // Validar formato de email básico
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              errors.push(`Fila ${index + 1}: Email inválido - ${email}`);
              return;
            }

            validUsers.push({
              email,
              full_name,
              company: row['Empresa']?.trim() || row.company?.trim() || row.empresa?.trim() || '',
              area: row['Área']?.trim() || row.area?.trim() || '',
              section: row['Sección']?.trim() || row.section?.trim() || row.seccion?.trim() || ''
            });
          });

          if (errors.length > 0) {
            console.warn('Errores en CSV:', errors);
            toast.error(`Se encontraron ${errors.length} errores en el archivo. Revisa la consola.`);
          }

          if (validUsers.length === 0) {
            toast.error('No se encontraron usuarios válidos en el archivo');
            return;
          }

          onUsersLoaded(validUsers);
          toast.success(`${validUsers.length} usuarios cargados exitosamente`);
        } catch (error) {
          console.error('Error processing CSV:', error);
          toast.error('Error al procesar el archivo CSV');
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('Error al leer el archivo CSV');
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  if (uploadedUsers.length > 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Usuarios Cargados desde CSV</CardTitle>
            </div>
            <Button onClick={onClear} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
          <CardDescription>
            {uploadedUsers.length} usuarios listos para asignar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {uploadedUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div>
                  <p className="font-medium text-sm">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.company && (
                    <p className="text-xs text-muted-foreground">
                      {user.company} {user.area && `- ${user.area}`} {user.section && `- ${user.section}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Carga Masiva desde CSV
        </CardTitle>
        <CardDescription>
          Sube un archivo CSV con la información de los usuarios a evaluar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Arrastra tu archivo CSV aquí
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            O haz clic para seleccionar un archivo
          </p>
          
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Seleccionar Archivo CSV
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Formato del archivo CSV:</h4>
          <p className="text-xs text-muted-foreground mb-2">
            El archivo debe contener las siguientes columnas:
          </p>
          <div className="text-xs font-mono bg-background p-2 rounded border">
            "Correo electrónico","Nombre Completo","Empresa","Área","Sección"<br/>
            usuario1@empresa.com,"Juan Pérez","Empresa ABC","Ventas","Norte"<br/>
            usuario2@empresa.com,"María García","Empresa ABC","Marketing","Sur"
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>Requerido:</strong> Correo electrónico, Nombre Completo<br/>
            <strong>Opcional:</strong> Empresa, Área, Sección<br/>
            <strong>Nota:</strong> Use la plantilla Excel descargable para formato correcto
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CsvUpload;
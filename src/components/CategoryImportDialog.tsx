
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { toast } from 'sonner';

interface CategoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (categories: any[]) => Promise<void>;
}

const CategoryImportDialog = ({ open, onOpenChange, onImport }: CategoryImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (fileExtension === 'csv') {
        const text = await file.text();
        Papa.parse(text, {
          header: true,
          encoding: 'UTF-8',
          skipEmptyLines: true,
          complete: (results) => {
            console.log('CSV parsing results:', results);
            const validData = results.data.filter((row: any) => {
              const hasName = (row.name || row.nombre || row.Name || row.Nombre || '').toString().trim() !== '';
              return hasName;
            });
            setPreviewData(validData.slice(0, 5));
          },
          error: (error) => {
            toast.error('Error al leer el archivo CSV: ' + error.message);
            console.error('CSV parsing error:', error);
          }
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        console.log('Excel parsing results:', data);
        
        const validData = data.filter((row: any) => {
          const hasName = (row.name || row.nombre || row.Name || row.Nombre || '').toString().trim() !== '';
          return hasName;
        });
        setPreviewData(validData.slice(0, 5));
      }
    } catch (error) {
      toast.error('Error al procesar el archivo');
      console.error('File parsing error:', error);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Por favor selecciona un archivo');
      return;
    }

    setImporting(true);
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let data: any[] = [];

      if (fileExtension === 'csv') {
        const text = await file.text();
        await new Promise<void>((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            encoding: 'UTF-8',
            skipEmptyLines: true,
            complete: (results) => {
              data = results.data;
              resolve();
            },
            error: (error) => {
              reject(error);
            }
          });
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      }

      console.log('Raw imported data:', data);

      // Transform and validate data to match category structure
      const categories = data.map((row: any) => {
        const name = (row.name || row.nombre || row.Name || row.Nombre || '').toString().trim();
        const description = (row.description || row.descripcion || row.Description || row.Descripcion || '').toString().trim();
        const codigo = (row.codigo_categoria || row.code || row.codigo || row.Code || '').toString().trim();
        const explicacion = (row.explicacion || row.explanation || row.Explicacion || row.Explanation || '').toString().trim();

        return {
          name: name,
          description: description || null,
          codigo_categoria: codigo || null,
          explicacion: explicacion || null
        };
      }).filter(cat => cat.name && cat.name.trim() !== '');

      console.log('Processed categories for import:', categories);

      if (categories.length === 0) {
        toast.error('No se encontraron categorías válidas en el archivo. Asegúrate de que tenga una columna "name" o "nombre" con datos.');
        return;
      }

      await onImport(categories);
      onOpenChange(false);
      setFile(null);
      setPreviewData([]);
      toast.success(`${categories.length} categorías importadas exitosamente`);
    } catch (error) {
      toast.error('Error al importar categorías: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setPreviewData([]);
    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Categorías</DialogTitle>
          <DialogDescription>
            Importa categorías desde un archivo CSV o Excel. Las categorías servirán para clasificar las preguntas del sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Seleccionar Archivo</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
            />
            <p className="text-sm text-muted-foreground">
              Formatos soportados: CSV (UTF-8), Excel (.xlsx, .xls)
            </p>
          </div>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Formato esperado del archivo:</strong><br/>
              • <code>name/nombre</code> (requerido) - Nombre de la categoría<br/>
              • <code>description/descripcion</code> (opcional) - Descripción de la categoría<br/>
              • <code>codigo_categoria/code</code> (opcional) - Código identificador<br/>
              • <code>explicacion/explanation</code> (opcional) - Explicación detallada
            </AlertDescription>
          </Alert>

          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>Vista Previa (primeras 5 categorías)</Label>
              <div className="border rounded-lg p-3 bg-muted/50 max-h-60 overflow-auto">
                <div className="space-y-2">
                  {previewData.map((row, index) => (
                    <div key={index} className="text-xs border-b pb-2 last:border-b-0">
                      <div><strong>Nombre:</strong> {row.name || row.nombre || row.Name || row.Nombre || 'No especificado'}</div>
                      {(row.description || row.descripcion || row.Description || row.Descripcion) && (
                        <div><strong>Descripción:</strong> {row.description || row.descripcion || row.Description || row.Descripcion}</div>
                      )}
                      {(row.codigo_categoria || row.code || row.codigo || row.Code) && (
                        <div><strong>Código:</strong> {row.codigo_categoria || row.code || row.codigo || row.Code}</div>
                      )}
                      {(row.explicacion || row.explanation || row.Explicacion || row.Explanation) && (
                        <div><strong>Explicación:</strong> {row.explicacion || row.explanation || row.Explicacion || row.Explanation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || importing}
            >
              {importing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Categorías
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryImportDialog;

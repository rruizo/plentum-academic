
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  nombre?: string;
  codigo_categoria?: string;
}

interface AdvancedImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onImport: (questions: any[]) => Promise<void>;
}

interface QuestionMapping {
  originalData: any;
  questionText: string;
  categoryName: string;
  categoryId?: string;
  categoryMapped: boolean;
  mediaSelected: string;
}

const AdvancedImportDialog = ({ open, onOpenChange, categories, onImport }: AdvancedImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [rawData, setRawData] = useState<any[]>([]);
  const [questionMappings, setQuestionMappings] = useState<QuestionMapping[]>([]);

  const resetDialog = () => {
    setFile(null);
    setRawData([]);
    setQuestionMappings([]);
    setStep('upload');
    setImporting(false);
  };

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
            error: reject
          });
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      }

      console.log('Raw parsed data:', data);
      
      const validData = data.filter((row: any) => {
        const hasQuestion = (row.question_text || row.texto_pregunta || row.pregunta || row.Question || '').toString().trim() !== '';
        return hasQuestion;
      });

      if (validData.length === 0) {
        toast.error('No se encontraron preguntas válidas en el archivo');
        return;
      }

      setRawData(validData);
      processDataForMapping(validData);
      setStep('mapping');
      
    } catch (error) {
      toast.error('Error al procesar el archivo');
      console.error('File parsing error:', error);
    }
  };

  const processDataForMapping = (data: any[]) => {
    const mappings: QuestionMapping[] = data.map((row, index) => {
      const questionText = (row.question_text || row.texto_pregunta || row.pregunta || row.Question || '').toString().trim();
      const categoryName = (row.category_name || row.categoria || row.category || row.Category || '').toString().trim();
      
      // Try to find matching category
      const matchedCategory = categories.find(cat => 
        cat.name === categoryName || 
        cat.nombre === categoryName ||
        cat.codigo_categoria === categoryName
      );

      return {
        originalData: row,
        questionText,
        categoryName,
        categoryId: matchedCategory?.id,
        categoryMapped: !!matchedCategory,
        mediaSelected: (row.media_poblacional_pregunta || row.media || 'Nunca').toString(),
      };
    });

    setQuestionMappings(mappings);
  };

  const updateQuestionMapping = (index: number, field: keyof QuestionMapping, value: any) => {
    setQuestionMappings(prev => prev.map((mapping, i) => 
      i === index ? { 
        ...mapping, 
        [field]: value,
        ...(field === 'categoryId' ? { categoryMapped: !!value } : {})
      } : mapping
    ));
  };

  const handleImport = async () => {
    const unmappedQuestions = questionMappings.filter(q => !q.categoryMapped);
    
    if (unmappedQuestions.length > 0) {
      toast.error(`${unmappedQuestions.length} preguntas no tienen categoría asignada`);
      return;
    }

    setImporting(true);
    try {
      const questionsToImport = questionMappings.map(mapping => ({
        question_text: mapping.questionText,
        texto_pregunta: mapping.questionText,
        category_id: mapping.categoryId,
        media_poblacional_pregunta: mapping.mediaSelected,
        question_type: 'reliability',
        options: ['Nunca', 'Rara vez', 'A veces', 'Frecuentemente'],
        opciones_respuesta_fijas: ['Nunca', 'Rara vez', 'A veces', 'Frecuentemente']
      }));

      console.log('Questions to import:', questionsToImport);
      
      await onImport(questionsToImport);
      onOpenChange(false);
      resetDialog();
      toast.success(`${questionsToImport.length} preguntas importadas exitosamente`);
    } catch (error) {
      toast.error('Error al importar preguntas: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const mappedCount = questionMappings.filter(q => q.categoryMapped).length;
  const totalCount = questionMappings.length;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Preguntas</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Selecciona un archivo CSV o Excel con las preguntas'}
            {step === 'mapping' && `Mapear categorías (${mappedCount}/${totalCount} mapeadas)`}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Seleccionar Archivo</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
              />
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Formato esperado:</strong><br/>
                • <code>question_text/texto_pregunta</code> - Texto de la pregunta<br/>
                • <code>category_name/categoria</code> - Nombre o código de la categoría<br/>
                • <code>media_poblacional_pregunta</code> - Media poblacional (Nunca, Rara vez, A veces, Frecuentemente)
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {mappedCount} de {totalCount} preguntas tienen categoría asignada
              </div>
              <Badge variant={mappedCount === totalCount ? 'default' : 'secondary'}>
                {mappedCount === totalCount ? 'Listo para importar' : 'Faltan categorías'}
              </Badge>
            </div>

            {categories.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No hay categorías disponibles. Necesitas crear categorías primero.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {questionMappings.map((mapping, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    {mapping.categoryMapped ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium mb-1 truncate">
                        {mapping.questionText}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Categoría original: "{mapping.categoryName || 'No especificada'}"
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Asignar Categoría</Label>
                      <Select
                        value={mapping.categoryId || ''}
                        onValueChange={(value) => updateQuestionMapping(index, 'categoryId', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name || category.nombre}
                              {category.codigo_categoria && ` (${category.codigo_categoria})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Media Poblacional</Label>
                      <Select
                        value={mapping.mediaSelected}
                        onValueChange={(value) => updateQuestionMapping(index, 'mediaSelected', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nunca">Nunca</SelectItem>
                          <SelectItem value="Rara vez">Rara vez</SelectItem>
                          <SelectItem value="A veces">A veces</SelectItem>
                          <SelectItem value="Frecuentemente">Frecuentemente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Volver
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={mappedCount !== totalCount || importing}
              >
                {importing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar {totalCount} Preguntas
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedImportDialog;

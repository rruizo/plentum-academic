
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Printer, Download, Eye, BarChart3, Users, Calendar, Edit, Copy, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExamResult {
  id: string;
  user_id: string;
  fecha_inicio: string;
  fecha_finalizacion: string;
  puntaje_total: number;
  estado: string;
  profiles?: {
    full_name: string;
    email: string;
    company: string;
  } | null;
}

interface ExamResultsViewerProps {
  examId: string;
  examTitle: string;
  onBack: () => void;
  userRole?: string;
}

const ExamResultsViewer = ({ examId, examTitle, onBack, userRole = 'student' }: ExamResultsViewerProps) => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [showHTMLReport, setShowHTMLReport] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [deletingExam, setDeletingExam] = useState(false);

  useEffect(() => {
    fetchExamResults();
  }, [examId]);

  const fetchExamResults = async () => {
    try {
      setLoading(true);
      
      // Primero obtener los resultados del examen
      const { data: examResults, error: examError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .order('started_at', { ascending: false });

      if (examError) throw examError;

      // Luego obtener los perfiles de usuario para cada resultado
      const resultsWithProfiles: ExamResult[] = [];
      
      for (const result of examResults || []) {
        let profiles = null;
        
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email, company')
            .eq('id', result.user_id)
            .single();
          
          if (!profileError && profileData) {
            profiles = {
              full_name: profileData.full_name || 'Sin nombre',
              email: profileData.email || 'Sin email',
              company: profileData.company || 'Sin empresa'
            };
          }
        } catch (error) {
          console.log('Profile not found for user:', result.user_id);
        }

        resultsWithProfiles.push({
          id: result.id,
          user_id: result.user_id,
          fecha_inicio: result.started_at,
          fecha_finalizacion: result.completed_at,
          puntaje_total: result.score || 0,
          estado: result.completed_at ? 'finalizado' : 'en_progreso',
          profiles: profiles
        });
      }
      
      setResults(resultsWithProfiles);
    } catch (error) {
      console.error('Error fetching exam results:', error);
      toast.error('Error al cargar los resultados del examen');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateExam = async () => {
    try {
      // Obtener el examen original
      const { data: originalExam, error: fetchError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (fetchError) throw fetchError;

      // Crear copia del examen
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const duplicatedExam = {
        title: `${originalExam.title} (Copia)`,
        description: originalExam.description,
        duracion_minutos: originalExam.duracion_minutos,
        created_by: user.id,
        estado: 'borrador',
        fecha_apertura: null,
        fecha_cierre: null
      };

      const { data, error: createError } = await supabase
        .from('exams')
        .insert(duplicatedExam)
        .select()
        .single();

      if (createError) throw createError;

      // Copiar configuración de categorías si existe
      const { data: categoryConfigs } = await supabase
        .from('examen_configuracion_categoria')
        .select('*')
        .eq('examen_id', examId);

      if (categoryConfigs && categoryConfigs.length > 0) {
        const duplicatedConfigs = categoryConfigs.map(config => ({
          examen_id: data.id,
          categoria_id: config.categoria_id,
          num_preguntas_a_incluir: config.num_preguntas_a_incluir
        }));

        await supabase
          .from('examen_configuracion_categoria')
          .insert(duplicatedConfigs);
      }

      toast.success('Examen duplicado exitosamente');
    } catch (error) {
      console.error('Error duplicating exam:', error);
      toast.error('Error al duplicar el examen');
    }
  };

  const checkExamResults = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('id')
        .eq('exam_id', examId)
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking exam results:', error);
      return false;
    }
  };

  const handleDeleteExam = async () => {
    try {
      setDeletingExam(true);
      
      // Verificar si existen resultados
      const hasResults = await checkExamResults();
      
      if (hasResults) {
        toast.error('No se puede eliminar el examen porque tiene resultados asociados.');
        return;
      }

      // Eliminar configuraciones de categorías primero
      await supabase
        .from('examen_configuracion_categoria')
        .delete()
        .eq('examen_id', examId);

      // Eliminar el examen
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (error) throw error;

      toast.success('Examen eliminado exitosamente');
      onBack(); // Regresar a la lista de exámenes
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Error al eliminar el examen');
    } finally {
      setDeletingExam(false);
    }
  };

  const generateHTMLReport = async (resultId: string) => {
    try {
      const result = results.find(r => r.id === resultId);
      if (!result) return;

      // Generar contenido HTML del reporte mejorado
      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reporte de Confiabilidad - ${examTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background: #fff;
              padding: 20px;
              max-width: 1000px;
              margin: 0 auto;
            }
            
            .header {
              text-align: center;
              border-bottom: 3px solid #007bff;
              padding-bottom: 30px;
              margin-bottom: 40px;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              padding: 30px;
              border-radius: 10px;
            }
            
            .header h1 {
              color: #007bff;
              font-size: 2.5em;
              margin-bottom: 10px;
              font-weight: 700;
            }
            
            .header h2 {
              color: #495057;
              font-size: 1.5em;
              font-weight: 400;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 25px;
              margin-bottom: 40px;
            }
            
            .info-card {
              border: 2px solid #e9ecef;
              padding: 25px;
              border-radius: 12px;
              background: #f8f9fa;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              transition: transform 0.2s ease;
            }
            
            .info-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 12px rgba(0,0,0,0.15);
            }
            
            .info-card h3 {
              color: #007bff;
              margin-bottom: 15px;
              font-size: 1.3em;
              border-bottom: 2px solid #007bff;
              padding-bottom: 5px;
            }
            
            .info-card p {
              margin-bottom: 8px;
              font-size: 1.1em;
            }
            
            .info-card strong {
              color: #495057;
              font-weight: 600;
            }
            
            .score-section {
              text-align: center;
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
              color: white;
              padding: 40px;
              border-radius: 15px;
              margin: 30px 0;
              box-shadow: 0 8px 16px rgba(40, 167, 69, 0.3);
            }
            
            .score {
              font-size: 3.5em;
              font-weight: bold;
              margin-bottom: 10px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            .score-label {
              font-size: 1.5em;
              font-weight: 300;
              opacity: 0.9;
            }
            
            .status {
              padding: 8px 16px;
              border-radius: 25px;
              color: white;
              font-weight: bold;
              display: inline-block;
              font-size: 1.1em;
            }
            
            .status.completado {
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            }
            
            .status.en_progreso {
              background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
              color: #000;
            }
            
            .analysis-section {
              background: #fff;
              border: 2px solid #dee2e6;
              padding: 30px;
              border-radius: 12px;
              margin: 30px 0;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            
            .analysis-section h3 {
              color: #007bff;
              font-size: 1.5em;
              margin-bottom: 20px;
              border-left: 5px solid #007bff;
              padding-left: 15px;
            }
            
            .footer {
              text-align: center;
              margin-top: 50px;
              padding: 20px;
              border-top: 2px solid #dee2e6;
              color: #6c757d;
              font-style: italic;
            }
            
            .date-generated {
              background: #e9ecef;
              padding: 10px 20px;
              border-radius: 20px;
              display: inline-block;
              margin-top: 10px;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 15px;
                font-size: 12pt;
              }
              
              .no-print {
                display: none !important;
              }
              
              .info-grid {
                grid-template-columns: 1fr 1fr;
              }
              
              .score {
                font-size: 2.5em;
              }
              
              .header h1 {
                font-size: 2em;
              }
              
              .info-card:hover {
                transform: none;
              }
            }
            
            @media (max-width: 768px) {
              .info-grid {
                grid-template-columns: 1fr;
              }
              
              .score {
                font-size: 2.5em;
              }
              
              .header h1 {
                font-size: 2em;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛡️ Reporte de Evaluación de Confiabilidad</h1>
            <h2>${examTitle}</h2>
          </div>
          
          <div class="info-grid">
            <div class="info-card">
              <h3>👤 Información del Participante</h3>
              <p><strong>Nombre:</strong> ${result.profiles?.full_name || 'No especificado'}</p>
              <p><strong>Email:</strong> ${result.profiles?.email || 'No especificado'}</p>
              <p><strong>Empresa:</strong> ${result.profiles?.company || 'No especificada'}</p>
            </div>
            
            <div class="info-card">
              <h3>📋 Detalles del Examen</h3>
              <p><strong>Fecha de Inicio:</strong> ${new Date(result.fecha_inicio).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p><strong>Fecha de Finalización:</strong> ${result.fecha_finalizacion 
                ? new Date(result.fecha_finalizacion).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'En progreso'
              }</p>
              <p><strong>Estado:</strong> <span class="status ${result.estado}">${result.estado.toUpperCase()}</span></p>
            </div>
          </div>
          
          <div class="score-section">
            <div class="score">${result.puntaje_total || 0}</div>
            <div class="score-label">Puntaje Total Obtenido</div>
          </div>
          
          <div class="analysis-section">
            <h3>📊 Análisis de Resultados</h3>
            <p style="font-size: 1.2em; line-height: 1.8;">
              Este reporte presenta los resultados de la evaluación de confiabilidad realizada. 
              El análisis incluye el puntaje total obtenido y proporciona información relevante 
              sobre el nivel de confiabilidad del participante evaluado.
            </p>
            
            <div style="margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 5px solid #28a745;">
              <h4 style="color: #28a745; margin-bottom: 10px;">💡 Interpretación</h4>
              <p>Los resultados obtenidos han sido procesados siguiendo metodologías estándar 
              de evaluación psicométrica para garantizar la precisión y confiabilidad del análisis.</p>
            </div>
          </div>
          
          <div class="footer">
            <div class="date-generated">
              📅 Reporte generado el: ${new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <p style="margin-top: 15px;">
              Este documento contiene información confidencial y debe ser tratado con la debida reserva.
            </p>
          </div>
        </body>
        </html>
      `;

      setHtmlContent(html);
      setShowHTMLReport(true);
    } catch (error) {
      console.error('Error generating HTML report:', error);
      toast.error('Error al generar el reporte HTML');
    }
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Esperar a que se carguen los estilos antes de imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 100);
      };
    }
  };

  const downloadReport = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-confiabilidad-${examTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Reporte descargado exitosamente');
  };

  if (showHTMLReport) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
          <Button variant="outline" onClick={() => setShowHTMLReport(false)} className="flex items-center gap-2">
            ← Volver a Resultados
          </Button>
          <div className="flex gap-2">
            <Button onClick={printReport} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Imprimir Reporte
            </Button>
            <Button variant="outline" onClick={downloadReport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Descargar HTML
            </Button>
          </div>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa del Reporte
            </CardTitle>
            <CardDescription>
              Previsualización del reporte que se imprimirá. Utilice los botones superiores para imprimir o descargar.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              className="border rounded-b-lg overflow-auto max-h-[70vh] bg-white"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando resultados...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          ← Volver a Exámenes
        </Button>
        <div className="flex gap-2">
          {userRole === 'admin' && (
            <>
              <Button variant="outline" onClick={handleDuplicateExam} className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Duplicar Examen
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Modificar Examen
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={deletingExam}
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar Examen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Confirmar Eliminación de Examen
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Está seguro de que desea eliminar el examen "{examTitle}"?
                      <br /><br />
                      {results.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <strong className="text-red-700 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            ADVERTENCIA:
                          </strong>
                          <p className="text-red-600 mt-1 text-sm">
                            Este examen tiene <strong>{results.length} resultado{results.length !== 1 ? 's' : ''}</strong> asociado{results.length !== 1 ? 's' : ''}. 
                            No se puede eliminar un examen con resultados.
                          </p>
                        </div>
                      )}
                      <br />
                      <strong className="text-red-600">Esta acción no se puede deshacer.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteExam}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={results.length > 0}
                    >
                      Eliminar Examen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold">{examTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
        </p>
      </div>

      {results.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin Resultados</CardTitle>
            <CardDescription>
              Este examen aún no tiene resultados registrados.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {result.profiles?.full_name || 'Participante'}
                    </CardTitle>
                    <CardDescription>
                      {result.profiles?.email} • {result.profiles?.company}
                    </CardDescription>
                  </div>
                  <Badge variant={result.estado === 'completado' ? 'default' : 'secondary'}>
                    {result.estado}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {result.puntaje_total || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Puntaje</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">
                      {new Date(result.fecha_inicio).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Fecha Inicio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">
                      {result.fecha_finalizacion 
                        ? new Date(result.fecha_finalizacion).toLocaleDateString()
                        : 'En progreso'
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">Fecha Fin</div>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      onClick={() => generateHTMLReport(result.id)}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Ver Reporte Completo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamResultsViewer;

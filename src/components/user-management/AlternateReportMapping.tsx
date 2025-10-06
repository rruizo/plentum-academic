import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FileText, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  full_name: string;
  email: string;
  exam_completed: boolean;
}

interface ExamAttempt {
  id: string;
  user_id: string;
  exam_id: string;
  completed_at: string;
  score: number;
}

interface AlternateReportMappingProps {
  users: User[];
}

const AlternateReportMapping = ({ users }: AlternateReportMappingProps) => {
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [alternateReports, setAlternateReports] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  useEffect(() => {
    fetchExamAttempts();
  }, [users]);

  const fetchExamAttempts = async () => {
    try {
      setLoading(true);
      const userIds = users.filter(u => u.exam_completed).map(u => u.id);
      
      if (userIds.length === 0) return;

      const { data, error } = await supabase
        .from('exam_attempts')
        .select('id, user_id, exam_id, completed_at, score')
        .in('user_id', userIds)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      setExamAttempts(data || []);
    } catch (error) {
      console.error('Error fetching exam attempts:', error);
      toast.error('Error al cargar intentos de examen');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlternateReport = (attemptId: string, enabled: boolean) => {
    setAlternateReports(prev => ({
      ...prev,
      [attemptId]: enabled
    }));
  };

  const generateAlternateReport = async (attemptId: string) => {
    try {
      setGeneratingReport(attemptId);
      
      // Obtener datos del intento para el PDF
      const attempt = examAttempts.find(a => a.id === attemptId);
      const user = users.find(u => u.id === attempt?.user_id);
      
      if (!attempt || !user) {
        throw new Error('No se encontró el intento de examen o usuario');
      }
      
      // Primero generar el HTML del reporte
      const { data: htmlData, error: htmlError } = await supabase.functions.invoke('generate-alternative-pdf-report', {
        body: {
          examAttemptId: attemptId,
          reportConfig: {
            include_sections: {
              personal_info: true,
              category_scores: true,
              risk_analysis: true,
              recommendations: true,
              charts: true
            },
            font_family: 'Arial',
            font_size: 12
          },
          includeAnalysis: true
        }
      });

      if (htmlError) throw htmlError;

      // Ahora generar el PDF y guardarlo en storage
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf-with-storage', {
        body: {
          htmlContent: htmlData.html,
          userId: user.id,
          examId: attempt.exam_id,
          reportType: 'alternate_reliability',
          templateName: 'Reporte Alternativo de Confiabilidad',
          reportConfig: {
            include_sections: {
              personal_info: true,
              category_scores: true,
              risk_analysis: true,
              recommendations: true,
              charts: true
            }
          }
        }
      });

      if (pdfError) throw pdfError;

      // El PDF se devuelve como Blob, descargarlo
      const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_Alternativo_${user.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Reporte alternativo generado y guardado exitosamente');
    } catch (error) {
      console.error('Error generating alternate report:', error);
      toast.error(`Error al generar el reporte alternativo: ${error.message}`);
    } finally {
      setGeneratingReport(null);
    }
  };

  const previewAlternateReport = async (attemptId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-alternative-pdf-report', {
        body: {
          examAttemptId: attemptId,
          reportConfig: {
            include_sections: {
              personal_info: true,
              category_scores: true,
              risk_analysis: true,
              recommendations: true,
              charts: true
            }
          },
          includeAnalysis: true
        }
      });

      if (error) throw error;

      // Open HTML in new window for preview
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(data.html);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Error previewing alternate report:', error);
      toast.error('Error al previsualizar el reporte');
    }
  };

  const completedUsers = users.filter(user => 
    examAttempts.some(attempt => attempt.user_id === user.id)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando intentos de examen...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Mapeo de Reportes Alternativos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configura y genera reportes alternativos para usuarios que han completado exámenes de confiabilidad
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {completedUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay usuarios con exámenes completados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedUsers.map(user => {
              const userAttempts = examAttempts.filter(attempt => attempt.user_id === user.id);
              return (
                <div key={user.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{user.full_name}</h4>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="secondary">
                      {userAttempts.length} intento{userAttempts.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {userAttempts.map(attempt => (
                      <div key={attempt.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={alternateReports[attempt.id] || false}
                            onCheckedChange={(checked) => toggleAlternateReport(attempt.id, checked)}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              Intento: {new Date(attempt.completed_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Puntaje: {attempt.score || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => previewAlternateReport(attempt.id)}
                            disabled={!alternateReports[attempt.id]}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateAlternateReport(attempt.id)}
                            disabled={!alternateReports[attempt.id] || generatingReport === attempt.id}
                          >
                            {generatingReport === attempt.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlternateReportMapping;
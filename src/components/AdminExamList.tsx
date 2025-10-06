import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Copy, Users, BarChart3, Calendar, Clock, AlertTriangle, Eye, FileText } from 'lucide-react';
import { useExamData } from '@/hooks/useExamData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ExamResults from './ExamResults';
import ExamEditDialog from './exam/ExamEditDialog';

interface AdminExamListProps {
  userRole: string;
}

const AdminExamList = ({ userRole }: AdminExamListProps) => {
  const { exams, loading, fetchExams } = useExamData();
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<string | null>(null);
  const [examResultsCount, setExamResultsCount] = useState<Record<string, number>>({});

  // Cargar conteo de resultados para cada examen
  useEffect(() => {
    const loadResultsCounts = async () => {
      if (exams.length === 0) return;
      
      const counts: Record<string, number> = {};
      
      for (const exam of exams) {
        try {
          const { data, error } = await supabase
            .from('exam_attempts')
            .select('id')
            .eq('exam_id', exam.id);
          
          if (!error && data) {
            counts[exam.id] = data.length;
          }
        } catch (error) {
          console.error('Error counting results for exam:', exam.id, error);
          counts[exam.id] = 0;
        }
      }
      
      setExamResultsCount(counts);
    };
    
    loadResultsCounts();
  }, [exams]);

  const handleDuplicateExam = async (examId: string) => {
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
      fetchExams();
    } catch (error) {
      console.error('Error duplicating exam:', error);
      toast.error('Error al duplicar el examen');
    }
  };

  const checkExamResults = async (examId: string): Promise<boolean> => {
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

  const handleDeleteExam = async (examId: string) => {
    try {
      setDeletingExamId(examId);
      
      // Verificar si existen resultados
      const hasResults = await checkExamResults(examId);
      
      if (hasResults) {
        toast.error('No se puede eliminar el examen porque tiene resultados asociados. Considere archivarlo en su lugar.');
        setDeletingExamId(null);
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
      fetchExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Error al eliminar el examen');
    } finally {
      setDeletingExamId(null);
    }
  };

  const handleViewResults = (examId: string) => {
    setShowResults(examId);
  };

  const handleBackFromResults = () => {
    setShowResults(null);
  };

  if (showResults) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackFromResults}>
          ← Volver a Exámenes Disponibles
        </Button>
        <ExamResults examId={showResults} userRole={userRole} />
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando exámenes...</p>
        </CardContent>
      </Card>
    );
  }

  if (exams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exámenes Disponibles</CardTitle>
          <CardDescription>
            No hay exámenes disponibles. Crea tu primer examen para comenzar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Exámenes Disponibles</h3>
          <p className="text-sm text-muted-foreground">
            {exams.length} examen{exams.length !== 1 ? 'es' : ''} encontrado{exams.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map((exam) => {
          const resultsCount = examResultsCount[exam.id] || 0;
          const hasResults = resultsCount > 0;
          
          return (
            <Card key={exam.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-2">{exam.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {exam.description || 'Sin descripción'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant={exam.estado === 'activo' ? 'default' : exam.estado === 'borrador' ? 'secondary' : 'outline'}>
                      {exam.estado}
                    </Badge>
                    {hasResults && (
                      <Badge variant="outline" className="text-xs">
                        {resultsCount} resultado{resultsCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{exam.duracion_minutos} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>Público</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Creado: {new Date(exam.created_at).toLocaleDateString()}
                    </div>
                    {exam.fecha_apertura && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Apertura: {new Date(exam.fecha_apertura).toLocaleDateString()}
                      </div>
                    )}
                    {exam.fecha_cierre && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Cierre: {new Date(exam.fecha_cierre).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Botones para todos los usuarios */}
                  <div className="flex gap-1 pt-2 border-t">
                    {/* Botón Ver Detalles - disponible para todos */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewResults(exam.id)}
                      className="flex-1"
                      title="Ver detalles del examen"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Ver Detalles
                    </Button>

                    {/* Botones específicos para admin */}
                    {userRole === 'admin' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicateExam(exam.id)}
                          title="Duplicar examen"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        
                        <ExamEditDialog 
                          exam={exam} 
                          onExamUpdated={fetchExams}
                        />
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deletingExamId === exam.id}
                              title="Eliminar examen"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Confirmar Eliminación
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Está seguro de que desea eliminar el examen "{exam.title}"?
                                <br /><br />
                                {hasResults && (
                                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                    <strong className="text-red-700 flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4" />
                                      ADVERTENCIA CRÍTICA:
                                    </strong>
                                    <p className="text-red-600 mt-1 text-sm">
                                      Este examen tiene <strong>{resultsCount} resultado{resultsCount !== 1 ? 's' : ''}</strong> asociado{resultsCount !== 1 ? 's' : ''}. 
                                      Al eliminarlo, se perderán todos los datos de respuestas y análisis.
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
                                onClick={() => handleDeleteExam(exam.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {hasResults ? 'Eliminar con Resultados' : 'Eliminar Examen'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminExamList;

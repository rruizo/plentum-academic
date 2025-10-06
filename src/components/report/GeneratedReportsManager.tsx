import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Eye, Trash2, Search, FileText, Calendar, User } from 'lucide-react';

interface GeneratedReport {
  id: string;
  user_id: string;
  exam_id: string | null;
  psychometric_test_id: string | null;
  report_type: 'reliability' | 'ocean' | 'custom';
  template_name: string | null;
  file_path: string;
  file_size: number | null;
  storage_bucket: string;
  generation_metadata: any;
  created_at: string;
  updated_at: string;
  // Datos relacionados
  profile?: {
    full_name: string;
    email: string;
    company: string;
  };
  exam?: {
    title: string;
  };
  psychometric_test?: {
    name: string;
  };
}

interface GeneratedReportsManagerProps {
  userRole?: 'admin' | 'teacher' | 'supervisor' | 'student';
  currentUserId?: string;
}

const GeneratedReportsManager: React.FC<GeneratedReportsManagerProps> = ({
  userRole = 'student',
  currentUserId
}) => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const { toast } = useToast();

  const canViewAllReports = ['admin', 'teacher', 'supervisor'].includes(userRole);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('generated_reports')
        .select(`
          *,
          profile:profiles(full_name, email, company),
          exam:exams(title),
          psychometric_test:psychometric_tests(name)
        `);

      // Filtrar por usuario si no es admin/teacher/supervisor
      if (!canViewAllReports && currentUserId) {
        query = query.eq('user_id', currentUserId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports((data as GeneratedReport[]) || []);
    } catch (error: any) {
      console.error('Error cargando reportes:', error);
      toast({
        title: "Error",
        description: "Error al cargar los reportes generados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (report: GeneratedReport) => {
    try {
      const { data, error } = await supabase.storage
        .from(report.storage_bucket)
        .download(report.file_path);

      if (error) throw error;

      // Crear URL para descarga
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.template_name || 'reporte'}-${report.created_at.split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Descarga iniciada",
        description: "El reporte se está descargando"
      });
    } catch (error: any) {
      console.error('Error descargando reporte:', error);
      toast({
        title: "Error",
        description: "Error al descargar el reporte",
        variant: "destructive"
      });
    }
  };

  const previewReport = async (report: GeneratedReport) => {
    try {
      const { data, error } = await supabase.storage
        .from(report.storage_bucket)
        .createSignedUrl(report.file_path, 3600); // 1 hora

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Error previsualizando reporte:', error);
      toast({
        title: "Error",
        description: "Error al previsualizar el reporte",
        variant: "destructive"
      });
    }
  };

  const deleteReport = async (report: GeneratedReport) => {
    if (!canViewAllReports && report.user_id !== currentUserId) {
      toast({
        title: "Error",
        description: "No tienes permisos para eliminar este reporte",
        variant: "destructive"
      });
      return;
    }

    try {
      // Eliminar archivo del storage
      const { error: storageError } = await supabase.storage
        .from(report.storage_bucket)
        .remove([report.file_path]);

      if (storageError) console.warn('Error eliminando archivo del storage:', storageError);

      // Eliminar registro de la base de datos
      const { error: dbError } = await supabase
        .from('generated_reports')
        .delete()
        .eq('id', report.id);

      if (dbError) throw dbError;

      toast({
        title: "Reporte eliminado",
        description: "El reporte ha sido eliminado correctamente"
      });

      loadReports();
    } catch (error: any) {
      console.error('Error eliminando reporte:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el reporte",
        variant: "destructive"
      });
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.exam?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.psychometric_test?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = reportTypeFilter === 'all' || report.report_type === reportTypeFilter;

    return matchesSearch && matchesType;
  });

  const getReportTypeBadge = (type: string) => {
    const variants = {
      reliability: 'default',
      ocean: 'secondary',
      custom: 'outline'
    } as const;

    const labels = {
      reliability: 'Confiabilidad',
      ocean: 'OCEAN',
      custom: 'Personalizado'
    };

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'default'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reportes Generados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando reportes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Reportes Generados ({filteredReports.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por candidato, email, template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo de reporte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="reliability">Confiabilidad</SelectItem>
              <SelectItem value="ocean">OCEAN</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabla de reportes */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {reports.length === 0 ? 'No hay reportes generados' : 'No se encontraron reportes con los filtros aplicados'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canViewAllReports && <TableHead>Candidato</TableHead>}
                  <TableHead>Tipo</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Examen/Test</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Generado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    {canViewAllReports && (
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.profile?.full_name}</div>
                          <div className="text-sm text-gray-500">{report.profile?.email}</div>
                          {report.profile?.company && (
                            <div className="text-xs text-gray-400">{report.profile.company}</div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {getReportTypeBadge(report.report_type)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{report.template_name || 'Sin nombre'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {report.exam?.title || report.psychometric_test?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(report.file_size)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(report.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => previewReport(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(report)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {(canViewAllReports || report.user_id === currentUserId) && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirmar eliminación</DialogTitle>
                              </DialogHeader>
                              <div className="py-4">
                                <p>¿Estás seguro de que deseas eliminar este reporte?</p>
                                <p className="text-sm text-gray-500 mt-2">
                                  Esta acción no se puede deshacer.
                                </p>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline">Cancelar</Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => deleteReport(report)}
                                >
                                  Eliminar
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GeneratedReportsManager;
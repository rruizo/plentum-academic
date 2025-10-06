
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useExamData, Exam } from '@/hooks/useExamData';

interface ExamEditDialogProps {
  exam: Exam;
  onExamUpdated?: () => void;
}

const ExamEditDialog = ({ exam, onExamUpdated }: ExamEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: exam.title,
    description: exam.description || '',
    duracion_minutos: exam.duracion_minutos || 60,
    fecha_apertura: exam.fecha_apertura ? new Date(exam.fecha_apertura).toISOString().slice(0, 16) : '',
    fecha_cierre: exam.fecha_cierre ? new Date(exam.fecha_cierre).toISOString().slice(0, 16) : '',
    estado: exam.estado || 'borrador'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      title: exam.title,
      description: exam.description || '',
      duracion_minutos: exam.duracion_minutos || 60,
      fecha_apertura: exam.fecha_apertura ? new Date(exam.fecha_apertura).toISOString().slice(0, 16) : '',
      fecha_cierre: exam.fecha_cierre ? new Date(exam.fecha_cierre).toISOString().slice(0, 16) : '',
      estado: exam.estado || 'borrador'
    });
  }, [exam]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('El título del examen es requerido');
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        duracion_minutos: formData.duracion_minutos,
        fecha_apertura: formData.fecha_apertura || null,
        fecha_cierre: formData.fecha_cierre || null,
        estado: formData.estado,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('exams')
        .update(updateData)
        .eq('id', exam.id);

      if (error) throw error;

      toast.success('Examen actualizado exitosamente');
      setOpen(false);
      
      if (onExamUpdated) {
        onExamUpdated();
      }
    } catch (error) {
      console.error('Error updating exam:', error);
      toast.error('Error al actualizar el examen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" title="Editar examen">
          <Edit className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Examen</DialogTitle>
          <DialogDescription>
            Modifica la información y configuración del examen
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título del Examen</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título del examen"
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del examen"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="duracion_minutos">Duración (minutos)</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="duracion_minutos"
                  type="number"
                  min="15"
                  max="240"
                  value={formData.duracion_minutos}
                  onChange={(e) => setFormData({ ...formData, duracion_minutos: parseInt(e.target.value) || 60 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fecha_apertura">Fecha de Apertura</Label>
                <Input
                  id="fecha_apertura"
                  type="datetime-local"
                  value={formData.fecha_apertura}
                  onChange={(e) => setFormData({ ...formData, fecha_apertura: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="fecha_cierre">Fecha de Cierre</Label>
                <Input
                  id="fecha_cierre"
                  type="datetime-local"
                  value={formData.fecha_cierre}
                  onChange={(e) => setFormData({ ...formData, fecha_cierre: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="estado">Estado del Examen</Label>
              <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Borrador</Badge>
                      <span>En desarrollo</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="activo">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Activo</Badge>
                      <span>Disponible para candidatos</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pausado">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Pausado</Badge>
                      <span>Temporalmente suspendido</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="finalizado">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Finalizado</Badge>
                      <span>No acepta más respuestas</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExamEditDialog;

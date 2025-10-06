
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Category } from '@/hooks/useExamData';

interface CategoryEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (categoryData: Partial<Category>) => Promise<void>;
  onDelete?: (categoryId: string) => Promise<void>;
  mode: 'create' | 'edit';
}

const CategoryEditor = ({ 
  open, 
  onOpenChange, 
  category, 
  onSave, 
  onDelete,
  mode 
}: CategoryEditorProps) => {
  const [formData, setFormData] = useState({
    name: '',
    codigo_categoria: '',
    description: '',
    explicacion: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData({
        name: category.name || category.nombre || '',
        codigo_categoria: category.codigo_categoria || '',
        description: category.description || '',
        explicacion: category.explicacion || ''
      });
    } else if (mode === 'create') {
      resetForm();
    }
  }, [category, mode, open]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Por favor ingrese el nombre de la categoría');
      return;
    }

    if (!formData.codigo_categoria.trim()) {
      toast.error('Por favor ingrese el código de la categoría');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: formData.name,
        nombre: formData.name, // Mantener compatibilidad
        codigo_categoria: formData.codigo_categoria,
        description: formData.description,
        explicacion: formData.explicacion
      });
      
      if (mode === 'create') {
        resetForm();
      }
    } catch (error) {
      // El error se maneja en el componente padre
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!category?.id || !onDelete) return;

    if (!confirm('¿Está seguro de que desea eliminar esta categoría? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      await onDelete(category.id);
    } catch (error) {
      // El error se maneja en el componente padre
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      codigo_categoria: '',
      description: '',
      explicacion: ''
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    if (mode === 'create') {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Crear Nueva Categoría' : 'Editar Categoría'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Complete los campos para crear una nueva categoría de preguntas'
              : 'Modifique los campos para actualizar la categoría'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre de la Categoría *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Abuso de confianza"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="codigo">Código de Categoría *</Label>
              <Input
                id="codigo"
                value={formData.codigo_categoria}
                onChange={(e) => setFormData(prev => ({ ...prev, codigo_categoria: e.target.value }))}
                placeholder="Ej: AC01"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción Breve</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Breve descripción de la categoría..."
              rows={2}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="explicacion">Explicación Detallada</Label>
            <Textarea
              id="explicacion"
              value={formData.explicacion}
              onChange={(e) => setFormData(prev => ({ ...prev, explicacion: e.target.value }))}
              placeholder="Explicación detallada de qué evalúa esta categoría, criterios de evaluación, etc..."
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Guardando...' : (mode === 'create' ? 'Crear Categoría' : 'Actualizar Categoría')}
            </Button>
            
            {mode === 'edit' && onDelete && (
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={loading}
                className="sm:w-auto"
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={loading}
              className="sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryEditor;

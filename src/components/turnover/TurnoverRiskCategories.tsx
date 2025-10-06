import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  nombre: string;
  descripcion: string;
  codigo_categoria: string;
  is_active: boolean;
}

const TurnoverRiskCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({
    nombre: '',
    descripcion: '',
    codigo_categoria: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('turnover_risk_categories')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCategory.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      const { error } = await supabase
        .from('turnover_risk_categories')
        .insert(newCategory);

      if (error) throw error;
      
      toast.success('Categoría creada exitosamente');
      setNewCategory({ nombre: '', descripcion: '', codigo_categoria: '' });
      loadCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Error al crear categoría');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Category>) => {
    try {
      const { error } = await supabase
        .from('turnover_risk_categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Categoría actualizada');
      setEditingId(null);
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Error al actualizar categoría');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta categoría?')) return;

    try {
      const { error } = await supabase
        .from('turnover_risk_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Categoría eliminada');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error al eliminar categoría');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva Categoría</CardTitle>
          <CardDescription>
            Cree una nueva categoría de evaluación para el examen de rotación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="new-nombre">Nombre</Label>
              <Input
                id="new-nombre"
                value={newCategory.nombre}
                onChange={(e) => setNewCategory({ ...newCategory, nombre: e.target.value })}
                placeholder="Ej: Expectativas Laborales"
              />
            </div>
            <div>
              <Label htmlFor="new-codigo">Código</Label>
              <Input
                id="new-codigo"
                value={newCategory.codigo_categoria}
                onChange={(e) => setNewCategory({ ...newCategory, codigo_categoria: e.target.value })}
                placeholder="Ej: EXP"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Crear Categoría
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="new-descripcion">Descripción</Label>
            <Textarea
              id="new-descripcion"
              value={newCategory.descripcion}
              onChange={(e) => setNewCategory({ ...newCategory, descripcion: e.target.value })}
              placeholder="Descripción de la categoría..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorías Existentes ({categories.length})</CardTitle>
          <CardDescription>
            Administre las categorías de evaluación de riesgo de rotación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardContent className="pt-6">
                  {editingId === category.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre</Label>
                          <Input
                            value={category.nombre}
                            onChange={(e) => {
                              setCategories(categories.map(c => 
                                c.id === category.id ? { ...c, nombre: e.target.value } : c
                              ));
                            }}
                          />
                        </div>
                        <div>
                          <Label>Código</Label>
                          <Input
                            value={category.codigo_categoria}
                            onChange={(e) => {
                              setCategories(categories.map(c => 
                                c.id === category.id ? { ...c, codigo_categoria: e.target.value } : c
                              ));
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Textarea
                          value={category.descripcion}
                          onChange={(e) => {
                            setCategories(categories.map(c => 
                              c.id === category.id ? { ...c, descripcion: e.target.value } : c
                            ));
                          }}
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            loadCategories();
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(category.id, {
                            nombre: category.nombre,
                            descripcion: category.descripcion,
                            codigo_categoria: category.codigo_categoria
                          })}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{category.nombre}</h4>
                          {category.codigo_categoria && (
                            <Badge variant="secondary">{category.codigo_categoria}</Badge>
                          )}
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {category.descripcion || 'Sin descripción'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(category.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TurnoverRiskCategories;

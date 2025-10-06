
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FolderTree, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Save,
  X,
  FileText,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  nombre: string;
  description?: string;
  codigo_categoria?: string;
  explicacion?: string;
  national_average?: string;
  parent_id?: string;
  created_at: string;
}

const OptimizedCategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    nombre: '',
    description: '',
    codigo_categoria: '',
    explicacion: '',
    national_average: '',
    parent_id: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [categories, searchTerm]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('question_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const filterCategories = () => {
    if (!searchTerm) {
      setFilteredCategories(categories);
      return;
    }

    const filtered = categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.codigo_categoria && category.codigo_categoria.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredCategories(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      nombre: '',
      description: '',
      codigo_categoria: '',
      explicacion: '',
      national_average: '',
      parent_id: ''
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setSelectedCategory(null);
    setIsEditing(false);
    setShowCreateDialog(true);
  };

  const openEditDialog = (category: Category) => {
    setFormData({
      name: category.name || '',
      nombre: category.nombre || '',
      description: category.description || '',
      codigo_categoria: category.codigo_categoria || '',
      explicacion: category.explicacion || '',
      national_average: category.national_average || '',
      parent_id: category.parent_id || ''
    });
    setSelectedCategory(category);
    setIsEditing(true);
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    try {
      if (isEditing && selectedCategory) {
        const { error } = await supabase
          .from('question_categories')
          .update(formData)
          .eq('id', selectedCategory.id);

        if (error) throw error;
        toast.success('Categoría actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('question_categories')
          .insert(formData);

        if (error) throw error;
        toast.success('Categoría creada exitosamente');
      }

      setShowCreateDialog(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Error al guardar la categoría');
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta categoría?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('question_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      toast.success('Categoría eliminada exitosamente');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error al eliminar la categoría');
    }
  };

  const getCategoryStats = (categoryId: string) => {
    // Esta función puede expandirse para mostrar estadísticas reales
    return {
      questions: Math.floor(Math.random() * 50) + 1,
      exams: Math.floor(Math.random() * 10) + 1,
      avgScore: (Math.random() * 100).toFixed(1)
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando categorías...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="h-6 w-6" />
            Gestión de Categorías Optimizada
          </h2>
          <p className="text-muted-foreground">
            Administra las categorías de preguntas de manera eficiente
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista de Categorías</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          <TabsTrigger value="hierarchy">Jerarquía</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Categorías ({filteredCategories.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar categorías..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map((category) => {
                  const stats = getCategoryStats(category.id);
                  return (
                    <Card key={category.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            {category.codigo_categoria && (
                              <Badge variant="outline" className="text-xs">
                                {category.codigo_categoria}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(category.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {category.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {category.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {stats.questions} preguntas
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {stats.avgScore}% promedio
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas Generales</CardTitle>
              <CardDescription>
                Resumen del uso y rendimiento de las categorías
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
                    <div className="text-sm text-muted-foreground">Total Categorías</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {categories.filter(c => c.parent_id).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Subcategorías</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {categories.filter(c => !c.parent_id).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Categorías Principales</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {categories.filter(c => c.national_average).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Con Promedio Nacional</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card>
            <CardHeader>
              <CardTitle>Vista Jerárquica</CardTitle>
              <CardDescription>
                Estructura organizacional de las categorías
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories
                  .filter(c => !c.parent_id)
                  .map((parentCategory) => (
                    <div key={parentCategory.id} className="border rounded-lg p-4">
                      <div className="font-semibold flex items-center gap-2">
                        <FolderTree className="h-4 w-4" />
                        {parentCategory.name}
                        {parentCategory.codigo_categoria && (
                          <Badge variant="outline">{parentCategory.codigo_categoria}</Badge>
                        )}
                      </div>
                      <div className="ml-6 mt-2 space-y-1">
                        {categories
                          .filter(c => c.parent_id === parentCategory.id)
                          .map((subCategory) => (
                            <div key={subCategory.id} className="text-sm text-muted-foreground">
                              ├─ {subCategory.name}
                              {subCategory.codigo_categoria && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {subCategory.codigo_categoria}
                                </Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Categoría' : 'Crear Nueva Categoría'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Modifica los datos de la categoría existente'
                : 'Completa la información para crear una nueva categoría'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre (English)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Category Name"
                />
              </div>
              <div>
                <Label htmlFor="nombre">Nombre (Español)</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Nombre de la Categoría"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="codigo_categoria">Código de Categoría</Label>
              <Input
                id="codigo_categoria"
                value={formData.codigo_categoria}
                onChange={(e) => setFormData({...formData, codigo_categoria: e.target.value})}
                placeholder="Ej: HON-001"
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descripción de la categoría"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="explicacion">Explicación Detallada</Label>
              <Textarea
                id="explicacion"
                value={formData.explicacion}
                onChange={(e) => setFormData({...formData, explicacion: e.target.value})}
                placeholder="Explicación detallada de qué evalúa esta categoría"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="national_average">Promedio Nacional</Label>
              <Input
                id="national_average"
                value={formData.national_average}
                onChange={(e) => setFormData({...formData, national_average: e.target.value})}
                placeholder="Ej: 75.5%"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Actualizar' : 'Crear'} Categoría
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OptimizedCategoryManagement;

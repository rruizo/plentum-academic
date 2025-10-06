
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, FolderPlus, Upload } from 'lucide-react';
import { useExamData } from '@/hooks/useExamData';
import { toast } from 'sonner';
import CategoryEditor from './CategoryEditor';
import CategoryImportDialog from './CategoryImportDialog';

const CategoryManagement = () => {
  const { 
    categories, 
    loading, 
    createCategory,
    updateCategory,
    deleteCategory,
    importCategories
  } = useExamData();

  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');

  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setEditorMode('create');
    setShowCategoryEditor(true);
  };

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category);
    setEditorMode('edit');
    setShowCategoryEditor(true);
  };

  const handleSaveCategory = async (categoryData: any) => {
    try {
      if (editorMode === 'create') {
        await createCategory(categoryData);
        toast.success('Categoría creada exitosamente');
      } else {
        await updateCategory(selectedCategory?.id, categoryData);
        toast.success('Categoría actualizada exitosamente');
      }
      setShowCategoryEditor(false);
    } catch (error) {
      toast.error('Error al guardar la categoría');
      console.error(error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta categoría?')) {
      return;
    }

    try {
      await deleteCategory(categoryId);
      toast.success('Categoría eliminada exitosamente');
    } catch (error) {
      toast.error('Error al eliminar la categoría');
      console.error(error);
    }
  };

  const handleImportCategories = async (categoriesData: any[]) => {
    try {
      await importCategories(categoriesData);
      toast.success(`${categoriesData.length} categorías importadas exitosamente`);
      setShowImportDialog(false);
    } catch (error) {
      toast.error('Error al importar categorías');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Categorías</h2>
          <p className="text-muted-foreground">
            Administra las categorías que agrupan las preguntas de confiabilidad
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Categorías
          </Button>
          <Button onClick={handleCreateCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Categorías Registradas ({categories.length})
          </CardTitle>
          <CardDescription>
            Lista de todas las categorías disponibles para clasificar preguntas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Cargando categorías...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <FolderPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No hay categorías registradas
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera categoría para comenzar a organizar las preguntas
              </p>
              <Button onClick={handleCreateCategory}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Categoría
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-lg mb-1">{category.name || category.nombre}</h4>
                      <Badge variant="outline" className="mb-2">
                        {category.codigo_categoria || 'Sin código'}
                      </Badge>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditCategory(category)}
                        title="Editar categoría"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCategory(category.id)}
                        title="Eliminar categoría"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {category.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Descripción:</strong> {category.description}
                    </p>
                  )}
                  
                  {category.explicacion && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Explicación:</strong> {category.explicacion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryEditor
        open={showCategoryEditor}
        onOpenChange={setShowCategoryEditor}
        category={selectedCategory}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory}
        mode={editorMode}
      />

      <CategoryImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImportCategories}
      />
    </div>
  );
};

export default CategoryManagement;

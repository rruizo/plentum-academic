
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Upload, Download, Search } from 'lucide-react';
import { useExamData, Question } from '@/hooks/useExamData';
import { toast } from 'sonner';
import AdvancedImportDialog from './AdvancedImportDialog';

const ConfiabilityQuestionManagement = () => {
  const { categories, questions, createQuestion, updateQuestion, deleteQuestion, importQuestions, loading } = useExamData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    texto_pregunta: '',
    category_id: '',
    media_poblacional_pregunta: 'Nunca' as 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente',
    difficulty_level: 1,
    weight: 1,
    is_control_question: false,
    national_average: 'Nunca' as 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente'
  });

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.texto_pregunta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.question_text?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || question.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({
      texto_pregunta: '',
      category_id: '',
      media_poblacional_pregunta: 'Nunca',
      difficulty_level: 1,
      weight: 1,
      is_control_question: false,
      national_average: 'Nunca'
    });
  };

  const handleCreate = async () => {
    try {
      if (!formData.texto_pregunta || !formData.category_id) {
        toast.error('Texto de pregunta y categoría son requeridos');
        return;
      }

      await createQuestion(formData);
      toast.success('Pregunta creada exitosamente');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Error al crear la pregunta');
      console.error(error);
    }
  };

  const handleEdit = (question: Question) => {
    setCurrentQuestion(question);
    setFormData({
      texto_pregunta: question.texto_pregunta || question.question_text || '',
      category_id: question.category_id,
      media_poblacional_pregunta: question.media_poblacional_pregunta || 'Nunca',
      difficulty_level: question.difficulty_level || 1,
      weight: question.weight || 1,
      is_control_question: question.is_control_question || false,
      national_average: question.national_average || 'Nunca'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    try {
      if (!currentQuestion || !formData.texto_pregunta || !formData.category_id) {
        toast.error('Datos incompletos');
        return;
      }

      await updateQuestion(currentQuestion.id, formData);
      toast.success('Pregunta actualizada exitosamente');
      setIsEditDialogOpen(false);
      setCurrentQuestion(null);
      resetForm();
    } catch (error) {
      toast.error('Error al actualizar la pregunta');
      console.error(error);
    }
  };

  const handleDelete = async (questionId: string) => {
    try {
      await deleteQuestion(questionId);
      toast.success('Pregunta eliminada exitosamente');
    } catch (error) {
      toast.error('Error al eliminar la pregunta');
      console.error(error);
    }
  };

  const handleImport = async (data: any[]) => {
    try {
      await importQuestions(data);
      toast.success(`${data.length} preguntas importadas exitosamente`);
      setIsImportDialogOpen(false);
    } catch (error) {
      toast.error('Error durante la importación');
      console.error(error);
    }
  };

  const exportQuestions = () => {
    const csvContent = [
      ['ID', 'Categoría', 'Pregunta', 'Media Poblacional Pregunta', 'Nivel Dificultad', 'Peso', 'Es Control'],
      ...filteredQuestions.map(q => [
        q.id,
        categories.find(c => c.id === q.category_id)?.nombre || 'Sin categoría',
        q.texto_pregunta || q.question_text || '',
        q.media_poblacional_pregunta || 'Nunca',
        q.difficulty_level || 1,
        q.weight || 1,
        q.is_control_question ? 'Sí' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preguntas_confiabilidad.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gestión de Preguntas de Confiabilidad</h2>
        <p className="text-muted-foreground">
          Administra las preguntas para los exámenes de confiabilidad con opciones de respuesta estandarizadas
        </p>
      </div>

      {/* Controles de filtros y acciones */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Filtros en móvil y desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar preguntas</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Buscar por texto de pregunta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Filtrar por categoría</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botones de acción responsivos */}
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button onClick={exportQuestions} variant="outline" size="sm" className="w-full sm:w-auto">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="sm:inline">Exportar</span>
              </Button>
              
              <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="sm" className="w-full sm:w-auto">
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="sm:inline">Importar</span>
              </Button>
              
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="sm:inline">Nueva Pregunta</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de preguntas responsiva */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Preguntas ({filteredQuestions.length})</CardTitle>
          <CardDescription className="text-sm">
            Lista de preguntas con opciones de respuesta: Nunca (0), Rara vez (1), A veces (2), Frecuentemente (3)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Vista móvil - Cards */}
          <div className="block lg:hidden space-y-4">
            {filteredQuestions.map((question) => (
              <Card key={question.id} className="p-4">
                <div className="space-y-3">
                  <div className="font-medium text-sm break-words">
                    {question.texto_pregunta || question.question_text}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {categories.find(c => c.id === question.category_id)?.nombre || 'Sin categoría'}
                    </Badge>
                    <Badge variant={question.difficulty_level && question.difficulty_level > 3 ? 'destructive' : 'default'} className="text-xs">
                      Nivel {question.difficulty_level || 1}
                    </Badge>
                    {question.is_control_question && (
                      <Badge variant="outline" className="text-xs">Control</Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Media: {question.media_poblacional_pregunta || 'Nunca'}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(question)}
                      className="h-8 px-2 text-xs"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-lg">¿Eliminar pregunta?</AlertDialogTitle>
                          <AlertDialogDescription className="text-sm">
                            Esta acción no se puede deshacer. La pregunta será eliminada permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(question.id)}
                            className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Vista desktop - Tabla */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[300px]">Pregunta</TableHead>
                    <TableHead className="min-w-[120px]">Categoría</TableHead>
                    <TableHead className="min-w-[140px]">Media Poblacional</TableHead>
                    <TableHead className="min-w-[100px]">Dificultad</TableHead>
                    <TableHead className="min-w-[80px]">Control</TableHead>
                    <TableHead className="min-w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-[300px]">
                        <div className="break-words">
                          {question.texto_pregunta || question.question_text}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {categories.find(c => c.id === question.category_id)?.nombre || 'Sin categoría'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {question.media_poblacional_pregunta || 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={question.difficulty_level && question.difficulty_level > 3 ? 'destructive' : 'default'} className="text-xs">
                          Nivel {question.difficulty_level || 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {question.is_control_question && (
                          <Badge variant="outline" className="text-xs">Control</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(question)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar pregunta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. La pregunta será eliminada permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(question.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para crear pregunta */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Pregunta de Confiabilidad</DialogTitle>
            <DialogDescription>
              Las opciones de respuesta son automáticamente: Nunca, Rara vez, A veces, Frecuentemente
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="texto_pregunta">Texto de la Pregunta</Label>
              <Textarea
                id="texto_pregunta"
                value={formData.texto_pregunta}
                onChange={(e) => setFormData(prev => ({ ...prev, texto_pregunta: e.target.value }))}
                placeholder="Ingrese el texto de la pregunta..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={formData.category_id} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, category_id: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="media_poblacional_pregunta">Media Poblacional Pregunta</Label>
                <Select
                  value={formData.media_poblacional_pregunta}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    media_poblacional_pregunta: value as 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente'
                  }))}
                >
                  <SelectTrigger>
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
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Nivel de Dificultad (1-5)</Label>
                <Input
                  id="difficulty"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.difficulty_level}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    difficulty_level: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weight">Peso</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    weight: parseFloat(e.target.value) || 1 
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="control">¿Es pregunta de control?</Label>
                <Select 
                  value={formData.is_control_question.toString()} 
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, is_control_question: value === 'true' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Sí</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>
              Crear Pregunta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar pregunta */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Pregunta de Confiabilidad</DialogTitle>
            <DialogDescription>
              Modifica los datos de la pregunta seleccionada
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="texto_pregunta">Texto de la Pregunta</Label>
              <Textarea
                id="texto_pregunta"
                value={formData.texto_pregunta}
                onChange={(e) => setFormData(prev => ({ ...prev, texto_pregunta: e.target.value }))}
                placeholder="Ingrese el texto de la pregunta..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={formData.category_id} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, category_id: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="media_poblacional_pregunta">Media Poblacional Pregunta</Label>
                <Select
                  value={formData.media_poblacional_pregunta}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    media_poblacional_pregunta: value as 'Nunca' | 'Rara vez' | 'A veces' | 'Frecuentemente'
                  }))}
                >
                  <SelectTrigger>
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
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Nivel de Dificultad (1-5)</Label>
                <Input
                  id="difficulty"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.difficulty_level}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    difficulty_level: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weight">Peso</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    weight: parseFloat(e.target.value) || 1 
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="control">¿Es pregunta de control?</Label>
                <Select 
                  value={formData.is_control_question.toString()} 
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, is_control_question: value === 'true' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Sí</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate}>
              Actualizar Pregunta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de importación */}
      <AdvancedImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImport={handleImport}
        categories={categories}
      />
    </div>
  );
};

export default ConfiabilityQuestionManagement;

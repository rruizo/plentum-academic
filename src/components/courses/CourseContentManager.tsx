
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Save, GripVertical, BookOpen, FileText, Video, Link, MessageSquare, Calculator, Users, File } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface CourseSection {
  id: string;
  title: string;
  description: string;
  order: number;
  resources: CourseResource[];
}

interface CourseResource {
  id: string;
  title: string;
  type: 'forum' | 'assignment' | 'quiz' | 'lesson' | 'page' | 'file' | 'url' | 'label' | 'chat' | 'database' | 'glossary' | 'wiki';
  description: string;
  order: number;
  config: any;
}

interface CourseContentManagerProps {
  courseId: string;
}

const resourceTypes = [
  { value: 'forum', label: 'Foro', icon: MessageSquare, description: 'Discusiones asincrónicas' },
  { value: 'assignment', label: 'Tarea', icon: FileText, description: 'Entrega de trabajos y evaluación' },
  { value: 'quiz', label: 'Cuestionario', icon: Calculator, description: 'Evaluaciones con diferentes tipos de preguntas' },
  { value: 'lesson', label: 'Lección', icon: BookOpen, description: 'Rutas de aprendizaje interactivas' },
  { value: 'page', label: 'Página', icon: File, description: 'Contenido estático con texto e imágenes' },
  { value: 'file', label: 'Archivo', icon: File, description: 'Documentos (PDF, DOCX, PPTX)' },
  { value: 'url', label: 'URL', icon: Link, description: 'Enlaces externos' },
  { value: 'label', label: 'Etiqueta', icon: FileText, description: 'Texto descriptivo o multimedia' },
  { value: 'chat', label: 'Chat', icon: MessageSquare, description: 'Conversaciones en tiempo real' },
  { value: 'database', label: 'Base de Datos', icon: Users, description: 'Colecciones de entradas de datos' },
  { value: 'glossary', label: 'Glosario', icon: BookOpen, description: 'Lista de definiciones' },
  { value: 'wiki', label: 'Wiki', icon: Edit, description: 'Creación colaborativa de contenido' }
];

const CourseContentManager = ({ courseId }: CourseContentManagerProps) => {
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [editingSection, setEditingSection] = useState<CourseSection | null>(null);
  const [editingResource, setEditingResource] = useState<CourseResource | null>(null);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showResourceCatalog, setShowResourceCatalog] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string>('');
  const [currentSectionId, setCurrentSectionId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Simular carga de datos desde la base de datos
  useEffect(() => {
    loadCourseContent();
  }, [courseId]);

  const loadCourseContent = async () => {
    // Aquí cargarías los datos reales desde Supabase
    // Por ahora, datos de ejemplo
    const exampleSections: CourseSection[] = [
      {
        id: '1',
        title: 'Introducción',
        description: 'Conceptos fundamentales y presentación del curso',
        order: 1,
        resources: [
          {
            id: 'r1',
            title: 'Video de Bienvenida',
            type: 'page',
            description: 'Presentación del instructor y objetivos del curso',
            order: 1,
            config: {}
          }
        ]
      }
    ];
    setSections(exampleSections);
  };

  const saveToDatabase = async () => {
    try {
      console.log('Guardando contenido del curso:', { courseId, sections });
      // Aquí implementarías la lógica para guardar en Supabase
      // await supabase.from('course_sections').upsert(sections);
      
      setHasUnsavedChanges(false);
      toast.success('Contenido del curso guardado exitosamente');
    } catch (error) {
      console.error('Error saving course content:', error);
      toast.error('Error al guardar el contenido del curso');
    }
  };

  const handleAddSection = () => {
    setEditingSection(null);
    setShowSectionDialog(true);
  };

  const handleEditSection = (section: CourseSection) => {
    setEditingSection(section);
    setShowSectionDialog(true);
  };

  const handleSaveSection = (sectionData: Partial<CourseSection>) => {
    if (editingSection) {
      // Editar sección existente
      setSections(prev => prev.map(section => 
        section.id === editingSection.id 
          ? { ...section, ...sectionData }
          : section
      ));
    } else {
      // Crear nueva sección
      const newSection: CourseSection = {
        id: Date.now().toString(),
        title: sectionData.title || '',
        description: sectionData.description || '',
        order: sections.length + 1,
        resources: []
      };
      setSections(prev => [...prev, newSection]);
    }
    setHasUnsavedChanges(true);
    setShowSectionDialog(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections(prev => prev.filter(section => section.id !== sectionId));
    setHasUnsavedChanges(true);
  };

  const handleAddResource = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setShowResourceCatalog(true);
  };

  const handleSelectResourceType = (type: string) => {
    setSelectedResourceType(type);
    setEditingResource(null);
    setShowResourceCatalog(false);
    setShowResourceDialog(true);
  };

  const handleEditResource = (resource: CourseResource, sectionId: string) => {
    setCurrentSectionId(sectionId);
    setEditingResource(resource);
    setSelectedResourceType(resource.type);
    setShowResourceDialog(true);
  };

  const handleSaveResource = (resourceData: Partial<CourseResource>) => {
    if (editingResource) {
      // Editar recurso existente
      setSections(prev => prev.map(section => 
        section.id === currentSectionId
          ? {
              ...section,
              resources: section.resources.map(resource =>
                resource.id === editingResource.id
                  ? { ...resource, ...resourceData }
                  : resource
              )
            }
          : section
      ));
    } else {
      // Crear nuevo recurso
      const section = sections.find(s => s.id === currentSectionId);
      const newResource: CourseResource = {
        id: Date.now().toString(),
        title: resourceData.title || '',
        type: selectedResourceType as any,
        description: resourceData.description || '',
        order: (section?.resources.length || 0) + 1,
        config: resourceData.config || {}
      };
      
      setSections(prev => prev.map(section => 
        section.id === currentSectionId
          ? { ...section, resources: [...section.resources, newResource] }
          : section
      ));
    }
    setHasUnsavedChanges(true);
    setShowResourceDialog(false);
  };

  const handleDeleteResource = (sectionId: string, resourceId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId
        ? { ...section, resources: section.resources.filter(r => r.id !== resourceId) }
        : section
    ));
    setHasUnsavedChanges(true);
  };

  const getResourceIcon = (type: string) => {
    const resourceType = resourceTypes.find(t => t.value === type);
    const Icon = resourceType?.icon || BookOpen;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Estructura del Curso</h3>
          <p className="text-sm text-muted-foreground">
            Organización por temas o semanas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={saveToDatabase} 
            disabled={!hasUnsavedChanges}
            variant={hasUnsavedChanges ? "default" : "outline"}
          >
            <Save className="h-4 w-4 mr-2" />
            {hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado'}
          </Button>
          <Button onClick={handleAddSection}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Nueva Sección
          </Button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Tienes cambios sin guardar. No olvides guardar antes de salir.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section, index) => (
          <Card key={section.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <div>
                    <CardTitle className="text-base">
                      {section.title || `Sección ${index + 1}`}
                    </CardTitle>
                    <CardDescription>
                      {section.description || 'Sin descripción'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditSection(section)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleAddResource(section.id)}
                  >
                    <Plus className="h-4 w-4" />
                    Agregar Recurso
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteSection(section.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {section.resources.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {section.resources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-blue-600">
                          {getResourceIcon(resource.type)}
                        </div>
                        <div>
                          <h5 className="font-medium text-sm">{resource.title}</h5>
                          <p className="text-xs text-muted-foreground">
                            {resourceTypes.find(t => t.value === resource.type)?.label}
                            {resource.description && ` - ${resource.description}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleEditResource(resource, section.id)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDeleteResource(section.id, resource.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {sections.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay secciones creadas</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Comienza creando la primera sección de tu curso
            </p>
            <Button onClick={handleAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Sección
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog para editar/crear sección */}
      <SectionDialog
        open={showSectionDialog}
        onOpenChange={setShowSectionDialog}
        section={editingSection}
        onSave={handleSaveSection}
      />

      {/* Dialog para catálogo de recursos */}
      <ResourceCatalogDialog
        open={showResourceCatalog}
        onOpenChange={setShowResourceCatalog}
        onSelectType={handleSelectResourceType}
      />

      {/* Dialog para configurar recurso */}
      <ResourceConfigDialog
        open={showResourceDialog}
        onOpenChange={setShowResourceDialog}
        resourceType={selectedResourceType}
        resource={editingResource}
        onSave={handleSaveResource}
      />
    </div>
  );
};

// Componente para el dialog de sección
const SectionDialog = ({ open, onOpenChange, section, onSave }: any) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (section) {
      setTitle(section.title);
      setDescription(section.description);
    } else {
      setTitle('');
      setDescription('');
    }
  }, [section]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }
    onSave({ title, description });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {section ? 'Editar Sección' : 'Nueva Sección'}
          </DialogTitle>
          <DialogDescription>
            {section ? 'Modifica los datos de la sección' : 'Crea una nueva sección para organizar el contenido'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="section-title">Título de la Sección</Label>
            <Input
              id="section-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Módulo 1: Fundamentos"
            />
          </div>
          <div>
            <Label htmlFor="section-description">Descripción</Label>
            <Textarea
              id="section-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el contenido de esta sección"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              {section ? 'Actualizar' : 'Crear'} Sección
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente para el catálogo de recursos
const ResourceCatalogDialog = ({ open, onOpenChange, onSelectType }: any) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Catálogo de Actividades y Recursos</DialogTitle>
          <DialogDescription>
            Selecciona el tipo de actividad o recurso que deseas agregar
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resourceTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Card 
                key={type.value} 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onSelectType(type.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="h-6 w-6 text-blue-600" />
                    <h4 className="font-medium">{type.label}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente para configurar recurso específico
const ResourceConfigDialog = ({ open, onOpenChange, resourceType, resource, onSave }: any) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState({});

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setDescription(resource.description);
      setConfig(resource.config || {});
    } else {
      setTitle('');
      setDescription('');
      setConfig({});
    }
  }, [resource]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }
    onSave({ title, description, config });
  };

  const resourceTypeData = resourceTypes.find(t => t.value === resourceType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {resourceTypeData && <resourceTypeData.icon className="h-5 w-5" />}
            {resource ? 'Editar' : 'Crear'} {resourceTypeData?.label}
          </DialogTitle>
          <DialogDescription>
            Configura los detalles de {resourceTypeData?.label?.toLowerCase()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="resource-title">Título</Label>
            <Input
              id="resource-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Ej: ${resourceTypeData?.label} 1`}
            />
          </div>
          <div>
            <Label htmlFor="resource-description">Descripción</Label>
            <Textarea
              id="resource-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el propósito de esta actividad"
              rows={3}
            />
          </div>
          
          {/* Aquí podrías agregar campos específicos según el tipo de recurso */}
          {resourceType === 'assignment' && (
            <div className="space-y-4">
              <div>
                <Label>Fecha de Entrega</Label>
                <Input type="datetime-local" />
              </div>
              <div>
                <Label>Puntuación Máxima</Label>
                <Input type="number" placeholder="100" />
              </div>
            </div>
          )}
          
          {resourceType === 'quiz' && (
            <div className="space-y-4">
              <div>
                <Label>Tiempo Límite (minutos)</Label>
                <Input type="number" placeholder="60" />
              </div>
              <div>
                <Label>Intentos Permitidos</Label>
                <Input type="number" placeholder="3" />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave}>
              {resource ? 'Actualizar' : 'Crear'} {resourceTypeData?.label}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseContentManager;

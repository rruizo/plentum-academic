
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, BookOpen, FileText, Video, Link, Users, MessageSquare, Calculator } from 'lucide-react';
import { toast } from 'sonner';

interface Activity {
  id: string;
  name: string;
  type: 'resource' | 'assignment' | 'quiz' | 'forum' | 'video' | 'file' | 'url';
  description: string;
  order: number;
}

interface CourseActivityManagerProps {
  courseId: string;
}

const CourseActivityManager = ({ courseId }: CourseActivityManagerProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'resource' as const,
    description: ''
  });

  const activityTypes = [
    { value: 'resource', label: 'Recurso', icon: BookOpen },
    { value: 'assignment', label: 'Tarea', icon: FileText },
    { value: 'quiz', label: 'Cuestionario', icon: Calculator },
    { value: 'forum', label: 'Foro', icon: MessageSquare },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'file', label: 'Archivo', icon: FileText },
    { value: 'url', label: 'Enlace', icon: Link }
  ];

  const handleAddActivity = () => {
    if (!newActivity.name.trim()) {
      toast.error('El nombre de la actividad es requerido');
      return;
    }

    const activity: Activity = {
      id: Date.now().toString(),
      name: newActivity.name,
      type: newActivity.type,
      description: newActivity.description,
      order: activities.length + 1
    };

    setActivities([...activities, activity]);
    setNewActivity({ name: '', type: 'resource', description: '' });
    setShowAddActivity(false);
    toast.success('Actividad agregada exitosamente');
  };

  const getActivityIcon = (type: string) => {
    const activityType = activityTypes.find(t => t.value === type);
    const Icon = activityType?.icon || BookOpen;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Actividades del Curso</h3>
        <Button onClick={() => setShowAddActivity(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Actividad
        </Button>
      </div>

      {showAddActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Actividad</CardTitle>
            <CardDescription>
              Agrega una nueva actividad o recurso al curso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="activity-name">Nombre de la Actividad</Label>
              <Input
                id="activity-name"
                value={newActivity.name}
                onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                placeholder="Ej: Introducción al tema"
              />
            </div>

            <div>
              <Label htmlFor="activity-type">Tipo de Actividad</Label>
              <Select
                value={newActivity.type}
                onValueChange={(value: any) => setNewActivity({ ...newActivity, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="activity-description">Descripción</Label>
              <Textarea
                id="activity-description"
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                placeholder="Describe el contenido o propósito de esta actividad"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddActivity}>
                Agregar Actividad
              </Button>
              <Button variant="outline" onClick={() => setShowAddActivity(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activities.length === 0 && !showAddActivity ? (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No hay actividades
            </h3>
            <p className="text-sm text-muted-foreground">
              Comienza agregando contenido y actividades a tu curso
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activities.map((activity, index) => (
            <Card key={activity.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-blue-600">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div>
                      <h4 className="font-medium">{activity.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {activityTypes.find(t => t.value === activity.type)?.label}
                        {activity.description && ` - ${activity.description}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      #{index + 1}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseActivityManager;

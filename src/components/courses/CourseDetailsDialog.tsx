import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Users, BookOpen, BarChart3, Calendar, Award } from 'lucide-react';
import CourseContentManager from './CourseContentManager';

interface Course {
  id: string;
  title: string;
  description?: string;
  instructor_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CourseDetailsDialogProps {
  course: Course;
  children: React.ReactNode;
}

const CourseDetailsDialog = ({ course, children }: CourseDetailsDialogProps) => {
  const [activeTab, setActiveTab] = useState('general');
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {course.title}
          </DialogTitle>
          <DialogDescription>
            Configuración completa del curso tipo Moodle
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="participants">Participantes</TabsTrigger>
            <TabsTrigger value="activities">Actividades</TabsTrigger>
            <TabsTrigger value="grades">Calificaciones</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración General</CardTitle>
                <CardDescription>
                  Parámetros básicos del curso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="course-name">Nombre del Curso</Label>
                    <Input id="course-name" defaultValue={course.title} />
                  </div>
                  <div>
                    <Label htmlFor="course-code">Código del Curso</Label>
                    <Input id="course-code" placeholder="Ej: MAT101" />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="course-description">Descripción</Label>
                  <Textarea 
                    id="course-description" 
                    defaultValue={course.description}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="course-format">Formato del Curso</Label>
                    <Select defaultValue="topics">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="topics">Por Temas</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="scorm">SCORM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="course-duration">Duración (semanas)</Label>
                    <Input id="course-duration" type="number" defaultValue="16" />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="course-visible" defaultChecked={course.is_active} />
                  <Label htmlFor="course-visible">Curso visible para estudiantes</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <CourseContentManager courseId={course.id} />
          </TabsContent>

          <TabsContent value="participants" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestión de Participantes
                </CardTitle>
                <CardDescription>
                  Roles, inscripciones y grupos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Método de Inscripción</Label>
                    <Select defaultValue="manual">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Inscripción Manual</SelectItem>
                        <SelectItem value="self">Auto-inscripción</SelectItem>
                        <SelectItem value="guest">Acceso de Invitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="max-students">Límite de Estudiantes</Label>
                    <Input id="max-students" type="number" placeholder="Sin límite" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="enrollment-key">Clave de Inscripción</Label>
                  <Input id="enrollment-key" placeholder="Dejar vacío para no requerir clave" />
                </div>

                <div className="space-y-2">
                  <Label>Participantes Actuales</Label>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      No hay estudiantes inscritos aún
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <CourseContentManager courseId={course.id} />
          </TabsContent>

          <TabsContent value="grades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sistema de Calificaciones
                </CardTitle>
                <CardDescription>
                  Configuración de evaluaciones y ponderaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Escala de Calificación</Label>
                    <Select defaultValue="100">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">0-100 puntos</SelectItem>
                        <SelectItem value="letter">Letras (A, B, C, D, F)</SelectItem>
                        <SelectItem value="pass">Aprobado/Reprobado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="passing-grade">Calificación Mínima</Label>
                    <Input id="passing-grade" type="number" defaultValue="60" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categorías de Calificación</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Tareas (40%)</span>
                      <Button size="sm" variant="outline">Editar</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Exámenes (35%)</span>
                      <Button size="sm" variant="outline">Editar</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Participación (25%)</span>
                      <Button size="sm" variant="outline">Editar</Button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    + Agregar Categoría
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración Avanzada
                </CardTitle>
                <CardDescription>
                  Restricciones, finalización y certificados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Restricciones de Acceso</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="date-restriction" />
                        <Label htmlFor="date-restriction">Restringir por fechas</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="grade-restriction" />
                        <Label htmlFor="grade-restriction">Restringir por calificación previa</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Finalización del Curso</Label>
                    <div className="mt-2">
                      <Select defaultValue="manual">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual por el estudiante</SelectItem>
                          <SelectItem value="auto">Automática por condiciones</SelectItem>
                          <SelectItem value="grade">Por calificación mínima</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="certificates" />
                    <Label htmlFor="certificates">Generar certificados al completar</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="badges" />
                    <Label htmlFor="badges">Habilitar insignias (badges)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CourseDetailsDialog;

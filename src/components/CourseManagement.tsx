
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Users, Calendar, Loader2, Settings, BarChart3, Award } from "lucide-react";
import { useCourses } from "@/hooks/useCourses";
import CreateCourseDialog from "@/components/courses/CreateCourseDialog";
import EditCourseDialog from "@/components/courses/EditCourseDialog";
import ViewCourseDialog from "@/components/courses/ViewCourseDialog";
import DeleteCourseDialog from "@/components/courses/DeleteCourseDialog";
import CourseDetailsDialog from "@/components/courses/CourseDetailsDialog";

interface CourseManagementProps {
  userRole: string;
}

const CourseManagement = ({ userRole }: CourseManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { courses, isLoading, error } = useCourses();

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && course.is_active) ||
      (statusFilter === "inactive" && !course.is_active);
    
    return matchesSearch && matchesStatus;
  });

  if (error) {
    console.error('Error loading courses:', error);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Cursos</h1>
          <p className="text-muted-foreground">
            Sistema completo de gestión de cursos tipo Moodle
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Estadísticas
          </Button>
          <CreateCourseDialog userRole={userRole} />
        </div>
      </div>

      {/* Filtros avanzados */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar cursos por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="psychology">Psicología</SelectItem>
                <SelectItem value="evaluation">Evaluación</SelectItem>
                <SelectItem value="statistics">Estadística</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Cargando cursos...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <div className="text-destructive mb-2">Error al cargar los cursos</div>
          <p className="text-muted-foreground text-sm">
            {error.message || "Ocurrió un error inesperado"}
          </p>
        </div>
      )}

      {/* Lista de cursos mejorada */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    course.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {course.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <CardTitle className="text-lg leading-tight">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description || "Sin descripción disponible"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Estadísticas del curso */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>0 estudiantes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>0 actividades</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span>Sin certificado</span>
                  </div>
                </div>

                {/* Progreso del curso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progreso del contenido</span>
                    <span className="font-medium">0%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <ViewCourseDialog course={course} />
                  <div className="flex gap-1">
                    <CourseDetailsDialog course={course}>
                      <Button size="sm" variant="ghost" title="Configuración completa">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </CourseDetailsDialog>
                    <EditCourseDialog course={course} userRole={userRole} />
                    <DeleteCourseDialog course={course} userRole={userRole} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state mejorado */}
      {!isLoading && !error && filteredCourses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm || statusFilter !== "all" ? "No se encontraron cursos" : "No hay cursos creados"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm || statusFilter !== "all" 
                ? "Intenta ajustar los filtros de búsqueda para encontrar los cursos que buscas"
                : "Comienza creando tu primer curso con contenido estructurado, actividades evaluables y seguimiento de progreso"
              }
            </p>
            {(!searchTerm && statusFilter === "all") && (
              <CreateCourseDialog userRole={userRole} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Estadísticas rápidas */}
      {!isLoading && !error && filteredCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{courses.length}</div>
                <div className="text-sm text-muted-foreground">Total de cursos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {courses.filter(c => c.is_active).length}
                </div>
                <div className="text-sm text-muted-foreground">Cursos activos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-sm text-muted-foreground">Estudiantes totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-muted-foreground">Certificados emitidos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CourseManagement;

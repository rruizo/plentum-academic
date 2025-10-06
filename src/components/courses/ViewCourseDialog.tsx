
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, User, Calendar } from "lucide-react";
import { Course } from "@/hooks/useCourses";

interface ViewCourseDialogProps {
  course: Course;
}

const ViewCourseDialog = ({ course }: ViewCourseDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          <Eye className="h-4 w-4 mr-2" />
          Ver Curso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {course.title}
            <Badge variant={course.is_active ? "default" : "secondary"}>
              {course.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Detalles completos del curso
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Descripción</h3>
            <p className="text-muted-foreground">
              {course.description || "No hay descripción disponible"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Instructor</span>
              </div>
              <p className="text-sm text-muted-foreground">
                ID: {course.instructor_id}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Fecha de Creación</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(course.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {course.updated_at !== course.created_at && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Última Actualización</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(course.updated_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Estado del Curso</h3>
            <div className="flex items-center gap-2">
              <Badge variant={course.is_active ? "default" : "secondary"}>
                {course.is_active ? "Activo" : "Inactivo"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {course.is_active 
                  ? "El curso está disponible para inscripciones" 
                  : "El curso no está disponible actualmente"
                }
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewCourseDialog;


import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Edit } from "lucide-react";
import { useCourses, Course } from "@/hooks/useCourses";

interface EditCourseDialogProps {
  course: Course;
  userRole: string;
}

const EditCourseDialog = ({ course, userRole }: EditCourseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || "");
  const [isActive, setIsActive] = useState(course.is_active);
  const { updateCourse, isUpdating } = useCourses();

  useEffect(() => {
    setTitle(course.title);
    setDescription(course.description || "");
    setIsActive(course.is_active);
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    console.log('Updating course with data:', {
      id: course.id,
      data: {
        title: title.trim(),
        description: description.trim(),
        is_active: isActive,
      }
    });

    updateCourse({
      id: course.id,
      data: {
        title: title.trim(),
        description: description.trim(),
        is_active: isActive,
      }
    });

    setOpen(false);
  };

  if (userRole !== "admin" && userRole !== "teacher") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Curso</DialogTitle>
          <DialogDescription>
            Modifica la información del curso
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="editCourseTitle">Título del Curso</Label>
            <Input
              id="editCourseTitle"
              placeholder="Ej: Psicología Cognitiva"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="editCourseDescription">Descripción</Label>
            <Textarea
              id="editCourseDescription"
              placeholder="Describe el contenido y objetivos del curso"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Curso activo</Label>
          </div>
          <Button type="submit" className="w-full" disabled={isUpdating}>
            {isUpdating ? "Actualizando..." : "Actualizar Curso"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCourseDialog;

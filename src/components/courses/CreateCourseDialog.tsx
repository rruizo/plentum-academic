
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useCourses } from "@/hooks/useCourses";
import { supabase } from "@/integrations/supabase/client";

interface CreateCourseDialogProps {
  userRole: string;
}

const CreateCourseDialog = ({ userRole }: CreateCourseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { createCourse, isCreating } = useCourses();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        return;
      }

      console.log('Creating course with data:', {
        title: title.trim(),
        description: description.trim(),
        instructor_id: user.id,
      });

      createCourse({
        title: title.trim(),
        description: description.trim(),
        instructor_id: user.id,
      });

      // Reset form and close dialog
      setTitle("");
      setDescription("");
      setOpen(false);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  if (userRole !== "admin" && userRole !== "teacher") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Curso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Curso</DialogTitle>
          <DialogDescription>
            Completa la información básica del curso
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="courseTitle">Título del Curso</Label>
            <Input
              id="courseTitle"
              placeholder="Ej: Psicología Cognitiva"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="courseDescription">Descripción</Label>
            <Textarea
              id="courseDescription"
              placeholder="Describe el contenido y objetivos del curso"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isCreating}>
            {isCreating ? "Creando..." : "Crear Curso"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCourseDialog;

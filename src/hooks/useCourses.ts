
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateCourseData {
  title: string;
  description: string;
  instructor_id: string;
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  is_active?: boolean;
}

export const useCourses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      console.log('Fetching courses...');
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching courses:', error);
        throw error;
      }

      console.log('Courses fetched:', data);
      return data as Course[];
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (courseData: CreateCourseData) => {
      console.log('Creating course:', courseData);
      const { data, error } = await supabase
        .from('courses')
        .insert([courseData])
        .select()
        .single();

      if (error) {
        console.error('Error creating course:', error);
        throw error;
      }

      console.log('Course created:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast({
        title: "Curso creado",
        description: "El curso se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el curso. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCourseData }) => {
      console.log('Updating course:', id, data);
      const { data: updatedData, error } = await supabase
        .from('courses')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating course:', error);
        throw error;
      }

      console.log('Course updated:', updatedData);
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast({
        title: "Curso actualizado",
        description: "El curso se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating course:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el curso. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting course:', id);
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting course:', error);
        throw error;
      }

      console.log('Course deleted:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast({
        title: "Curso eliminado",
        description: "El curso se ha eliminado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el curso. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  return {
    courses,
    isLoading,
    error,
    createCourse: createCourseMutation.mutate,
    updateCourse: updateCourseMutation.mutate,
    deleteCourse: deleteCourseMutation.mutate,
    isCreating: createCourseMutation.isPending,
    isUpdating: updateCourseMutation.isPending,
    isDeleting: deleteCourseMutation.isPending,
  };
};

export const useCourse = (id: string) => {
  return useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      console.log('Fetching course by id:', id);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching course:', error);
        throw error;
      }

      console.log('Course fetched:', data);
      return data as Course;
    },
    enabled: !!id,
  });
};

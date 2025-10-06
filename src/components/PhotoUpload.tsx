import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUpdate?: (url: string | null) => void;
}

const PhotoUpload = ({ currentPhotoUrl, onPhotoUpdate }: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const userId = user?.id;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    setUploading(true);

    try {
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `candidates/${fileName}`;

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('candidate-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('candidate-photos')
        .getPublicUrl(filePath);

      const newPhotoUrl = urlData.publicUrl;

      // Actualizar perfil del usuario
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ photo_url: newPhotoUrl })
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      setPhotoUrl(newPhotoUrl);
      onPhotoUpdate?.(newPhotoUrl);
      toast.success('Foto de perfil actualizada correctamente');

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!userId) return;

    try {
      // Actualizar perfil removiendo la URL de la foto
      const { error } = await supabase
        .from('profiles')
        .update({ photo_url: null })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setPhotoUrl(undefined);
      onPhotoUpdate?.(null);
      toast.success('Foto de perfil removida');

    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Error al remover la foto');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Foto de Perfil
        </CardTitle>
        <CardDescription>
          Sube una foto que aparecerá en tus reportes de evaluación. Formatos aceptados: JPG, PNG. Máximo 5MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={photoUrl} alt="Foto de perfil" />
            <AvatarFallback className="text-lg">
              <Camera className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              onClick={triggerFileInput}
              disabled={uploading}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Subiendo...' : photoUrl ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            
            {photoUrl && (
              <Button
                variant="outline"
                onClick={handleRemovePhoto}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Remover foto
              </Button>
            )}
          </div>
        </div>

        {photoUrl && (
          <div className="text-sm text-muted-foreground">
            <p>Esta foto aparecerá en la sección "Información del Candidato" de tus reportes de evaluación.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PhotoUpload;
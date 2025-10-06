import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  RefreshCw, 
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HTPSubmissionFormProps {
  assignmentId: string;
  onSubmissionComplete: () => void;
}

const HTPSubmissionForm: React.FC<HTPSubmissionFormProps> = ({
  assignmentId,
  onSubmissionComplete
}) => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [explanationText, setExplanationText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);

  // Check for existing submission on component mount
  React.useEffect(() => {
    checkExistingSubmission();
  }, [assignmentId]);

  const checkExistingSubmission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: submission } = await supabase
        .from('htp_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('user_id', user.id)
        .single();

      if (submission) {
        setExistingSubmission(submission);
        setImagePreview(submission.image_url);
        setExplanationText(submission.explanation_text || '');
      }
    } catch (error) {
      // No existing submission found, that's fine
      console.log('No existing submission found:', error);
    }
  };

  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor seleccione un archivo de imagen válido');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 10MB permitido');
      return;
    }

    setImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = async () => {
    if (!image) {
      toast.error('Por favor seleccione una imagen');
      return;
    }

    if (!explanationText.trim()) {
      toast.error('Por favor escriba la explicación de su dibujo');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Upload image to storage
      const fileExt = image.name.split('.').pop();
      const fileName = `htp-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `htp-submissions/${fileName}`;

      setUploadProgress(25);

      const { error: uploadError } = await supabase.storage
        .from('candidate-photos')
        .upload(filePath, image);

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('candidate-photos')
        .getPublicUrl(filePath);

      setUploadProgress(75);

      // Save or update submission to database
      if (existingSubmission) {
        // Update existing submission
        const { error: dbError } = await supabase
          .from('htp_submissions')
          .update({
            image_url: publicUrl,
            image_filename: image.name,
            image_size: image.size,
            explanation_text: explanationText.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubmission.id);

        if (dbError) throw dbError;
      } else {
        // Insert new submission
        const { error: dbError } = await supabase
          .from('htp_submissions')
          .insert({
            assignment_id: assignmentId,
            user_id: user.id,
            image_url: publicUrl,
            image_filename: image.name,
            image_size: image.size,
            explanation_text: explanationText.trim(),
            legal_consent: true, // This form is only shown after consent
            consent_timestamp: new Date().toISOString()
          });

        if (dbError) throw dbError;
      }

      setUploadProgress(100);

      toast.success(existingSubmission ? '¡Examen actualizado exitosamente!' : '¡Examen enviado exitosamente!');
      onSubmissionComplete();

    } catch (error: any) {
      console.error('Error submitting HTP:', error);
      toast.error('Error al enviar el examen: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-primary" />
            <span>Instrucciones para el Examen HTP</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Es un gusto que participes con nosotros en este proceso de selección.</strong> 
              Deseamos que puedas colaborar con nosotros, por lo que te pedimos sigas las siguientes 
              instrucciones al pie de la letra ya que forman parte de la evaluación.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-lg">1. Dibuja una persona bajo la lluvia</h4>
              <p className="text-sm text-muted-foreground">
                En una hoja blanca tamaño carta, dibuja una persona bajo la lluvia. 
                Al terminar, escribe debajo una breve explicación de lo que significa para ti ese dibujo.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-lg">2. Agrega tu compromiso personal</h4>
              <p className="text-sm text-muted-foreground">
                En la misma hoja blanca coloca el siguiente texto con tu puño y letra:<br />
                <em>'Yo, [Tu nombre completo], me comprometo a dar lo mejor de mí en este trabajo'.</em>
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-lg">3. Firma al final</h4>
              <p className="text-sm text-muted-foreground">
                Firma al final de la hoja.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-lg">4. Toma la fotografía</h4>
              <p className="text-sm text-muted-foreground">
                Toma una foto clara donde se vea toda la hoja. No importa que se vea parte de la superficie donde descansa la hoja.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload form */}
      <Card>
        <CardHeader>
          <CardTitle>Subir tu Examen</CardTitle>
          <CardDescription>
            Sube la fotografía de tu hoja completada y agrega la explicación de tu dibujo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image upload */}
          <div className="space-y-4">
            <Label htmlFor="image-upload">Fotografía de tu hoja</Label>
            
            {imagePreview ? (
              <div className="space-y-4">
                {existingSubmission && !image && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Ya tienes un examen enviado. Puedes cambiarlo seleccionando una nueva imagen.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview del examen" 
                    className="max-w-full h-64 object-contain border rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImage(null);
                      if (!existingSubmission) {
                        setImagePreview(null);
                      }
                    }}
                    className="absolute top-2 right-2"
                  >
                    Cambiar imagen
                  </Button>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-replace"
                />
                <label htmlFor="image-replace">
                  <Button variant="outline" asChild className="cursor-pointer">
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar nueva imagen
                    </span>
                  </Button>
                </label>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Selecciona la fotografía de tu hoja</p>
                  <p className="text-sm text-muted-foreground">
                    Formatos soportados: JPG, PNG (máximo 10MB)
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button variant="outline" asChild className="cursor-pointer">
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Seleccionar archivo
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Explanation text */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explicación de tu dibujo</Label>
            <Textarea
              id="explanation"
              rows={6}
              value={explanationText}
              onChange={(e) => setExplanationText(e.target.value)}
              placeholder="Escribe aquí qué significa para ti el dibujo que realizaste..."
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Explica brevemente qué representa para ti el dibujo de la persona bajo la lluvia
            </p>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Enviando examen...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleSubmit}
              disabled={(!image && !existingSubmission) || !explanationText.trim() || uploading}
              size="lg"
              className="px-8"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {existingSubmission ? 'Actualizando...' : 'Enviando...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {existingSubmission ? 'Actualizar Examen' : 'Enviar Examen'}
                </>
              )}
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> {existingSubmission 
                ? 'Puedes actualizar tu examen las veces que necesites. Asegúrate de que la imagen sea clara y la explicación esté completa.'
                : 'Asegúrate de que la imagen sea clara y la explicación esté completa antes de enviar.'
              }
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default HTPSubmissionForm;
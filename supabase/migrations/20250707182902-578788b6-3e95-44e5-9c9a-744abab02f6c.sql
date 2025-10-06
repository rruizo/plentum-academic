-- Crear bucket para fotos de perfil de candidatos
INSERT INTO storage.buckets (id, name, public) VALUES ('candidate-photos', 'candidate-photos', true);

-- Crear políticas para el bucket de fotos
CREATE POLICY "Fotos de candidatos son accesibles públicamente" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'candidate-photos');

CREATE POLICY "Usuarios autenticados pueden subir sus fotos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'candidate-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios pueden actualizar sus propias fotos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'candidate-photos' AND auth.uid() IS NOT NULL);

-- Añadir columna para la URL de la foto del candidato en la tabla profiles
ALTER TABLE profiles ADD COLUMN photo_url TEXT;

-- Comentario sobre la columna
COMMENT ON COLUMN profiles.photo_url IS 'URL de la foto de perfil del candidato almacenada en Supabase Storage';
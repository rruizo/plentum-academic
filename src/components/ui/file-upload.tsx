
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, File, Image } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  onFileSelect: (file: File) => void;
  onUrlChange: (url: string) => void;
  currentUrl?: string;
  placeholder?: string;
}

const FileUpload = ({ 
  accept = "image/*", 
  maxSize = 5, 
  onFileSelect, 
  onUrlChange,
  currentUrl = '',
  placeholder = "URL del archivo"
}: FileUploadProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`El archivo no debe superar ${maxSize}MB`);
      return;
    }

    setIsUploading(true);
    
    try {
      // Validate file type
      if (accept.includes('image') && !file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen válido');
        return;
      }

      onFileSelect(file);
      
      // Convert to base64 for immediate use
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        onUrlChange(base64String);
        toast.success('Archivo cargado exitosamente');
      };
      reader.onerror = () => {
        toast.error('Error al procesar el archivo');
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Error al cargar el archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    onUrlChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Archivo eliminado');
  };

  const isValidImageUrl = (url: string) => {
    return url && (url.startsWith('data:image/') || url.startsWith('http'));
  };

  return (
    <div className="space-y-3">
      {/* URL Input */}
      <div className="flex gap-2">
        <Input
          value={currentUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        {currentUrl && (
          <Button variant="outline" size="sm" onClick={clearFile}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* File Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
          dragOver 
            ? 'border-primary bg-primary/5 scale-105' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          ) : (
            <Upload className="h-10 w-10 text-gray-400" />
          )}
          
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isUploading ? 'Procesando archivo...' : 'Arrastra un archivo aquí o haz clic para seleccionar'}
            </p>
            <p className="text-xs text-gray-500">
              Máximo {maxSize}MB • {accept.includes('image') ? 'Imágenes' : 'Archivos'} soportados
            </p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Preview */}
      {currentUrl && (
        <div className="mt-3">
          {isValidImageUrl(currentUrl) && accept.includes('image') ? (
            <div className="relative">
              <img 
                src={currentUrl} 
                alt="Preview" 
                className="h-24 w-auto border rounded-lg shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  toast.error('Error al cargar la imagen. Verifica que la URL sea válida.');
                }}
                onLoad={() => {
                  console.log('Image loaded successfully');
                }}
              />
              <div className="absolute top-1 right-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg">
              <File className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700 truncate">
                {currentUrl.length > 50 ? `${currentUrl.substring(0, 50)}...` : currentUrl}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Status Indicator */}
      {currentUrl && (
        <div className="flex items-center gap-1 text-xs">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-green-600">Archivo configurado</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;

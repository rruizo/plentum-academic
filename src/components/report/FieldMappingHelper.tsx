import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  availableFields, 
  getDynamicCategoryFields, 
  validateTemplate,
  analyzeTemplateFields,
  getFieldsBySection,
  type FieldMapping 
} from '@/utils/fieldMapper';
import { Search, Copy, Code, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FieldMappingHelperProps {
  templateContent?: string;
  onFieldSelect?: (field: FieldMapping) => void;
}

const FieldMappingHelper: React.FC<FieldMappingHelperProps> = ({
  templateContent = '',
  onFieldSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<FieldMapping | null>(null);
  const { toast } = useToast();

  // Combinar campos estáticos y dinámicos
  const allFields = useMemo(() => {
    return [...availableFields, ...getDynamicCategoryFields()];
  }, []);

  // Validar template si se proporciona
  const templateValidation = useMemo(() => {
    if (!templateContent) return null;
    return validateTemplate(templateContent);
  }, [templateContent]);

  // Filtrar campos
  const filteredFields = useMemo(() => {
    return allFields.filter(field => {
      const matchesSearch = 
        field.placeholder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.expression.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSection = sectionFilter === 'all' || field.section === sectionFilter;

      return matchesSearch && matchesSection;
    });
  }, [allFields, searchTerm, sectionFilter]);

  // Obtener secciones únicas
  const sections = useMemo(() => {
    const sectionSet = new Set(allFields.map(field => field.section));
    return Array.from(sectionSet).sort();
  }, [allFields]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "El texto ha sido copiado al portapapeles"
    });
  };

  const getDataTypeColor = (dataType: string) => {
    const colors = {
      string: 'bg-blue-100 text-blue-800',
      number: 'bg-green-100 text-green-800',
      date: 'bg-purple-100 text-purple-800',
      boolean: 'bg-orange-100 text-orange-800',
      html: 'bg-red-100 text-red-800'
    };
    return colors[dataType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSectionIcon = (section: string) => {
    const icons = {
      company: '🏢',
      candidate: '👤',
      scores: '📊',
      category_scores: '📈',
      personal: '🏠',
      ai: '🤖',
      metadata: '📅',
      charts: '📊'
    };
    return icons[section as keyof typeof icons] || '📄';
  };

  return (
    <div className="space-y-6">
      {/* Validación del template */}
      {templateValidation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {templateValidation.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Validación del Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Badge variant={templateValidation.isValid ? 'default' : 'destructive'}>
                  {templateValidation.isValid ? 'Válido' : 'Errores encontrados'}
                </Badge>
                <span className="text-sm text-gray-600">
                  {templateValidation.validPlaceholders.length} placeholders válidos
                </span>
                {templateValidation.invalidPlaceholders.length > 0 && (
                  <span className="text-sm text-red-600">
                    {templateValidation.invalidPlaceholders.length} placeholders inválidos
                  </span>
                )}
              </div>

              {templateValidation.errors.length > 0 && (
                <div className="bg-red-50 p-3 rounded-md">
                  <h4 className="font-medium text-red-800 mb-2">Errores:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {templateValidation.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {templateValidation.warnings.length > 0 && (
                <div className="bg-yellow-50 p-3 rounded-md">
                  <h4 className="font-medium text-yellow-800 mb-2">Advertencias:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {templateValidation.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Explorador de campos */}
      <Card>
        <CardHeader>
          <CardTitle>Campos Disponibles para Mapeo</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar campos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por sección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las secciones</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section} value={section}>
                    {getSectionIcon(section)} {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="grid" className="space-y-4">
            <TabsList>
              <TabsTrigger value="grid">Vista en Cuadrícula</TabsTrigger>
              <TabsTrigger value="list">Vista de Lista</TabsTrigger>
              <TabsTrigger value="sections">Por Secciones</TabsTrigger>
            </TabsList>

            <TabsContent value="grid">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFields.map((field) => (
                  <Card key={field.placeholder} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {field.placeholder}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(field.placeholder)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <p className="text-sm text-gray-600">{field.description}</p>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getDataTypeColor(field.dataType)}>
                            {field.dataType}
                          </Badge>
                          <Badge variant="secondary">
                            {getSectionIcon(field.section)} {field.section}
                          </Badge>
                        </div>

                        {field.category && (
                          <Badge variant="outline">
                            Categoría: {field.category}
                          </Badge>
                        )}

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                              <Eye className="h-3 w-3 mr-1" />
                              Ver detalles
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Detalles del Campo</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="font-medium">Placeholder:</label>
                                <code className="block mt-1 p-2 bg-gray-100 rounded text-sm">
                                  {field.placeholder}
                                </code>
                              </div>
                              <div>
                                <label className="font-medium">Descripción:</label>
                                <p className="mt-1 text-sm">{field.description}</p>
                              </div>
                              <div>
                                <label className="font-medium">Expresión de mapeo:</label>
                                <code className="block mt-1 p-2 bg-gray-100 rounded text-sm">
                                  {field.expression}
                                </code>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => copyToClipboard(field.placeholder)}
                                >
                                  Copiar Placeholder
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => copyToClipboard(field.expression)}
                                >
                                  Copiar Expresión
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list">
              <div className="space-y-2">
                {filteredFields.map((field) => (
                  <div key={field.placeholder} className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono">{field.placeholder}</code>
                        <Badge variant="outline" className={getDataTypeColor(field.dataType)}>
                          {field.dataType}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{field.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(field.placeholder)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sections">
              <div className="space-y-6">
                {sections.map(section => {
                  const sectionFields = getFieldsBySection(section);
                  if (sectionFields.length === 0) return null;

                  return (
                    <Card key={section}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span>{getSectionIcon(section)}</span>
                          {section} ({sectionFields.length} campos)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {sectionFields.map((field) => (
                            <div key={field.placeholder} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <code className="text-sm">{field.placeholder}</code>
                                <p className="text-xs text-gray-500">{field.description}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(field.placeholder)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-gray-500">
            Total: {filteredFields.length} campos disponibles
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FieldMappingHelper;
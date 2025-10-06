import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportConfigurationSections from '../ReportConfigurationSections';
import ReportConfigurationFormat from '../ReportConfigurationFormat';
import ReportConfigurationCompany from '../ReportConfigurationCompany';
import ReportTemplateUpload from '../ReportTemplateUpload';
import type { ReportConfig } from '@/types/reportTypes';

interface ReportConfigurationContentProps {
  config: ReportConfig;
  updateSectionInclude: (section: keyof ReportConfig['include_sections'], value: boolean) => void;
  updateConfigField: (field: keyof ReportConfig, value: any) => void;
  handleFileUpload: (type: 'header' | 'footer') => (file: File) => Promise<void>;
}

const ReportConfigurationContent = ({
  config,
  updateSectionInclude,
  updateConfigField,
  handleFileUpload
}: ReportConfigurationContentProps) => {
  return (
    <Tabs defaultValue="sections" className="space-y-4">
      <TabsList>
        <TabsTrigger value="sections">Secciones del Reporte</TabsTrigger>
        <TabsTrigger value="format">Formato</TabsTrigger>
        <TabsTrigger value="template">Template Personalizado</TabsTrigger>
        <TabsTrigger value="company">Datos de la Empresa</TabsTrigger>
      </TabsList>

      <TabsContent value="sections">
        <ReportConfigurationSections
          includeSections={config.include_sections}
          onSectionChange={updateSectionInclude}
        />
      </TabsContent>

      <TabsContent value="format">
        <ReportConfigurationFormat
          config={config}
          onConfigChange={updateConfigField}
          onFileUpload={handleFileUpload}
        />
      </TabsContent>

      <TabsContent value="template">
        <ReportTemplateUpload
          config={config}
          onConfigChange={updateConfigField}
        />
      </TabsContent>

      <TabsContent value="company">
        <ReportConfigurationCompany
          config={config}
          onConfigChange={updateConfigField}
        />
      </TabsContent>
    </Tabs>
  );
};

export default ReportConfigurationContent;
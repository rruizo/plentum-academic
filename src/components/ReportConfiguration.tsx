
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ReportPreview from './ReportPreview';
import ReportConfigurationExamSelector from './ReportConfigurationExamSelector';
import ReportConfigurationHeader from './report/ReportConfigurationHeader';
import ReportConfigurationContent from './report/ReportConfigurationContent';
import { useReportConfiguration } from '@/hooks/useReportConfiguration';
import type { ReportConfig } from '@/types/reportTypes';

interface ReportConfigurationProps {
  examId?: string;
  onSave?: (config: ReportConfig) => void;
}

const ReportConfiguration = ({ examId: propExamId, onSave }: ReportConfigurationProps) => {
  const [showPreview, setShowPreview] = useState(false);
  
  const {
    selectedExamId,
    setSelectedExamId,
    availableExams,
    config,
    loading,
    saving,
    handleSaveConfig,
    updateSectionInclude,
    updateConfigField,
    handleFileUpload
  } = useReportConfiguration(propExamId);

  const onSaveHandler = () => {
    handleSaveConfig(onSave);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando configuración...</span>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setShowPreview(false)}>
          ← Volver a Configuración
        </Button>
        <ReportPreview examId={selectedExamId} config={config} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportConfigurationHeader
        config={config}
        saving={saving}
        selectedExamId={selectedExamId}
        onSave={onSaveHandler}
        onPreview={() => setShowPreview(true)}
      />

      <ReportConfigurationExamSelector
        selectedExamId={selectedExamId}
        availableExams={availableExams}
        onExamChange={setSelectedExamId}
      />

      {selectedExamId && (
        <ReportConfigurationContent
          config={config}
          updateSectionInclude={updateSectionInclude}
          updateConfigField={updateConfigField}
          handleFileUpload={handleFileUpload}
        />
      )}
    </div>
  );
};

export default ReportConfiguration;

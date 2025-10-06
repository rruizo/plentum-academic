import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Info, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticoResendProps {
  onClose?: () => void;
}

interface DiagnosticoResult {
  status: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  recommendation?: string;
  action?: {
    label: string;
    url?: string;
    onClick?: () => void;
  };
}

export const DiagnosticoResend: React.FC<DiagnosticoResendProps> = ({ onClose }) => {
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [resultados, setResultados] = useState<DiagnosticoResult[]>([]);
  const [resolviendoFallos, setResolviendoFallos] = useState(false);

  const resolverEnviosFallidos = async () => {
    setResolviendoFallos(true);
    try {
      // Primero verificar cuántas notificaciones pendientes hay
      const { data: pendientesAntes, error: errorAntes } = await supabase
        .from('exam_email_notifications')
        .select('id, user_email, status, email_type')
        .eq('status', 'pending');

      console.log('🔍 Notificaciones pendientes ANTES de limpiar:', pendientesAntes);
      
      if (errorAntes) {
        console.error('❌ Error consultando notificaciones antes:', errorAntes);
        toast.error('Error al consultar notificaciones pendientes');
        return;
      }

      if (!pendientesAntes || pendientesAntes.length === 0) {
        toast.info('ℹ️ No hay notificaciones pendientes para limpiar');
        return;
      }

      // Limpiar notificaciones pendientes
      const { data: updateResult, error: updateError } = await supabase
        .from('exam_email_notifications')
        .update({ status: 'failed' })
        .eq('status', 'pending')
        .select();

      console.log('🔧 Resultado de la actualización:', updateResult);
      console.log('🔧 Error de actualización:', updateError);

      if (updateError) {
        console.error('❌ Error actualizando notificaciones:', updateError);
        toast.error(`Error al actualizar notificaciones: ${updateError.message}`);
        return;
      }

      // Verificar después de la actualización
      const { data: pendientesDespues, error: errorDespues } = await supabase
        .from('exam_email_notifications')
        .select('id, user_email, status, email_type')
        .eq('status', 'pending');

      console.log('✅ Notificaciones pendientes DESPUÉS de limpiar:', pendientesDespues);

      if (errorDespues) {
        console.error('❌ Error consultando notificaciones después:', errorDespues);
        toast.error('Error al verificar resultado de limpieza');
        return;
      }

      const filasAfectadas = updateResult?.length || 0;
      const quedanPendientes = pendientesDespues?.length || 0;

      if (quedanPendientes === 0) {
        toast.success(`✅ ${filasAfectadas} notificaciones limpiadas exitosamente. Ya puedes reintentar el envío masivo.`);
      } else {
        toast.warning(`⚠️ Se actualizaron ${filasAfectadas} filas, pero aún quedan ${quedanPendientes} pendientes. Puede ser un problema de permisos.`);
      }

    } catch (error) {
      console.error('💥 Error general limpiando notificaciones:', error);
      toast.error(`Error al limpiar notificaciones: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setResolviendoFallos(false);
    }
  };

  const ejecutarDiagnostico = async () => {
    setDiagnosticando(true);
    setResultados([]);
    
    try {
      // Probar envío de email de diagnóstico
      console.log('[DiagnosticoResend] 🔍 Iniciando diagnóstico completo...');
      
      const { data: response, error } = await supabase.functions.invoke('send-exam-notifications', {
        body: {
          emails: ['reneycec@gmail.com'], // Tu email registrado en Resend
          subject: '🔍 Diagnóstico del Sistema RESEND - ' + new Date().toLocaleTimeString(),
          examTitle: 'Examen de Diagnóstico',
          examId: 'diagnostic-test',
          message: 'Este es un email de diagnóstico para verificar la configuración de RESEND.'
        }
      });

      console.log('[DiagnosticoResend] 📡 Respuesta del diagnóstico:', { response, error });

      const resultadosNuevos: DiagnosticoResult[] = [];

      if (error) {
        resultadosNuevos.push({
          status: 'error',
          title: 'Error Crítico en Edge Function',
          message: `No se pudo comunicar con el servicio de correo: ${error.message}`,
          recommendation: 'Verificar configuración de Supabase y variables de entorno',
          action: {
            label: 'Ver Documentación',
            url: 'https://supabase.com/docs/guides/functions'
          }
        });
      } else if (response) {
        // Inferir estado de API Key basándose en el resultado del envío
        if (response.success && response.sent > 0) {
          resultadosNuevos.push({
            status: 'success',
            title: 'API Key Configurada Correctamente',
            message: 'La API Key de RESEND está configurada y funcionando correctamente en el backend',
            recommendation: 'Configuración de API Key verificada exitosamente'
          });
        } else if (response.failed > 0 && response.sent === 0) {
          // Si todos los envíos fallaron, podría ser problema de API key o configuración
          resultadosNuevos.push({
            status: 'warning',
            title: 'Posible Problema de Configuración',
            message: 'Los envíos fallaron. Puede ser un problema de API Key, dominio no verificado, o restricciones del tier gratuito',
            recommendation: 'Verificar API Key en Supabase y dominio en Resend',
            action: {
              label: 'Ver Variables Supabase',
              url: `https://supabase.com/dashboard/project/popufimnleaubvlwyusb/settings/functions`
            }
          });
        }

        // Analizar errores específicos
        if (response.errorAnalysis) {
          Object.entries(response.errorAnalysis).forEach(([errorType, count]) => {
            if (typeof count === 'number' && count > 0) {
              switch (errorType) {
                case 'domain_verification':
                  resultadosNuevos.push({
                    status: 'error',
                    title: 'Dominio No Verificado',
                    message: `${count} error(es) de verificación de dominio`,
                    recommendation: 'Verificar el dominio en resend.com/domains',
                    action: {
                      label: 'Verificar Dominio',
                      url: 'https://resend.com/domains'
                    }
                  });
                  break;
                case 'testing_restriction':
                  resultadosNuevos.push({
                    status: 'warning',
                    title: 'Restricción del Tier Gratuito',
                    message: `${count} error(es) por limitaciones del tier gratuito`,
                    recommendation: 'Solo puedes enviar a tu propio email o verificar dominio',
                    action: {
                      label: 'Actualizar Plan',
                      url: 'https://resend.com/pricing'
                    }
                  });
                  break;
                case 'rate_limit':
                  resultadosNuevos.push({
                    status: 'error',
                    title: 'Límite de Envío Excedido',
                    message: `${count} error(es) por límite diario/mensual excedido`,
                    recommendation: 'Esperar 24h o actualizar plan de Resend',
                    action: {
                      label: 'Ver Límites',
                      url: 'https://resend.com/pricing'
                    }
                  });
                  break;
                case 'configuration':
                  resultadosNuevos.push({
                    status: 'error',
                    title: 'Error de Configuración',
                    message: `${count} error(es) de configuración`,
                    recommendation: 'Revisar configuración de API Key y variables de entorno'
                  });
                  break;
              }
            }
          });
        }

        // Analizar éxito del envío
        if (response.success && response.sent > 0) {
          resultadosNuevos.push({
            status: 'success',
            title: 'Envío de Prueba Exitoso',
            message: `Se enviaron ${response.sent} de ${response.total} emails correctamente`,
            recommendation: 'El sistema de correo está funcionando correctamente'
          });
        } else if (response.failed > 0) {
          resultadosNuevos.push({
            status: 'warning',
            title: 'Envío de Prueba con Errores',
            message: `${response.failed} de ${response.total} emails fallaron`,
            recommendation: 'Revisar configuración y errores específicos'
          });
        }

        // Mostrar recomendaciones del sistema
        if (response.recommendations && response.recommendations.length > 0) {
          resultadosNuevos.push({
            status: 'info',
            title: 'Recomendaciones del Sistema',
            message: response.recommendations.join(' • '),
            recommendation: 'Seguir estas recomendaciones para mejorar la entrega'
          });
        }

        // Verificar notificaciones pendientes
        const { data: pendingNotifications } = await supabase
          .from('exam_email_notifications')
          .select('id, user_email, status, email_type')
          .eq('status', 'pending');

        if (pendingNotifications && pendingNotifications.length > 0) {
          resultadosNuevos.push({
            status: 'error',
            title: `🚨 ${pendingNotifications.length} Notificaciones Pendientes Detectadas`,
            message: `Hay ${pendingNotifications.length} emails atascados en estado "pending". Estos corresponden a los envíos fallidos que aparecen en el sistema.`,
            recommendation: 'Limpiar notificaciones pendientes para permitir reenvío',
            action: {
              label: 'Resolver Envíos Fallidos',
              onClick: () => resolverEnviosFallidos()
            }
          });
        }
      }

      setResultados(resultadosNuevos);
      
    } catch (error) {
      console.error('[DiagnosticoResend] ❌ Error en diagnóstico:', error);
      setResultados([{
        status: 'error',
        title: 'Error al Ejecutar Diagnóstico',
        message: error instanceof Error ? error.message : 'Error desconocido',
        recommendation: 'Contactar soporte técnico'
      }]);
    } finally {
      setDiagnosticando(false);
    }
  };

  const getIcono = (status: DiagnosticoResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: DiagnosticoResult['status']) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          Diagnóstico del Sistema RESEND
        </CardTitle>
        <CardDescription>
          Herramienta para diagnosticar problemas con el envío de emails via RESEND
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={ejecutarDiagnostico}
            disabled={diagnosticando}
            className="flex-1"
          >
            {diagnosticando ? 'Diagnosticando...' : 'Ejecutar Diagnóstico'}
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </div>

        {resultados.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Resultados del Diagnóstico:</h3>
            {resultados.map((resultado, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${getStatusColor(resultado.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getIcono(resultado.status)}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{resultado.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{resultado.message}</p>
                    {resultado.recommendation && (
                      <p className="text-xs text-gray-500 mt-2">
                        <strong>Recomendación:</strong> {resultado.recommendation}
                      </p>
                    )}
                    {resultado.action && (
                      <div className="mt-3">
                        {resultado.action.url ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(resultado.action!.url, '_blank')}
                          >
                            {resultado.action.label}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={resultado.action.onClick}
                          >
                            {resultado.action.label}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {resultados.length === 0 && !diagnosticando && (
          <div className="text-center text-gray-500 py-8">
            Haga clic en "Ejecutar Diagnóstico" para analizar la configuración de RESEND
          </div>
        )}
      </CardContent>
    </Card>
  );
};
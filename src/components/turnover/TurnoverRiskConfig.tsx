import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TurnoverConfig {
  id: string;
  openai_model: string;
  temperature: number;
  max_tokens: number;
  system_message: string;
  user_prompt: string;
}

const TurnoverRiskConfig = () => {
  const [config, setConfig] = useState<TurnoverConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('turnover_risk_config')
        .select('*')
        .single();

      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('turnover_risk_config')
        .update({
          openai_model: config.openai_model,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          system_message: config.system_message,
          user_prompt: config.user_prompt
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No se encontró configuración</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Modelo de IA</CardTitle>
          <CardDescription>
            Configure los parámetros del modelo OpenAI para el análisis de riesgo de rotación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="model">Modelo de OpenAI</Label>
              <Select 
                value={config.openai_model}
                onValueChange={(value) => setConfig({ ...config, openai_model: value })}
              >
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5-2025-08-07">GPT-5 (Flagship)</SelectItem>
                  <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini (Eficiente)</SelectItem>
                  <SelectItem value="gpt-5-nano-2025-08-07">GPT-5 Nano (Rápido)</SelectItem>
                  <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1 (Confiable)</SelectItem>
                  <SelectItem value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini</SelectItem>
                  <SelectItem value="o3-2025-04-16">O3 (Razonamiento Avanzado)</SelectItem>
                  <SelectItem value="o4-mini-2025-04-16">O4 Mini (Razonamiento Rápido)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Modelo a utilizar para el análisis
              </p>
            </div>

            <div>
              <Label htmlFor="temperature">Temperatura</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                0 = Más determinista, 2 = Más creativo
              </p>
            </div>

            <div>
              <Label htmlFor="tokens">Máximo de Tokens</Label>
              <Input
                id="tokens"
                type="number"
                min="100"
                max="16000"
                step="100"
                value={config.max_tokens}
                onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Longitud máxima de la respuesta
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Message</CardTitle>
          <CardDescription>
            Mensaje del sistema que define el rol y comportamiento del modelo de IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.system_message}
            onChange={(e) => setConfig({ ...config, system_message: e.target.value })}
            rows={6}
            className="font-mono text-sm"
            placeholder="Eres un experto en..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Prompt (Template)</CardTitle>
          <CardDescription>
            Template del prompt que se enviará al modelo. Use {"{{RESPUESTAS}}"} como placeholder para las respuestas del candidato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={config.user_prompt}
            onChange={(e) => setConfig({ ...config, user_prompt: e.target.value })}
            rows={12}
            className="font-mono text-sm"
            placeholder="Analiza las siguientes respuestas:\n\n{{RESPUESTAS}}\n\n..."
          />
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Variables disponibles:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><code className="bg-background px-2 py-1 rounded">{"{{RESPUESTAS}}"}</code> - Respuestas del candidato en formato estructurado</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TurnoverRiskConfig;

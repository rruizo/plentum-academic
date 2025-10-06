-- Add granular OpenAI configuration fields to system_config table
ALTER TABLE public.system_config 
ADD COLUMN ocean_modelo text DEFAULT 'gpt-4.1-2025-04-14',
ADD COLUMN ocean_temperatura numeric(2,1) DEFAULT 0.7 CHECK (ocean_temperatura >= 0.0 AND ocean_temperatura <= 1.0),
ADD COLUMN ocean_max_tokens integer DEFAULT 2000 CHECK (ocean_max_tokens > 0 AND ocean_max_tokens <= 32768),
ADD COLUMN confiabilidad_analisis_modelo text DEFAULT 'gpt-4.1-2025-04-14',
ADD COLUMN confiabilidad_analisis_temperatura numeric(2,1) DEFAULT 0.7 CHECK (confiabilidad_analisis_temperatura >= 0.0 AND confiabilidad_analisis_temperatura <= 1.0),
ADD COLUMN confiabilidad_analisis_max_tokens integer DEFAULT 1500 CHECK (confiabilidad_analisis_max_tokens > 0 AND confiabilidad_analisis_max_tokens <= 32768),
ADD COLUMN confiabilidad_conclusiones_modelo text DEFAULT 'gpt-4.1-2025-04-14',
ADD COLUMN confiabilidad_conclusiones_temperatura numeric(2,1) DEFAULT 0.7 CHECK (confiabilidad_conclusiones_temperatura >= 0.0 AND confiabilidad_conclusiones_temperatura <= 1.0),
ADD COLUMN confiabilidad_conclusiones_max_tokens integer DEFAULT 1000 CHECK (confiabilidad_conclusiones_max_tokens > 0 AND confiabilidad_conclusiones_max_tokens <= 32768);
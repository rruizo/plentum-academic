-- Add OpenAI model column to system_config and set a safe default
BEGIN;

ALTER TABLE public.system_config
ADD COLUMN IF NOT EXISTS openai_model text DEFAULT 'gpt-4.1-nano';

-- Optional: comment for documentation
COMMENT ON COLUMN public.system_config.openai_model IS 'Default OpenAI model for AI features (admin-configurable).';

COMMIT;
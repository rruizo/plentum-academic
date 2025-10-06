-- Add turnover test type to credential expiration config
INSERT INTO public.credential_expiration_config (test_type, expiration_days, is_active)
VALUES ('turnover', 7, true)
ON CONFLICT (test_type) DO NOTHING;
-- Crear usuario admin para las pruebas con todos los campos requeridos
INSERT INTO public.profiles (
  id, 
  email, 
  full_name, 
  role, 
  company, 
  area, 
  section,
  report_contact
) VALUES (
  'cd20752e-4bfd-40a5-b425-8bd437983a56'::uuid,
  'reneycc@gmail.com',
  'René Administrador',
  'admin',
  'Avsec Trust',
  'Administración',
  'Sistema',
  'admin@avsectrust.com'
) ON CONFLICT (id) DO UPDATE SET 
  role = 'admin',
  email = 'reneycc@gmail.com',
  full_name = 'René Administrador',
  report_contact = 'admin@avsectrust.com';
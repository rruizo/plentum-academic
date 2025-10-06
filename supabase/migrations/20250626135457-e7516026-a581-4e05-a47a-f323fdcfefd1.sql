
-- Primero, verificar los roles permitidos actualmente y actualizar la constraint
-- Eliminar la constraint existente
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Crear una nueva constraint que incluya 'supervisor' (en minúsculas)
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'teacher', 'student', 'supervisor'));

-- También actualizar cualquier función que pueda estar usando roles antiguos
UPDATE profiles SET role = 'supervisor' WHERE role = 'Supervisor';

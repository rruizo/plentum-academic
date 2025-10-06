-- Temporarily disable the role validation trigger
ALTER TABLE profiles DISABLE TRIGGER validate_role_change_trigger;

-- Update the user role
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'mamape93@gmail.com';

-- Clean up any access restrictions for admin users
UPDATE profiles 
SET access_restricted = false, 
    can_login = true 
WHERE role = 'admin' AND (access_restricted = true OR can_login = false);

-- Re-enable the role validation trigger
ALTER TABLE profiles ENABLE TRIGGER validate_role_change_trigger;
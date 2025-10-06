-- Fix admin user role for mamape93@gmail.com
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'mamape93@gmail.com';

-- Also clean up any potential access restrictions for admin users
UPDATE profiles 
SET access_restricted = false, 
    can_login = true 
WHERE role = 'admin' AND (access_restricted = true OR can_login = false);
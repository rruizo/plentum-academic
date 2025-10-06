
-- Fix RLS policies for questions table to allow authenticated users to insert questions
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON questions;
DROP POLICY IF EXISTS "Enable read access for all users" ON questions;
DROP POLICY IF EXISTS "Enable update for users based on email" ON questions;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON questions;

-- Create proper RLS policies for questions
CREATE POLICY "Users can view all questions" 
  ON questions FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert questions" 
  ON questions FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update questions" 
  ON questions FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete questions" 
  ON questions FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Also ensure question_categories has proper policies
DROP POLICY IF EXISTS "Enable read access for all users" ON question_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON question_categories;
DROP POLICY IF EXISTS "Enable update for users based on email" ON question_categories;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON question_categories;

CREATE POLICY "Users can view all categories" 
  ON question_categories FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert categories" 
  ON question_categories FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update categories" 
  ON question_categories FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete categories" 
  ON question_categories FOR DELETE 
  USING (auth.role() = 'authenticated');

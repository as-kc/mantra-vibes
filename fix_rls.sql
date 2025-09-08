-- Fix the infinite recursion in profiles RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "profiles select self or admin" ON public.profiles;

-- Create a simple policy that allows users to see their own profile
CREATE POLICY "profiles select self" 
ON public.profiles FOR SELECT 
USING (id = auth.uid());

-- For admin access, we can create a separate policy or handle it in the application layer
-- Since admins rarely need to see other user profiles in this inventory app,
-- we'll keep it simple and let admins see their own profile like everyone else
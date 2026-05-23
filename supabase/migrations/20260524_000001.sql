-- 1. Allow users to READ their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING ( auth.uid() = id );

-- 2. Allow users to UPDATE their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING ( auth.uid() = id );
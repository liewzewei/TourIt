-- User table linked to auth.users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

-- Trigger to insert user metadata into public.users after signup
CREATE OR REPLACE FUNCTION public.create_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatically run create_new_user() after a new auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_new_user();

-- Enable Row-Level Security on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--profile table
CREATE TABLE public.profiles (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to insert user metadata into public.profiles after signup
CREATE OR REPLACE FUNCTION public.create_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatically run create_new_profile() after a new auth.users insert
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_new_profile();

-- Enable Row-Level Security on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
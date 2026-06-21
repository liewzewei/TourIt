-- Add onboarding completed flag to check if users have completed onboarding
ALTER TABLE public.profiles
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
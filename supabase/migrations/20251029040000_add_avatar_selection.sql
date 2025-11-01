-- Add selected_avatar field to profiles table for avatar picker
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS selected_avatar TEXT;

-- Add round_timer field to lobbies for custom timer settings
ALTER TABLE public.lobbies
ADD COLUMN IF NOT EXISTS round_timer INTEGER NOT NULL DEFAULT 60 CHECK (round_timer >= 30 AND round_timer <= 90);

-- Update the handle_new_user function to not set avatar_url by default
-- Users will choose their avatar in ProfileSetup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, discord_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Player'),
    NEW.raw_user_meta_data->>'provider_id'
  );
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;


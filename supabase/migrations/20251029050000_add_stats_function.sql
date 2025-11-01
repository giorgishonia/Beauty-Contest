-- Function to increment user stats after game completion
-- Called by socket server when game ends

CREATE OR REPLACE FUNCTION increment_user_stats(
  p_user_id UUID,
  p_games_won INTEGER,
  p_rounds_played INTEGER,
  p_rounds_survived INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_stats
  SET 
    games_played = games_played + 1,
    games_won = games_won + p_games_won,
    total_rounds_played = total_rounds_played + p_rounds_played,
    total_rounds_survived = total_rounds_survived + p_rounds_survived,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;


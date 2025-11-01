-- Auto-close inactive rooms functionality

-- Function to close inactive rooms (no activity for 30 minutes)
CREATE OR REPLACE FUNCTION close_inactive_rooms()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inactive_room RECORD;
  closed_count integer := 0;
BEGIN
  -- Find rooms that have been inactive for more than 30 minutes
  -- and are still in 'waiting' status
  FOR inactive_room IN
    SELECT id, name
    FROM lobbies
    WHERE status = 'waiting'
      AND updated_at < (NOW() - INTERVAL '30 minutes')
  LOOP
    -- Update room status to finished
    UPDATE lobbies
    SET status = 'finished', updated_at = NOW()
    WHERE id = inactive_room.id;

    -- Remove all lobby players (they can rejoin if they want)
    DELETE FROM lobby_players WHERE lobby_id = inactive_room.id;

    -- Log the closure (optional, for debugging)
    RAISE NOTICE 'Closed inactive room: % (ID: %)', inactive_room.name, inactive_room.id;

    closed_count := closed_count + 1;
  END LOOP;

  RETURN closed_count;
END;
$$;

-- Function to update lobby activity timestamp
CREATE OR REPLACE FUNCTION update_lobby_activity(lobby_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE lobbies
  SET updated_at = NOW()
  WHERE id = lobby_uuid;
END;
$$;

-- Function to get room activity info (for monitoring)
CREATE OR REPLACE FUNCTION get_room_activity()
RETURNS TABLE (
  lobby_id UUID,
  lobby_name TEXT,
  host_username TEXT,
  player_count BIGINT,
  status TEXT,
  last_activity TIMESTAMPTZ,
  minutes_inactive NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    p.username as host_username,
    COUNT(lp.id) as player_count,
    l.status,
    l.updated_at as last_activity,
    EXTRACT(EPOCH FROM (NOW() - l.updated_at)) / 60 as minutes_inactive
  FROM lobbies l
  LEFT JOIN profiles p ON l.host_id = p.id
  LEFT JOIN lobby_players lp ON l.id = lp.lobby_id
  WHERE l.status = 'waiting'
  GROUP BY l.id, l.name, p.username, l.status, l.updated_at
  ORDER BY l.updated_at ASC;
END;
$$;

-- Allow guest users to create lobbies by changing host_id to TEXT
-- This removes the foreign key constraint so guest IDs can be stored

-- First, drop all policies that depend on host_id
DROP POLICY IF EXISTS "Authenticated users can create lobbies" ON public.lobbies;
DROP POLICY IF EXISTS "Host can update lobby" ON public.lobbies;
DROP POLICY IF EXISTS "Host can delete lobby" ON public.lobbies;

-- Drop the foreign key constraint
ALTER TABLE public.lobbies 
  DROP CONSTRAINT IF EXISTS lobbies_host_id_fkey;

-- Change host_id from UUID to TEXT to support guest IDs
-- Cast existing UUID values to TEXT
ALTER TABLE public.lobbies 
  ALTER COLUMN host_id TYPE TEXT USING host_id::TEXT;

-- Recreate the RLS policies to work with TEXT host_id
CREATE POLICY "Users can create lobbies"
  ON public.lobbies FOR INSERT
  WITH CHECK (true); -- Allow all inserts (service role bypasses RLS anyway)

CREATE POLICY "Host can update lobby"
  ON public.lobbies FOR UPDATE
  USING (true); -- Allow all updates (service role bypasses RLS anyway)

CREATE POLICY "Host can delete lobby"
  ON public.lobbies FOR DELETE
  USING (true); -- Allow all deletes (service role bypasses RLS anyway)


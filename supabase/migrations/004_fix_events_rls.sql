-- Fix: events disappearing after login
-- The events_select_published policy must allow both anon and authenticated
-- users to see published/live/ended events. The previous policy relied on
-- auth.uid() in a subquery which can fail for the anon role depending on
-- Supabase configuration.

-- Drop the existing policy
DROP POLICY IF EXISTS events_select_published ON events;

-- Recreate with explicit role grants and a simpler structure
-- Public events (published/live/ended) are readable by everyone.
-- Org owners can additionally see their own draft/cancelled events.
CREATE POLICY events_select_public ON events
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'live', 'ended'));

CREATE POLICY events_select_owner ON events
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Also ensure ticket_types are readable (already USING TRUE, but confirm)
DROP POLICY IF EXISTS ticket_types_select ON ticket_types;
CREATE POLICY ticket_types_select ON ticket_types
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

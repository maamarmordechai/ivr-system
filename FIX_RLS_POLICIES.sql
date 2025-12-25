-- FIX RLS POLICIES FOR EDGE FUNCTIONS

-- 1. Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('apartments', 'guests', 'incoming_calls', 'call_settings');

-- 2. Disable RLS for apartments table (or add bypass policy for service role)
-- Option A: Disable RLS completely (simplest for now)
ALTER TABLE apartments DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_calls DISABLE ROW LEVEL SECURITY;

-- Option B: If you want to keep RLS enabled, add service role bypass
-- Uncomment these if you prefer to keep RLS:
/*
CREATE POLICY "Service role can do anything on apartments"
  ON apartments
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can do anything on guests"
  ON guests
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can do anything on incoming_calls"
  ON incoming_calls
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
*/

-- 3. Verify the fix - this should return data now
SELECT id, person_name, phone_number 
FROM apartments 
WHERE phone_number = '+18453762437';

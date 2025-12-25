-- Add DELETE policies for authenticated users to allow restart functionality

-- Add DELETE policy for weekly_availability_calls
DROP POLICY IF EXISTS "Allow authenticated users to delete weekly availability calls" ON weekly_availability_calls;
CREATE POLICY "Allow authenticated users to delete weekly availability calls" 
  ON weekly_availability_calls FOR DELETE TO authenticated USING (true);

-- Add DELETE policy for bed_confirmations
DROP POLICY IF EXISTS "Allow authenticated users to delete bed confirmations" ON bed_confirmations;
CREATE POLICY "Allow authenticated users to delete bed confirmations" 
  ON bed_confirmations FOR DELETE TO authenticated USING (true);

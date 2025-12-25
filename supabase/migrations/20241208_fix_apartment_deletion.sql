-- Fix foreign key constraints to allow apartment deletion
-- Remove constraints that reference old guest tracking system

-- Drop foreign key constraint from incoming_calls if it exists
ALTER TABLE incoming_calls DROP CONSTRAINT IF EXISTS incoming_calls_apartment_id_fkey;

-- Recreate with SET NULL on delete
ALTER TABLE incoming_calls 
  ADD CONSTRAINT incoming_calls_apartment_id_fkey 
  FOREIGN KEY (apartment_id) 
  REFERENCES apartments(id) 
  ON DELETE SET NULL;

-- Make apartment_id nullable in incoming_calls since not all calls are from apartments
ALTER TABLE incoming_calls ALTER COLUMN apartment_id DROP NOT NULL;

-- Fix bed_availability_responses constraint (uses apartments.beds_needed which doesn't exist)
-- Drop the problematic constraint and table if it exists
DROP TABLE IF EXISTS bed_availability_responses CASCADE;
DROP TABLE IF EXISTS bed_assignments CASCADE;
DROP TABLE IF EXISTS weekly_bed_needs CASCADE;

-- Add is_active column to apartments if it doesn't exist
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Set all existing apartments to active
UPDATE apartments SET is_active = true WHERE is_active IS NULL;

-- Remove any old assignment/guest-related foreign keys if they exist
DO $$ 
BEGIN
  -- Drop old assignment constraints if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignments') THEN
    ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_apartment_id_fkey CASCADE;
    DROP TABLE assignments CASCADE;
  END IF;
  
  -- Drop old guests table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guests') THEN
    DROP TABLE guests CASCADE;
  END IF;
END $$;

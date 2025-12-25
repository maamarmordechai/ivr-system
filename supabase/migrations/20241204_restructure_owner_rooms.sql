-- Restructure apartment system to support owner-centric model with multiple rooms
-- An owner has ONE phone number but can have multiple rooms/apartments
-- The system makes ONE call per owner and asks about ALL their rooms

-- Add room_name to distinguish multiple rooms for same owner
ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS room_name TEXT DEFAULT 'Main Room';

-- Add couple_friendly per room (different from is_family_friendly)
ALTER TABLE apartments 
ADD COLUMN IF NOT EXISTS couple_friendly BOOLEAN DEFAULT true;

COMMENT ON COLUMN apartments.room_name IS 'Name/identifier for this room (e.g., "Room 1", "Basement Apt", "Main House")';
COMMENT ON COLUMN apartments.couple_friendly IS 'Whether THIS specific room can accommodate couples';

-- Update existing apartments to have default room_name
UPDATE apartments
SET room_name = 'Room 1'
WHERE room_name IS NULL OR room_name = '';

-- Create view to group apartments by owner (phone number)
CREATE OR REPLACE VIEW owners_with_rooms AS
SELECT 
  phone_number,
  person_name,
  COUNT(*) as total_rooms,
  SUM(number_of_beds) as total_beds,
  ARRAY_AGG(
    jsonb_build_object(
      'id', id,
      'room_name', room_name,
      'address', address,
      'number_of_beds', number_of_beds,
      'number_of_rooms', number_of_rooms,
      'couple_friendly', couple_friendly,
      'has_kitchenette', has_kitchenette,
      'has_crib', has_crib,
      'is_family_friendly', is_family_friendly,
      'instructions', instructions
    ) ORDER BY room_name
  ) as rooms,
  MIN(last_called_date) as last_called_date,
  MIN(call_frequency) as call_frequency
FROM apartments
WHERE phone_number IS NOT NULL
GROUP BY phone_number, person_name;

COMMENT ON VIEW owners_with_rooms IS 'Groups apartments by owner phone number for unified calling';

-- Create function to get owner's rooms for calling
CREATE OR REPLACE FUNCTION get_owner_rooms(owner_phone TEXT)
RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  address TEXT,
  beds INTEGER,
  couple_friendly BOOLEAN,
  has_crib BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    apartments.room_name,
    apartments.address,
    apartments.number_of_beds,
    apartments.couple_friendly,
    apartments.has_crib
  FROM apartments
  WHERE phone_number = owner_phone
  ORDER BY room_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_owner_rooms IS 'Returns all rooms for a specific owner by phone number';

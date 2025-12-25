-- Check all guests and their couple status

SELECT 
  g.id,
  g.name,
  g.is_couple,
  g.guest_type,
  g.number_of_people,
  g.check_in_date,
  g.check_out_date,
  COUNT(a.id) as assignment_count,
  CASE 
    WHEN COUNT(a.id) = 0 THEN 'AVAILABLE'
    ELSE 'ASSIGNED'
  END as status
FROM guests g
LEFT JOIN assignments a ON a.guest_id = g.id
GROUP BY g.id, g.name, g.is_couple, g.guest_type, g.number_of_people, g.check_in_date, g.check_out_date
ORDER BY g.created_at DESC;

-- Show only unassigned couples
SELECT 
  g.id,
  g.name,
  g.is_couple,
  g.number_of_people,
  g.check_in_date
FROM guests g
LEFT JOIN assignments a ON a.guest_id = g.id
WHERE a.id IS NULL 
  AND g.is_couple = TRUE;

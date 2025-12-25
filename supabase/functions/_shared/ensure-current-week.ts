// Auto-create current week if it doesn't exist
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export async function ensureCurrentWeek(supabaseUrl: string, supabaseKey: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if current week exists in desperate_weeks
  const { data: existingWeek, error: fetchError } = await supabase
    .from('desperate_weeks')
    .select('id, week_start_date, week_end_date, is_current')
    .eq('is_current', true)
    .maybeSingle();

  if (existingWeek) {
    console.log('Current week already exists:', existingWeek);
    return existingWeek;
  }

  // No current week - create one automatically
  console.log('No current week found, creating automatically...');

  // Calculate next Friday
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  nextFriday.setHours(18, 0, 0, 0); // 6 PM Friday

  // Calculate following Monday
  const followingMonday = new Date(nextFriday);
  followingMonday.setDate(nextFriday.getDate() + 3);
  followingMonday.setHours(0, 0, 0, 0);

  const weekStartDate = nextFriday.toISOString().split('T')[0];
  const weekEndDate = followingMonday.toISOString().split('T')[0];

  // Check if a week with this date already exists (but not marked as current)
  const { data: existingByDate } = await supabase
    .from('desperate_weeks')
    .select('id, week_start_date, week_end_date, is_current')
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  if (existingByDate) {
    // Mark it as current instead of creating a new one
    const { error: updateError } = await supabase
      .from('desperate_weeks')
      .update({ is_current: true })
      .eq('id', existingByDate.id);

    if (updateError) {
      console.error('Error marking week as current:', updateError);
    }
    
    console.log('Marked existing week as current:', existingByDate);
    return { ...existingByDate, is_current: true };
  }

  // Create the new week in desperate_weeks
  const { data: newWeek, error: weekError } = await supabase
    .from('desperate_weeks')
    .insert({
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      is_current: true
    })
    .select()
    .single();

  if (weekError) {
    console.error('Error creating current week:', weekError);
    throw new Error(`Failed to create current week: ${weekError.message}`);
  }

  // Create tracking entry for beds
  const { error: trackingError } = await supabase
    .from('weekly_bed_tracking')
    .insert({
      week_id: newWeek.id,
      beds_needed: 2,
      beds_confirmed: 0
    });

  if (trackingError) {
    console.error('Error creating tracking entry:', trackingError);
    // Don't throw - week was created successfully
  }

  console.log('Created new current week:', newWeek);
  return newWeek;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wwopmopxgpdeqxuacagf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3b3Btb3B4Z3BkZXF4dWFjYWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjUyOTUsImV4cCI6MjA4MDM0MTI5NX0.lvo5ZT4aA1BDO_0VmkyIa0bG32hgayHRO5mkqZpOhq4';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};

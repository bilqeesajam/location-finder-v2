import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://artpowrkwqldwhbeqfiz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydHBvd3Jrd3FsZHdoYmVxZml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NzQ0NTksImV4cCI6MjA4NTM1MDQ1OX0.3tG4-UK4WzLREErkOHV97hT_E9qHsc00yxd3ELbbJnI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

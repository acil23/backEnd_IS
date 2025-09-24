import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('Supabase env missing. Check SUPABASE_URL / SUPABASE_ANON_KEY');
  throw new Error('supabaseUrl is required.');
}

export const supabase = createClient(url, key, { auth: { persistSession: false } });

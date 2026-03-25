import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://rygafvlzzkvqhhenajzi.supabase.co';
const defaultSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z2Fmdmx6emt2cWhoZW5hanppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDg5NzgsImV4cCI6MjA4NTQyNDk3OH0.8oRsXVtdb3DnDEusJzHao3P4w-6D_-i-z9S787D8BWo';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  || defaultSupabaseUrl;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  || defaultSupabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Builder is using the default Supabase configuration because VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

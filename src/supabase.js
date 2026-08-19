import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      db: { schema: 'app_simple_body_graph' }
    });
    console.log('Supabase client initialized successfully with schema app_simple_body_graph.');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
} else {
  console.warn('Supabase credentials VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Running in local/offline-only mode.');
}

export { supabase };

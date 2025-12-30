import { createClient } from '@supabase/supabase-js';

// Support both standard and React App prefixed environment variables
// .trim() is added to prevent errors from accidental whitespace in env vars
const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials are missing. Database features will fail.");
}

// Use placeholders if env vars are missing to prevent "supabaseUrl is required" error during client initialization
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseKey || 'placeholder';

export const supabase = createClient(url, key);

import { createClient } from '@supabase/supabase-js';

// Helper to reliably get environment variables across different environments (Vite, CRA, Node)
const getEnv = (key: string): string => {
  // 1. Try Vite's import.meta.env (if available)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  
  // 2. Try standard process.env (CRA, Next.js, Node)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }

  return '';
};

// Check all common naming conventions for Supabase keys
const getSupabaseUrl = () => 
  getEnv('VITE_SUPABASE_URL') || 
  getEnv('REACT_APP_SUPABASE_URL') || 
  getEnv('SUPABASE_URL') || 
  '';

const getSupabaseKey = () => 
  getEnv('VITE_SUPABASE_ANON_KEY') || 
  getEnv('REACT_APP_SUPABASE_ANON_KEY') || 
  getEnv('REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY') || 
  getEnv('SUPABASE_ANON_KEY') || 
  '';

const supabaseUrl = "https://cbtfpuzsjtsdtvcfdkoz.supabase.co"
const supabaseKey = "sb_publishable_1mSmGCHSqSmjQMGw8inA9g_X1OULPOJ"

// Debug log to help troubleshoot (remove in production if needed)
if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase Credentials not found. Checking: VITE_SUPABASE_URL, REACT_APP_SUPABASE_URL, SUPABASE_URL");
}

// Use placeholders if env vars are missing to prevent client initialization errors
// We use a specific placeholder to detect this state later
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const url = supabaseUrl || PLACEHOLDER_URL;
const key = supabaseKey || 'placeholder';

export const supabase = createClient(url, key);

// Helper to check if we are actually connected to a real backend
export const isSupabaseConfigured = (): boolean => {
  return url !== PLACEHOLDER_URL && key !== 'placeholder';
};

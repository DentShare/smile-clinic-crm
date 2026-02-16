// Secure Supabase client configuration.
//
// IMPORTANT: Environment variables MUST be set in .env file
// This application will not start without proper Supabase credentials.
//
// Required environment variables:
// - VITE_SUPABASE_URL: Your Supabase project URL
// - VITE_SUPABASE_PUBLISHABLE_KEY: Your Supabase anon/public key

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Get environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validate that required environment variables are present
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const missingVars = [];
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_PUBLISHABLE_KEY) missingVars.push('VITE_SUPABASE_PUBLISHABLE_KEY');

  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}.\n\n` +
    `Please create a .env file in the project root with:\n` +
    `VITE_SUPABASE_URL=your_supabase_url\n` +
    `VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key\n\n` +
    `See .env.example for reference.`
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

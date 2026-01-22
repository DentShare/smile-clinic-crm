// Runtime-safe Supabase client.
//
// Why: in some preview/build environments `import.meta.env.VITE_SUPABASE_URL` may be undefined,
// which causes `createClient()` to throw `supabaseUrl is required`.
//
// We keep a fallback to the publishable (anon) credentials so the app can boot reliably.
// Note: publishable/anon credentials are safe to ship to the client.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const FALLBACK_SUPABASE_URL = "https://vdihwysnyyipkvaevzyp.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaWh3eXNueXlpcGt2YWV2enlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjYwNDUsImV4cCI6MjA4NDU0MjA0NX0.dyn-L_k5Qvwc_oNgpReYUhrktBIHEoipFIoNcF17exk";

const SUPABASE_URL =
  (import.meta as any)?.env?.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta as any)?.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

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

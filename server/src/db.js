import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Supabase client for admin database (second Supabase instance)
const supabaseUrl = process.env.ADMIN_SUPABASE_URL;
const supabaseKey = process.env.ADMIN_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing ADMIN_SUPABASE_URL or ADMIN_SUPABASE_SERVICE_ROLE_KEY environment variables");
}

const db = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default db;



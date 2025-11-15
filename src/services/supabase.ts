import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

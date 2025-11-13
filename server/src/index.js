import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authRouter, { requireAuth } from "./auth.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/api", authRouter);

// Simple admin token middleware
const requireAdmin = (req, res, next) => {
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) {
    return res.status(500).json({ error: "Server not configured: ADMIN_API_TOKEN missing" });
  }
  if (!token || token !== adminToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Ensure backups dir exists
const backupsDir = path.resolve(__dirname, "..", "backups");
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

function getPgTool(tool) {
  // Allow override via PG_BIN to point to PostgreSQL bin directory on Windows
  const pgBin = process.env.PG_BIN; // e.g., C:\\Program Files\\PostgreSQL\\16\\bin
  return pgBin ? path.join(pgBin, `${tool}${process.platform === "win32" ? ".exe" : ""}`) : tool;
}

function getConnectionString() {
  // Build connection URI string like: postgresql://user:password@host:port/db?sslmode=require
  const host = process.env.SUPABASE_DB_HOST;
  const port = process.env.SUPABASE_DB_PORT || "5432";
  const user = process.env.SUPABASE_DB_USER;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const db = process.env.SUPABASE_DB_NAME || "postgres";
  const sslmode = process.env.SSLMODE || "require";
  
  // Encode password in case it has special characters
  const encodedPassword = encodeURIComponent(password);
  
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}?sslmode=${sslmode}`;
}

// List backups
app.get("/api/backups", requireAdmin, (req, res) => {
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => {
      const p = path.join(backupsDir, f);
      const stat = fs.statSync(p);
      return { filename: f, size: stat.size, createdAt: stat.birthtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json({ backups: files });
});

// Create backup using pg_dump -> .sql (data only, no schema/functions/triggers)
app.post("/api/backup", requireAdmin, async (req, res) => {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `supabase-backup-${ts}.sql`;
    const outPath = path.join(backupsDir, filename);

    const pgDump = getPgTool("pg_dump");
    const connString = getConnectionString();
    
    const args = [
      connString,
      "--data-only",        // Only backup data, not schema
      "--schema=public",    // Backup public schema
      "--schema=auth",      // Backup auth schema (Supabase auth tables)
      "--no-owner",
      "--no-privileges",
      "--inserts",          // Use INSERT format instead of COPY
      "-F",
      "p",
      "-f",
      outPath,
    ];

    console.log(`Running: ${pgDump} ${args.slice(0, -2).join(" ")} -f ${outPath}`);

    const child = spawn(pgDump, args, { env: process.env });

    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    
    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`pg_dump failed with code ${code}`);
        console.error(`stderr: ${stderr}`);
        if (fs.existsSync(outPath)) {
          try { fs.unlinkSync(outPath); } catch {}
        }
        return res.status(500).json({ 
          error: "pg_dump failed", 
          details: stderr.trim() || stdout.trim() || `Exit code: ${code}` 
        });
      }
      return res.json({ 
        filename, 
        path: "backups/" + filename, 
        createdAt: new Date().toISOString() 
      });
    });

    child.on("error", (err) => {
      console.error("spawn error:", err);
      return res.status(500).json({ 
        error: "Failed to execute pg_dump", 
        details: err.message 
      });
    });
  } catch (e) {
    console.error("backup error:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Helper function to run SQL command via psql
function runPsqlCommand(command, description) {
  return new Promise((resolve, reject) => {
    const psql = getPgTool("psql");
    const connString = getConnectionString();
    
    const args = [
      connString,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      command,
    ];

    console.log(`${description}: ${psql} ${args.slice(0, -2).join(" ")} -c "${command}"`);

    const child = spawn(psql, args, { env: process.env });
    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    
    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`${description} failed with code ${code}`);
        console.error(`stderr: ${stderr}`);
        reject(new Error(stderr.trim() || stdout.trim() || `Exit code: ${code}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    child.on("error", (err) => {
      console.error(`${description} spawn error:`, err);
      reject(err);
    });
  });
}

// Restore from a given filename using psql < file.sql (data only)
app.post("/api/restore", requireAdmin, async (req, res) => {
  try {
    const { filename } = req.body || {};
    if (!filename || typeof filename !== "string") {
      return res.status(400).json({ error: "filename is required" });
    }
    const filePath = path.join(backupsDir, path.basename(filename));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Backup not found" });
    }

    // Step 1: Clear all data in public and auth schemas before restore
    // This only deletes data, not schema
    console.log("Clearing all data in public and auth schemas...");
    
    try {
      // First try to TRUNCATE all public tables together (handles FK constraints better)
      await runPsqlCommand(
        `DO $$ 
        DECLARE 
          r RECORD;
          table_list TEXT := '';
        BEGIN 
          -- Build list of all public tables
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename) 
          LOOP 
            IF table_list != '' THEN
              table_list := table_list || ', ';
            END IF;
            table_list := table_list || 'public.' || quote_ident(r.tablename);
          END LOOP;
          
          -- TRUNCATE all tables at once if any tables exist
          IF table_list != '' THEN
            BEGIN
              EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
            EXCEPTION WHEN OTHERS THEN
              -- Fallback: TRUNCATE individually
              FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
              LOOP 
                BEGIN
                  EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
                EXCEPTION WHEN OTHERS THEN
                  RAISE NOTICE 'Could not truncate public.%: %, trying DELETE', r.tablename, SQLERRM;
                  -- Fallback to DELETE if TRUNCATE fails
                  BEGIN
                    EXECUTE 'DELETE FROM public.' || quote_ident(r.tablename);
                  EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Could not delete from public.%: %', r.tablename, SQLERRM;
                  END;
                END;
              END LOOP;
            END;
          END IF;
        END $$;`,
        "TRUNCATE public tables"
      );
    } catch (truncateError) {
      console.error("TRUNCATE public schema error (continuing anyway):", truncateError);
      // Continue even if TRUNCATE fails
    }
    
    try {
      // TRUNCATE auth schema tables - need to handle FK constraints carefully
      // For auth schema, we need to delete in proper order due to FK constraints
      // identities -> users (but users might have other dependencies)
      await runPsqlCommand(
        `DO $$ 
        DECLARE 
          r RECORD;
          table_list TEXT := '';
        BEGIN 
          -- Build list of all auth tables
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'auth' ORDER BY tablename) 
          LOOP 
            IF table_list != '' THEN
              table_list := table_list || ', ';
            END IF;
            table_list := table_list || 'auth.' || quote_ident(r.tablename);
          END LOOP;
          
          -- TRUNCATE all auth tables at once if any tables exist
          IF table_list != '' THEN
            BEGIN
              EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
            EXCEPTION WHEN OTHERS THEN
              RAISE NOTICE 'Batch TRUNCATE failed: %, trying individual TRUNCATE', SQLERRM;
              -- Fallback: TRUNCATE individually, then DELETE as final fallback
              FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'auth' ORDER BY tablename) 
              LOOP 
                BEGIN
                  EXECUTE 'TRUNCATE TABLE auth.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
                EXCEPTION WHEN OTHERS THEN
                  RAISE NOTICE 'Could not truncate auth.%: %, trying DELETE', r.tablename, SQLERRM;
                  -- Fallback to DELETE if TRUNCATE fails
                  BEGIN
                    EXECUTE 'DELETE FROM auth.' || quote_ident(r.tablename);
                  EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Could not delete from auth.%: %', r.tablename, SQLERRM;
                  END;
                END;
              END LOOP;
            END;
          END IF;
          
          -- Final cleanup: DELETE from all auth tables to ensure everything is cleared
          -- Do this after TRUNCATE to catch any missed records
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'auth') 
          LOOP 
            BEGIN
              EXECUTE 'DELETE FROM auth.' || quote_ident(r.tablename);
            EXCEPTION WHEN OTHERS THEN
              RAISE NOTICE 'Final DELETE from auth.% failed: %', r.tablename, SQLERRM;
            END;
          END LOOP;
        END $$;`,
        "TRUNCATE/DELETE auth tables"
      );
    } catch (truncateError) {
      console.error("TRUNCATE auth schema error (continuing anyway):", truncateError);
      // Continue even if TRUNCATE fails (some auth tables may not have permission)
    }

    // Step 2: Restore data from backup file
    // We'll filter permission errors in the response (some auth tables may not be restorable)
    
    const psql = getPgTool("psql");
    const connString = getConnectionString();
    
    // Restore data only - use single transaction for atomicity
    // Note: We don't use ON_ERROR_STOP=1 because some auth tables may have permission errors
    // We'll filter and report permission errors separately
    const args = [
      connString,
      "-v",
      "--single-transaction",  // Run in a single transaction
      "-f",
      filePath,
    ];

    console.log(`Running: ${psql} ${args.slice(0, -2).join(" ")} -f ${filePath}`);

    const child = spawn(psql, args, { env: process.env });
    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    
    child.on("close", async (code) => {
      // Check for permission denied errors (expected for some auth tables)
      const permissionDeniedMatches = stderr.match(/permission denied[^\n]*/gi) || [];
      const hasPermissionErrors = permissionDeniedMatches.length > 0;
      
      // Check for actual ERROR messages (not just notices)
      const errorMatches = stderr.match(/ERROR:[^\n]*/gi) || [];
      const nonPermissionErrors = errorMatches.filter(err => !err.match(/permission denied/i));
      
      // If there are non-permission errors, it's a real failure
      if (code !== 0 && nonPermissionErrors.length > 0) {
        console.error(`psql restore failed with code ${code}`);
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({ 
          error: "psql restore failed", 
          details: stderr.trim() || stdout.trim() || `Exit code: ${code}` 
        });
      }
      
      // Step 3: Refresh providers column in auth.users from auth.identities
      // The providers column is computed from identities, so we need to update it
      console.log("Refreshing providers column in auth.users...");
      try {
        await runPsqlCommand(
          `UPDATE auth.users u
           SET raw_app_meta_data = jsonb_set(
             COALESCE(raw_app_meta_data, '{}'::jsonb),
             '{providers}',
             (
               SELECT jsonb_agg(DISTINCT i.provider ORDER BY i.provider)
               FROM auth.identities i
               WHERE i.user_id = u.id
             )
           )
           WHERE EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id);`,
          "Refresh providers"
        );
        
        // Also try to update the providers column directly if it exists and is not a generated column
        try {
          await runPsqlCommand(
            `DO $$
            DECLARE
              user_record RECORD;
              providers_array TEXT[];
            BEGIN
              FOR user_record IN SELECT id FROM auth.users LOOP
                SELECT array_agg(DISTINCT provider ORDER BY provider) INTO providers_array
                FROM auth.identities
                WHERE user_id = user_record.id;
                
                IF providers_array IS NOT NULL THEN
                  UPDATE auth.users
                  SET providers = providers_array
                  WHERE id = user_record.id;
                END IF;
              END LOOP;
            END $$;`,
            "Update providers column"
          );
        } catch (updateError) {
          console.log("Could not update providers column directly (may be a generated column):", updateError.message);
          // This is OK, providers might be a generated column
        }
      } catch (refreshError) {
        console.error("Refresh providers error (continuing anyway):", refreshError);
        // Continue even if refresh fails
      }
      
      // Success (or only permission errors which are acceptable)
      const warnings = hasPermissionErrors 
        ? [`${permissionDeniedMatches.length} permission denied errors (some auth tables may not be restorable)`]
        : [];
      
      return res.json({ 
        restoredFrom: path.basename(filePath), 
        restoredAt: new Date().toISOString(),
        warnings: warnings.length > 0 ? warnings : undefined
      });
    });

    child.on("error", (err) => {
      console.error("spawn error:", err);
      return res.status(500).json({ 
        error: "Failed to execute psql", 
        details: err.message 
      });
    });
  } catch (e) {
    console.error("restore error:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Example protected route with role check
app.get("/api/admin/ping", requireAuth(["admin"]), (req, res) => {
  res.json({ ok: true, by: req.user });
});

app.listen(PORT, () => {
  console.log(`Backup server listening on http://localhost:${PORT}`);
});



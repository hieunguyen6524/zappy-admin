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

// Create backup using pg_dump -> .sql
app.post("/api/backup", requireAdmin, async (req, res) => {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `supabase-backup-${ts}.sql`;
    const outPath = path.join(backupsDir, filename);

    const pgDump = getPgTool("pg_dump");
    const connString = getConnectionString();
    
    const args = [
      connString,
      "--no-owner",
      "--no-privileges",
      "--clean",
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

// Restore from a given filename using psql < file.sql
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

    const psql = getPgTool("psql");
    const connString = getConnectionString();
    
    const args = [
      connString,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      filePath,
    ];

    console.log(`Running: ${psql} ${args.slice(0, -2).join(" ")} -f ${filePath}`);

    const child = spawn(psql, args, { env: process.env });
    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    
    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`psql restore failed with code ${code}`);
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({ 
          error: "psql restore failed", 
          details: stderr.trim() || stdout.trim() || `Exit code: ${code}` 
        });
      }
      return res.json({ 
        restoredFrom: path.basename(filePath), 
        restoredAt: new Date().toISOString() 
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



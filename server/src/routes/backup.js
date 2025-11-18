import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireAdmin } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure backups dir exists
const backupsDir = path.resolve(__dirname, "..", "backups");
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

function getPgTool(tool) {
  const pgBin = process.env.PG_BIN;
  return pgBin ? path.join(pgBin, `${tool}${process.platform === "win32" ? ".exe" : ""}`) : tool;
}

function getConnectionString() {
  const host = process.env.SUPABASE_DB_HOST;
  const port = process.env.SUPABASE_DB_PORT || "5432";
  const user = process.env.SUPABASE_DB_USER;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const db = process.env.SUPABASE_DB_NAME || "postgres";
  const sslmode = process.env.SSLMODE || "require";
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}?sslmode=${sslmode}`;
}

// List backups
router.get("/", requireAdmin, (req, res) => {
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

// Create backup
router.post("/", requireAdmin, async (req, res) => {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `supabase-backup-${ts}.sql`;
    const outPath = path.join(backupsDir, filename);

    const pgDump = getPgTool("pg_dump");
    const connString = getConnectionString();
    
    const args = [
      connString,
      "--data-only",
      "--schema=public",
      "--schema=auth",
      "--no-owner",
      "--no-privileges",
      "--inserts",
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

export default router;


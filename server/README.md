Backup/Restore Server for Supabase

Setup:

- Install PostgreSQL client tools (pg_dump, psql). On Windows, set PG_BIN to the bin folder if not on PATH.
- Create a .env in this folder:

PORT=4000
ADMIN_API_TOKEN=change-me-strong-token
SUPABASE_DB_HOST=YOUR_SUPABASE_HOST
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=YOUR_SUPABASE_PASSWORD
SSLMODE=require
# PG_BIN=C:\\Program Files\\PostgreSQL\\16\\bin

Run:

- npm install
- npm run dev

Endpoints:

- POST /api/backup
- POST /api/restore { filename }
- GET /api/backups


/**
 * PM2 configuration for a development machine: API with auto-reload and the
 * Vite dev server. Paths are relative to this file, so it works from any clone.
 * Requires `uv sync` in backend/ and `npm install` in frontend/.
 */
const path = require('node:path');

const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'dashvolcano-api',
      script: path.join(ROOT, 'backend/.venv/bin/uvicorn'),
      args: 'backend.main:app --reload --reload-dir backend --host 127.0.0.1 --port 8000',
      // backend/config.py reads the .env file of this directory
      cwd: ROOT,
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        PYTHONPATH: ROOT,
        ENVIRONMENT: 'development',
      },
      error_file: path.join(ROOT, 'logs/api-error.log'),
      out_file: path.join(ROOT, 'logs/api-out.log'),
      log_file: path.join(ROOT, 'logs/api-combined.log'),
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
    {
      name: 'dashvolcano-frontend',
      cwd: path.join(ROOT, 'frontend'),
      script: 'npm',
      args: 'run dev',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'development',
      },
      error_file: path.join(ROOT, 'logs/frontend-error.log'),
      out_file: path.join(ROOT, 'logs/frontend-out.log'),
      log_file: path.join(ROOT, 'logs/frontend-combined.log'),
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};

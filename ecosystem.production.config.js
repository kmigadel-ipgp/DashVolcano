/**
 * PM2 configuration for the production server (API only).
 *
 * The frontend is a static build (frontend/dist) served by nginx, which also
 * proxies /api, /health, /docs, /redoc and /openapi.json to the API.
 * Deploy with ./deploy.sh; see "Production deployment" in the README.
 */
const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'dashvolcano-api',
      // Absolute paths: PM2 started at boot by systemd must not depend on the shell PATH.
      // /usr/bin/python3 is the server's Python 3.10, where the backend dependencies are installed.
      script: '/usr/local/bin/uvicorn',
      interpreter: '/usr/bin/python3',
      args: [
        'backend.main:app',
        // Only nginx talks to the API
        '--host', '127.0.0.1',
        '--port', '8000',
        '--workers', '4',
        '--timeout-keep-alive', '120',
        '--timeout-graceful-shutdown', '30',
      ].join(' '),
      // backend/config.py reads the .env file of this directory
      cwd: ROOT,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      // Leave uvicorn its graceful shutdown before PM2 kills it
      kill_timeout: 35000,
      env: {
        PYTHONPATH: ROOT,
        ENVIRONMENT: 'production',
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};

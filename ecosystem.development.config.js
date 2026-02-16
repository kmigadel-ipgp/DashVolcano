module.exports = {
  apps: [
    {
      name: 'dashvolcano-api',
      script: './backend/.venv/bin/uvicorn',
      args: 'backend.main:app --reload --host 0.0.0.0 --port 8000',
      cwd: '/home/kmigadel/Documents/IPGP/Projects-Tasks/DashVolcano/Website/code/DashVolcano',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        PYTHONPATH: '/home/kmigadel/Documents/IPGP/Projects-Tasks/DashVolcano/Website/code/DashVolcano',
        ENVIRONMENT: 'development'
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
    {
      name: 'dashvolcano-frontend',
      cwd: '/home/kmigadel/Documents/IPGP/Projects-Tasks/DashVolcano/Website/code/DashVolcano/frontend',
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
        PORT: 5173
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    }
  ]
};

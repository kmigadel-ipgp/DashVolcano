module.exports = {
  apps: [
    {
      name: 'dashvolcano-api',
      script: '/usr/local/bin/uvicorn',
      args: 'backend.main:app --host 0.0.0.0 --port 8000 --workers 4',
      cwd: '/root/DashVolcano',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'python3',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        PYTHONPATH: '/root/DashVolcano',
        ENVIRONMENT: 'production'
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
    }
  ]
};

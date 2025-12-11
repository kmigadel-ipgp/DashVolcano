module.exports = {
  apps: [
    {
      name: 'dashvolcano-api',
      script: '/root/DashVolcano/start-api.sh',
      cwd: '/root/DashVolcano',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'bash',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        LD_LIBRARY_PATH: '/usr/local/ssl/lib64',
        PATH: '/root/.pyenv/versions/3.10.12/bin:/usr/local/bin:/usr/bin:/bin',
      },
      error_file: '/root/DashVolcano/logs/api-error.log',
      out_file: '/root/DashVolcano/logs/api-out.log',
      log_file: '/root/DashVolcano/logs/api-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
    {
      name: 'dashvolcano-frontend',
      cwd: '/root/DashVolcano/frontend',
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
      error_file: '/root/DashVolcano/logs/frontend-error.log',
      out_file: '/root/DashVolcano/logs/frontend-out.log',
      log_file: '/root/DashVolcano/logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    }
  ]
};

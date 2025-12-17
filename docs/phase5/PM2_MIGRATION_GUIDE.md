# Migration Guide: systemd to PM2

**Date**: December 11, 2025  
**Purpose**: Migrate DashVolcano from systemd to PM2 for unified process management

---

## Why PM2?

- **Unified Management**: Single interface for both backend and frontend
- **Better Monitoring**: Real-time process monitoring with `pm2 monit`
- **Automatic Restarts**: Built-in crash recovery
- **Log Management**: Centralized logging with rotation
- **Email Alerts**: Custom monitoring with email notifications
- **Zero-Downtime Deployments**: Easy rolling updates

---

## Prerequisites

Before starting the migration, ensure you have:

1. **Node.js and npm installed**:
   ```bash
   node --version  # Should show v20.x.x
   npm --version
   ```

2. **PM2 installed globally**:
   ```bash
   npm install -g pm2
   pm2 --version
   ```

3. **Email addresses configured** in `.env`:
   - `SENDER_EMAIL`: Your email address
   - `RECEIVER_EMAIL`: Where to send alerts
   - Note: Uses localhost SMTP (port 25) - no password required

---

## Migration Steps

### Step 1: Install Dependencies

```bash
cd /root/DashVolcano

# Install PM2 globally if not already installed
npm install -g pm2

# Install monitoring dependencies
npm install nodemailer dotenv

# Make setup script executable
chmod +x setup-monitoring.sh
```

### Step 2: Configure Email Settings

Edit `/root/DashVolcano/.env` and add your email addresses:

```bash
# Email notification settings for PM2 monitoring (uses localhost SMTP)
SENDER_EMAIL=migadel@ipgp.fr
RECEIVER_EMAIL=migadel@ipgp.fr
```

**Note**: The monitoring system uses the local SMTP server (localhost:25) which should be configured on the server. No password is required.

### Step 3: Stop systemd Service

```bash
# Stop the current systemd service
sudo systemctl stop dashvolcano-api.service

# Disable it from starting on boot
sudo systemctl disable dashvolcano-api.service

# Verify it's stopped
sudo systemctl status dashvolcano-api.service
```

### Step 4: Start PM2 Processes

```bash
cd /root/DashVolcano

# Start both backend and frontend using ecosystem config
pm2 start ecosystem.config.js

# Check status
pm2 list

# You should see:
# ┌─────┬──────────────────────────┬─────────┬─────────┬─────────┐
# │ id  │ name                     │ status  │ restart │ uptime  │
# ├─────┼──────────────────────────┼─────────┼─────────┼─────────┤
# │ 0   │ dashvolcano-api          │ online  │ 0       │ 0s      │
# │ 1   │ dashvolcano-frontend     │ online  │ 0       │ 0s      │
# └─────┴──────────────────────────┴─────────┴─────────┴─────────┘
```

### Step 5: Save PM2 Configuration

```bash
# Save the current process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Follow the instructions printed by the command above
# It will output a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
# Copy and run that command
```

### Step 6: Setup Monitoring

```bash
cd /root/DashVolcano

# Run the setup script
bash setup-monitoring.sh

# This will:
# - Install nodemailer dependencies
# - Setup cron job (every 5 minutes)
# - Test the monitoring script
```

### Step 7: Verify Everything Works

```bash
# Check PM2 processes
pm2 list

# View logs
pm2 logs

# Test API endpoint
curl https://dashvolcano.ipgp.fr/health

# Test frontend
curl https://dashvolcano.ipgp.fr/

# Test monitoring script
node /root/DashVolcano/monitor.js

# Check cron job is installed
crontab -l | grep DashVolcano
```

### Step 8: Update nginx Configuration (Optional)

If you want nginx to serve the frontend via PM2 (running on port 3000), update nginx:

```bash
sudo nano /etc/nginx/sites-available/dashvolcano.conf
```

Change the frontend location block from:
```nginx
location / {
    root /var/www/dashvolcano;
    try_files $uri $uri/ /index.html;
}
```

To:
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

Then reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Note**: The current setup keeps frontend as static files in nginx, which is more efficient. The PM2 frontend process is optional.

---

## Verification Checklist

After migration, verify:

- [ ] PM2 processes are running: `pm2 list`
- [ ] Backend API responds: `curl https://dashvolcano.ipgp.fr/health`
- [ ] Frontend loads: `curl https://dashvolcano.ipgp.fr/`
- [ ] Logs are being written: `ls -lh /root/DashVolcano/logs/`
- [ ] PM2 starts on boot: `pm2 startup` configured
- [ ] Cron job installed: `crontab -l | grep DashVolcano`
- [ ] Monitoring works: `node /root/DashVolcano/monitor.js`
- [ ] systemd service stopped: `systemctl status dashvolcano-api.service`

---

## Useful PM2 Commands

### Process Management
```bash
# List all processes
pm2 list

# View logs (all processes)
pm2 logs

# View logs (specific process)
pm2 logs dashvolcano-api
pm2 logs dashvolcano-frontend

# Restart processes
pm2 restart dashvolcano-api
pm2 restart dashvolcano-frontend
pm2 restart all

# Stop processes
pm2 stop dashvolcano-api
pm2 stop all

# Delete processes (removes from PM2 list)
pm2 delete dashvolcano-api
pm2 delete all

# Monitor in real-time
pm2 monit

# Show detailed info
pm2 show dashvolcano-api
```

### Log Management
```bash
# View logs in real-time
pm2 logs --lines 100

# Flush logs
pm2 flush

# Reload all logs
pm2 reloadLogs

# View log files directly
tail -f /root/DashVolcano/logs/api-out.log
tail -f /root/DashVolcano/logs/api-error.log
```

### Process Control
```bash
# Reload with zero downtime
pm2 reload dashvolcano-api

# Restart with delay
pm2 restart dashvolcano-api --wait-ready

# Scale processes (if using cluster mode)
pm2 scale dashvolcano-api 4

# Save process list
pm2 save

# Resurrect saved processes
pm2 resurrect
```

### Monitoring
```bash
# View monitoring logs
tail -f /root/DashVolcano/logs/monitor.log

# Test monitoring script
node /root/DashVolcano/monitor.js

# Check cron status
crontab -l

# View cron logs
grep CRON /var/log/syslog | tail -20
```

---

## Rollback to systemd (If Needed)

If you need to rollback to systemd:

```bash
# Stop PM2 processes
pm2 stop all
pm2 delete all

# Disable PM2 startup
pm2 unstartup

# Remove cron job
crontab -e
# Delete the DashVolcano monitoring lines

# Start systemd service
sudo systemctl start dashvolcano-api.service
sudo systemctl enable dashvolcano-api.service

# Verify
sudo systemctl status dashvolcano-api.service
```

---

## Troubleshooting

### PM2 processes not starting

```bash
# Check PM2 logs
pm2 logs

# Check if Python path is correct
which uvicorn
# Should be: /root/.pyenv/versions/3.10.12/bin/uvicorn

# Check if OpenSSL library path is set
pm2 show dashvolcano-api | grep LD_LIBRARY_PATH
```

### Email notifications not working

```bash
# Test monitoring script
node /root/DashVolcano/monitor.js

# Check .env file
cat /root/DashVolcano/.env | grep EMAIL

# Test local SMTP server
telnet localhost 25

# Check if postfix/sendmail is running
systemctl status postfix
# or
systemctl status sendmail

# Check mail logs
tail -f /var/log/mail.log
```

### Cron job not running

```bash
# Check cron is running
systemctl status cron

# View cron logs
grep CRON /var/log/syslog | tail -20

# Test cron job manually
cd /root/DashVolcano && /usr/bin/node /root/DashVolcano/monitor.js

# Verify PATH in cron
crontab -l | grep PATH
```

### Frontend not accessible

If using PM2 for frontend:
```bash
# Check if serve is installed
npm list -g serve

# Install if missing
npm install -g serve

# Check frontend logs
pm2 logs dashvolcano-frontend
```

If using static files (current setup):
```bash
# Frontend should still be served by nginx from /var/www/dashvolcano/
# The PM2 frontend process is optional
ls -la /var/www/dashvolcano/
```

---

## Performance Comparison

### Before (systemd)
- Single process manager (backend only)
- Manual log rotation required
- Basic monitoring via systemctl
- No email alerts
- Separate frontend management

### After (PM2)
- Unified process manager (backend + optional frontend)
- Built-in log rotation
- Real-time monitoring (`pm2 monit`)
- Email alerts on process failure
- Automatic restarts on crash
- Zero-downtime reloads
- Better resource monitoring

---

## Next Steps

After successful migration:

1. **Monitor for 24 hours**: Check logs and email alerts
2. **Test failure scenarios**: Stop a process manually and verify email alert
3. **Review performance**: Use `pm2 monit` to check resource usage
4. **Update documentation**: Note any custom configurations
5. **Create backup**: `pm2 save` regularly

---

## Support

For issues or questions:
- View logs: `pm2 logs`
- Check status: `pm2 list`
- Monitor: `pm2 monit`
- Test monitoring: `node /root/DashVolcano/monitor.js`

**Last Updated**: December 11, 2025

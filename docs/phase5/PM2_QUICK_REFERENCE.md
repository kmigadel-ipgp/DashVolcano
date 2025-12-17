# PM2 Deployment Quick Reference

**Server**: dashvolcano.ipgp.fr  
**Process Manager**: PM2  
**Date**: December 11, 2025

---

## Quick Start

### View Status
```bash
pm2 list
pm2 monit
```

### View Logs
```bash
pm2 logs
pm2 logs dashvolcano-api
pm2 logs dashvolcano-frontend
```

### Restart Services
```bash
pm2 restart dashvolcano-api
pm2 restart dashvolcano-frontend
pm2 restart all
```

### Stop/Start Services
```bash
pm2 stop all
pm2 start ecosystem.config.js
```

---

## Configuration Files

### PM2 Ecosystem Config
**Location**: `/root/DashVolcano/ecosystem.config.js`

Manages:
- `dashvolcano-api` (Backend - FastAPI/uvicorn on port 8000)
- `dashvolcano-frontend` (Frontend - serve on port 3000, optional)

### Monitoring Script
**Location**: `/root/DashVolcano/monitor.js`

Features:
- Checks processes every 5 minutes (cron)
- Auto-restarts crashed processes
- Sends email alerts via localhost SMTP
- Logs to `/root/DashVolcano/logs/monitor.log`

### Environment Variables
**Location**: `/root/DashVolcano/.env`

Required:
```bash
SENDER_EMAIL=your-email@ipgp.fr
RECEIVER_EMAIL=your-email@ipgp.fr
```

---

## Log Files

```
/root/DashVolcano/logs/
├── api-out.log          # Backend stdout
├── api-error.log        # Backend stderr
├── api-combined.log     # Backend combined
├── frontend-out.log     # Frontend stdout
├── frontend-error.log   # Frontend stderr
├── frontend-combined.log # Frontend combined
└── monitor.log          # Monitoring script output
```

---

## Monitoring

### Check Health
```bash
# Manual monitoring check
node /root/DashVolcano/monitor.js

# View monitoring logs
tail -f /root/DashVolcano/logs/monitor.log

# Check cron job
crontab -l | grep DashVolcano
```

### Cron Schedule
Runs every 5 minutes:
```
*/5 * * * * cd /root/DashVolcano && /usr/bin/node /root/DashVolcano/monitor.js >> /root/DashVolcano/logs/monitor.log 2>&1
```

---

## Email Notifications

### Configuration
Uses localhost SMTP (port 25) - requires local mail server (postfix/sendmail)

```bash
# Check mail server status
systemctl status postfix

# Test SMTP
telnet localhost 25

# View mail logs
tail -f /var/log/mail.log
```

### Alert Triggers
- Process status not "online"
- Process not found in PM2 list
- PM2 not installed/accessible
- Monitoring script errors

---

## Deployment Workflow

### Deploy Backend Update
```bash
cd /root/DashVolcano
git pull
cd backend
pip install -e .
pm2 restart dashvolcano-api
pm2 logs dashvolcano-api
```

### Deploy Frontend Update
```bash
cd /root/DashVolcano/frontend
npm install
npm run build
# Copy to nginx or restart PM2 frontend
pm2 restart dashvolcano-frontend
```

### Zero-Downtime Reload
```bash
pm2 reload dashvolcano-api
```

---

## Troubleshooting

### Process Won't Start
```bash
# Check logs
pm2 logs dashvolcano-api --lines 100

# Check configuration
pm2 show dashvolcano-api

# Check environment
pm2 show dashvolcano-api | grep -A 20 "env:"

# Verify Python/uvicorn path
which uvicorn
/root/.pyenv/versions/3.10.12/bin/uvicorn --version
```

### High Memory Usage
```bash
# Check memory
pm2 list
pm2 monit

# Restart if needed
pm2 restart dashvolcano-api

# Adjust max_memory_restart in ecosystem.config.js
```

### Logs Not Appearing
```bash
# Flush and reload logs
pm2 flush
pm2 reloadLogs

# Check log directory permissions
ls -la /root/DashVolcano/logs/
```

---

## Maintenance Commands

### Daily
```bash
# Check status
pm2 list
pm2 monit

# Check monitoring
tail -20 /root/DashVolcano/logs/monitor.log
```

### Weekly
```bash
# Review logs
pm2 logs --lines 1000 --nostream

# Check disk usage
du -sh /root/DashVolcano/logs/

# Flush old logs if needed
pm2 flush
```

### Monthly
```bash
# Save PM2 configuration
pm2 save

# Update dependencies
cd /root/DashVolcano/backend
pip install --upgrade -r requirements.txt

cd /root/DashVolcano/frontend
npm update

# Restart with updates
pm2 restart all
```

---

## System Startup

PM2 is configured to start on boot:

```bash
# View startup configuration
pm2 startup

# If needed, reconfigure
pm2 unstartup
pm2 startup systemd -u root --hp /root
# Run the command it outputs
pm2 save
```

---

## Migration from systemd

If you need to switch back to systemd:

```bash
# Stop PM2
pm2 stop all
pm2 delete all
pm2 unstartup

# Remove cron job
crontab -e
# Delete DashVolcano monitoring lines

# Start systemd service
sudo systemctl start dashvolcano-api.service
sudo systemctl enable dashvolcano-api.service
```

---

## URLs

- Frontend: https://dashvolcano.ipgp.fr/
- API: https://dashvolcano.ipgp.fr/api/
- Health: https://dashvolcano.ipgp.fr/health

---

## Emergency Contacts

- **Server Issues**: Check `/root/DashVolcano/logs/`
- **Email Alerts**: Check `/var/log/mail.log`
- **Full Documentation**: `/root/DashVolcano/docs/PM2_MIGRATION_GUIDE.md`

---

**Last Updated**: December 11, 2025

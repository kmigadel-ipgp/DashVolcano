# DashVolcano Deployment Guide

Complete guide for deploying DashVolcano v3.0 to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [nginx Configuration](#nginx-configuration)
6. [SSL/TLS Setup](#ssltls-setup)
7. [Monitoring & Logging](#monitoring--logging)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

**Server:**
- **Operating System**: Ubuntu 20.04+ or similar Linux distribution
- **Node.js**: 20.19+ (for building frontend)
- **Python**: 3.11+ (for backend)
- **MongoDB**: 4.4+ (Atlas recommended) or local installation
- **nginx**: 1.18+ (reverse proxy and static file server)
- **pm2**: 5.0+ (process manager for backend)
- **uv**: Latest version (Python package manager, optional but recommended)

**Development Machine (for building):**
- **Node.js**: 20.19+
- **Python**: 3.11+
- **Git**: 2.0+

### Required Credentials

- **MongoDB Connection String**: Atlas URI or local MongoDB credentials
- **Domain Name** (optional): For SSL/TLS setup
- **SSH Access**: To your production server

---

## System Requirements

### Minimum Server Specs

**Development/Testing:**
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 10 GB SSD
- **Bandwidth**: 10 Mbps

**Production (Small):**
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 20 GB SSD
- **Bandwidth**: 100 Mbps

**Production (Medium - Recommended):**
- **CPU**: 8 cores
- **RAM**: 16 GB
- **Storage**: 50 GB SSD
- **Bandwidth**: 1 Gbps

### Estimated Resource Usage

- **Backend API** (FastAPI + pm2): ~200-500 MB RAM per worker
- **Frontend** (nginx static files): ~50 MB disk space
- **MongoDB** (if self-hosted): ~2-4 GB RAM, ~10 GB disk per 100K samples
- **nginx**: ~10-50 MB RAM

---

## Backend Deployment

### Step 1: Clone Repository

```bash
# SSH into your production server
ssh user@your-server.com

# Clone the repository
cd /var/www
sudo git clone https://github.com/your-org/DashVolcano.git
sudo chown -R $USER:$USER DashVolcano
cd DashVolcano/backend
```

### Step 2: Install Python Dependencies

**Option A: Using uv (Recommended)**
```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv sync
```

**Option B: Using pip**
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -e .
```

### Step 3: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with your production credentials
nano .env
```

**`.env` File:**
```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dashvolcano?retryWrites=true&w=majority
MONGODB_DB_NAME=dashvolcano

# Redis Configuration (optional, for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
CACHE_TTL=3600

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4
LOG_LEVEL=info

# CORS Configuration
CORS_ORIGINS=["https://your-domain.com", "https://www.your-domain.com"]

# Environment
ENVIRONMENT=production
```

**Security Notes:**
- Use strong MongoDB credentials
- Restrict `CORS_ORIGINS` to your domain only
- Keep `.env` file permissions restrictive: `chmod 600 .env`
- Never commit `.env` to version control

### Step 4: Test Backend Manually

```bash
# Activate virtual environment (if using venv)
source venv/bin/activate

# Start backend manually to test
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Test health endpoint (in another terminal)
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","database":"connected"}

# Stop manual server (Ctrl+C)
```

### Step 5: Set Up pm2 Process Manager

**Install pm2:**
```bash
# Install globally
npm install -g pm2
```

**Create pm2 Ecosystem File:**
```bash
# Create ecosystem.config.js
nano /var/www/DashVolcano/backend/ecosystem.config.js
```

**`ecosystem.config.js` Configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'dashvolcano-api',
    script: 'uvicorn',
    args: 'backend.main:app --host 0.0.0.0 --port 8000 --workers 4',
    cwd: '/var/www/DashVolcano/backend',
    interpreter: '/var/www/DashVolcano/backend/venv/bin/python',
    env: {
      ENVIRONMENT: 'production',
      PYTHONPATH: '/var/www/DashVolcano'
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/dashvolcano-api-error.log',
    out_file: '/var/log/pm2/dashvolcano-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10
  }]
};
```

**If using uv:**
```javascript
// Modify interpreter line:
interpreter: '/home/your-user/.local/bin/uv',
args: 'run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4',
```

**Start Backend with pm2:**
```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Start the application
cd /var/www/DashVolcano/backend
pm2 start ecosystem.config.js

# Save pm2 process list
pm2 save

# Set up pm2 to start on system boot
pm2 startup systemd
# Follow the instructions printed by the command above
```

**Verify Backend is Running:**
```bash
# Check pm2 status
pm2 status

# Check logs
pm2 logs dashvolcano-api --lines 50

# Test health endpoint
curl http://localhost:8000/health
```

---

## Frontend Deployment

### Step 1: Build Frontend on Development Machine

**On your development machine (or server with sufficient resources):**

```bash
# Navigate to frontend directory
cd /path/to/DashVolcano/frontend

# Install dependencies
npm install

# Create production environment file (if needed)
echo "VITE_API_BASE_URL=https://your-domain.com" > .env.production

# Build for production
npm run build

# Build output will be in dist/ folder
ls -lh dist/
```

**Expected Build Output:**
```
dist/
├── assets/
│   ├── index-abc123.js       # Main JavaScript bundle (~380 KB gzipped)
│   ├── index-def456.css      # Styles
│   └── ...                   # Other chunked assets
└── index.html                # Entry HTML file
```

### Step 2: Transfer Build to Server

```bash
# From your development machine, transfer dist/ to server
rsync -avz --delete dist/ user@your-server.com:/var/www/DashVolcano/frontend/dist/

# Or using scp
scp -r dist/* user@your-server.com:/var/www/DashVolcano/frontend/dist/
```

**Alternative: Build on Server (if resources allow)**
```bash
# SSH into server
ssh user@your-server.com

# Navigate to frontend directory
cd /var/www/DashVolcano/frontend

# Install dependencies and build
npm install
npm run build
```

### Step 3: Verify Build Files

```bash
# On server, check dist/ folder
ls -lh /var/www/DashVolcano/frontend/dist/

# Verify index.html exists
cat /var/www/DashVolcano/frontend/dist/index.html
```

---

## nginx Configuration

### Step 1: Install nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 2: Create nginx Site Configuration

```bash
# Create new site configuration
sudo nano /etc/nginx/sites-available/dashvolcano
```

**Basic Configuration (HTTP only):**
```nginx
# DashVolcano nginx configuration
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Root directory for frontend static files
    root /var/www/DashVolcano/frontend/dist;
    index index.html;

    # Frontend - serve React SPA
    location / {
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - reverse proxy to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings for large responses
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # API documentation
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /redoc {
        proxy_pass http://127.0.0.1:8000/redoc;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/csv;

    # Logging
    access_log /var/log/nginx/dashvolcano-access.log;
    error_log /var/log/nginx/dashvolcano-error.log;
}
```

### Step 3: Enable Site and Test Configuration

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/dashvolcano /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload nginx
sudo systemctl reload nginx
```

### Step 4: Configure Firewall

```bash
# Allow HTTP and HTTPS through firewall
sudo ufw allow 'Nginx Full'

# Check firewall status
sudo ufw status
```

### Step 5: Test Deployment

```bash
# Test frontend (from your machine)
curl -I http://your-domain.com

# Test backend API
curl http://your-domain.com/health

# Expected response:
# {"status":"healthy","database":"connected"}

# Test API endpoint
curl http://your-domain.com/api/samples?limit=5

# Open in browser
# http://your-domain.com
```

---

## SSL/TLS Setup

### Using Let's Encrypt (Certbot)

**Step 1: Install Certbot**
```bash
# Ubuntu 20.04+
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

**Step 2: Obtain SSL Certificate**
```bash
# Run Certbot for nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

**Step 3: Verify SSL Configuration**
```bash
# Test certificate
sudo certbot certificates

# Test HTTPS
curl -I https://your-domain.com

# Check SSL rating
# Visit https://www.ssllabs.com/ssltest/ and enter your domain
```

**Step 4: Set Up Auto-Renewal**
```bash
# Certbot automatically sets up renewal, but verify:
sudo systemctl status certbot.timer

# Test renewal process
sudo certbot renew --dry-run
```

### Updated nginx Configuration (with SSL)

After running Certbot, your nginx config will be updated automatically. Verify it looks similar to:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates managed by Certbot
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ... rest of configuration from above
    root /var/www/DashVolcano/frontend/dist;
    index index.html;
    
    # ... (all location blocks same as HTTP config)
}
```

---

## Monitoring & Logging

### pm2 Monitoring

**View Running Processes:**
```bash
# List all processes
pm2 list

# Detailed status
pm2 status

# Real-time monitoring (CPU, memory)
pm2 monit
```

**View Logs:**
```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs dashvolcano-api

# View last 100 lines
pm2 logs dashvolcano-api --lines 100

# Follow logs in real-time
pm2 logs dashvolcano-api --lines 0
```

**Process Management:**
```bash
# Restart application
pm2 restart dashvolcano-api

# Stop application
pm2 stop dashvolcano-api

# Delete from pm2 list
pm2 delete dashvolcano-api

# Reload (zero-downtime restart)
pm2 reload dashvolcano-api
```

### nginx Monitoring

**View nginx Logs:**
```bash
# Access logs
sudo tail -f /var/log/nginx/dashvolcano-access.log

# Error logs
sudo tail -f /var/log/nginx/dashvolcano-error.log

# Check for errors
sudo grep "error" /var/log/nginx/dashvolcano-error.log
```

**nginx Status:**
```bash
# Check if nginx is running
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx
```

### System Resource Monitoring

**CPU and Memory:**
```bash
# Real-time resource usage
htop

# or use top
top

# Check disk usage
df -h

# Check available memory
free -h
```

**Database Monitoring:**
```bash
# MongoDB Atlas: Use MongoDB Compass or Atlas web interface
# https://cloud.mongodb.com/

# Local MongoDB:
mongo --eval "db.serverStatus()"
```

---

## Maintenance

### Regular Updates

**Update Backend Code:**
```bash
# SSH into server
ssh user@your-server.com

# Pull latest changes
cd /var/www/DashVolcano
git pull origin main

# Update backend dependencies
cd backend
source venv/bin/activate  # or use `uv sync`
pip install -e .

# Restart backend
pm2 restart dashvolcano-api

# Check logs for errors
pm2 logs dashvolcano-api --lines 50
```

**Update Frontend:**
```bash
# Build on development machine
cd /path/to/DashVolcano/frontend
npm install
npm run build

# Transfer to server
rsync -avz --delete dist/ user@your-server.com:/var/www/DashVolcano/frontend/dist/

# No need to restart nginx (static files are served directly)
```

### Database Maintenance

**MongoDB Atlas:**
- Monitor usage via Atlas dashboard
- Set up alerts for disk space, connection limits
- Review slow queries and create indexes as needed

**Backup Data:**
```bash
# MongoDB Atlas: Use automated backups (configured in Atlas)

# Local MongoDB backup:
mongodump --uri="mongodb://localhost:27017/dashvolcano" --out=/backup/dashvolcano-$(date +%Y%m%d)

# Restore from backup:
mongorestore --uri="mongodb://localhost:27017/dashvolcano" /backup/dashvolcano-20241208/
```

### Log Rotation

**pm2 Logs:**
```bash
# Install pm2-logrotate
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

**nginx Logs:**
Ubuntu/Debian includes logrotate by default for nginx. Verify:
```bash
# Check logrotate config
cat /etc/logrotate.d/nginx

# Manually trigger rotation (for testing)
sudo logrotate -f /etc/logrotate.d/nginx
```

### Security Updates

```bash
# Update system packages regularly
sudo apt update
sudo apt upgrade

# Update Node.js (if needed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Update Python (if needed)
sudo apt install python3.11

# Update npm packages (frontend dependencies)
cd /var/www/DashVolcano/frontend
npm outdated
npm update

# Update Python packages (backend dependencies)
cd /var/www/DashVolcano/backend
pip list --outdated
pip install --upgrade package-name
```

---

## Troubleshooting

### Backend Issues

**Backend not starting:**
```bash
# Check pm2 logs
pm2 logs dashvolcano-api --lines 100

# Check if port 8000 is in use
sudo lsof -i :8000

# Check MongoDB connection
# Look for "database":"connected" in logs

# Test MongoDB connection manually
python -c "from pymongo import MongoClient; client = MongoClient('your-mongodb-uri'); print(client.server_info())"
```

**Backend crashes frequently:**
```bash
# Check memory usage
pm2 monit

# Increase memory limit in ecosystem.config.js
# max_memory_restart: '2G'

# Reduce number of workers if low on RAM
# args: 'backend.main:app --host 0.0.0.0 --port 8000 --workers 2'

# Restart pm2
pm2 restart dashvolcano-api
```

**Slow API responses:**
```bash
# Check database indexes
# MongoDB Atlas: Go to Collections → Indexes

# Enable Redis caching (if not already)
# Update .env with Redis credentials

# Check backend logs for slow queries
pm2 logs dashvolcano-api | grep "slow"

# Monitor backend resource usage
pm2 monit
```

### Frontend Issues

**Frontend not loading:**
```bash
# Check nginx logs
sudo tail -f /var/log/nginx/dashvolcano-error.log

# Verify dist/ folder exists
ls -lh /var/www/DashVolcano/frontend/dist/

# Check nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

**API requests fail from frontend:**
```bash
# Check CORS settings in backend .env
# CORS_ORIGINS should include your frontend domain

# Check nginx proxy configuration
# Ensure location /api/ is correctly proxying to backend

# Test API directly
curl http://localhost:8000/api/samples?limit=5

# Check browser console for errors (F12)
```

**Assets not loading (404 errors):**
```bash
# Check nginx asset caching configuration
# Verify location ~* \.(js|css|png|...)$ block

# Check file permissions
ls -l /var/www/DashVolcano/frontend/dist/

# Ensure nginx user can read files
sudo chown -R www-data:www-data /var/www/DashVolcano/frontend/dist/
```

### nginx Issues

**502 Bad Gateway:**
```bash
# Backend is not running or not accessible
pm2 status

# Check backend is listening on correct port
sudo netstat -tlnp | grep 8000

# Check nginx proxy_pass configuration
sudo nginx -t

# Check SELinux (if applicable)
sudo setsebool -P httpd_can_network_connect 1
```

**504 Gateway Timeout:**
```bash
# Increase timeout in nginx config
# location /api/ {
#   proxy_read_timeout 120s;
# }

# Reload nginx
sudo systemctl reload nginx

# Check if backend is actually responding slowly
curl -o /dev/null -s -w 'Total: %{time_total}s\n' http://localhost:8000/api/samples?limit=1000
```

**SSL Certificate Issues:**
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Verify SSL configuration
sudo nginx -t
```

### Database Issues

**MongoDB connection timeout:**
```bash
# Check MongoDB URI in .env
# Ensure IP whitelist includes server IP (MongoDB Atlas)

# Test connection
mongo "your-mongodb-uri" --eval "db.runCommand({ping:1})"

# Check firewall rules
sudo ufw status
```

**Out of disk space:**
```bash
# Check disk usage
df -h

# Clean old logs
pm2 flush  # Clear pm2 logs
sudo journalctl --vacuum-time=7d  # Clear system logs older than 7 days

# Check for large files
du -h /var/log | sort -h | tail -20
```

---

## Performance Optimization

### nginx Optimizations

**Enable HTTP/2:**
Already enabled in SSL config: `listen 443 ssl http2;`

**Enable Brotli Compression (optional):**
```bash
# Install nginx-brotli module
sudo apt install libnginx-mod-http-brotli

# Add to nginx config (inside server block)
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
```

**Enable Caching (static assets):**
Already configured in location block for static assets (1 year cache).

### Backend Optimizations

**Use Redis for Caching:**
```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Update backend .env
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL=3600

# Restart backend
pm2 restart dashvolcano-api
```

**Database Indexes:**
Ensure MongoDB has indexes on frequently queried fields:
- `samples`: `rock_type`, `tectonic_setting`, `matching_metadata.volcano_number`, `oxides.SIO2(WT%)`
- `volcanoes`: `volcano_number`, `country`
- `eruptions`: `volcano_number`, `start_year`, `vei`

---

## Additional Resources

- **MongoDB Atlas Docs**: https://www.mongodb.com/docs/atlas/
- **nginx Documentation**: https://nginx.org/en/docs/
- **pm2 Documentation**: https://pm2.keymetrics.io/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **FastAPI Deployment**: https://fastapi.tiangolo.com/deployment/

---

**Deployment Checklist:**

- [ ] Backend code deployed to server
- [ ] Python dependencies installed
- [ ] `.env` file configured with production credentials
- [ ] pm2 configured and backend running
- [ ] Frontend built and transferred to server
- [ ] nginx installed and configured
- [ ] Site enabled in nginx
- [ ] Firewall configured (ports 80, 443)
- [ ] SSL/TLS certificate obtained (Certbot)
- [ ] Backend health check passing (`/health`)
- [ ] Frontend loads in browser
- [ ] API requests work from frontend
- [ ] Logs are accessible (pm2 logs, nginx logs)
- [ ] Monitoring set up (pm2 monit)
- [ ] Automatic restarts configured (pm2 startup)
- [ ] Backup strategy in place (MongoDB)
- [ ] Documentation reviewed (frontend README, backend README, API examples)

**Congratulations! DashVolcano v3.0 is now live in production.** 🌋🚀

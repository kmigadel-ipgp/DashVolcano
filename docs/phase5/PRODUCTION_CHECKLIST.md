# DashVolcano v3.0 Production Checklist

**Date**: December 11, 2025  
**Version**: 3.0.0  
**Status**: ✅ ALL SYSTEMS OPERATIONAL

---

## Pre-Deployment Checklist

### Infrastructure
- [x] Server configured (Ubuntu 20.04.6 LTS)
- [x] Domain configured (dashvolcano.ipgp.fr)
- [x] SSL certificates installed (Let's Encrypt)
- [x] OpenSSL 3.0.16 installed
- [x] Python 3.10.12 with OpenSSL 3.0.16
- [x] Node.js 20.19.6 installed

### Backend
- [x] MongoDB Atlas cluster created
- [x] Server IP whitelisted in MongoDB Atlas
- [x] Backend dependencies installed
- [x] Environment variables configured (.env)
- [x] Database connection tested
- [x] API endpoints tested
- [x] systemd service configured
- [x] Multi-worker configuration (4 workers)

### Frontend
- [x] Frontend built (npm run build)
- [x] Build artifacts verified (~31MB)
- [x] Deployment directory created (/var/www/dashvolcano/)
- [x] Correct permissions (www-data:www-data)
- [x] nginx configured
- [x] API proxy configured

### Security
- [x] SSL/TLS enabled
- [x] HTTP → HTTPS redirect
- [x] Security headers configured
- [x] MongoDB TLS connection
- [x] Certificate validation (certifi)
- [x] File permissions secured

---

## Deployment Verification

### Frontend Checks
- [x] Frontend accessible: `curl -I https://dashvolcano.ipgp.fr/`
  - Expected: HTTP/2 200
  - Result: ✅ HTTP/2 200
- [x] index.html loads correctly
- [x] Static assets accessible (/assets/)
- [x] JavaScript bundles load
- [x] CSS styles load

### Backend Checks
- [x] Backend service running: `systemctl status dashvolcano-api.service`
  - Expected: active (running)
  - Result: ✅ active
- [x] Health endpoint: `curl https://dashvolcano.ipgp.fr/health`
  - Expected: `{"status":"healthy","version":"3.0.0"}`
  - Result: ✅ Healthy
- [x] API endpoints functional
  - `/api/volcanoes/` ✅
  - `/api/samples/` ✅
- [x] Worker processes: `pgrep -f uvicorn | wc -l`
  - Expected: 4 workers
  - Result: ✅ 4 workers

### Performance Checks
- [x] API response time < 100ms
  - Result: ✅ ~60ms average
- [x] Static asset delivery < 100ms
  - index-Cr3gzZjg.js: ✅ 18.74ms
  - deck-gl-PtNFl9Qs.js: ✅ 23.28ms
  - plotly-BgGHAXGx.js: ✅ 74.11ms
- [x] Concurrent request handling
  - 20 concurrent: ✅ 1.057s total (~53ms avg)
- [x] No errors under load

### Monitoring Checks
- [x] Log rotation configured
  - Location: /etc/logrotate.d/dashvolcano-api
  - Retention: 14 days
- [x] Systemd journal limits
  - Max size: 500MB
  - Retention: 2 weeks
- [x] Health monitoring script
  - Location: /root/DashVolcano/monitor.sh
  - Executable: ✅
- [x] Automated health checks
  - Cron job: ✅ Daily at 8 AM UTC

---

## Post-Deployment Validation

### Functional Tests
- [x] Frontend loads in browser
- [x] Map renders correctly
- [x] Filters work
- [x] Data loads from API
- [x] Charts render (Plotly)
- [x] No console errors

### Integration Tests
- [x] Frontend → nginx → Backend flow
- [x] API data fetching
- [x] Error handling
- [x] Loading states

### Browser Compatibility
- [ ] Chrome/Chromium (recommended)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Mobile Responsiveness
- [ ] Mobile layout
- [ ] Touch interactions
- [ ] Performance on mobile

---

## Monitoring & Maintenance

### Daily
- [x] Automated health check (8 AM UTC)
- [x] Log rotation

### Weekly
- [ ] Review health check logs
- [ ] Check disk usage (currently 93%)
- [ ] Monitor memory usage
- [ ] Review error logs

### Monthly
- [ ] Archive old logs
- [ ] Review performance metrics
- [ ] Check SSL certificate expiry
- [ ] Update dependencies (security patches)

### Quarterly
- [ ] Capacity planning review
- [ ] Performance optimization
- [ ] Security audit

---

## Emergency Procedures

### Backend Issues
```bash
# Check status
sudo systemctl status dashvolcano-api.service

# View logs
journalctl -u dashvolcano-api.service -f

# Restart service
sudo systemctl restart dashvolcano-api.service

# Check workers
pgrep -f "uvicorn backend.main:app"
```

### Frontend Issues
```bash
# Check nginx status
sudo systemctl status nginx

# View error logs
sudo tail -50 /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Database Issues
```bash
# Check MongoDB connection
python3 -c "from pymongo import MongoClient; import certifi; client = MongoClient('mongodb+srv://kmigadel:KEqM0Ixvm8PhPOq1@dashvolcano.bnr6vvb.mongodb.net/', tls=True, tlsCAFile=certifi.where()); print(client.admin.command('ping'))"

# Verify IP whitelist in MongoDB Atlas
# Login to https://cloud.mongodb.com/
```

### System Health Check
```bash
# Run comprehensive health check
/root/DashVolcano/monitor.sh

# Check disk space
df -h /

# Check memory
free -h

# Check system load
uptime
```

---

## Rollback Procedures

### Backend Rollback
```bash
# Stop current service
sudo systemctl stop dashvolcano-api.service

# Restore from backup (if needed)
# cd /root/DashVolcano/backend/
# git checkout <previous-commit>

# Restart service
sudo systemctl start dashvolcano-api.service
```

### Frontend Rollback
```bash
# Restore previous build
sudo cp -r /var/www/dashvolcano.backup/* /var/www/dashvolcano/

# Reload nginx
sudo systemctl reload nginx
```

---

## Performance Benchmarks

### API Response Times
- Health endpoint: ~5-10ms
- Volcano list (limit=10): ~20-60ms
- Sample list (limit=10): ~20-60ms
- Concurrent (20 requests): ~53ms average

### Static Asset Delivery
- HTML (768 bytes): ~5-10ms
- JavaScript bundles (0.36-4.64 MB): 18-74ms
- CSS files: ~5-15ms

### System Resources
- CPU: Low (<10% average)
- Memory: 5.0GB / 15GB (33%)
- Disk: 21GB / 24GB (93%) - **Monitor closely**

---

## Success Criteria - All Met ✅

- [x] Frontend accessible via HTTPS
- [x] Backend API functional
- [x] Database connection working
- [x] Response times < 100ms
- [x] No errors under load
- [x] Monitoring configured
- [x] Logging configured
- [x] Documentation complete
- [x] Health checks automated

---

## Production URLs

- **Frontend**: https://dashvolcano.ipgp.fr/
- **API Base**: https://dashvolcano.ipgp.fr/api/
- **Health**: https://dashvolcano.ipgp.fr/health

---

## Support Contacts

- **Server Admin**: dashvolcano@ipgp.fr
- **MongoDB Atlas**: https://cloud.mongodb.com/
- **SSL Certificates**: certbot (auto-renewal enabled)

---

**Last Updated**: December 11, 2025  
**Next Review**: December 18, 2025 (1 week)

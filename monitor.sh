#!/bin/bash
# DashVolcano Health Monitoring Script

echo "=== DashVolcano Health Check ==="
echo "Date: $(date)"
echo ""

# Check backend service
echo "Backend API Status:"
systemctl is-active dashvolcano-api.service
echo "Workers: $(pgrep -f 'uvicorn backend.main:app' | wc -l)"
echo ""

# Check nginx
echo "Nginx Status:"
systemctl is-active nginx
echo ""

# Check API response
echo "API Health:"
curl -s http://localhost:8000/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"Status: {d['status']}, Version: {d['version']}\")" 2>/dev/null || echo "API not responding"
echo ""

# Check disk usage
echo "Disk Usage:"
df -h / | tail -1 | awk '{print "Used: "$3"/"$2" ("$5")"}'
echo ""

# Check memory
echo "Memory Usage:"
free -h | grep Mem | awk '{print "Used: "$3"/"$2}'
echo ""

# Check recent errors
echo "Recent Backend Errors (last 10):"
journalctl -u dashvolcano-api.service --since "1 hour ago" -p err -n 10 --no-pager | tail -5 || echo "No recent errors"
echo ""

echo "=== Health Check Complete ==="

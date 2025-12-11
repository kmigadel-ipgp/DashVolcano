#!/bin/bash

###############################################################################
# Setup Monitoring Script for DashVolcano PM2 Processes
#
# This script:
# 1. Creates necessary directories
# 2. Installs nodemailer and dependencies
# 3. Makes the monitor script executable
# 4. Sets up a cron job to run the monitor every 5 minutes
# 5. Provides instructions for PM2 ecosystem configuration
#
# Usage: bash setup-monitoring.sh
###############################################################################

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Setting up DashVolcano PM2 Monitoring"
echo "=========================================="
echo ""

# Create logs directory if it doesn't exist
echo "📁 Creating logs directory..."
mkdir -p logs

# Check if node and npm are installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 is not installed globally."
    echo "   Installing PM2..."
    npm install -g pm2
    echo "✅ PM2 installed successfully"
fi

echo "✅ PM2 version: $(pm2 --version)"
echo ""

# Initialize package.json if it doesn't exist
if [ ! -f "package.json" ]; then
    echo "📦 Initializing package.json..."
    npm init -y
fi

# Install dependencies
echo "📦 Installing nodemailer and dotenv..."
npm install nodemailer dotenv

# Make monitor script executable
echo "🔧 Making monitor.js executable..."
chmod +x monitor.js

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo ""
    echo "Please create a .env file with the following variables:"
    echo ""
    echo "SENDER_EMAIL=your-email@ipgp.fr"
    echo "RECEIVER_EMAIL=your-email@ipgp.fr"
    echo ""
    echo "Note: Uses localhost SMTP (port 25) - no password required"
    echo ""
else
    # Check if email variables are set
    if grep -q "SENDER_EMAIL=" .env && grep -q "RECEIVER_EMAIL=" .env; then
        echo "✅ Email configuration found in .env"
    else
        echo "⚠️  Warning: Email variables not properly configured in .env"
        echo "   Please ensure SENDER_EMAIL and RECEIVER_EMAIL are set"
    fi
fi

# Test the monitor script
echo ""
echo "🧪 Testing monitor script..."
node monitor.js

# Setup cron job
echo ""
echo "⏰ Setting up cron job..."

# Create a temporary cron file
CRON_TEMP=$(mktemp)

# Get existing crontab (if any)
crontab -l > "$CRON_TEMP" 2>/dev/null || true

# Check if the cron job already exists
if grep -q "DashVolcano/monitor.js" "$CRON_TEMP"; then
    echo "⚠️  Cron job already exists. Updating..."
    # Remove old entries
    sed -i '/DashVolcano\/monitor.js/d' "$CRON_TEMP"
    sed -i '/Monitor DashVolcano/d' "$CRON_TEMP"
    sed -i '/PATH=.*DashVolcano/d' "$CRON_TEMP"
fi

# Detect PM2 location
PM2_PATH=$(which pm2 2>/dev/null || echo "")
if [ -z "$PM2_PATH" ]; then
    echo "⚠️  Warning: PM2 not found in PATH. Using default location."
    PM2_BIN_DIR="/usr/local/bin"
else
    PM2_BIN_DIR=$(dirname "$PM2_PATH")
    echo "✅ Found PM2 at: $PM2_PATH"
fi

# Add new cron job (runs every 5 minutes) with proper PATH
echo "" >> "$CRON_TEMP"
echo "# Monitor DashVolcano PM2 processes every 5 minutes" >> "$CRON_TEMP"
echo "PATH=${PM2_BIN_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" >> "$CRON_TEMP"
echo "*/5 * * * * cd $SCRIPT_DIR && /usr/bin/node $SCRIPT_DIR/monitor.js >> $SCRIPT_DIR/logs/monitor.log 2>&1" >> "$CRON_TEMP"

# Install the new crontab
crontab "$CRON_TEMP"
rm "$CRON_TEMP"

echo "✅ Cron job installed successfully!"
echo ""

# Display current crontab
echo "📋 Current crontab entries:"
crontab -l | grep -A 1 "DashVolcano" || echo "(No entries found)"
echo ""

# Instructions for stopping systemd service and starting PM2
echo "=========================================="
echo "Migration from systemd to PM2"
echo "=========================================="
echo ""
echo "To migrate from systemd to PM2:"
echo ""
echo "  1. Stop and disable the systemd service:"
echo "     sudo systemctl stop dashvolcano-api.service"
echo "     sudo systemctl disable dashvolcano-api.service"
echo ""
echo "  2. Start with PM2 ecosystem config:"
echo "     pm2 start ecosystem.config.js"
echo ""
echo "  3. Save the PM2 process list:"
echo "     pm2 save"
echo ""
echo "  4. Set up PM2 to start on system boot:"
echo "     pm2 startup"
echo "     (follow the instructions printed by the command above)"
echo ""
echo "  5. Update nginx configuration (if using frontend via PM2):"
echo "     The frontend will now be served on port 3000"
echo "     Update nginx proxy_pass if needed"
echo ""
echo "=========================================="
echo "Useful Commands"
echo "=========================================="
echo ""
echo "  View all PM2 processes:"
echo "    pm2 list"
echo ""
echo "  View logs:"
echo "    pm2 logs dashvolcano-api"
echo "    pm2 logs dashvolcano-frontend"
echo ""
echo "  Restart services:"
echo "    pm2 restart dashvolcano-api"
echo "    pm2 restart dashvolcano-frontend"
echo "    pm2 restart all"
echo ""
echo "  Monitor in real-time:"
echo "    pm2 monit"
echo ""
echo "  View monitoring logs:"
echo "    tail -f logs/monitor.log"
echo ""
echo "  Test email notification manually:"
echo "    node monitor.js"
echo ""
echo "  Stop all processes:"
echo "    pm2 stop all"
echo ""
echo "  Delete all processes:"
echo "    pm2 delete all"
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "The monitoring system will check dashvolcano-api and"
echo "dashvolcano-frontend processes every 5 minutes and send"
echo "an email if any process is not running."
echo ""
echo "Make sure to configure .env with your email settings!"
echo ""

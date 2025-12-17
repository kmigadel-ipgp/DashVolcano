#!/usr/bin/env node

/**
 * DashVolcano PM2 Process Monitor
 * 
 * This script checks if the dashvolcano-api and dashvolcano-frontend PM2 processes
 * are running. If either process is down, it attempts to restart it and sends
 * an email notification.
 * 
 * Usage: node monitor.js
 * Cron: Runs every 5 minutes via crontab
 */

const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'monitor.env') });

// Configuration
const PROCESSES_TO_MONITOR = ['dashvolcano-api']; // Frontend served by nginx as static files
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const RECEIVER_EMAIL = process.env.RECEIVER_EMAIL;

// Logging utility
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Check if PM2 is installed
function checkPM2Installed() {
  return new Promise((resolve) => {
    exec('which pm2', (error, stdout) => {
      if (error || !stdout.trim()) {
        log('❌ ERROR: PM2 is not installed or not in PATH');
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// Get PM2 process list
function getPM2List() {
  return new Promise((resolve, reject) => {
    exec('pm2 jlist', (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to get PM2 list: ${stderr || error.message}`));
        return;
      }
      
      try {
        const processes = JSON.parse(stdout);
        resolve(processes);
      } catch (e) {
        reject(new Error(`Failed to parse PM2 output: ${e.message}`));
      }
    });
  });
}

// Restart a PM2 process
function restartProcess(processName) {
  return new Promise((resolve, reject) => {
    log(`🔄 Attempting to restart ${processName}...`);
    exec(`pm2 restart ${processName}`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to restart ${processName}: ${stderr || error.message}`));
        return;
      }
      log(`✅ Successfully restarted ${processName}`);
      resolve(stdout);
    });
  });
}

// Send email notification
async function sendEmail(subject, body) {
  if (!SENDER_EMAIL || !RECEIVER_EMAIL) {
    log('⚠️  Email addresses not configured in .env file');
    log('   Please set SENDER_EMAIL and RECEIVER_EMAIL');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      /**
       * SMTP server hostname or IP address.
       * 'localhost' is used here for a local SMTP server setup.
       */
      host: "localhost",
      
      /**
       * Port number to connect to the SMTP server.
       * Port 25 is typically used for unencrypted connections.
       */
      port: 25,

      /**
       * Indicates whether to use a secure connection (SSL/TLS).
       * Set to false for port 25 as it does not use SSL/TLS.
       */
      secure: false,

      /**
       * Disables the use of STARTTLS command to upgrade the connection to a secure one.
       * Ignored when 'secure' is set to true.
       */
      ignoreTLS: true,

      /**
       * Enables debug mode to print detailed logs of the SMTP communication.
       * Useful for troubleshooting and debugging.
       */
      debug: true,
    });

    const info = await transporter.sendMail({
      from: `"DashVolcano Monitor" <${SENDER_EMAIL}>`,
      to: RECEIVER_EMAIL,
      subject: subject,
      text: body,
      html: `<pre>${body}</pre>`,
    });

    log(`✅ Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    log(`❌ Failed to send email: ${error.message}`);
    return false;
  }
}

// Main monitoring function
async function monitorProcesses() {
  log('========================================');
  log('DashVolcano PM2 Process Monitor');
  log('========================================');

  // Check if PM2 is installed
  const pm2Installed = await checkPM2Installed();
  if (!pm2Installed) {
    await sendEmail(
      '🚨 DashVolcano Alert: PM2 Not Found',
      'PM2 is not installed or not in PATH on dashvolcano.ipgp.fr\n\nPlease install PM2 or fix the PATH configuration.'
    );
    process.exit(1);
  }

  try {
    // Get PM2 process list
    const processes = await getPM2List();
    
    if (processes.length === 0) {
      log('⚠️  No PM2 processes found');
      await sendEmail(
        '🚨 DashVolcano Alert: No PM2 Processes',
        'No PM2 processes are currently running on dashvolcano.ipgp.fr\n\nPlease start the DashVolcano services:\npm2 start ecosystem.config.js'
      );
      return;
    }

    const downProcesses = [];
    const restartedProcesses = [];

    // Check each monitored process
    for (const processName of PROCESSES_TO_MONITOR) {
      const process = processes.find(p => p.name === processName);
      
      if (!process) {
        log(`❌ Process not found: ${processName}`);
        downProcesses.push({
          name: processName,
          status: 'NOT_FOUND',
          message: 'Process not in PM2 list',
        });
        continue;
      }

      const status = process.pm2_env.status;
      const restarts = process.pm2_env.restart_time;
      const uptime = process.pm2_env.pm_uptime;
      const memory = (process.monit.memory / 1024 / 1024).toFixed(2);
      const cpu = process.monit.cpu;

      log(`📊 ${processName}:`);
      log(`   Status: ${status}`);
      log(`   Restarts: ${restarts}`);
      log(`   Memory: ${memory} MB`);
      log(`   CPU: ${cpu}%`);
      log(`   Uptime: ${new Date(uptime).toISOString()}`);

      if (status !== 'online') {
        log(`❌ ${processName} is ${status}`);
        downProcesses.push({
          name: processName,
          status: status,
          restarts: restarts,
          memory: memory,
          cpu: cpu,
        });

        // Attempt to restart
        try {
          await restartProcess(processName);
          restartedProcesses.push(processName);
        } catch (error) {
          log(`❌ Failed to restart ${processName}: ${error.message}`);
        }
      } else {
        log(`✅ ${processName} is running normally`);
      }
    }

    // Send email if there were issues
    if (downProcesses.length > 0) {
      const timestamp = new Date().toISOString();
      let emailBody = `DashVolcano Process Alert - ${timestamp}\n\n`;
      emailBody += `Server: dashvolcano.ipgp.fr\n\n`;
      emailBody += `The following processes were found down:\n\n`;

      for (const proc of downProcesses) {
        emailBody += `• ${proc.name}\n`;
        emailBody += `  Status: ${proc.status}\n`;
        if (proc.restarts !== undefined) {
          emailBody += `  Previous Restarts: ${proc.restarts}\n`;
        }
        emailBody += `\n`;
      }

      if (restartedProcesses.length > 0) {
        emailBody += `\nRestarted processes:\n`;
        for (const proc of restartedProcesses) {
          emailBody += `• ${proc}\n`;
        }
        emailBody += `\nPlease verify the processes are running correctly:\npm2 list\npm2 logs\n`;
      } else {
        emailBody += `\n⚠️  Failed to automatically restart processes.\n`;
        emailBody += `Please manually investigate:\n`;
        emailBody += `  ssh dashvolcano.ipgp.fr\n`;
        emailBody += `  pm2 list\n`;
        emailBody += `  pm2 logs\n`;
      }

      emailBody += `\nFull status:\npm2 status\n`;

      await sendEmail(
        `🚨 DashVolcano Alert: ${downProcesses.length} Process(es) Down`,
        emailBody
      );
    } else {
      log('✅ All monitored processes are running normally');
    }

  } catch (error) {
    log(`❌ Error during monitoring: ${error.message}`);
    await sendEmail(
      '🚨 DashVolcano Alert: Monitoring Error',
      `An error occurred while monitoring PM2 processes:\n\n${error.message}\n\nServer: dashvolcano.ipgp.fr\nTime: ${new Date().toISOString()}`
    );
  }

  log('========================================');
  log('Monitoring check complete');
  log('========================================');
  log('');
}

// Run the monitor
monitorProcesses().catch((error) => {
  log(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});

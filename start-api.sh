#!/bin/bash
# DashVolcano API Startup Script for PM2

cd /root/DashVolcano
export LD_LIBRARY_PATH=/usr/local/ssl/lib64
export PATH=/root/.pyenv/versions/3.10.12/bin:$PATH

# --timeout-keep-alive: Keep connections alive for 120s
# --timeout-graceful-shutdown: Allow 30s for graceful shutdown
# --workers 4: Use 4 worker processes for better concurrency
exec /root/.pyenv/versions/3.10.12/bin/uvicorn backend.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --timeout-keep-alive 120 \
  --timeout-graceful-shutdown 30

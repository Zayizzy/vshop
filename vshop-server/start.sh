#!/bin/sh
set -e

echo "[vshop] === Container starting ==="
echo "[vshop] Node version: $(node -v)"
echo "[vshop] DATABASE_URL: ${DATABASE_URL:-(NOT SET)}"
echo "[vshop] JWT_SECRET: ${JWT_SECRET:+set (hidden)}"
echo "[vshop] WX_APPID: ${WX_APPID:-(NOT SET)}"

echo "[vshop] Running prisma migrate deploy..."
npx prisma migrate deploy || {
  echo "[vshop] ❌ prisma migrate deploy FAILED"
  echo "[vshop] Possible causes:"
  echo "[vshop]   1. DATABASE_URL not configured or incorrect"
  echo "[vshop]   2. MySQL not reachable (use internal IP, not public IP)"
  echo "[vshop]   3. MySQL credentials wrong"
  echo "[vshop]   4. Database 'vshop' does not exist yet"
  exit 1
}

echo "[vshop] ✅ migrations applied successfully"
echo "[vshop] Starting application..."
node dist/main.js

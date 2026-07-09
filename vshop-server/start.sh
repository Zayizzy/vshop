#!/bin/sh
set -e

echo "[vshop] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[vshop] Starting application..."
node dist/main.js

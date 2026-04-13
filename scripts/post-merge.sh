#!/bin/bash
set -e
pnpm install --frozen-lockfile

if [ "$REPLIT_DEPLOYMENT" = "1" ]; then
  echo "Skipping schema push in production deployment (use explicit migration)"
else
  pnpm --filter @workspace/db run push-force
fi

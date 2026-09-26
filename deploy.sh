#!/usr/bin/env bash
set -e
echo "[deploy.sh] SafeOpenSource Production Rebuild & Deploy Triggered"
echo "[deploy.sh] Running astro build..."
npm run build
echo "[deploy.sh] Build completed successfully. Assets generated in dist/."

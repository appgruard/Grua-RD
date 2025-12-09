#!/bin/bash
# Prepare iOS project for Driver app
# Usage: ./scripts/build-conductor-ios.sh

set -e

echo "==========================================="
echo "  Preparing Grua RD Conductor for iOS"
echo "==========================================="

# Set production environment
export NODE_ENV=production

# VITE_ variables must be set for the frontend build
# These get embedded in the compiled JavaScript bundle
export VITE_API_URL=${VITE_API_URL:-"https://app.gruard.com"}
export VITE_MAPBOX_ACCESS_TOKEN=${VITE_MAPBOX_ACCESS_TOKEN:-""}
export VITE_VAPID_PUBLIC_KEY=${VITE_VAPID_PUBLIC_KEY:-""}

# Validate required environment variables
if [ -z "$VITE_MAPBOX_ACCESS_TOKEN" ]; then
    echo "WARNING: VITE_MAPBOX_ACCESS_TOKEN is not set. Maps may not work correctly."
fi

if [ -z "$VITE_VAPID_PUBLIC_KEY" ]; then
    echo "WARNING: VITE_VAPID_PUBLIC_KEY is not set. Push notifications may not work."
fi

echo ""
echo "Environment:"
echo "  NODE_ENV: $NODE_ENV"
echo "  VITE_API_URL: $VITE_API_URL"
echo "  VITE_MAPBOX_ACCESS_TOKEN: ${VITE_MAPBOX_ACCESS_TOKEN:0:20}..."
echo "  VITE_VAPID_PUBLIC_KEY: ${VITE_VAPID_PUBLIC_KEY:0:20}..."
echo ""

# Run the build script
npx tsx scripts/build-mobile-app.ts conductor ios

echo ""
echo "==========================================="
echo "  iOS project prepared!"
echo "==========================================="
echo "Open in Xcode: npx cap open ios"
echo "Bundle ID: com.fouronesolutions.gruard.conductor"

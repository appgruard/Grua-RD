#!/bin/bash
# Prepare iOS project for Client app
# Usage: ./scripts/build-cliente-ios.sh

set -e

echo "🍎 Preparing Grúa RD Cliente for iOS..."

# Set production environment
export NODE_ENV=production
export VITE_API_URL=${VITE_API_URL:-"https://gruard.app"}

# Run the build script
npx tsx scripts/build-mobile-app.ts cliente ios

echo "✅ iOS project prepared!"
echo "📱 Open in Xcode: npx cap open ios"
echo "📦 Bundle ID: com.fouronesolutions.gruard.cliente"

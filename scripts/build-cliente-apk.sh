#!/bin/bash
# Build APK for Client app
# Usage: ./scripts/build-cliente-apk.sh

set -e

echo "🚀 Building Grúa RD Cliente APK..."

# Set production environment
export NODE_ENV=production
export VITE_API_URL=${VITE_API_URL:-"https://app.gruard.com"}

# Run the build script
npx tsx scripts/build-mobile-app.ts cliente android

echo "✅ Build completed!"
echo "📦 APK location: android/app/build/outputs/apk/"

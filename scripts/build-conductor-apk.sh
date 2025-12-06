#!/bin/bash
# Build APK for Driver app
# Usage: ./scripts/build-conductor-apk.sh

set -e

echo "🚀 Building Grúa RD Conductor APK..."

# Set production environment
export NODE_ENV=production
export VITE_API_URL=${VITE_API_URL:-"https://gruard.app"}

# Run the build script
npx tsx scripts/build-mobile-app.ts conductor android

echo "✅ Build completed!"
echo "📦 APK location: android/app/build/outputs/apk/"

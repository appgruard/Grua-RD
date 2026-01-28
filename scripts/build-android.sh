#!/bin/bash
set -e

echo "🔧 Building Grúa RD Android APK/AAB"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Change to project root
cd "$(dirname "$0")/.."

# Build type (debug or release)
BUILD_TYPE="${1:-debug}"

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}🏗️ Building web assets...${NC}"
npm run build

echo -e "${YELLOW}📱 Syncing Capacitor...${NC}"
npx cap sync android

echo -e "${YELLOW}🔨 Building Android ${BUILD_TYPE}...${NC}"
cd android

if [ "$BUILD_TYPE" == "release" ]; then
    # Check for signing configuration
    if [ -z "$ANDROID_KEYSTORE_PATH" ]; then
        echo -e "${RED}❌ Error: ANDROID_KEYSTORE_PATH not set${NC}"
        echo "Please set the following environment variables for release builds:"
        echo "  - ANDROID_KEYSTORE_PATH"
        echo "  - ANDROID_KEYSTORE_PASSWORD"
        echo "  - ANDROID_KEY_ALIAS"
        echo "  - ANDROID_KEY_PASSWORD"
        exit 1
    fi
    
    echo -e "${YELLOW}🔐 Building signed release APK and AAB...${NC}"
    ./gradlew assembleRelease bundleRelease
    
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
    
    echo -e "${GREEN}✅ Release build complete!${NC}"
    echo -e "APK: ${APK_PATH}"
    echo -e "AAB: ${AAB_PATH}"
else
    echo -e "${YELLOW}🔨 Building debug APK...${NC}"
    ./gradlew assembleDebug
    
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    
    echo -e "${GREEN}✅ Debug build complete!${NC}"
    echo -e "APK: ${APK_PATH}"
fi

cd ..
echo -e "${GREEN}🎉 Android build finished successfully!${NC}"

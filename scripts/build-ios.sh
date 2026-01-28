#!/bin/bash
set -e

echo "🔧 Building Grúa RD iOS IPA"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Change to project root
cd "$(dirname "$0")/.."

# Build type (debug or release)
BUILD_TYPE="${1:-debug}"
SCHEME="App"
WORKSPACE="ios/App/App.xcworkspace"
PROJECT="ios/App/App.xcodeproj"

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}🏗️ Building web assets...${NC}"
npm run build

echo -e "${YELLOW}📱 Syncing Capacitor...${NC}"
npx cap sync ios

echo -e "${YELLOW}📦 Installing CocoaPods dependencies...${NC}"
cd ios/App
if command -v pod &> /dev/null; then
    pod install
else
    echo -e "${RED}⚠️ CocoaPods not installed. Skipping pod install.${NC}"
    echo "Install CocoaPods with: sudo gem install cocoapods"
fi
cd ../..

echo -e "${YELLOW}🔨 Building iOS ${BUILD_TYPE}...${NC}"

if [ "$BUILD_TYPE" == "release" ]; then
    # Check for signing configuration
    if [ -z "$IOS_TEAM_ID" ]; then
        echo -e "${YELLOW}⚠️ IOS_TEAM_ID not set. Manual signing may be required.${NC}"
    fi
    
    # Archive for release
    echo -e "${YELLOW}📦 Creating archive...${NC}"
    
    xcodebuild \
        -project "$PROJECT" \
        -scheme "$SCHEME" \
        -configuration Release \
        -archivePath "build/GruaRD.xcarchive" \
        -allowProvisioningUpdates \
        clean archive
    
    # Export IPA
    echo -e "${YELLOW}📦 Exporting IPA...${NC}"
    
    cat > ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
EOF
    
    xcodebuild \
        -exportArchive \
        -archivePath "build/GruaRD.xcarchive" \
        -exportPath "build/ipa" \
        -exportOptionsPlist "ExportOptions.plist" \
        -allowProvisioningUpdates
    
    rm ExportOptions.plist
    
    echo -e "${GREEN}✅ Release build complete!${NC}"
    echo -e "IPA: build/ipa/GruaRD.ipa"
else
    # Build for simulator (debug)
    echo -e "${YELLOW}🔨 Building for simulator...${NC}"
    
    xcodebuild \
        -project "$PROJECT" \
        -scheme "$SCHEME" \
        -configuration Debug \
        -destination 'platform=iOS Simulator,name=iPhone 15' \
        build
    
    echo -e "${GREEN}✅ Debug build complete!${NC}"
fi

echo -e "${GREEN}🎉 iOS build finished successfully!${NC}"

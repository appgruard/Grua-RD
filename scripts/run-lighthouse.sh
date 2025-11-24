#!/bin/bash

echo "🔍 Grúa RD - Lighthouse Audit"
echo "======================================"
echo ""

if ! command -v lighthouse &> /dev/null; then
    echo "❌ Lighthouse CLI not installed"
    echo ""
    echo "Install with:"
    echo "  npm install -g lighthouse"
    exit 1
fi

URL="${1:-http://localhost:5000}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="lighthouse-reports"

mkdir -p "$OUTPUT_DIR"

echo "📊 Running Lighthouse audit on: $URL"
echo ""

echo "1️⃣  Mobile audit..."
lighthouse "$URL" \
  --preset=mobile \
  --emulated-form-factor=mobile \
  --output=html \
  --output=json \
  --output-path="$OUTPUT_DIR/mobile_${TIMESTAMP}" \
  --chrome-flags="--headless" \
  --quiet

echo ""
echo "2️⃣  Desktop audit..."
lighthouse "$URL" \
  --preset=desktop \
  --emulated-form-factor=desktop \
  --output=html \
  --output=json \
  --output-path="$OUTPUT_DIR/desktop_${TIMESTAMP}" \
  --chrome-flags="--headless" \
  --quiet

echo ""
echo "✅ Audits complete!"
echo ""
echo "📂 Reports saved to:"
echo "   - $OUTPUT_DIR/mobile_${TIMESTAMP}.html"
echo "   - $OUTPUT_DIR/desktop_${TIMESTAMP}.html"
echo ""
echo "Open in browser:"
echo "   open $OUTPUT_DIR/mobile_${TIMESTAMP}.html"
echo ""

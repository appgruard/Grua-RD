#!/bin/bash

set -e

echo "🏗️  Building Grúa RD for Production"
echo "===================================="
echo ""

echo "📋 Step 1: Type Checking..."
npm run check

echo ""
echo "📦 Step 2: Building Frontend & Backend..."
npm run build

echo ""
echo "✅ Build Complete!"
echo ""
echo "📂 Output:"
echo "   - Frontend: dist/public/"
echo "   - Backend:  dist/index.js"
echo ""
echo "🚀 To start production server:"
echo "   npm start"
echo ""

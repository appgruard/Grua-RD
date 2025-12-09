#!/usr/bin/env node

/**
 * Patches react-map-gl package.json to add the missing "." export
 * This is needed because react-map-gl v8.x doesn't export a root entry,
 * which causes Vite/Rollup to fail when it's listed in manualChunks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, '..', 'node_modules', 'react-map-gl', 'package.json');

try {
  // Check if the file exists
  if (!fs.existsSync(packageJsonPath)) {
    console.log('react-map-gl not installed yet, skipping patch');
    process.exit(0);
  }

  // Read the package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Check if already patched
  if (packageJson.exports && packageJson.exports['.']) {
    console.log('react-map-gl already patched');
    process.exit(0);
  }

  // Add the "." export pointing to mapbox (same as ./mapbox)
  if (!packageJson.exports) {
    packageJson.exports = {};
  }

  packageJson.exports = {
    '.': {
      types: './dist/mapbox.d.ts',
      require: './dist/mapbox.cjs',
      import: './dist/mapbox.js'
    },
    ...packageJson.exports
  };

  // Write back
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Successfully patched react-map-gl package.json');

} catch (error) {
  console.error('Error patching react-map-gl:', error.message);
  // Don't fail the build if patch fails - it might work anyway
  process.exit(0);
}

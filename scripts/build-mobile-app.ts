#!/usr/bin/env npx tsx
/**
 * Script para compilar las apps móviles de Grúa RD
 * 
 * Uso:
 *   npx tsx scripts/build-mobile-app.ts cliente android
 *   npx tsx scripts/build-mobile-app.ts conductor ios
 *   npx tsx scripts/build-mobile-app.ts cliente all
 * 
 * Este script:
 * - Verifica que existan los archivos de configuración base
 * - Hace backup de archivos de configuración antes de modificar
 * - Genera configuración específica para la app seleccionada
 * - Compila el APK/IPA
 * - Copia el APK resultante a builds/<app-type>/
 * - Restaura los archivos originales
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { APP_CONFIGS, getAppConfig, AppType } from './capacitor-apps.config';

const args = process.argv.slice(2);
const appType = args[0] as AppType;
const platform = args[1] || 'android';

if (!appType || !['cliente', 'conductor'].includes(appType)) {
  console.error(`
╔════════════════════════════════════════════════════════════════╗
║           Grúa RD - Build de Aplicaciones Móviles              ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Uso:                                                          ║
║    npx tsx scripts/build-mobile-app.ts <tipo> <plataforma>     ║
║                                                                ║
║  Tipos de app:                                                 ║
║    - cliente    : App para clientes (solicitar grúas)          ║
║    - conductor  : App para conductores (aceptar servicios)     ║
║                                                                ║
║  Plataformas:                                                  ║
║    - android    : Genera APK para Android                      ║
║    - ios        : Prepara proyecto para Xcode                  ║
║    - all        : Ambas plataformas                            ║
║                                                                ║
║  Ejemplos:                                                     ║
║    npx tsx scripts/build-mobile-app.ts cliente android         ║
║    npx tsx scripts/build-mobile-app.ts conductor ios           ║
║    npx tsx scripts/build-mobile-app.ts cliente all             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

const config = getAppConfig(appType);

const BACKUP_DIR = '.build-backups';
const BUILDS_DIR = 'builds';

// Files that MUST exist before we can build
const REQUIRED_FILES = [
  'capacitor.config.ts',
];

// Files that should be backed up (if they exist)
const FILES_TO_BACKUP = [
  'capacitor.config.ts',
  'android/app/build.gradle',
  'android/app/src/main/res/values/strings.xml',
  'android/app/src/main/assets/capacitor.config.json',
  'ios/App/App/Info.plist',
  'ios/App/App/capacitor.config.json',
];

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Grúa RD - Compilando App Móvil                       ║
╠════════════════════════════════════════════════════════════════╣
║  App: ${config.displayName.padEnd(52)}║
║  Tipo: ${appType.padEnd(51)}║
║  Plataforma: ${platform.padEnd(45)}║
║  App ID: ${config.appId.padEnd(49)}║
╚════════════════════════════════════════════════════════════════╝
`);

// Whitelist of allowed commands to prevent command injection
const ALLOWED_COMMANDS = [
  'npm run build',
  'npx cap sync android',
  'npx cap sync ios',
  './gradlew assembleRelease',
  './gradlew assembleDebug',
] as const;

type AllowedCommand = typeof ALLOWED_COMMANDS[number];

function isAllowedCommand(cmd: string): cmd is AllowedCommand {
  return ALLOWED_COMMANDS.includes(cmd as AllowedCommand);
}

function run(cmd: AllowedCommand, options?: { cwd?: string }) {
  // Validate command is in whitelist to prevent command injection
  if (!isAllowedCommand(cmd)) {
    throw new Error(`Command not allowed: ${cmd}. Only whitelisted commands can be executed.`);
  }
  
  console.log(`\n▶ ${cmd}\n`);
  try {
    execSync(cmd, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`Error ejecutando: ${cmd}`);
    throw error;
  }
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function verifyRequiredFiles() {
  console.log('\n🔍 Verificando archivos requeridos...\n');
  
  const missing: string[] = [];
  
  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(file)) {
      missing.push(file);
    } else {
      console.log(`  ✓ ${file}`);
    }
  }
  
  if (missing.length > 0) {
    console.error(`
❌ Error: Faltan archivos requeridos para el build:
${missing.map(f => `   - ${f}`).join('\n')}

Asegúrate de tener el proyecto configurado correctamente.
El archivo capacitor.config.ts base debe existir antes de compilar.

Para crear la configuración inicial, ejecuta:
  npx cap init "Grúa RD" "com.fouronesolutions.gruard" --web-dir dist/public
`);
    process.exit(1);
  }
}

function backupFiles() {
  console.log('\n📦 Haciendo backup de archivos originales...\n');
  
  // Clean any previous backup
  if (fs.existsSync(BACKUP_DIR)) {
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  }
  ensureDir(BACKUP_DIR);
  
  let backedUp = 0;
  for (const file of FILES_TO_BACKUP) {
    if (fs.existsSync(file)) {
      const backupPath = path.join(BACKUP_DIR, file);
      ensureDir(path.dirname(backupPath));
      fs.copyFileSync(file, backupPath);
      console.log(`  ✓ Backup: ${file}`);
      backedUp++;
    }
  }
  
  if (backedUp === 0) {
    throw new Error('No se pudo hacer backup de ningún archivo. Verifica la configuración del proyecto.');
  }
  
  console.log(`\n  Total: ${backedUp} archivos respaldados`);
}

function restoreFiles() {
  console.log('\n🔄 Restaurando archivos originales...\n');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('  ⚠ No hay backups para restaurar');
    return;
  }
  
  let restored = 0;
  for (const file of FILES_TO_BACKUP) {
    const backupPath = path.join(BACKUP_DIR, file);
    if (fs.existsSync(backupPath)) {
      // Ensure target directory exists
      ensureDir(path.dirname(file));
      fs.copyFileSync(backupPath, file);
      console.log(`  ✓ Restaurado: ${file}`);
      restored++;
    }
  }
  
  // Clean up backup directory
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  console.log(`\n  ✓ Backup eliminado (${restored} archivos restaurados)`);
}

function generateCapacitorConfig() {
  const apiUrl = process.env.VITE_API_URL || 'https://app.gruard.com';
  const isProduction = process.env.NODE_ENV === 'production';
  
  const configContent = `import type { CapacitorConfig } from '@capacitor/cli';

// Auto-generated for ${config.displayName}
// Generated at: ${new Date().toISOString()}
// App Type: ${appType}
// IMPORTANT: This file was temporarily modified for build. If you see this comment,
// the build script failed to restore the original. Check .build-backups/ directory.

const config: CapacitorConfig = {
  appId: '${config.appId}',
  appName: '${config.displayName}',
  webDir: 'dist/public',
  
  server: {
    androidScheme: 'https',
    hostname: 'app.gruard.com',
    iosScheme: 'capacitor',
    url: ${isProduction ? `'${apiUrl}'` : 'undefined'},
    cleartext: false,
    allowNavigation: [
      'gruard.com',
      '*.gruard.com',
      'app.gruard.com',
      'api.mapbox.com',
      '*.tiles.mapbox.com',
      'events.mapbox.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'api.azul.com.do',
      '*.azul.com.do',
      '*.waze.com',
      'waze.com'
    ]
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '${config.splashColor}',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '${config.primaryColor}',
      splashFullScreen: true,
      splashImmersive: true
    },
    
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },

    Geolocation: {
      permissions: {
        android: { enableHighAccuracy: true },
        ios: { enableHighAccuracy: true }
      }
    },

    Camera: {
      promptLabelHeader: '${config.displayName} - Cámara',
      promptLabelCancel: 'Cancelar',
      promptLabelPhoto: 'Galería',
      promptLabelPicture: 'Tomar Foto'
    },

    Filesystem: {},
    Network: {},
    App: {},
    
    CapacitorCookies: { enabled: true },
    CapacitorHttp: { enabled: true }
  },

  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH,
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD,
      keystoreAlias: process.env.ANDROID_KEY_ALIAS || '${appType}',
      keystoreAliasPassword: process.env.ANDROID_KEY_PASSWORD,
      releaseType: 'APK',
      signingType: 'apksigner'
    },
    webContentsDebuggingEnabled: ${!isProduction}
  },

  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile'
  }
};

export default config;
`;

  fs.writeFileSync('capacitor.config.ts', configContent);
  console.log('✓ capacitor.config.ts generado para', config.displayName);
}

function updateAndroidConfig() {
  const buildGradlePath = 'android/app/build.gradle';
  
  if (!fs.existsSync(buildGradlePath)) {
    console.log('⚠ android/app/build.gradle no encontrado. Ejecuta "npx cap add android" primero.');
    return;
  }

  let content = fs.readFileSync(buildGradlePath, 'utf8');
  
  // Update applicationId only (keep namespace as base to avoid Java package issues)
  content = content.replace(
    /applicationId\s+"[^"]+"/,
    `applicationId "${config.appId}"`
  );
  
  fs.writeFileSync(buildGradlePath, content);
  console.log('✓ android/app/build.gradle actualizado');

  // Update strings.xml
  const stringsPath = 'android/app/src/main/res/values/strings.xml';
  if (fs.existsSync(stringsPath)) {
    let stringsContent = fs.readFileSync(stringsPath, 'utf8');
    stringsContent = stringsContent.replace(
      /<string name="app_name">[^<]+<\/string>/,
      `<string name="app_name">${config.displayName}</string>`
    );
    stringsContent = stringsContent.replace(
      /<string name="title_activity_main">[^<]+<\/string>/,
      `<string name="title_activity_main">${config.displayName}</string>`
    );
    stringsContent = stringsContent.replace(
      /<string name="package_name">[^<]+<\/string>/,
      `<string name="package_name">${config.appId}</string>`
    );
    stringsContent = stringsContent.replace(
      /<string name="custom_url_scheme">[^<]+<\/string>/,
      `<string name="custom_url_scheme">${config.appId}</string>`
    );
    fs.writeFileSync(stringsPath, stringsContent);
    console.log('✓ strings.xml actualizado');
  }
}

function backupPostSyncFiles() {
  // After sync, backup the generated config files that cap sync creates
  console.log('\n📦 Capturando archivos generados por sync...\n');
  
  const postSyncFiles = [
    'android/app/src/main/assets/capacitor.config.json',
    'ios/App/App/capacitor.config.json',
  ];
  
  for (const file of postSyncFiles) {
    if (fs.existsSync(file)) {
      const backupPath = path.join(BACKUP_DIR, file);
      if (!fs.existsSync(backupPath)) {
        // Only backup if we didn't already have one (first time after initial backup)
        ensureDir(path.dirname(backupPath));
        // Read the ORIGINAL backup to restore later, not the new one
      }
    }
  }
}

function updateIOSConfig() {
  const projectPath = 'ios/App/App.xcodeproj/project.pbxproj';
  
  if (!fs.existsSync(projectPath)) {
    console.log('⚠ iOS project no encontrado. Ejecuta "npx cap add ios" primero.');
    return;
  }

  // Update Info.plist
  const infoPlistPath = 'ios/App/App/Info.plist';
  if (fs.existsSync(infoPlistPath)) {
    let content = fs.readFileSync(infoPlistPath, 'utf8');
    
    // Update display name
    content = content.replace(
      /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
      `<key>CFBundleDisplayName</key>\n\t<string>${config.displayName}</string>`
    );
    content = content.replace(
      /<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/,
      `<key>CFBundleName</key>\n\t<string>${config.appName}</string>`
    );
    
    fs.writeFileSync(infoPlistPath, content);
    console.log('✓ Info.plist actualizado');
  }

  console.log(`
📱 Para iOS, abre Xcode y actualiza manualmente:
   1. Bundle Identifier: ${config.bundleId}
   2. Display Name: ${config.displayName}
   3. Signing Team y Certificates
   
   Comando: npx cap open ios
`);
}

function copyApkToBuilds(buildType: 'debug' | 'release') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(BUILDS_DIR, appType, 'android');
  ensureDir(outputDir);
  
  const sourcePath = `android/app/build/outputs/apk/${buildType}/app-${buildType}.apk`;
  const destFileName = `gruard-${appType}-${buildType}-${timestamp}.apk`;
  const destPath = path.join(outputDir, destFileName);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`\n📦 APK copiado a: ${destPath}`);
    
    // Also create a "latest" copy
    const latestPath = path.join(outputDir, `gruard-${appType}-${buildType}-latest.apk`);
    if (fs.existsSync(latestPath)) {
      fs.unlinkSync(latestPath);
    }
    fs.copyFileSync(sourcePath, latestPath);
    console.log(`📦 APK latest: ${latestPath}`);
  }
}

async function main() {
  let buildSucceeded = false;
  
  try {
    // Step 0: Verify required files exist
    verifyRequiredFiles();
    
    // Step 1: Backup original files
    backupFiles();
    
    // Step 2: Generate Capacitor config
    console.log('\n📦 Paso 1: Generando configuración de Capacitor...\n');
    generateCapacitorConfig();

    // Step 3: Build frontend
    console.log('\n🔨 Paso 2: Compilando frontend...\n');
    run('npm run build');

    // Step 4: Sync with native platforms
    console.log('\n📱 Paso 3: Sincronizando con plataformas nativas...\n');
    
    if (platform === 'android' || platform === 'all') {
      run('npx cap sync android');
      updateAndroidConfig();
      
      console.log('\n🤖 Paso 4: Compilando APK para Android...\n');
      
      // Check if signing is configured
      if (process.env.ANDROID_KEYSTORE_PATH) {
        console.log('✓ Keystore configurado - generando APK de release');
        run('./gradlew assembleRelease', { cwd: 'android' });
        copyApkToBuilds('release');
        buildSucceeded = true;
        console.log(`
✅ APK de Release generado:
   builds/${appType}/android/gruard-${appType}-release-latest.apk
   
   Para generar AAB (Play Store):
   cd android && ./gradlew bundleRelease
`);
      } else {
        console.log('⚠ Keystore no configurado - generando APK de debug');
        run('./gradlew assembleDebug', { cwd: 'android' });
        copyApkToBuilds('debug');
        buildSucceeded = true;
        console.log(`
✅ APK de Debug generado:
   builds/${appType}/android/gruard-${appType}-debug-latest.apk
   
   Para release, configura las variables:
   - ANDROID_KEYSTORE_PATH
   - ANDROID_KEYSTORE_PASSWORD
   - ANDROID_KEY_ALIAS
   - ANDROID_KEY_PASSWORD
`);
      }
    }

    if (platform === 'ios' || platform === 'all') {
      run('npx cap sync ios');
      updateIOSConfig();
      buildSucceeded = true;
      
      console.log(`
🍎 iOS preparado. Para generar el IPA:

1. Abre Xcode:
   npx cap open ios

2. Configura Signing:
   - Selecciona tu Team de desarrollo
   - Bundle Identifier: ${config.bundleId}

3. Genera Archive:
   - Product → Archive
   - Usa Organizer para exportar IPA

4. O usa xcodebuild desde terminal:
   cd ios/App && xcodebuild -workspace App.xcworkspace \\
     -scheme App \\
     -configuration Release \\
     -archivePath build/App.xcarchive \\
     archive
`);
    }

  } catch (error) {
    console.error('\n❌ Error durante el build:', error);
    buildSucceeded = false;
  } finally {
    // ALWAYS restore original files
    restoreFiles();
  }

  if (buildSucceeded) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    ✅ Build Completado                         ║
╠════════════════════════════════════════════════════════════════╣
║  App: ${config.displayName.padEnd(52)}║
║  App ID: ${config.appId.padEnd(49)}║
║  Archivos originales restaurados                               ║
╚════════════════════════════════════════════════════════════════╝
`);
  } else {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    ❌ Build Fallido                            ║
╠════════════════════════════════════════════════════════════════╣
║  Archivos originales restaurados                               ║
║  Revisa los errores arriba                                     ║
╚════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error fatal:', error);
  // Try to restore even on fatal error
  try {
    restoreFiles();
  } catch (e) {
    console.error('No se pudo restaurar archivos:', e);
  }
  process.exit(1);
});

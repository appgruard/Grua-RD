# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║                  GRÚA RD - BUILD WIZARD PARA WINDOWS                           ║
# ║                  Compila tu app Android en 5 pasos simples                     ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

# Colores para el terminal
$colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
    Title = "Magenta"
}

function Write-Header {
    param([string]$text)
    Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor $colors.Title
    Write-Host "║ $($text.PadRight(36)) ║" -ForegroundColor $colors.Title
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor $colors.Title
}

function Write-Step {
    param([int]$step, [string]$text)
    Write-Host "`n[PASO $step] $text" -ForegroundColor $colors.Info
}

function Write-Success {
    param([string]$text)
    Write-Host "✓ $text" -ForegroundColor $colors.Success
}

function Write-Error-Custom {
    param([string]$text)
    Write-Host "✗ $text" -ForegroundColor $colors.Error
}

function Check-Command {
    param([string]$command, [string]$name)
    try {
        $result = & $command 2>&1
        Write-Success "$name instalado"
        return $true
    } catch {
        Write-Error-Custom "$name NO está instalado"
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# INICIO
# ═══════════════════════════════════════════════════════════════════════════════

Write-Header "WIZARD DE COMPILACIÓN - GRÚA RD"

Write-Host @"
Este wizard automatiza todo el proceso de compilación para Android.

🎯 Lo que haremos:
   1. Verificar herramientas instaladas
   2. Instalar dependencias npm
   3. Compilar aplicación web
   4. Sincronizar con Capacitor
   5. Abrir Android Studio

Tiempo estimado: 5-10 minutos

"@ -ForegroundColor $colors.Info

$continue = Read-Host "¿Comenzamos? (s/n)"
if ($continue -ne "s" -and $continue -ne "S") {
    Write-Host "Cancelado." -ForegroundColor $colors.Warning
    exit
}

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 1: VERIFICAR HERRAMIENTAS
# ═══════════════════════════════════════════════════════════════════════════════

Write-Step 1 "Verificando herramientas instaladas..."

$tools_ok = $true

# Node.js
if (Check-Command "node --version" "Node.js") {
    $node_version = node --version
    Write-Host "  Versión: $node_version" -ForegroundColor Gray
} else {
    $tools_ok = $false
    Write-Host "  Descarga desde: https://nodejs.org/" -ForegroundColor $colors.Warning
}

# NPM
if (Check-Command "npm --version" "NPM") {
    $npm_version = npm --version
    Write-Host "  Versión: $npm_version" -ForegroundColor Gray
} else {
    $tools_ok = $false
}

# Java
if (Check-Command "java -version" "Java") {
    Write-Host "  Versión: (mira arriba)" -ForegroundColor Gray
} else {
    $tools_ok = $false
    Write-Host "  Descarga desde: https://www.oracle.com/java/technologies/downloads/#java17" -ForegroundColor $colors.Warning
}

# Android SDK
if (Test-Path $env:ANDROID_HOME) {
    Write-Success "Android SDK encontrado"
    Write-Host "  Ruta: $env:ANDROID_HOME" -ForegroundColor Gray
} else {
    Write-Error-Custom "Android SDK NO configurado"
    $tools_ok = $false
    Write-Host "  Configura ANDROID_HOME en Variables de Entorno" -ForegroundColor $colors.Warning
}

# ADB
if (Check-Command "adb --version" "Android Debug Bridge") {
    Write-Host "  (Necesario para instalar en teléfono)" -ForegroundColor Gray
} else {
    Write-Error-Custom "ADB NO está disponible - pero puedes continuar"
}

if (-not $tools_ok) {
    Write-Host "`n" -ForegroundColor $colors.Error
    Write-Error-Custom "Faltan herramientas requeridas"
    Write-Host "Por favor, descarga e instala las herramientas faltantes, luego ejecuta este script de nuevo." -ForegroundColor $colors.Warning
    exit
}

Write-Success "Todas las herramientas están instaladas"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 2: INSTALAR DEPENDENCIAS
# ═══════════════════════════════════════════════════════════════════════════════

Write-Step 2 "Instalando dependencias npm..."

Write-Host "Ejecutando: npm install" -ForegroundColor Gray
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "npm install falló"
    $retry = Read-Host "¿Reintentar? (s/n)"
    if ($retry -eq "s" -or $retry -eq "S") {
        npm install
        if ($LASTEXITCODE -ne 0) {
            exit
        }
    } else {
        exit
    }
}

Write-Success "Dependencias instaladas"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 3: COMPILAR APLICACIÓN WEB
# ═══════════════════════════════════════════════════════════════════════════════

Write-Step 3 "Compilando aplicación web..."

Write-Host "Ejecutando: npm run build" -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "npm run build falló"
    exit
}

Write-Success "Aplicación compilada (dist/public/)"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 4: SINCRONIZAR CON CAPACITOR
# ═══════════════════════════════════════════════════════════════════════════════

Write-Step 4 "Sincronizando con Capacitor..."

Write-Host "Ejecutando: npx cap sync" -ForegroundColor Gray
npx cap sync

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "npx cap sync falló"
    exit
}

Write-Success "Capacitor sincronizado"

# ═══════════════════════════════════════════════════════════════════════════════
# PASO 5: ABRIR ANDROID STUDIO
# ═══════════════════════════════════════════════════════════════════════════════

Write-Step 5 "Preparando para abrir Android Studio..."

Write-Host "Ejecutando: npx cap open android" -ForegroundColor Gray
npx cap open android

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "npx cap open android falló"
    Write-Host "Intenta abrir manualmente: android/" -ForegroundColor $colors.Warning
    exit
}

# ═══════════════════════════════════════════════════════════════════════════════
# RESUMEN
# ═══════════════════════════════════════════════════════════════════════════════

Write-Header "¡WIZARD COMPLETADO!"

Write-Host @"
✓ Dependencias instaladas
✓ Aplicación compilada
✓ Capacitor sincronizado
✓ Android Studio abierto

📱 PRÓXIMOS PASOS EN ANDROID STUDIO:

1. Espera a que Gradle termine de sincronizar
2. Ve a: Build → Build Bundle(s) / APK(s) → Build APK(s)
3. Espera a que se compile (2-5 minutos)
4. Cuando termine, verás la ruta del APK

🚀 Para instalar en teléfono (conectado por USB):
   adb install android/app/build/outputs/apk/debug/app-debug.apk

📚 Para más información:
   - Lee: SETUP_WINDOWS_BUILD.md
   - Capítulo: "PASO 7: Compilar Android APK"

" -ForegroundColor $colors.Success

Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

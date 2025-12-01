# Grua RD - Build Wizard para Windows
# Compila tu app Android en 5 pasos simples

$colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
    Title = "Magenta"
}

function Write-Header {
    param([string]$text)
    Write-Host "`n=====================================" -ForegroundColor $colors.Title
    Write-Host "  $text" -ForegroundColor $colors.Title
    Write-Host "=====================================" -ForegroundColor $colors.Title
}

function Write-Step {
    param([int]$step, [string]$text)
    Write-Host "`n[PASO $step] $text" -ForegroundColor $colors.Info
}

function Write-Success {
    param([string]$text)
    Write-Host "OK: $text" -ForegroundColor $colors.Success
}

function Write-Error-Custom {
    param([string]$text)
    Write-Host "ERROR: $text" -ForegroundColor $colors.Error
}

function Check-Command {
    param([string]$command, [string]$name)
    try {
        $result = & $command 2>&1
        Write-Success "$name instalado"
        return $true
    } catch {
        Write-Error-Custom "$name NO esta instalado"
        return $false
    }
}

# INICIO
Write-Header "BUILD WIZARD - GRUA RD"

Write-Host "`nEste wizard compila tu app para Android.`n" -ForegroundColor $colors.Info
Write-Host "Que haremos:" -ForegroundColor $colors.Info
Write-Host "  1. Verificar herramientas" -ForegroundColor Gray
Write-Host "  2. Instalar dependencias npm" -ForegroundColor Gray
Write-Host "  3. Compilar aplicacion web" -ForegroundColor Gray
Write-Host "  4. Sincronizar con Capacitor" -ForegroundColor Gray
Write-Host "  5. Abrir Android Studio" -ForegroundColor Gray
Write-Host "`nTiempo estimado: 5-10 minutos`n" -ForegroundColor Gray

$continue = Read-Host "Comenzamos? (s/n)"
if ($continue -ne "s" -and $continue -ne "S") {
    Write-Host "Cancelado." -ForegroundColor $colors.Warning
    exit
}

# PASO 1: VERIFICAR HERRAMIENTAS
Write-Step 1 "Verificando herramientas instaladas..."

$tools_ok = $true

if (Check-Command "node --version" "Node.js") {
    $node_version = node --version
    Write-Host "  Version: $node_version" -ForegroundColor Gray
} else {
    $tools_ok = $false
    Write-Host "  Descarga desde: https://nodejs.org/" -ForegroundColor $colors.Warning
}

if (Check-Command "npm --version" "NPM") {
    $npm_version = npm --version
    Write-Host "  Version: $npm_version" -ForegroundColor Gray
} else {
    $tools_ok = $false
}

if (Check-Command "java -version" "Java") {
    Write-Host "  Version: (arriba)" -ForegroundColor Gray
} else {
    $tools_ok = $false
    Write-Host "  Descarga desde: https://www.oracle.com/java/technologies/downloads/#java17" -ForegroundColor $colors.Warning
}

if (Test-Path $env:ANDROID_HOME) {
    Write-Success "Android SDK encontrado"
    Write-Host "  Ruta: $env:ANDROID_HOME" -ForegroundColor Gray
} else {
    Write-Error-Custom "Android SDK NO configurado"
    $tools_ok = $false
    Write-Host "  Configura ANDROID_HOME en Variables de Entorno" -ForegroundColor $colors.Warning
}

if (Check-Command "adb --version" "Android Debug Bridge") {
    Write-Host "  (Necesario para instalar en telefono)" -ForegroundColor Gray
} else {
    Write-Host "  (Opcional - pero recomendado)" -ForegroundColor $colors.Warning
}

if (-not $tools_ok) {
    Write-Host ""
    Write-Error-Custom "Faltan herramientas requeridas"
    Write-Host "Por favor, descarga e instala las herramientas faltantes, luego ejecuta este script de nuevo." -ForegroundColor $colors.Warning
    exit
}

Write-Success "Todas las herramientas estan OK"

# PASO 2: INSTALAR DEPENDENCIAS
Write-Step 2 "Instalando dependencias npm..."

Write-Host "Ejecutando: npm install" -ForegroundColor Gray
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "npm install fallo"
    $retry = Read-Host "Reintentar? (s/n)"
    if ($retry -eq "s" -or $retry -eq "S") {
        npm install
        if ($LASTEXITCODE -ne 0) {
            exit
        }
    } else {
        exit
    }
}

Write-Success "Dependencias instaladas OK"

# PASO 3: COMPILAR APLICACION WEB
Write-Step 3 "Compilando aplicacion web..."

Write-Host "Ejecutando: npm run build" -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "npm run build fallo"
    exit
}

Write-Success "Aplicacion compilada OK (dist/public/)"

# PASO 4: SINCRONIZAR CON CAPACITOR
Write-Step 4 "Sincronizando con Capacitor..."

Write-Host "Ejecutando: npx cap sync" -ForegroundColor Gray
npx cap sync

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "npx cap sync fallo"
    exit
}

Write-Success "Capacitor sincronizado OK"

# PASO 5: ABRIR ANDROID STUDIO
Write-Step 5 "Preparando para abrir Android Studio..."

Write-Host "Ejecutando: npx cap open android" -ForegroundColor Gray
npx cap open android

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "npx cap open android fallo"
    Write-Host "Intenta abrir manualmente: android/" -ForegroundColor $colors.Warning
    exit
}

# RESUMEN
Write-Header "WIZARD COMPLETADO!"

Write-Host "`nOK: Dependencias instaladas" -ForegroundColor $colors.Success
Write-Host "OK: Aplicacion compilada" -ForegroundColor $colors.Success
Write-Host "OK: Capacitor sincronizado" -ForegroundColor $colors.Success
Write-Host "OK: Android Studio abierto" -ForegroundColor $colors.Success

Write-Host "`nPROXIMOS PASOS EN ANDROID STUDIO:`n" -ForegroundColor $colors.Info
Write-Host "1. Espera a que Gradle termine de sincronizar" -ForegroundColor Gray
Write-Host "2. Ve a: Build -> Build Bundle(s) / APK(s) -> Build APK(s)" -ForegroundColor Gray
Write-Host "3. Espera a que se compile (2-5 minutos)" -ForegroundColor Gray
Write-Host "4. Cuando termine, veras la ruta del APK" -ForegroundColor Gray

Write-Host "`nPara instalar en telefono (conectado por USB):`n" -ForegroundColor $colors.Info
Write-Host "adb install android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor Gray

Write-Host "`nPara mas informacion:" -ForegroundColor $colors.Info
Write-Host "  - Lee: SETUP_WINDOWS_BUILD.md" -ForegroundColor Gray
Write-Host "  - Capitulo: PASO 7: Compilar Android APK" -ForegroundColor Gray

Write-Host "`nPresiona una tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

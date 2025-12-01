@echo off
REM Grua RD - Build Script para Windows
REM Script simplificado en Batch

cls
color 0A
echo.
echo =====================================
echo   BUILD WIZARD - GRUA RD
echo =====================================
echo.
echo Este script compila tu app para Android.
echo.
pause

REM PASO 1: Instalar dependencias
echo.
echo [PASO 1] Instalando dependencias npm...
echo.
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: npm install fallo
    pause
    exit /b 1
)

REM PASO 2: Compilar
echo.
echo [PASO 2] Compilando aplicacion web...
echo.
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: npm run build fallo
    pause
    exit /b 1
)

REM PASO 3: Sincronizar Capacitor
echo.
echo [PASO 3] Sincronizando con Capacitor...
echo.
call npx cap sync
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: npx cap sync fallo
    pause
    exit /b 1
)

REM PASO 4: Abrir Android Studio
echo.
echo [PASO 4] Abriendo Android Studio...
echo.
call npx cap open android
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: npx cap open android fallo
    echo Intenta abrir manualmente la carpeta: android\
    pause
    exit /b 1
)

REM Resumen
color 0A
cls
echo.
echo =====================================
echo   WIZARD COMPLETADO
echo =====================================
echo.
echo OK: Dependencias instaladas
echo OK: Aplicacion compilada
echo OK: Capacitor sincronizado
echo OK: Android Studio abierto
echo.
echo PROXIMOS PASOS EN ANDROID STUDIO:
echo.
echo 1. Espera a que Gradle termine de sincronizar
echo 2. Ve a: Build - Build Bundle^(s^) / APK^(s^) - Build APK^(s^)
echo 3. Espera a que se compile ^(2-5 minutos^)
echo 4. Cuando termine, veras la ruta del APK
echo.
echo Para instalar en telefono ^(conectado por USB^):
echo adb install android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause

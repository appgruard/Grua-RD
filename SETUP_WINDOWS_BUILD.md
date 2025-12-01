# Guía Completa: Compilar Grúa RD en Windows (Desde tu Laptop)

Esta guía te explica exactamente qué instalar, dónde descargarlo, cómo instalarlo, y qué archivos copiar de Replit a tu computadora Windows.

---

## PASO 0: Qué archivos copiar de Replit

**IMPORTANTE**: No necesitas copiar todo el proyecto. Solo necesitas:

### Archivos y carpetas ESENCIALES:

```
gruard-rd/
├── android/                    ← COPIAR COMPLETA (plataforma Android)
├── ios/                        ← COPIAR COMPLETA (plataforma iOS)
├── capacitor.config.ts
├── package.json
├── package-lock.json
├── dist/                       ← COPIAR (ya compilado en Replit)
│   └── public/
└── node_modules/               ← OPCIONALMENTE (o instalar localmente)
```

**NO NECESITAS:**
- `client/` - El código ya está compilado en `dist/public/`
- `server/` - Solo se usa en Replit
- `shared/` - Solo se usa durante el build

### Cómo copiar desde Replit:

1. Descarga los archivos: En Replit, haz clic en el icono de carpeta → **Download**
2. Eso descargar el proyecto completo como `.zip`
3. Extrae el `.zip` en tu Windows en una carpeta, ejemplo: `C:\gruard-rd\`

---

## PASO 1: Instalar Node.js (REQUERIDO)

### Descargar Node.js:
1. Ve a: https://nodejs.org/
2. Descarga la versión **LTS** (Recomendado para estabilidad)
3. Ejecuta el instalador `.msi`
4. En la instalación:
   - Marca "Add to PATH" (importante)
   - Marca "npm package manager"
   - Completa la instalación

### Verificar instalación:
Abre PowerShell o Cmd y ejecuta:
```powershell
node --version
npm --version
```

Deberías ver números de versión (ejemplo: v18.17.0 y 9.6.7)

---

## PASO 2: Instalar Capacitor CLI Globalmente (REQUERIDO)

Abre PowerShell como administrador y ejecuta:

```powershell
npm install -g @capacitor/cli
```

Verifica:
```powershell
capacitor --version
```

---

## PASO 3: Instalar Android Studio (Para compilar Android APK)

### Descargar:
1. Ve a: https://developer.android.com/studio
2. Descarga para Windows
3. Ejecuta el instalador

### Instalación:
1. Sigue los pasos del instalador
2. **IMPORTANTE**: En "Android SDK Components Setup", asegúrate de instalar:
   - ✅ Android SDK (API level 24 o superior)
   - ✅ Android Virtual Device (opcional, para testing)
   - ✅ Android SDK Build-Tools
3. **Anota la ruta de Android SDK** cuando se instale (típicamente: `C:\Users\[TuUsuario]\AppData\Local\Android\Sdk`)

### Configurar variables de entorno:

1. En Windows, abre "Variables de entorno":
   - Presiona `Win + X` → Busca "Variables de entorno"
   - O ve a: Panel de Control → Sistema → Configuración avanzada del sistema → Variables de entorno

2. Haz clic en "Nueva" y agrega:
   - **Variable**: `ANDROID_HOME`
   - **Valor**: `C:\Users\[TuUsuario]\AppData\Local\Android\Sdk` (tu ruta)

3. Haz clic en "Nueva" y agrega:
   - **Variable**: `JAVA_HOME`
   - **Valor**: Busca donde instaló Android Studio el JDK (típicamente dentro del Android Studio path)

4. Haz clic en Path → Editar → Agregar:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`

### Verificar:
```powershell
adb --version
```

Deberías ver la versión de Android Debug Bridge

---

## PASO 4: Instalar Java Development Kit - JDK 17 (Para Android)

### Descargar:
1. Ve a: https://www.oracle.com/java/technologies/downloads/#java17
2. Descarga para Windows x64 MSI (es más fácil)
3. Ejecuta el instalador

### Verificar:
```powershell
java -version
javac -version
```

---

## PASO 5: Configurar tu proyecto en Windows

### Abre PowerShell y navega a tu proyecto:

```powershell
cd C:\gruard-rd
```

### Instala dependencias de Node:

```powershell
npm install
```

Este comando instalará todo lo necesario (incluyendo Capacitor localmente)

### Compila el frontend (si no lo hiciste en Replit):

```powershell
npm run build
```

Esto crea `dist/public/` con todos los archivos listos para la app nativa

---

## PASO 6: Sincronizar Capacitor con plataformas nativas

```powershell
npx cap sync
```

Este comando:
1. Copia `dist/public/` a las carpetas nativas
2. Actualiza los plugins
3. Prepara Android Studio y Xcode

---

## PASO 7: Compilar Android APK (En Android Studio)

### Abrir Android Studio:

```powershell
npx cap open android
```

Esto abre Android Studio con el proyecto configurado

### Compilar APK de DEBUG (para testing):

1. En Android Studio, ve a: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Espera a que termine (puede tardar 2-5 minutos)
3. Cuando termine, verás un mensaje con la ruta del APK

El APK de debug estará en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Puedes instalar este APK en cualquier teléfono Android conectado**

### Instalar en teléfono (conectado por USB):

```powershell
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Compilar APK de RELEASE (para publicar en Play Store):

1. Genera una keystore (primera vez):
```powershell
cd android
keytool -genkey -v -keystore gruard-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias gruard
```

Llena los datos solicitados (país, nombre, etc.)

2. Crea archivo `gradle.properties` en `android/` con:
```properties
GRUARD_RELEASE_STORE_FILE=gruard-release-key.jks
GRUARD_RELEASE_STORE_PASSWORD=tu_password_aqui
GRUARD_RELEASE_KEY_ALIAS=gruard
GRUARD_RELEASE_KEY_PASSWORD=tu_password_aqui
```

3. En PowerShell:
```powershell
cd android
./gradlew bundleRelease
```

El archivo `.aab` (App Bundle) estará en:
```
android/app/build/outputs/bundle/release/app-release.aab
```

**Este archivo se sube a Google Play Console**

---

## PASO 8: Compilar para iOS (Solo si tienes Mac)

**IMPORTANTE**: iOS SOLO se puede compilar en macOS. Si estás en Windows, necesitarás:
- Una Mac
- O usar un servicio como EAS Build (Expo)

Si tienes Mac disponible:

```bash
npx cap open ios
```

Luego en Xcode:
1. Selecciona un simulador
2. Presiona **Cmd + R** para compilar y ejecutar

---

## ESTRUCTURA DE CARPETAS DESPUÉS DE COPIAR

Tu carpeta `C:\gruard-rd\` debería verse así:

```
gruard-rd/
├── android/
│   ├── app/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── AndroidManifest.xml ← IMPORTANTE
│   │   │   │   ├── assets/
│   │   │   │   │   └── public/ ← Archivos web compilados
│   │   │   │   └── java/
│   │   ├── build.gradle
│   │   └── build.gradle
│   ├── gradle.properties ← Creas esto
│   └── gradlew (ejecutable)
├── ios/
│   ├── App/
│   │   ├── App/
│   │   │   ├── Info.plist ← IMPORTANTE
│   │   │   └── public/ ← Archivos web compilados
│   │   ├── Podfile
│   │   └── Podfile.lock
├── dist/
│   └── public/
│       ├── index.html
│       ├── css/
│       ├── js/
│       └── assets/
├── node_modules/
├── capacitor.config.ts
├── package.json
└── package-lock.json
```

---

## COMANDOS RÁPIDOS DE REFERENCIA

### Después de cambios en el código Replit:

```powershell
# 1. Descarga nuevamente desde Replit
# 2. Reemplaza dist/, android/, ios/ en tu Windows

# 3. Sincroniza:
npx cap sync

# 4. Abre Android Studio:
npx cap open android

# 5. En Android Studio: Build → Build APK
```

### Para testing rápido:

```powershell
# Build + sync + open Android Studio (todo en uno)
npm run build && npx cap sync && npx cap open android
```

---

## SOLUCIÓN DE PROBLEMAS

### Error: "gradle command not found"
**Solución**: Abre PowerShell en la carpeta `android/` y usa `./gradlew` en lugar de `gradle`

### Error: "ANDROID_HOME not set"
**Solución**: 
1. Verifica que configuraste ANDROID_HOME en variables de entorno
2. Reinicia PowerShell después de configurar
3. Prueba con: `echo $env:ANDROID_HOME`

### Error: "Cannot find module @capacitor"
**Solución**: 
```powershell
npm install
```

### La app dice "Cannot find web assets"
**Solución**: Asegúrate de ejecutar `npm run build` antes de `npx cap sync`

### Error en Android Studio: "Gradle sync failed"
**Solución**:
1. En Android Studio: **File → Sync Now**
2. O elimina carpeta `android/.gradle` y vuelve a abrir

---

## CHECKLIST FINAL

Antes de compilar, verifica:

- [ ] Node.js instalado: `node --version`
- [ ] Capacitor CLI: `capacitor --version`
- [ ] Android Studio instalado
- [ ] ANDROID_HOME configurado: `echo $env:ANDROID_HOME`
- [ ] Proyecto descargado en `C:\gruard-rd\`
- [ ] `npm install` ejecutado
- [ ] `npm run build` ejecutado
- [ ] `npx cap sync` ejecutado
- [ ] Abres con `npx cap open android`
- [ ] Android Studio abre correctamente

---

## SIGUIENTES PASOS

1. **Testing**: Compila APK debug y prueba en un teléfono
2. **Release**: Crea keystore y compila APK release
3. **Play Store**: Sube el AAB (App Bundle) a Google Play Console
4. **iOS**: Si tienes Mac, repite el proceso en macOS

---

## CONTACTO/AYUDA

Si tienes problemas:
1. Verifica que completaste todos los pasos
2. Revisa la ruta de ANDROID_HOME
3. Asegúrate de que copiastes la carpeta `dist/` reciente

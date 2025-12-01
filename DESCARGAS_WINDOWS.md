# Checklist de Descargas para Windows

Aquí está EXACTAMENTE QUÉ descargar, de DÓNDE, y en qué ORDEN.

---

## 1️⃣ Node.js (PRIMERO - Requerido para todo)

**¿Qué?** Node.js versión LTS

**Dónde:** https://nodejs.org/

**Cuál descargar:**
- Haz clic en "Download" (el botón grande)
- Se abre la página, verás dos botones: **LTS** (recomendado) y Current
- Descarga el **LTS** (que diga "Windows Installer (.msi)")

**Cómo instalar:**
1. Ejecuta el archivo `.msi` que descargó
2. Sigue el instalador (próximo, próximo, próximo)
3. **IMPORTANTE**: Marca las casillas:
   - ✅ "Add to PATH"
   - ✅ "npm package manager"
4. Completa la instalación

**Verificar:**
Abre PowerShell y escribe:
```powershell
node --version
npm --version
```

Si ves números, ¡está bien instalado!

---

## 2️⃣ Java Development Kit (JDK 17) - Para Android

**¿Qué?** Java JDK 17

**Dónde:** https://www.oracle.com/java/technologies/downloads/#java17

**Cuál descargar:**
- Busca la sección "Windows x64 MSI Installer"
- Haz clic en ese botón
- Puede pedir login de Oracle (crea una cuenta gratis o usa google)

**Cómo instalar:**
1. Ejecuta el archivo `.msi`
2. Sigue el instalador (todo por defecto está bien)

**Verificar:**
```powershell
java -version
javac -version
```

---

## 3️⃣ Android Studio - Para compilar APK

**¿Qué?** Android Studio (IDE para Android)

**Dónde:** https://developer.android.com/studio

**Cuál descargar:**
- El botón grande que dice "Download Android Studio [versión]"
- Automáticamente detecta que es Windows

**Cómo instalar:**
1. Ejecuta el instalador `.exe`
2. En la ventana "Android SDK Components Setup":
   - Marca: ✅ **Android SDK (API 24+)**
   - Marca: ✅ **Android SDK Platform-Tools**
   - Marca: ✅ **Android Virtual Device** (opcional)
3. Completa la instalación

**MUY IMPORTANTE**: 
Cuando termina, **anota la ruta** que dice "Android SDK Location" (algo como: `C:\Users\[TuUsuario]\AppData\Local\Android\Sdk`)

**Verificar:**
```powershell
adb --version
```

---

## 4️⃣ Proyecto desde Replit

**¿Qué?** El código de Grúa RD

**Dónde:** Tu proyecto en Replit

**Cómo descargar:**
1. En Replit, en la parte izquierda haz clic en el ícono de carpeta
2. Arriba a la derecha, busca el menú (⋯) → **Download**
3. Se descarga un archivo `.zip`

**Cómo guardar:**
1. Crea una carpeta en Windows: `C:\gruard-rd`
2. Extrae el `.zip` en esa carpeta

---

## 5️⃣ Configurar Variables de Entorno (IMPORTANTE)

### Abrir Variables de Entorno:
1. Presiona `Win + X` en tu teclado
2. Busca "Variables de entorno del sistema"
3. Abre "Editar las variables de entorno del sistema"
4. Haz clic en el botón "Variables de entorno" (abajo a la derecha)

### Crear ANDROID_HOME:
1. En la ventana, haz clic en "Nueva" (en la sección de abajo)
2. **Nombre de variable:** `ANDROID_HOME`
3. **Valor de variable:** La ruta que anotaste de Android Studio, ejemplo:
   ```
   C:\Users\TuUsuario\AppData\Local\Android\Sdk
   ```
4. Haz clic OK

### Agregar a PATH:
1. En la lista, busca la variable llamada `Path`
2. Haz clic en ella, luego "Editar"
3. Haz clic en "Nuevo"
4. Agrega: `%ANDROID_HOME%\platform-tools`
5. Haz clic en "Nuevo" de nuevo
6. Agrega: `%ANDROID_HOME%\tools`
7. Haz clic OK en todas las ventanas

**Reinicia PowerShell** después de esto

---

## ✅ Verificación Final

Abre PowerShell y ejecuta estos comandos:

```powershell
# Debe mostrar versión de Node
node --version

# Debe mostrar versión de npm
npm --version

# Debe mostrar versión de Java
java -version

# Debe mostrar versión de Android
adb --version

# Debe mostrar versión de Capacitor
npx @capacitor/cli --version
```

Si todos los comandos muestran versiones, ¡estás listo para compilar!

---

## 📋 Resumen Visual

| Programa | Descarga | Versión | ¿Requerido? |
|----------|----------|---------|-----------|
| Node.js | nodejs.org | LTS | ✅ Sí |
| Java JDK | oracle.com | 17 | ✅ Sí |
| Android Studio | developer.android.com | Última | ✅ Sí (para Android) |
| Xcode | App Store (Mac) | Última | ❌ Solo para iOS |
| Proyecto Grúa RD | Tu Replit | Descárgalo | ✅ Sí |

---

## Notas Importantes

⚠️ **ORDEN IMPORTA**: Instala primero Node.js, luego Java, luego Android Studio

⚠️ **Variables de Entorno**: Después de configurarlas, REINICIA PowerShell

⚠️ **Espacio**: Asegúrate de tener +30GB libres (Android Studio es pesado)

⚠️ **Windows Defender**: Puede ralentizar el build. Considera agregar la carpeta de proyecto a excepciones.

---

## Próximos Pasos (Después de descargar todo)

Lee el archivo: **SETUP_WINDOWS_BUILD.md**

Ese archivo te dice exactamente qué comandos ejecutar en PowerShell paso a paso.

# ⚡ Setup Rápido - Estilo Wizard

¿Quieres compilar sin leer toneladas de documentación? Este es tu camino.

---

## 1️⃣ Instala 3 cosas (5 minutos)

### Opción A: Descargar uno por uno
- **Node.js LTS**: https://nodejs.org/ → Ejecuta el instalador
- **Java 17**: https://www.oracle.com/java/technologies/downloads/#java17 → Ejecuta el instalador
- **Android Studio**: https://developer.android.com/studio → Ejecuta el instalador

### Opción B: Más fácil - Solo si tienes Chocolatey instalado
```powershell
choco install nodejs-lts jdk17 android-studio
```

---

## 2️⃣ Configura variable (2 minutos)

1. Presiona `Win + X` → "Variables de entorno"
2. Haz clic en "Variables de entorno"
3. Haz clic en "Nueva"
4. **Nombre:** `ANDROID_HOME`
5. **Valor:** `C:\Users\[TuUsuario]\AppData\Local\Android\Sdk` (copia la ruta real)
6. OK en todo

**Reinicia PowerShell**

---

## 3️⃣ Descarga tu proyecto

1. En Replit: Haz clic en carpeta → Download
2. Extrae el `.zip` en `C:\gruard-rd\`

---

## 4️⃣ **Ejecuta el Wizard (2 minutos)**

Abre PowerShell EN la carpeta del proyecto y ejecuta:

```powershell
.\BUILD-WIZARD.ps1
```

**¿Te da error de permisos?** Ejecuta primero:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Luego vuelve a ejecutar el wizard.

---

## 5️⃣ Listo

El wizard:
- ✅ Verifica que todo esté instalado
- ✅ Instala dependencias
- ✅ Compila tu app
- ✅ Abre Android Studio automáticamente

En Android Studio:
- Ve a: **Build → Build APK(s)**
- Espera 2-5 minutos
- ¡Tu APK está listo!

---

## Instalar en teléfono

Conecta tu teléfono por USB y ejecuta:

```powershell
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## ¿Problemas?

| Problema | Solución |
|----------|----------|
| "No se reconoce el comando" | Reinicia PowerShell después de instalar |
| "ANDROID_HOME no existe" | Verifica que copiaste la ruta correcta |
| "Gradle sync failed" | En Android Studio: File → Sync Now |
| "Permisos de script" | Ejecuta: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |

---

## Más detalles

Si necesitas entender mejor:
- Lee: **DESCARGAS_WINDOWS.md** (qué descargar)
- Lee: **SETUP_WINDOWS_BUILD.md** (pasos detallados)
- Lee: **CAPACITOR_BUILD_GUIDE.md** (configuración avanzada)

---

**¡Eso es todo! El wizard hace el resto.** 🚀

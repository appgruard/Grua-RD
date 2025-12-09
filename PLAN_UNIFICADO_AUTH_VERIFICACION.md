# Plan Unificado: Correcciones de Autenticación y Verificación para CapRover

## Resumen Ejecutivo

Este plan unifica las correcciones necesarias para resolver todos los problemas identificados en los flujos de login, registro, verificación y autenticación. El objetivo es garantizar una experiencia de usuario fluida y segura, especialmente para usuarios con verificación pendiente, y asegurar compatibilidad total con el despliegue en CapRover.

---

## Problemas Identificados

### Críticos (Bloquean el uso de la app)

| # | Problema | Impacto | Ubicación |
|---|----------|---------|-----------|
| 1 | Login se queda cargando sin respuesta | Usuario no puede iniciar sesión | `server/routes.ts` - endpoint login |
| 2 | Sesiones en memoria se pierden al reiniciar | Usuarios deben re-loguearse tras cada deploy | `server/routes.ts` - session config |
| 3 | Sesión destruida tras login con verificación pendiente | Conductor pierde acceso durante verificación | `server/routes.ts` + `client/src/App.tsx` |

### Altos (Afectan funcionalidad crítica)

| # | Problema | Impacto | Ubicación |
|---|----------|---------|-----------|
| 4 | Siguiente paso de verificación no se despliega | Usuario debe refrescar página manualmente | `client/src/pages/auth/verify-pending.tsx` |
| 5 | Validación OCR de documentos incompleta | Licencias no se validan con Verifik | Múltiples archivos |
| 6 | DeserializeUser no maneja usuarios eliminados | Errores silenciosos si usuario fue borrado | `server/routes.ts` |

### Medios (Mejoras de UX y seguridad)

| # | Problema | Impacto | Ubicación |
|---|----------|---------|-----------|
| 7 | Acceso a APIs durante verificación incompleto | Conductor no puede completar pasos | `server/routes.ts` - middleware auth |
| 8 | Campos obsoletos en perfil (grúa individual) | Confusión del usuario | `EditProfileModal.tsx` |

---

## Fases de Implementación

### FASE 1: Correcciones Críticas de Autenticación (Prioridad: URGENTE) ✅ COMPLETADA - 9 Dic 2025

**Estado:** Implementada y verificada

**Cambios realizados:**
- ✅ 1.1 Login cambiado a usar callback de passport.authenticate - Ahora devuelve 401 claro en lugar de quedarse cargando
- ✅ 1.2 Session store PostgreSQL agregado para producción - Sesiones persisten tras reinicio del contenedor
- ✅ 1.3 DeserializeUser mejorado - Maneja usuarios eliminados y suspendidos correctamente
- ✅ Configuración de cookies corregida - `sameSite: "lax"` para compatibilidad con CapRover

**Archivos modificados:**
- `server/routes.ts`

---

#### 1.1 Corregir Login con passport.authenticate (Problema #1)

**Archivo:** `server/routes.ts`

**Problema actual:** El endpoint `/api/auth/login` usa `passport.authenticate("local")` como middleware simple. Cuando la autenticación falla, Passport llama `done(null, false)` y el request queda sin respuesta.

**Solución:** Usar la forma callback de `passport.authenticate`:

```typescript
// ANTES (línea ~1330)
app.post("/api/auth/login", passport.authenticate("local"), async (req: Request, res: Response) => {
  // ...lógica de verificación
});

// DESPUÉS
app.post("/api/auth/login", (req: Request, res: Response, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      logSystem.error("Login authentication error", err);
      return res.status(500).json({ message: "Error de autenticación interno" });
    }
    
    if (!user) {
      logAuth.loginFailed(req.body.email || "unknown", info?.message || "Invalid credentials");
      return res.status(401).json({ 
        message: info?.message || "Credenciales inválidas. Verifica tu correo y contraseña." 
      });
    }
    
    // Establecer sesión manualmente
    req.login(user, (loginErr) => {
      if (loginErr) {
        logSystem.error("Session establishment error", loginErr);
        return res.status(500).json({ message: "Error al establecer sesión" });
      }
      
      // Continuar con lógica existente de verificación...
      handlePostLoginVerification(req, res, user);
    });
  })(req, res, next);
});

// Extraer lógica post-login a función separada
async function handlePostLoginVerification(req: Request, res: Response, user: any) {
  // Lógica de verificación de cédula, email, foto para conductores
  // ... código existente ...
}
```

**Verificación:** 
- Login con credenciales correctas → Sesión establecida
- Login con credenciales incorrectas → Error 401 con mensaje claro
- Error interno → Error 500 con mensaje genérico

---

#### 1.2 Agregar Session Store Persistente (Problema #2)

**Archivo:** `server/routes.ts`

**Problema actual:** Las sesiones usan MemoryStore por defecto y se pierden al reiniciar el servidor.

**Solución:** Configurar connect-pg-simple para producción:

```typescript
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

// Al inicio del archivo, después de los imports existentes
const isProduction = process.env.NODE_ENV === "production";

// Antes de configurar session (línea ~406)
// Configurar trust proxy para CapRover (CRÍTICO)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Configurar session store persistente
let sessionStore: session.Store | undefined = undefined;

if (isProduction && process.env.DATABASE_URL) {
  try {
    const PgSession = connectPgSimple(session);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' 
        ? { rejectUnauthorized: false } 
        : undefined
    });
    
    sessionStore = new PgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15 // Limpiar sesiones expiradas cada 15 min
    });
    
    logSystem.info("PostgreSQL session store initialized");
  } catch (error) {
    logSystem.error("Failed to initialize PostgreSQL session store, falling back to memory", error);
  }
}

const sessionParser = session({
  store: sessionStore, // undefined en desarrollo usa MemoryStore
  secret: process.env.SESSION_SECRET || "gruard-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  cookie: {
    secure: isProduction, // true solo en producción (HTTPS)
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax", // "none" para cross-origin en CapRover
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
    domain: isProduction ? undefined : undefined // Dejar que el navegador lo maneje
  },
});
```

**Verificación:**
- En desarrollo: Sesiones en memoria (comportamiento actual)
- En producción: Sesiones en PostgreSQL
- Tabla `user_sessions` se crea automáticamente
- Sesiones persisten tras reinicio del contenedor

---

#### 1.3 Corregir DeserializeUser (Problema #6)

**Archivo:** `server/routes.ts`

**Problema actual:** Si un usuario es eliminado de la base de datos mientras tiene sesión activa, deserializeUser puede fallar silenciosamente.

**Solución:**

```typescript
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUserById(id);
    
    if (!user) {
      // Usuario fue eliminado o no existe - invalidar sesión
      logSystem.warn("DeserializeUser: User not found, invalidating session", { userId: id });
      return done(null, false);
    }
    
    // Verificar que la cuenta no está suspendida/baneada
    if (user.estadoCuenta === 'baneado' || user.estadoCuenta === 'suspendido') {
      logSystem.warn("DeserializeUser: User account suspended/banned", { 
        userId: id, 
        estado: user.estadoCuenta 
      });
      return done(null, false);
    }
    
    done(null, user as any);
  } catch (error) {
    logSystem.error("DeserializeUser error", error);
    done(error);
  }
});
```

---

### FASE 2: Sesiones Durante Verificación Pendiente (Prioridad: ALTA) ✅ COMPLETADA - 9 Dic 2025

**Estado:** Implementada y verificada

**Cambios realizados:**
- ✅ 2.1 ProtectedRoute actualizado con prop `allowPendingVerification` para permitir acceso a rutas de verificación
- ✅ 2.1 Ruta `/verify-pending` envuelta en ProtectedRoute con `allowPendingVerification={true}`
- ✅ 2.1 Verificación de clientes también incluida en ProtectedRoute
- ✅ 2.2 Middleware de verificación ya implementado con `VERIFICATION_ALLOWED_PATTERNS` y `userNeedsVerification()`
- ✅ 2.2 Ruta `/api/storage/files/*` agregada a patrones permitidos durante verificación

**Archivos modificados:**
- `client/src/App.tsx` - ProtectedRoute con allowPendingVerification
- `server/routes.ts` - Middleware de verificación con patrones permitidos

**Rutas permitidas durante verificación:**
- `/api/auth/me`, `/api/auth/logout`, `/api/auth/send-otp`, `/api/auth/verify-otp`
- `/api/identity/*` (scan-cedula, verify-cedula, verify-profile-photo, verification-status, status)
- `/api/documents/upload`, `/api/driver/documents`
- `/api/drivers/me/servicios`, `/api/drivers/me/vehiculos/*`
- `/api/users/me`, `/api/users/profile-photo`
- `/api/storage/files/*`

---

#### 2.1 Mantener Sesión Activa Durante Verificación (Problema #3)

**Problema actual:** El sistema destruye o no establece correctamente la sesión cuando un conductor necesita completar verificación.

**Archivos a modificar:**
- `server/routes.ts`
- `client/src/App.tsx`
- `client/src/lib/auth.tsx`

**Solución Backend - Permitir sesión con verificación pendiente:**

```typescript
// En el endpoint POST /api/auth/login (después de req.login exitoso)
async function handlePostLoginVerification(req: Request, res: Response, user: any) {
  const safeUser = getSafeUser(user);
  
  // Para conductores, verificar estado de verificación
  if (user.userType === 'conductor') {
    const conductor = await storage.getConductorByUserId(user.id);
    
    const verificationStatus = {
      cedulaVerificada: !!user.cedulaVerificada,
      emailVerificado: !!user.emailVerificado,
      telefonoVerificado: !!user.telefonoVerificado,
      fotoVerificada: !!(user as any).fotoVerificada,
      licenciaVerificada: !!conductor?.licenciaVerificada,
      categoriasConfiguradas: !!conductor?.categoriasConfiguradas,
      vehiculosRegistrados: !!conductor?.vehiculosRegistrados
    };
    
    const allVerified = Object.values(verificationStatus).every(v => v);
    
    // IMPORTANTE: Siempre establecer la sesión, incluso si falta verificación
    // El frontend redirigirá a la página de verificación pendiente
    
    logAuth.loginSuccess(user.email, user.userType);
    
    return res.json({
      user: safeUser,
      verificationStatus,
      requiresVerification: !allVerified,
      redirectTo: allVerified ? '/driver' : '/verify-pending'
    });
  }
  
  // Para clientes
  const clientVerified = user.cedulaVerificada && (user.emailVerificado || user.telefonoVerificado);
  
  logAuth.loginSuccess(user.email, user.userType);
  
  return res.json({
    user: safeUser,
    requiresVerification: !clientVerified,
    redirectTo: clientVerified ? '/client' : '/verify-pending'
  });
}
```

**Solución Frontend - Permitir acceso a rutas de verificación:**

```typescript
// client/src/App.tsx - ProtectedRoute actualizado

function ProtectedRoute({ 
  children, 
  allowedRoles,
  allowPendingVerification = false // NUEVO: permite acceso durante verificación
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  // Verificar roles permitidos
  if (allowedRoles && !allowedRoles.includes(user.userType)) {
    return <Redirect to="/" />;
  }

  // Si permite verificación pendiente, no redirigir
  if (allowPendingVerification) {
    return <>{children}</>;
  }

  // Verificar estado de verificación para conductores
  if (user.userType === 'conductor') {
    const needsVerification = !user.cedulaVerificada || 
                              !(user.emailVerificado || user.telefonoVerificado) || 
                              !(user as any).fotoVerificada;
    
    if (needsVerification) {
      return <Redirect to="/verify-pending" />;
    }
  }

  return <>{children}</>;
}

// Configurar rutas
<Route path="/verify-pending">
  <ProtectedRoute allowPendingVerification={true}>
    <VerifyPending />
  </ProtectedRoute>
</Route>
```

---

#### 2.2 APIs Permitidas Durante Verificación (Problema #7)

**Archivo:** `server/routes.ts`

**Problema:** Durante la verificación, el conductor necesita acceso a ciertas APIs pero el middleware las bloquea.

**Solución:** Crear middleware que permita rutas específicas durante verificación:

```typescript
// Middleware de autenticación con excepciones para verificación
function requireAuthWithVerificationAccess(
  allowedDuringVerification: string[] = []
) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }
    
    const user = req.user;
    
    // Verificar si el usuario está en proceso de verificación
    if (user.userType === 'conductor') {
      const isVerifying = !user.cedulaVerificada || 
                          !user.emailVerificado || 
                          !(user as any).fotoVerificada;
      
      if (isVerifying) {
        // Verificar si la ruta actual está permitida durante verificación
        const currentPath = req.path;
        const isAllowed = allowedDuringVerification.some(pattern => {
          if (pattern.endsWith('*')) {
            return currentPath.startsWith(pattern.slice(0, -1));
          }
          return currentPath === pattern;
        });
        
        if (!isAllowed) {
          return res.status(403).json({ 
            message: "Debe completar la verificación primero",
            requiresVerification: true 
          });
        }
      }
    }
    
    next();
  };
}

// Rutas permitidas durante verificación
const VERIFICATION_ALLOWED_ROUTES = [
  '/api/auth/me',
  '/api/auth/logout',
  '/api/identity/*',           // Todas las rutas de verificación de identidad
  '/api/documents/upload',     // Subir documentos
  '/api/otp/*',                // Verificación OTP
  '/api/drivers/me/servicios', // Seleccionar categorías
  '/api/drivers/me/vehiculos', // Registrar vehículos
  '/api/users/profile',        // Ver/editar perfil básico
  '/api/storage/files/*',      // Acceder a archivos subidos
];
```

---

### FASE 3: Correcciones de UI de Verificación (Prioridad: ALTA) ✅ COMPLETADA - 9 Dic 2025

**Estado:** Implementada y verificada

**Cambios realizados:**
- ✅ 3.1 Función helper `getNextStep()` agregada para determinar automáticamente el siguiente paso de verificación
- ✅ 3.2 Transiciones suaves con framer-motion implementadas usando `AnimatePresence` y `motion.div`
- ✅ Animaciones aplicadas a todas las cards de verificación (cedula, email, photo, license, categories, vehicles)

**Archivos modificados:**
- `client/src/pages/auth/verify-pending.tsx`

---

#### 3.1 Siguiente Paso No Se Despliega (Problema #4)

**Archivo:** `client/src/pages/auth/verify-pending.tsx`

**Problema actual:** Después de completar un paso (ej: escanear cédula), el siguiente paso no se muestra automáticamente. El usuario debe refrescar la página.

**Causa raíz:** Después de completar un paso, se llamaba `refetchVerificationStatus()` que podría sobrescribir el estado local antes de que `setCurrentStep()` se ejecute.

**Solución:**

```typescript
// En scanCedulaImage() y funciones similares

async function scanCedulaImage(imageBase64: string) {
  try {
    setIsScanning(true);
    
    const response = await apiRequest('POST', '/api/identity/scan-cedula', {
      image: imageBase64
    });
    
    if (response.verified) {
      // 1. PRIMERO actualizar estados locales (SIN await de refetch)
      setCedulaVerified(true);
      
      // 2. LUEGO determinar el siguiente paso
      const nextStep = getNextStep('cedula');
      setCurrentStep(nextStep);
      
      // 3. Mostrar toast de éxito
      toast({
        title: "Cédula verificada",
        description: "Tu cédula ha sido verificada correctamente.",
      });
      
      // 4. FINALMENTE refrescar en background (no bloquea la UI)
      refetchVerificationStatus();
    } else {
      // Manejar error de verificación
      toast({
        title: "Error de verificación",
        description: response.error || "No se pudo verificar la cédula",
        variant: "destructive"
      });
    }
  } catch (error) {
    // Manejar error de red
  } finally {
    setIsScanning(false);
  }
}

// Función helper para determinar siguiente paso
function getNextStep(completedStep: VerificationStep): VerificationStep {
  const steps: VerificationStep[] = ['cedula', 'email', 'photo', 'license', 'categories', 'vehicles'];
  const currentIndex = steps.indexOf(completedStep);
  
  if (currentIndex < steps.length - 1) {
    return steps[currentIndex + 1];
  }
  
  return completedStep; // Ya está en el último paso
}
```

**Aplicar patrón similar a:**
- `verifyOtpMutation.onSuccess`
- `validateProfilePhoto()`
- `uploadLicense()` (frontal y trasera)
- `saveCategories()`
- `registerVehicle()`

---

#### 3.2 Mejorar Transiciones Entre Pasos

**Archivo:** `client/src/pages/auth/verify-pending.tsx`

```typescript
// Agregar transiciones suaves al cambiar de paso
import { motion, AnimatePresence } from "framer-motion";

// En el render del paso actual
<AnimatePresence mode="wait">
  <motion.div
    key={currentStep}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2 }}
  >
    {renderCurrentStep()}
  </motion.div>
</AnimatePresence>
```

---

### FASE 4: Validación OCR de Documentos con Verifik (Prioridad: ALTA) ✅ COMPLETADA - 9 Dic 2025

**Estado:** Implementada y verificada

**Cambios realizados:**
- ✅ 4.1 `handleLicenseUpload` reescrito para integrar validación OCR de Verifik
- ✅ Estados de verificación OCR por lado: `licenseFrontVerified`, `licenseBackVerified`
- ✅ Estado `licenseOcrDetails` para almacenar datos extraídos (licenseNumber, licenseClass)
- ✅ Llamadas a `/api/identity/scan-license` (frontal) y `/api/identity/scan-license-back` (trasero)
- ✅ Validación OCR requerida antes de permitir continuar al siguiente paso
- ✅ UI mejorada con badges "OCR Verificado", loading overlay, y datos de licencia extraídos

**Archivos modificados:**
- `client/src/pages/auth/verify-pending.tsx`

---

#### 4.1 Validar Licencia de Conducir con Verifik (Problema #5)

**Archivos:**
- `server/routes.ts`
- `client/src/pages/auth/verify-pending.tsx`

**Problema original:** La licencia de conducir se subía pero no se validaba con OCR de Verifik.

**Solución Backend - Endpoint de validación de licencia:**

```typescript
// POST /api/identity/scan-license (ya existe, verificar implementación)
app.post("/api/identity/scan-license", 
  requireAuth, 
  ocrScanLimiter,
  async (req: Request, res: Response) => {
    try {
      const { image, side } = req.body; // side: 'front' | 'back'
      
      if (!image) {
        return res.status(400).json({ message: "Imagen requerida" });
      }
      
      // Validar tamaño de imagen
      const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
      if (base64Data.length > 10 * 1024 * 1024) { // 10MB max
        return res.status(400).json({ message: "Imagen demasiado grande (máx 10MB)" });
      }
      
      let result;
      if (side === 'back') {
        result = await validateDriverLicenseBack(image);
      } else {
        result = await validateDriverLicense(image);
      }
      
      if (!result.success) {
        return res.status(400).json({
          verified: false,
          error: result.error || "No se pudo procesar la licencia"
        });
      }
      
      // Guardar resultado en la base de datos
      if (result.isValidLicense) {
        const user = req.user!;
        const conductor = await storage.getConductorByUserId(user.id);
        
        if (conductor) {
          const updateData: any = {};
          
          if (side === 'back') {
            updateData.licenciaTraseraUrl = `verified_${Date.now()}`;
            // Si ya tiene licencia frontal, marcar como verificada
            if (conductor.licenciaFrontalUrl) {
              updateData.licenciaVerificada = true;
            }
          } else {
            updateData.licenciaFrontalUrl = `verified_${Date.now()}`;
          }
          
          await storage.updateConductor(conductor.id, updateData);
        }
      }
      
      return res.json({
        verified: result.isValidLicense,
        score: result.score,
        licenseNumber: result.licenseNumber,
        licenseClass: result.licenseClass,
        expirationDate: result.expirationDate,
        holderName: result.holderName,
        details: result.details
      });
      
    } catch (error: any) {
      logSystem.error("License scan error", error);
      return res.status(500).json({ 
        message: "Error al procesar la licencia" 
      });
    }
  }
);
```

**Solución Frontend - Integrar validación en paso de licencia:**

```typescript
// En verify-pending.tsx - paso de licencia

async function validateLicenseImage(imageBase64: string, side: 'front' | 'back') {
  setIsValidating(true);
  
  try {
    const response = await apiRequest('POST', '/api/identity/scan-license', {
      image: imageBase64,
      side
    });
    
    if (response.verified) {
      if (side === 'front') {
        setLicenseFrontVerified(true);
        setLicenseFrontUrl(imageBase64);
        toast({
          title: "Licencia frontal verificada",
          description: `Score: ${Math.round(response.score * 100)}%`
        });
      } else {
        setLicenseBackVerified(true);
        setLicenseBackUrl(imageBase64);
        toast({
          title: "Licencia trasera verificada", 
          description: `Categoría: ${response.licenseClass}`
        });
      }
      
      // Si ambos lados están verificados, avanzar al siguiente paso
      if ((side === 'front' && licenseBackVerified) || 
          (side === 'back' && licenseFrontVerified)) {
        setCurrentStep('categories');
      }
    } else {
      toast({
        title: "Licencia no válida",
        description: response.error || "No se pudo verificar la licencia",
        variant: "destructive"
      });
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Error al conectar con el servicio de verificación",
      variant: "destructive"
    });
  } finally {
    setIsValidating(false);
  }
}
```

---

### FASE 5: Compatibilidad con CapRover (Prioridad: MEDIA)

#### 5.1 Configuración de Cookies y HTTPS

**Archivo:** `server/routes.ts`

```typescript
// Asegurar que CapRover maneja correctamente las cookies

const isProduction = process.env.NODE_ENV === "production";
const isCapRover = !!process.env.CAPROVER_GIT_COMMIT_SHA;

// trust proxy es CRÍTICO para CapRover
if (isProduction || isCapRover) {
  app.set('trust proxy', 1);
}

// Configuración de cookies optimizada para CapRover
const cookieConfig = {
  secure: isProduction, // true en producción
  httpOnly: true,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
  // NO establecer domain para evitar problemas con subdominios
};

const sessionParser = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "gruard-secret-change-in-production",
  name: 'gruard.sid', // Nombre único para la cookie de sesión
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  cookie: cookieConfig,
});
```

#### 5.2 Variables de Entorno Requeridas

```bash
# Requeridas en CapRover
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=<secret-seguro-de-32-caracteres>
VERIFIK_API_KEY=<api-key-de-verifik>

# Opcionales
DATABASE_SSL=true  # Si PostgreSQL requiere SSL
```

---

### FASE 6: Limpieza y Mejoras Menores (Prioridad: BAJA)

#### 6.1 Eliminar Campos Obsoletos de Grúa (Problema #8)

**Archivo:** `client/src/components/EditProfileModal.tsx`

Ya completado según los planes anteriores. Verificar que no existan campos `placaGrua`, `marcaGrua`, `modeloGrua`.

#### 6.2 Logs de Auditoría Mejorados

```typescript
// Agregar logs detallados para troubleshooting en producción

logAuth.verificationStep = (userId: string, step: string, success: boolean, details?: any) => {
  logger.info(`Verification step: ${step}`, {
    userId,
    step,
    success,
    details,
    timestamp: new Date().toISOString()
  });
};
```

---

## Orden de Implementación Recomendado

```
FASE 1 (Crítica - Día 1)
├── 1.1 Corregir passport.authenticate
├── 1.2 Agregar session store PostgreSQL
└── 1.3 Corregir deserializeUser

FASE 2 (Alta - Día 1-2)
├── 2.1 Mantener sesión durante verificación
└── 2.2 APIs permitidas durante verificación

FASE 3 (Alta - Día 2)
├── 3.1 Fix: siguiente paso no se despliega
└── 3.2 Transiciones suaves entre pasos

FASE 4 (Alta - Día 2-3)
└── 4.1 Validación OCR de licencia con Verifik

FASE 5 (Media - Día 3)
├── 5.1 Configuración CapRover optimizada
└── 5.2 Documentar variables de entorno

FASE 6 (Baja - Día 3)
├── 6.1 Verificar limpieza de campos obsoletos
└── 6.2 Mejorar logs de auditoría
```

---

## Verificación Post-Implementación

### Checklist de Pruebas

#### Login y Autenticación
- [ ] Login con credenciales correctas → Sesión establecida
- [ ] Login con credenciales incorrectas → Error 401 claro
- [ ] Login de conductor sin verificación → Sesión + redirect a /verify-pending
- [ ] Sesión persiste tras reinicio del contenedor (CapRover)
- [ ] Logout funciona correctamente

#### Verificación de Conductores
- [ ] Paso 1: Cédula OCR con Verifik → Detecta número y nombre
- [ ] Paso 2: Email/OTP → Envía y verifica código
- [ ] Paso 3: Foto de perfil → Detecta rostro humano
- [ ] Paso 4: Licencia frontal → OCR con Verifik
- [ ] Paso 5: Licencia trasera → OCR con Verifik
- [ ] Paso 6: Categorías → Selección guardada
- [ ] Paso 7: Vehículos → Registro completado
- [ ] Siguiente paso se despliega automáticamente (sin refresh)
- [ ] Sesión no se pierde entre pasos

#### CapRover
- [ ] Deploy exitoso sin errores
- [ ] Cookies funcionan correctamente (secure, sameSite)
- [ ] Sesiones persisten en PostgreSQL
- [ ] Health check responde correctamente

---

## Dependencias

### Ya Instaladas
- `connect-pg-simple` - Session store PostgreSQL
- `pg` - Cliente PostgreSQL
- `express-session` - Manejo de sesiones

### Ninguna Nueva Requerida

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Sesiones existentes se pierden al cambiar a PG store | Alta | Bajo | Usuarios solo deben re-loguearse una vez |
| Verifik API no disponible | Baja | Alto | Fallback con flag `skipped: true` para revisión manual |
| Cookies no funcionan en CapRover | Media | Alto | Probar con `secure: true` y `sameSite: none` |

---

## Notas Finales

- Este plan NO debe ejecutarse hasta que el usuario lo apruebe.
- Cada fase debe probarse completamente antes de pasar a la siguiente.
- Los deploys a CapRover deben hacerse después de cada fase completada.
- Mantener logs detallados para facilitar debugging en producción.

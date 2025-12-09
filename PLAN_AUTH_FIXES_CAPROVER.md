# Plan: Corrección del Flujo de Autenticación para CapRover

## Problemas Identificados

### 1. CRÍTICO: Login se queda cargando (Sin respuesta de error)
**Archivo:** `server/routes.ts` línea 1330
**Problema:** El endpoint `/api/auth/login` usa `passport.authenticate("local")` como middleware simple, pero cuando la autenticación falla (usuario no encontrado o contraseña inválida), Passport llama `done(null, false)` y el comportamiento por defecto es NO llamar al siguiente handler - la solicitud queda sin respuesta.

**Solución:** Usar la forma callback de `passport.authenticate` para manejar explícitamente los errores:

```typescript
// ANTES (línea 1330)
app.post("/api/auth/login", passport.authenticate("local"), async (req: Request, res: Response) => {

// DESPUÉS
app.post("/api/auth/login", (req: Request, res: Response, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      logSystem.error("Login authentication error", err);
      return res.status(500).json({ message: "Error de autenticación" });
    }
    
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    
    // Establecer la sesión manualmente
    req.login(user, (loginErr) => {
      if (loginErr) {
        logSystem.error("Session establishment error", loginErr);
        return res.status(500).json({ message: "Error al establecer sesión" });
      }
      
      // Continuar con la lógica de verificación existente...
      handlePostLoginLogic(req, res, user);
    });
  })(req, res, next);
});
```

### 2. CRÍTICO: Sesiones en Memoria (Se pierden al reiniciar)
**Archivo:** `server/routes.ts` líneas 406-417
**Problema:** Las sesiones no tienen store persistente - usan MemoryStore por defecto que se pierde al reiniciar el servidor.

**Solución:** Agregar connect-pg-simple para producción:
```typescript
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

// Antes de configurar session
if (isProduction) {
  app.set('trust proxy', 1);
}

let sessionStore: any = undefined;
if (isProduction && process.env.DATABASE_URL) {
  const PgSession = connectPgSimple(session);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
  sessionStore = new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  });
}

const sessionParser = session({
  store: sessionStore,
  // ... resto de config
});
```

### 3. MENOR: Posible condición de carrera en deserializeUser
**Archivo:** `server/routes.ts` línea 277-284
**Problema:** `deserializeUser` no maneja el caso donde el usuario ya no existe en la base de datos.

**Solución:**
```typescript
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUserById(id);
    if (!user) {
      // Usuario fue eliminado - invalidar sesión
      return done(null, false);
    }
    done(null, user as any);
  } catch (error) {
    done(error);
  }
});
```

## Orden de Implementación

1. **Fase 1:** Corregir passport.authenticate para manejar errores (CRÍTICO - resuelve login colgado)
2. **Fase 2:** Agregar session store persistente (CRÍTICO - resuelve sesiones perdidas)
3. **Fase 3:** Mejorar deserializeUser (MENOR - previene errores edge case)

## Impacto
- Fase 1: Usuarios verán mensaje de error en lugar de pantalla cargando
- Fase 2: Sesiones persistirán después de reiniciar servidor
- Fase 3: Mejor manejo de usuarios eliminados

## Dependencias
- `connect-pg-simple` - Ya instalado
- `pg` - Ya instalado

## Variables de Entorno Necesarias en CapRover
- `DATABASE_URL` - Ya configurada
- `SESSION_SECRET` - Ya configurada
- `DATABASE_SSL` - Opcional (set to 'true' si PostgreSQL requiere SSL)

# Plan de Corrección: Problemas de Verificación en App Móvil (Release)

## Problema Detectado
El usuario reporta que en las versiones Release (APK/AAB) los conductores son redirigidos a la página de verificación incluso si ya están verificados. Además, en el panel de administración, la carga del estado de verificación falla. Ambos problemas no ocurren en la PWA (web).

**Observación Clave:** Al cerrar y abrir la app, el Dashboard del conductor se muestra sin problemas. Esto indica que el problema ocurre específicamente en la transición post-login (donde los datos del usuario podrían no estar completamente hidratados en la caché de React Query) y no es un problema de permisos permanentes en la base de datos.

## Análisis Técnico Inicial
1.  **Redirección de Conductores:** En `client/src/App.tsx`, el `ProtectedRoute` utiliza `currentUser`. Si al iniciar sesión, la respuesta del login no incluye el objeto `conductor` (o este se carga asincrónicamente mediante un refetch que aún no ha terminado), la lógica de `needsVerification` se dispara. Al reiniciar la app, `useQuery(['/api/auth/me'])` carga el usuario completo (incluyendo relaciones) desde el inicio, por lo que el Dashboard funciona.
2.  **Error en Panel Admin:** El error "No se pudo cargar el estado de verificación" en `AdminVerifications.tsx` se debe probablemente a que el query usa `/api/admin/verification-status` como URL relativa. En Capacitor, las URLs deben ser absolutas para que el plugin de HTTP maneje correctamente las cookies/sesiones.

## Plan de Acción

### 1. Diagnóstico y Logs (Backend)
*   Aumentar el nivel de detalle en los logs de `server/routes.ts` específicamente para la deserialización de usuarios y el endpoint de verificación.
*   Verificar si `req.user` contiene la relación `conductor` cargada correctamente en el entorno de producción.

### 2. Robustez en el Frontend (`client/src/App.tsx`)
*   Modificar el `ProtectedRoute` para ser más tolerante a datos parcialmente cargados mientras se realiza el refresh.
*   Asegurar que la lógica de "necesita verificación" (`needsVerification`) solo se active si los datos son explícitamente `false`, no simplemente porque no han llegado todavía.

### 3. Sincronización de Sesión Nativa (`client/src/lib/auth.tsx`)
*   Revisar `getFullUrl` y el manejo de `credentials: 'include'` en `CapacitorHttp`.
*   Asegurar que el `sessionStorage` (indicador de sesión) sea consistente o se ignore correctamente en nativo si causa falsos negativos.

### 4. Corrección en Admin (`client/src/pages/admin/verifications.tsx`)
*   Ajustar el fetch del estado de verificación para usar `getApiUrl` consistentemente (como se hace en otros queries del mismo archivo) para asegurar que la URL sea absoluta en dispositivos nativos.

## Próximos Pasos Recomendados
1.  Aplicar cambios de robustez en el filtrado de rutas.
2.  Normalizar las llamadas a la API en el panel de administración.
3.  Verificar la persistencia de la sesión en el almacén de Postgres (que ya está configurado pero podría tener problemas de conectividad en el release).

---
*Este plan será ejecutado una vez recibida la confirmación del usuario.*

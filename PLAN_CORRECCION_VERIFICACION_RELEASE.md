# Plan de Corrección: Problemas de Verificación en App Móvil (Release)

## Problema Detectado
El usuario reporta que en las versiones Release (APK/AAB) los conductores son redirigidos a la página de verificación incluso si ya están verificados. Además, en el panel de administración, la carga del estado de verificación falla. Ambos problemas no ocurren en la PWA (web).

## Análisis Técnico Inicial
1.  **Redirección de Conductores:** En `client/src/App.tsx`, el `ProtectedRoute` utiliza `currentUser` (que puede ser `user` de la sesión activa o `pendingVerificationUser`). La lógica de redirección depende de campos como `conductor`, `cedulaVerificada`, `fotoVerificada`, etc. Si estos campos llegan como `undefined` o no están presentes en el objeto retornado por el servidor en modo producción/nativo, la app redirige preventivamente a `/verify-pending`.
2.  **Error en Panel Admin:** El error "No se pudo cargar el estado de verificación" en `AdminVerifications.tsx` sugiere que el endpoint `/api/admin/verification-status` está fallando o retornando un error 401/403 que no se maneja correctamente en el entorno nativo (posiblemente por problemas de cookies/sesión persistente).
3.  **Diferencia PWA vs Nativo:** Las aplicaciones nativas usan `CapacitorHttp` y manejan las cookies de forma distinta. En producción, la configuración de `sameSite: "lax"` y `secure: true` es crítica.

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

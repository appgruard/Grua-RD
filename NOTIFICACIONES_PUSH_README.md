# Sistema de Notificaciones Push - GruaRD

## Descripción

GruaRD implementa un sistema completo de notificaciones push usando la Web Push API estándar. Las notificaciones se envían automáticamente en eventos clave del ciclo de vida del servicio.

## Configuración Requerida

### 1. Generar Claves VAPID

Las claves VAPID (Voluntary Application Server Identification) son credenciales que permiten al servidor enviar notificaciones push de forma segura.

**Generar claves:**

```bash
npx web-push generate-vapid-keys
```

Este comando generará dos claves:

```
Public Key:  BF_EVY...
Private Key: mXZjum...
```

### 2. Configurar Variables de Entorno

Debes configurar estas dos variables de entorno en Replit (pestaña Secrets):

- **VITE_VAPID_PUBLIC_KEY**: La clave pública (se usa en el frontend)
- **VAPID_PRIVATE_KEY**: La clave privada (se usa en el backend)

**⚠️ IMPORTANTE**: 
- NUNCA compartas o commits la clave privada en el código fuente
- Las claves son únicas para tu aplicación
- Si expones accidentalmente las claves, genera nuevas inmediatamente

### 3. Comportamiento sin Claves

Si no configuras las claves VAPID:
- La aplicación funcionará normalmente
- Las notificaciones push simplemente no se enviarán
- Verás advertencias en los logs del servidor indicando que las notificaciones no están configuradas

## Arquitectura

### Base de Datos

**Tabla `push_subscriptions`:**
```sql
- id (uuid)
- user_id (uuid) → users.id
- endpoint (text, unique)
- p256dh_key (text)
- auth_key (text)
- user_agent (text)
- created_at (timestamp)
```

### Backend

**Archivos:**
- `server/push-service.ts`: Servicio principal de notificaciones
- `server/storage.ts`: Métodos CRUD para suscripciones
- `server/routes.ts`: Endpoints de API y triggers de notificaciones

**Endpoints API:**
- `POST /api/push/subscribe`: Suscribir dispositivo a notificaciones
- `POST /api/push/unsubscribe`: Desuscribir dispositivo
- `GET /api/push/subscriptions`: Obtener suscripciones del usuario

**Métodos del servicio:**
- `notifyServiceAccepted()`: Notifica al cliente cuando conductor acepta
- `notifyServiceStarted()`: Notifica cuando conductor inicia servicio
- `notifyServiceCompleted()`: Notifica cuando servicio se completa
- `notifyNewServiceRequest()`: Notifica a conductores sobre nueva solicitud
- `notifyNewMessage()`: Notifica sobre nuevo mensaje en chat

### Frontend

**Hook `usePushNotifications`:**

```typescript
import { usePushNotifications } from '@/lib/usePushNotifications';

function MyComponent() {
  const { isSupported, isSubscribed, subscribe, unsubscribe, isLoading } = usePushNotifications();

  return (
    <div>
      {isSupported && !isSubscribed && (
        <button onClick={subscribe} disabled={isLoading}>
          Activar Notificaciones
        </button>
      )}
      {isSubscribed && (
        <button onClick={unsubscribe} disabled={isLoading}>
          Desactivar Notificaciones
        </button>
      )}
    </div>
  );
}
```

### Service Worker

**Archivo `client/public/sw.js`:**

El service worker maneja dos eventos principales:

1. **`push`**: Recibe y muestra la notificación
2. **`notificationclick`**: Maneja clics en notificaciones para abrir la página correcta

## Eventos que Disparan Notificaciones

| Evento | Destinatario | Título | Acción |
|--------|--------------|--------|--------|
| Servicio aceptado | Cliente | "¡Grúa en camino! 🚛" | Abre tracking |
| Servicio iniciado | Cliente | "Servicio iniciado 🚀" | Abre tracking |
| Servicio completado | Cliente | "Servicio completado ✅" | Abre tracking |
| Nueva solicitud | Conductores disponibles | "Nueva solicitud de servicio 📍" | Abre dashboard |
| Nuevo mensaje | Destinatario | "Nuevo mensaje de [nombre] 💬" | Abre chat |

## Flujo de Suscripción

1. Usuario visita la aplicación
2. Hook `usePushNotifications` detecta soporte del navegador
3. Usuario hace clic en "Activar Notificaciones"
4. Se solicita permiso al navegador
5. Si se otorga permiso, se crea una suscripción
6. Suscripción se envía al backend vía `POST /api/push/subscribe`
7. Backend guarda en tabla `push_subscriptions`

## Gestión de Suscripciones Expiradas

El sistema maneja automáticamente suscripciones expiradas:

1. Al intentar enviar una notificación, si el endpoint responde con `410` o `404`
2. La suscripción se elimina automáticamente de la base de datos
3. No se generan errores visibles al usuario

## Testing

Para probar notificaciones push:

1. Configura las claves VAPID
2. Abre la aplicación en un navegador (Chrome, Firefox, Edge)
3. Acepta los permisos de notificación
4. Realiza una acción que dispare una notificación (ej: aceptar servicio)
5. Deberías ver la notificación en el sistema operativo

**⚠️ Limitaciones:**
- Safari en iOS requiere la app instalada como PWA
- Firefox requiere que el sitio sea HTTPS (o localhost)
- No funciona en modo incógnito

## Seguridad

- Las claves VAPID NUNCA deben estar en el código fuente
- Solo se almacenan en variables de entorno
- El endpoint de suscripción requiere autenticación
- Cada suscripción está asociada a un usuario específico
- Las claves de encriptación (p256dh y auth) se guardan para cada suscripción

## Troubleshooting

### "Push notifications not configured"

**Causa**: No hay claves VAPID configuradas

**Solución**: Genera y configura las claves VAPID en variables de entorno

### "No soportado"

**Causa**: El navegador no soporta Web Push API

**Solución**: Usa un navegador compatible (Chrome, Firefox, Edge, Safari 16+)

### "Permisos denegados"

**Causa**: Usuario rechazó permisos de notificación

**Solución**: El usuario debe ir a configuración del navegador y permitir notificaciones para el sitio

### Notificaciones no llegan

**Posibles causas:**
1. Claves VAPID incorrectas
2. Suscripción expirada (se limpia automáticamente)
3. Permisos del navegador bloqueados
4. Service worker no registrado correctamente

## Recursos Adicionales

- [Web Push API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [web-push NPM Package](https://www.npmjs.com/package/web-push)

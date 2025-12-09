# Plan de Correcciones - GruARD

## Estado General
- **Fecha de inicio**: 8 de diciembre, 2025
- **Última actualización**: 8 de diciembre, 2025
- **Estado**: ✅ Todas las correcciones completadas

---

## Problema 1: Verificación de Cédula en Panel Admin
**Estado**: ✅ Completado

### Descripción
Cuando se verifica la cédula de un chofer desde el panel admin, actualmente se pide ingresar el número de cédula manualmente. La lógica correcta sería mostrar la foto de la cédula que el conductor subió en el módulo de verificación para poder aprobar o rechazar manualmente.

### Cambios Realizados
1. ✅ Agregado campo `cedulaImageUrl` a la tabla `users` en el schema
2. ✅ Agregado método `uploadBase64Image` al storage-service para subir imágenes desde base64
3. ✅ Modificado endpoint `/api/identity/scan-cedula` para guardar la imagen automáticamente
4. ✅ Modificado endpoint `/api/admin/pending-cedula-verifications` para devolver la URL de la imagen
5. ✅ Actualizado el frontend admin para mostrar la imagen de la cédula en el diálogo de verificación
6. ✅ Creada migración `migrations/0011_cedula_image_url.sql`
7. ✅ Agregado `data-testid="img-cedula-preview"` a la imagen de cédula

---

## Problema 2: Error OCR - Servicio no configurado
**Estado**: ✅ Completado

### Descripción
Cuando un chofer sube su documento en el paso 1 (verificación de cédula) da el error: "El servicio de verificación OCR no está configurado."

### Cambios Realizados
1. ✅ Creado flujo alternativo cuando OCR no está configurado
2. ✅ El conductor puede subir la imagen sin OCR
3. ✅ La imagen se guarda y queda pendiente de aprobación manual por admin
4. ✅ Se muestra mensaje al usuario: "Tu cédula ha sido recibida y será verificada manualmente por un administrador."
5. ✅ Agregada validación MIME y magic bytes para seguridad
6. ✅ Limitado tamaño máximo de imagen a 5MB
7. ✅ Verificación de tamaño mínimo de buffer (12 bytes) para evitar DoS

---

## Problema 3: Clientes que desean ser Conductores
**Estado**: ✅ Completado

### Descripción
Los clientes deberían poder crear un perfil de conductor si así lo desean, sin recibir error de "usuario ya existe".

### Cambios Realizados
1. ✅ Creado endpoint `/api/drivers/become-driver` para clientes existentes
2. ✅ Permite a clientes autenticados convertirse en conductores
3. ✅ Agregada tarjeta "Convertirme en Conductor" en el perfil del cliente
4. ✅ Redirige al onboarding de conductor para completar documentos y vehículo
5. ✅ El historial del cliente se preserva (misma cuenta de usuario)
6. ✅ Obtiene usuario fresco del storage (evita datos de sesión obsoletos)
7. ✅ Actualiza la sesión con req.login() después de la conversión
8. ✅ Manejo de errores robusto con retornos 500 cuando falla la sesión

---

## Correcciones de Seguridad Aplicadas

### Upload de Imágenes (storage-service.ts)
- ✅ Validación de tipo MIME (solo JPEG, PNG, WebP, GIF permitidos)
- ✅ Verificación de tamaño mínimo de buffer (12 bytes) ANTES de acceder a magic bytes
- ✅ Validación de magic bytes para verificar que realmente es una imagen
- ✅ Límite de tamaño de archivo (5MB por defecto)
- ✅ Mensajes de error descriptivos en español

### Endpoint become-driver (routes.ts)
- ✅ Obtiene usuario fresco del storage en lugar de usar `req.user` directamente
- ✅ Valida que el userId exista en la sesión
- ✅ Retorna 404 si usuario no existe
- ✅ Retorna 500 si updatedUser es null después de la actualización
- ✅ Actualiza la sesión con `req.login()` usando Promise para manejar errores
- ✅ Retorna 500 si req.login falla

---

## Archivos Modificados

### Schema y Base de Datos
- `shared/schema.ts` - Nuevo campo `cedulaImageUrl` en tabla users
- `migrations/0011_cedula_image_url.sql` - Migración para agregar columna

### Backend
- `server/storage-service.ts` - Nuevo método `uploadBase64Image` con validación de seguridad
- `server/routes.ts` - Modificados endpoints:
  - `/api/identity/scan-cedula` - Guardar imagen y fallback sin OCR
  - `/api/admin/pending-cedula-verifications` - Devolver URL de imagen
  - `/api/drivers/become-driver` - Nuevo endpoint para conversión cliente→conductor

### Frontend
- `client/src/pages/admin/verifications.tsx` - Diálogo mejorado con imagen de cédula
- `client/src/pages/client/profile.tsx` - Card "Convertirme en Conductor"

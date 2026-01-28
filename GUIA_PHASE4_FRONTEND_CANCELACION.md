# 📋 GUÍA COMPLETA: Implementar Phase 4 (Frontend de Cancelación)

> ✅ **PARA PRINCIPIANTES SIN EXPERIENCIA**  
> Esta guía explica CADA PASO sin asumir conocimientos previos

---

## 📚 TABLA DE CONTENIDOS
1. [Conceptos Básicos](#conceptos-básicos)
2. [Archivos que Crearás](#archivos-que-crearás)
3. [Componente 1: Modal de Cancelación](#paso-1-crear-modal-de-cancelación)
4. [Componente 2: Historial de Cancelaciones](#paso-2-crear-historial-de-cancelaciones)
5. [Pruebas](#cómo-probar)

---

## ✨ CONCEPTOS BÁSICOS

Antes de empezar, necesitas entender 4 conceptos:

### 1. **¿Qué es un Componente?**
Un componente es como un "bloque de construcción" de la app. Por ejemplo:
- Un botón es un componente
- Un formulario es un componente
- Una ventana modal (emergente) es un componente

Los componentes se crean en archivos `.tsx`

### 2. **¿Qué es una Query/Mutation?**
- **Query**: Traer datos de la API (GET)
- **Mutation**: Enviar datos a la API (POST, PATCH, DELETE)

Ejemplo:
```typescript
// QUERY: Traer las razones de cancelación de la API
const { data: razones } = useQuery({
  queryKey: ['/api/razones-cancelacion'],
})

// MUTATION: Enviar cancelación a la API
const cancelMutation = useMutation({
  mutationFn: async (data) => {
    const response = await apiRequest('POST', `/api/servicios/${id}/cancelar`, data)
    return response.json()
  }
})
```

### 3. **¿Qué es "State"?**
State es la información que guarda un componente. Por ejemplo:
```typescript
const [razonSeleccionada, setRazonSeleccionada] = useState('')
// razonSeleccionada = valor actual
// setRazonSeleccionada = función para cambiar el valor
```

### 4. **¿Qué es TypeScript?**
TypeScript es JavaScript con "tipos". Especifica qué tipo de datos esperas:
```typescript
// Sin tipos (JavaScript normal)
const suma = (a, b) => a + b

// Con tipos (TypeScript)
const suma = (a: number, b: number): number => a + b
//           ↑ a es number   ↑ b es number  ↑ resultado es number
```

---

## 📂 ARCHIVOS QUE CREARÁS

Crearás **2 componentes principales**:

```
client/src/components/
├── CancelServiceModal.tsx          ← NUEVO: Modal para cancelar
└── cancellation/                   ← NUEVA CARPETA
    ├── CancellationHistory.tsx     ← NUEVO: Historial de cancelaciones
    └── CancellationCard.tsx        ← NUEVO: Tarjeta individual
```

---

## 🚀 PASO 1: CREAR MODAL DE CANCELACIÓN

### 1.1 Crear el archivo

**Ruta:** `client/src/components/CancelServiceModal.tsx`

**¿Qué hace?** Una ventana emergente que:
- Muestra las razones de cancelación
- Deja escribir notas
- Calcula la penalización
- Envía la cancelación

### 1.2 Copiar el código

```typescript
// ============================================
// IMPORTACIONES - Explica qué herramientas usamos
// ============================================
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Componentes UI (ya existen en el proyecto)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

// ============================================
// TIPOS - Define qué datos esperamos
// ============================================
interface CancelServiceModalProps {
  isOpen: boolean;           // ¿Está abierto el modal?
  onClose: () => void;       // Función para cerrar
  serviceId: string;         // ID del servicio a cancelar
  serviceCost: number;       // Costo del servicio (para mostrar penalización)
  userType: 'cliente' | 'conductor'; // Tipo de usuario
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function CancelServiceModal({
  isOpen,
  onClose,
  serviceId,
  serviceCost,
  userType,
}: CancelServiceModalProps) {
  // ====== STATE (Variables que guarda el componente) ======
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ====== QUERIES (Traer datos de la API) ======

  // QUERY 1: Traer las razones de cancelación
  const { data: reasonsData, isLoading: reasonsLoading } = useQuery({
    queryKey: ['/api/razones-cancelacion'],
    // Esta query viene PREPARADA en tu proyecto
    // No necesitas especificar queryFn, ya está configurada
  });

  // Extraer las razones del array
  const reasons = reasonsData || [];

  // QUERY 2: Traer datos del servicio (para mostrar más info)
  const { data: serviceData } = useQuery({
    queryKey: ['/api/services', serviceId],
    enabled: isOpen && !!serviceId,
  });

  // ====== MUTATIONS (Enviar datos a la API) ======
  const cancelMutation = useMutation({
    mutationFn: async () => {
      // Validar que haya razón seleccionada
      if (!selectedReason) {
        throw new Error('Selecciona una razón');
      }

      // Enviar a la API
      const response = await apiRequest('POST', `/api/servicios/${serviceId}/cancelar`, {
        razonCodigo: selectedReason,
        notasUsuario: notes || null,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al cancelar');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // ✅ Si la API responde OK:
      toast({
        title: 'Servicio cancelado',
        description: `Penalización: $${data.penalizacion?.monto || 0}`,
      });
      // Recargar datos
      queryClient.invalidateQueries({ queryKey: ['/api/services', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/my-services'] });
      // Cerrar modal
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      // ❌ Si hay error:
      toast({
        title: 'Error al cancelar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // ====== FUNCIONES AUXILIARES ======
  const resetForm = () => {
    setSelectedReason('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Encontrar la razón seleccionada en el array
  const selectedReasonData = reasons.find((r: any) => r.codigo === selectedReason);

  // ====== RENDERIZAR (Lo que ve el usuario) ======
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="cancel-service-modal">
        <DialogHeader>
          <DialogTitle data-testid="cancel-modal-title">Cancelar Servicio</DialogTitle>
          <DialogDescription data-testid="cancel-modal-description">
            Por favor, selecciona una razón y añade comentarios si es necesario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4" data-testid="cancel-form-container">
          {/* ===== SELECTOR DE RAZÓN ===== */}
          <div className="space-y-2" data-testid="reason-selector-group">
            <label className="text-sm font-medium" data-testid="label-reason">
              Razón de Cancelación *
            </label>
            {reasonsLoading ? (
              <div className="p-2 text-center text-sm text-muted-foreground">
                Cargando razones...
              </div>
            ) : (
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger data-testid="select-trigger-reason">
                  <SelectValue placeholder="Selecciona una razón..." />
                </SelectTrigger>
                <SelectContent data-testid="select-content-reason">
                  {reasons.map((reason: any) => (
                    <SelectItem
                      key={reason.codigo}
                      value={reason.codigo}
                      data-testid={`reason-option-${reason.codigo}`}
                    >
                      {reason.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* ===== CAMPO DE NOTAS ===== */}
          <div className="space-y-2" data-testid="notes-field-group">
            <label className="text-sm font-medium" data-testid="label-notes">
              Notas Adicionales (Opcional)
            </label>
            <Textarea
              placeholder="Cuéntanos más sobre tu cancelación..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              data-testid="textarea-notes"
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground" data-testid="notes-counter">
              {notes.length}/500 caracteres
            </p>
          </div>

          {/* ===== ADVERTENCIA DE PENALIZACIÓN ===== */}
          {selectedReason && (
            <Card
              className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
              data-testid="penalty-warning-card"
            >
              <CardHeader className="pb-3" data-testid="penalty-header">
                <CardTitle className="flex gap-2 text-sm" data-testid="penalty-title">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Información de Penalización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm" data-testid="penalty-content">
                <p data-testid="penalty-description">
                  {selectedReasonData?.penalizacionPredeterminada
                    ? 'Se aplicará una penalización por esta cancelación.'
                    : 'No hay penalización predeterminada por esta razón, pero puede haber cargos administrativos.'}
                </p>
                <p className="font-medium" data-testid="penalty-amount">
                  La penalización será calculada basada en el estado del servicio.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ===== BOTONES DE ACCIÓN ===== */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            data-testid="button-cancel-modal-close"
          >
            Cerrar
          </Button>
          <Button
            onClick={() => cancelMutation.mutate()}
            disabled={!selectedReason || cancelMutation.isPending}
            data-testid="button-submit-cancel"
          >
            {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 1.3 Entender el código paso a paso

**LÍNEAS 1-20: Importaciones**
```typescript
import { useState } from 'react';
// ↑ Permite guardar datos en el componente (state)

import { useMutation, useQuery } from '@tanstack/react-query';
// ↑ Permite hacer llamadas a la API

import { Dialog, ... } from '@/components/ui/dialog';
// ↑ Componentes UI listos para usar
```

**LÍNEAS 22-29: Props**
```typescript
interface CancelServiceModalProps {
  isOpen: boolean;           // ¿El modal está visible?
  onClose: () => void;       // Función para cerrarlo
  serviceId: string;         // ID del servicio
  serviceCost: number;       // Precio del servicio
  userType: 'cliente' | 'conductor'; // Tipo de usuario
}
```

**LÍNEAS 35-38: State (Variables)**
```typescript
const [selectedReason, setSelectedReason] = useState('');
// selectedReason = valor actual (inicialmente vacío)
// setSelectedReason = función para cambiar el valor
```

**LÍNEAS 40-44: Query - Traer razones**
```typescript
const { data: reasonsData, isLoading: reasonsLoading } = useQuery({
  queryKey: ['/api/razones-cancelacion'],
  // Esta es la URL de tu API (ya está creada en Phase 3)
});
```

**LÍNEAS 52-65: Mutation - Enviar cancelación**
```typescript
const cancelMutation = useMutation({
  mutationFn: async () => {
    // Validar
    if (!selectedReason) {
      throw new Error('Selecciona una razón');
    }
    // Enviar a la API
    const response = await apiRequest('POST', `/api/servicios/${serviceId}/cancelar`, {
      razonCodigo: selectedReason,
      notasUsuario: notes || null,
    });
    // Procesar respuesta
    return response.json();
  },
  onSuccess: (data) => {
    // ✅ Si funcionó
    toast({ ... });
    onClose();
  },
  onError: (error) => {
    // ❌ Si hubo error
    toast({ ... });
  },
});
```

---

## 🚀 PASO 2: CREAR HISTORIAL DE CANCELACIONES

Crearás **2 archivos**:
1. Contenedor principal
2. Tarjeta individual

### 2.1 Crear archivo principal

**Ruta:** `client/src/components/cancellation/CancellationHistory.tsx`

Primero crea la carpeta `cancellation`:
```bash
# En tu terminal, navega al directorio de componentes
mkdir -p client/src/components/cancellation
```

Luego copia este código:

```typescript
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { CancellationCard } from './CancellationCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CancellationHistoryProps {
  userId: string;           // ID del usuario
  userType: 'cliente' | 'conductor'; // Tipo
}

export function CancellationHistory({ userId, userType }: CancellationHistoryProps) {
  // ====== QUERY - Traer historial ======
  // Los endpoints están en tu API:
  // - Cliente: GET /api/usuarios/{id}/cancelaciones
  // - Conductor: GET /api/conductores/{id}/cancelaciones
  const endpoint = userType === 'cliente'
    ? `/api/usuarios/${userId}/cancelaciones`
    : `/api/conductores/${userId}/cancelaciones`;

  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint],
    enabled: !!userId, // Solo si tenemos userId
  });

  // ====== RENDERIZAR ======

  // 1. ESTADO: Cargando
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="loading-state">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 2. ESTADO: Error
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
        <CardContent className="pt-6" data-testid="error-state">
          <p className="text-sm text-red-700 dark:text-red-400">
            Error al cargar cancelaciones: {(error as Error).message}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Extraer datos
  const cancelaciones = data?.ultimas_cancelaciones || [];
  const totalCancelaciones = data?.total_cancelaciones || 0;
  const penalizacionesTotales = data?.penalizaciones_totales || 0;

  // 3. ESTADO: No hay cancelaciones
  if (cancelaciones.length === 0) {
    return (
      <Card className="border-dashed" data-testid="empty-state">
        <CardContent className="pt-6 text-center" data-testid="empty-message">
          <p className="text-muted-foreground">No hay cancelaciones registradas</p>
        </CardContent>
      </Card>
    );
  }

  // 4. ESTADO: Mostrar cancelaciones
  return (
    <div className="space-y-4" data-testid="cancellations-list">
      {/* ===== RESUMEN ===== */}
      <Card className="bg-muted" data-testid="cancellations-summary">
        <CardHeader data-testid="summary-header">
          <CardTitle className="text-lg" data-testid="summary-title">
            Resumen de Cancelaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4" data-testid="summary-stats">
          <div data-testid="stat-total">
            <p className="text-sm text-muted-foreground">Total de Cancelaciones</p>
            <p className="text-2xl font-bold">{totalCancelaciones}</p>
          </div>
          <div data-testid="stat-penalties">
            <p className="text-sm text-muted-foreground">Penalizaciones Totales</p>
            <p className="text-2xl font-bold text-destructive">
              ${penalizacionesTotales.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ===== LISTA DE CANCELACIONES ===== */}
      <div className="space-y-2" data-testid="cancellations-cards">
        {cancelaciones.map((cancel: any, index: number) => (
          <CancellationCard
            key={cancel.servicio_id || index}
            cancellation={cancel}
            data-testid={`cancellation-card-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
```

### 2.2 Crear tarjeta individual

**Ruta:** `client/src/components/cancellation/CancellationCard.tsx`

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CancellationCardProps {
  cancellation: {
    servicio_id: string;
    fecha: string;
    penalizacion: number;
    razon: string;
    estado: string;
  };
}

export function CancellationCard({ cancellation }: CancellationCardProps) {
  // ====== FUNCIONES AUXILIARES ======

  // Cambiar color según penalización
  const getPenaltyColor = (amount: number): string => {
    if (amount === 0) return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200';
    if (amount < 10) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
  };

  // Cambiar color según estado
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'rechazado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Convertir fecha a formato legible
  const formattedDate = format(
    new Date(cancellation.fecha),
    "d 'de' MMMM 'de' yyyy 'a las' HH:mm",
    { locale: es }
  );

  // ====== RENDERIZAR ======
  return (
    <Card className="hover-elevate" data-testid={`card-cancellation-${cancellation.servicio_id}`}>
      <CardContent className="pt-6" data-testid="cancellation-content">
        {/* ===== FILA 1: Razón y Estado ===== */}
        <div className="mb-4 flex items-start justify-between gap-2" data-testid="header-row">
          <div className="flex-1" data-testid="reason-section">
            <p className="text-sm font-medium" data-testid="reason-title">Razón</p>
            <p className="text-sm text-muted-foreground" data-testid="reason-value">
              {cancellation.razon}
            </p>
          </div>
          <Badge className={getStatusColor(cancellation.estado)} data-testid="status-badge">
            {cancellation.estado}
          </Badge>
        </div>

        {/* ===== FILA 2: Fecha y Penalización ===== */}
        <div className="grid grid-cols-2 gap-4" data-testid="details-row">
          {/* Fecha */}
          <div data-testid="date-section">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Fecha
            </div>
            <p className="text-sm" data-testid="date-value">
              {formattedDate}
            </p>
          </div>

          {/* Penalización */}
          <div data-testid="penalty-section">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Penalización
            </div>
            <Badge
              className={getPenaltyColor(cancellation.penalizacion)}
              data-testid="penalty-badge"
            >
              ${cancellation.penalizacion.toFixed(2)}
            </Badge>
          </div>
        </div>

        {/* ===== ADVERTENCIA: Si hay penalización alta ===== */}
        {cancellation.penalizacion > 20 && (
          <div
            className="mt-4 flex gap-2 rounded-md bg-amber-50 p-2 dark:bg-amber-950"
            data-testid="high-penalty-warning"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-700 dark:text-amber-200" data-testid="warning-text">
              Esta penalización fue significativa. Si crees que es injusta, puedes apelar dentro de
              7 días.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2.3 Entender estos componentes

**CancellationHistory:**
- Trae datos de la API
- Muestra un resumen
- Maneja estados (cargando, error, vacío)
- Renderiza múltiples `CancellationCard`

**CancellationCard:**
- Componente pequeño
- Muestra una cancelación individual
- Cambia colores según penalización
- Muestra advertencias si es necesario

---

## 🔗 PASO 3: INTEGRAR EN PÁGINAS EXISTENTES

### 3.1 En Perfil del Cliente

**Archivo:** `client/src/pages/client/profile.tsx`

Busca la sección donde quieres añadir el historial y añade:

```typescript
// Al principio del archivo, en las importaciones:
import { CancellationHistory } from '@/components/cancellation/CancellationHistory';

// En el componente, dentro del JSX, añade una nueva sección:
<div className="space-y-6">
  {/* ... otras secciones ... */}
  
  {/* Nueva sección: Historial de Cancelaciones */}
  <Card data-testid="section-cancellation-history">
    <CardHeader data-testid="cancellation-history-header">
      <CardTitle data-testid="cancellation-history-title">
        Historial de Cancelaciones
      </CardTitle>
      <CardDescription data-testid="cancellation-history-desc">
        Ver todas tus cancelaciones y penalizaciones
      </CardDescription>
    </CardHeader>
    <CardContent data-testid="cancellation-history-content">
      <CancellationHistory userId={user.id} userType="cliente" />
    </CardContent>
  </Card>
</div>
```

### 3.2 En Perfil del Conductor

**Archivo:** `client/src/pages/driver/profile.tsx`

Lo mismo pero con `userType="conductor"`:

```typescript
import { CancellationHistory } from '@/components/cancellation/CancellationHistory';

// En el JSX:
<CancellationHistory userId={user.id} userType="conductor" />
```

### 3.3 Usar el Modal en Home del Cliente

**Archivo:** `client/src/pages/client/home.tsx`

Busca donde muestres los servicios activos y añade el botón:

```typescript
// Importar al inicio
import { CancelServiceModal } from '@/components/CancelServiceModal';

// En el componente, añade state para controlar el modal:
const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
const [selectedServiceForCancel, setSelectedServiceForCancel] = useState<string | null>(null);

// En cada tarjeta de servicio, añade un botón:
<Button
  variant="destructive"
  size="sm"
  onClick={() => {
    setSelectedServiceForCancel(service.id);
    setIsCancelModalOpen(true);
  }}
  data-testid={`button-cancel-service-${service.id}`}
>
  Cancelar Servicio
</Button>

// Al final del componente, antes del cierre, añade:
{selectedServiceForCancel && (
  <CancelServiceModal
    isOpen={isCancelModalOpen}
    onClose={() => {
      setIsCancelModalOpen(false);
      setSelectedServiceForCancel(null);
    }}
    serviceId={selectedServiceForCancel}
    serviceCost={service.costoTotal}
    userType="cliente"
  />
)}
```

---

## ✅ CÓMO PROBAR

### Paso 1: Asegúrate de que el servidor está corriendo

Abre el panel de "Workflows" en Replit y verifica que "Start application" está corriendo (verde).

### Paso 2: Prueba la API directamente

Abre tu app en el navegador y abre las DevTools (F12).

En la consola, ejecuta:
```javascript
// Probar si la API de razones funciona
fetch('/api/razones-cancelacion')
  .then(r => r.json())
  .then(d => console.log(d))
```

Deberías ver un array de razones.

### Paso 3: Prueba el componente

1. Navega a una página del cliente (home)
2. Deberías ver un botón "Cancelar Servicio"
3. Haz click
4. Debería abrirse el modal
5. Selecciona una razón
6. Haz click en "Confirmar Cancelación"
7. Deberías ver un toast con el resultado

### Paso 4: Prueba el historial

1. Navega a tu perfil (cliente o conductor)
2. Desplázate hacia abajo
3. Deberías ver "Historial de Cancelaciones"
4. Si tienes cancelaciones, deberías verlas listadas
5. Si no tienes, deberías ver "No hay cancelaciones registradas"

---

## 🐛 SOLUCIONAR PROBLEMAS

### Problema: "No puedo ver el modal"
**Solución:**
- Verifica que importaste `CancelServiceModal` correctamente
- Verifica que agregaste el `{selectedServiceForCancel && ...}` al final

### Problema: "Error: Cannot find module"
**Solución:**
- Asegúrate de que los imports usan `@/components/...` (con la @)
- Verifica que los archivos están en las rutas correctas

### Problema: "El historial está vacío"
**Solución:**
- Ve a la consola del navegador y verifica que la API retorna datos
- Verifica que tienes cancelaciones registradas en la base de datos

### Problema: "Las razones no cargan"
**Solución:**
- Ve a DevTools > Network
- Busca la request a `/api/razones-cancelacion`
- Verifica que retorna un array con datos
- Si no, el endpoint puede estar caído

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Creé `CancelServiceModal.tsx`
- [ ] Creé la carpeta `cancellation/`
- [ ] Creé `CancellationHistory.tsx`
- [ ] Creé `CancellationCard.tsx`
- [ ] Importé `CancelServiceModal` en `client/home.tsx`
- [ ] Agregué estado para el modal en `client/home.tsx`
- [ ] Agregué el botón de cancelar en cada servicio
- [ ] Agregué el componente `CancelServiceModal` al final de la página
- [ ] Importé `CancellationHistory` en `client/profile.tsx`
- [ ] Agregué la sección de historial en el perfil
- [ ] Importé `CancellationHistory` en `driver/profile.tsx`
- [ ] Agregué la sección de historial en el perfil del conductor
- [ ] Probé que el modal abre
- [ ] Probé que el historial carga
- [ ] Verifiqué que los tosts funcionan
- [ ] Sin errores en la consola

---

## 📞 PRÓXIMOS PASOS

Una vez termines esta guía:

1. Ejecuta `npm run dev` para reiniciar
2. Abre la app en el navegador
3. Prueba todos los pasos del "CÓMO PROBAR"
4. Si todo funciona, avísame para hacer la revisión final


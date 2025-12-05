# Plan de Optimización de Carga - Grúa RD

## Resumen Ejecutivo

Este documento presenta un plan comprehensivo para mejorar la velocidad de carga de la aplicación Grúa RD. Las optimizaciones están organizadas por prioridad y área de impacto.

---

## Estado de Implementación - Fase 1

| Tarea | Estado | Notas |
|-------|--------|-------|
| 1.1 Code Splitting Manual Chunks | BLOQUEADO | No se puede editar vite.config.ts por restricciones del sistema |
| 1.2 Lazy Loading Componentes | PARCIAL | Creados lazy-chart.tsx, lazy-calendar.tsx, lazy-carousel.tsx. Calendar integrado en analytics.tsx. Nota: Recharts se importa directamente en analytics.tsx, requiere refactoring mayor para lazy-load |
| 1.3 CSS Crítico Inline | COMPLETADO | Agregado en client/index.html con soporte dark mode |
| 1.4 Compresión Backend | COMPLETADO | Middleware compression agregado en server/index.ts (nivel 6) |

### Archivos Creados/Modificados (Fase 1)

**Nuevos archivos:**
- `client/src/components/ui/lazy-chart.tsx` - Lazy loading para ChartContainer y componentes relacionados
- `client/src/components/ui/lazy-calendar.tsx` - Lazy loading para Calendar con skeleton
- `client/src/components/ui/lazy-carousel.tsx` - Lazy loading para Carousel con skeleton

**Archivos modificados:**
- `client/index.html` - CSS crítico inline para estado de carga inicial
- `server/index.ts` - Middleware de compresión gzip (nivel 6)

### Uso de Componentes Lazy

```typescript
// Antes (carga síncrona)
import { ChartContainer } from '@/components/ui/chart';
import { Calendar } from '@/components/ui/calendar';

// Después (carga lazy)
import { LazyChartContainer } from '@/components/ui/lazy-chart';
import { LazyCalendar } from '@/components/ui/lazy-calendar';

// Uso igual que antes
<LazyChartContainer config={chartConfig}>
  <BarChart data={data}>...</BarChart>
</LazyChartContainer>

<LazyCalendar mode="range" selected={dateRange} />
```

### Limitaciones Conocidas

1. **Recharts directo en analytics.tsx**: La página de analytics importa componentes de Recharts directamente (LineChart, BarChart, etc.) en lugar de usar el wrapper ChartContainer. Esto requiere refactoring mayor para lazy-load.

2. **vite.config.ts bloqueado**: No se puede configurar manualChunks para code splitting de vendors.

---

## Diagnóstico Actual

### Fortalezas Existentes
- Lazy loading de páginas con `React.lazy()`
- Preconexiones DNS para Mapbox y Google Fonts
- Service Worker con cache de assets
- Precarga de módulos para conductores

### Áreas de Mejora Identificadas
1. **Sin code splitting avanzado** - Todo el código vendor en un solo chunk
2. **Librerías pesadas cargadas síncronamente** - Recharts (~200KB), Mapbox GL (~500KB)
3. **48 componentes UI** - Todos incluidos en bundle principal
4. **Fonts externos** - Dependencia de Google Fonts (red request)
5. **Service Worker básico** - No pre-cachea assets de build
6. **Sin compresión de respuestas** - API sin gzip/brotli
7. **CSS no crítico bloqueante** - Todo el CSS carga antes del render

---

## Fase 1: Optimizaciones de Alto Impacto (Inmediatas)

### 1.1 Code Splitting con Vite Manual Chunks

**Archivo:** `vite.config.ts`

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-dom/client'],
        'vendor-query': ['@tanstack/react-query'],
        'vendor-router': ['wouter'],
        'vendor-ui-radix': [
          '@radix-ui/react-dialog',
          '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-tabs',
          '@radix-ui/react-select',
          '@radix-ui/react-toast',
          '@radix-ui/react-tooltip',
        ],
        'vendor-maps': ['mapbox-gl', 'react-map-gl'],
        'vendor-charts': ['recharts'],
        'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
        'vendor-animations': ['framer-motion'],
      },
    },
  },
}
```

**Impacto esperado:** Reducción de ~40% en tamaño de chunk inicial

---

### 1.2 Lazy Loading de Componentes Pesados

**Componentes a lazy-load:**

| Componente | Tamaño Estimado | Uso |
|------------|-----------------|-----|
| Chart (recharts) | ~200KB | Solo en páginas analytics |
| MapboxMap | ~500KB | Solo cuando se necesita mapa |
| Calendar | ~50KB | Solo en formularios de fecha |
| Carousel | ~30KB | Uso limitado |

**Implementación:**

```typescript
// Crear: client/src/components/ui/LazyChart.tsx
import { lazy, Suspense } from 'react';
import { Skeleton } from './skeleton';

const ChartContainer = lazy(() => 
  import('./chart').then(m => ({ default: m.ChartContainer }))
);

export function LazyChartContainer(props) {
  return (
    <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
      <ChartContainer {...props} />
    </Suspense>
  );
}
```

---

### 1.3 Optimización de CSS Crítico

**Archivo:** `client/index.html`

Agregar CSS crítico inline para evitar flash de contenido:

```html
<style>
  /* Critical CSS - Loading state */
  #root:empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #f8f9fa;
  }
  #root:empty::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 3px solid #0F2947;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .dark #root:empty {
    background: #0a0a0a;
  }
  .dark #root:empty::after {
    border-color: #ffffff;
    border-top-color: transparent;
  }
</style>
```

---

### 1.4 Compresión de Respuestas del Backend

**Archivo:** `server/index.ts`

```typescript
import compression from 'compression';

// Antes de las rutas
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6, // Balance entre velocidad y compresión
}));
```

**Impacto esperado:** Reducción de ~70% en tamaño de transferencia

---

## Fase 2: Optimizaciones de Medio Impacto

### 2.1 Fuentes Self-Hosted

**Problema:** Dependencia de Google Fonts agrega 2-3 requests de red

**Solución:** Descargar Inter font y servirla localmente

```css
/* client/src/fonts.css */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/inter-400.woff2') format('woff2');
}
/* ... más weights */
```

**Cambios en index.html:**
- Remover `<link>` a Google Fonts
- Agregar `<link rel="preload" href="/fonts/inter-400.woff2" as="font" crossorigin>`

---

### 2.2 Service Worker Mejorado

**Archivo:** `client/public/sw.js`

Agregar precache de chunks de build:

```javascript
// Después del install event
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Los chunks de build se agregarán dinámicamente con workbox
];

// Estrategia stale-while-revalidate para JS/CSS
self.addEventListener('fetch', (event) => {
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
});
```

---

### 2.3 Preload de Rutas por Rol

**Archivo:** `client/src/lib/preload.ts`

Mejorar precarga basada en rol de usuario:

```typescript
export function preloadByUserType(userType: string) {
  const modulesByType = {
    cliente: [
      () => import('@/pages/client/home'),
      () => import('@/pages/client/tracking'),
      () => import('@/components/maps/MapboxMap'),
    ],
    conductor: [
      () => import('@/pages/driver/dashboard'),
      () => import('@/pages/driver/profile'),
      () => import('@/components/maps/MapboxMap'),
    ],
    admin: [
      () => import('@/pages/admin/dashboard'),
      () => import('@/components/ui/chart'),
    ],
  };

  const modules = modulesByType[userType] || [];
  modules.forEach((load, i) => {
    setTimeout(() => load().catch(() => {}), i * 100);
  });
}
```

---

### 2.4 Optimización del AuthProvider

**Problema:** Fetch de `/api/auth/me` bloquea renderizado inicial

**Solución:** Usar session token en cookie para verificación instantánea

```typescript
// En client/src/lib/auth.tsx
export function AuthProvider({ children }) {
  // Check cookie existence first for instant feedback
  const hasCookie = document.cookie.includes('connect.sid');
  const [quickCheck, setQuickCheck] = useState(!hasCookie);

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: hasCookie, // Only fetch if cookie exists
    // ...
  });

  if (!hasCookie && isLoading) {
    // No cookie = definitely not logged in
    // Render login immediately
  }
}
```

---

## Fase 3: Optimizaciones Avanzadas

### 3.1 Skeleton Screens Mejorados

Crear skeletons específicos para cada tipo de página:

```typescript
// client/src/components/skeletons/DashboardSkeleton.tsx
export function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" /> {/* Title */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" /> {/* Stats card */}
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-[300px]" /> {/* Map area */}
    </div>
  );
}
```

---

### 3.2 React Query Optimizations

```typescript
// client/src/lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 5, // 5 minutes (antes cacheTime)
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});
```

---

### 3.3 Imágenes Optimizadas

- Convertir PNG/JPG a WebP
- Lazy loading nativo: `<img loading="lazy">`
- Agregar dimensiones explícitas para evitar CLS

```typescript
// Componente de imagen optimizada
export function OptimizedImage({ src, alt, width, height, ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}
```

---

### 3.4 Preload Link Tags Dinámicos

Agregar hints de recursos al index.html dinámicamente:

```html
<!-- En index.html head -->
<link rel="modulepreload" href="/src/main.tsx" />

<!-- Script para preload dinámico -->
<script>
  // Preload based on stored user type
  const userType = localStorage.getItem('lastUserType');
  if (userType === 'conductor') {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = '/src/pages/driver/dashboard.tsx';
    document.head.appendChild(link);
  }
</script>
```

---

## Fase 4: Monitoreo y Métricas

### 4.1 Implementar Web Vitals Tracking

```typescript
// client/src/lib/analytics.ts
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

export function initWebVitals() {
  const report = (metric) => {
    console.log(metric.name, metric.value);
    // Enviar a analytics si disponible
  };

  onCLS(report);
  onFID(report);
  onLCP(report);
  onFCP(report);
  onTTFB(report);
}
```

### 4.2 Bundle Analysis

Comando para analizar bundle:

```bash
npx vite-bundle-visualizer
```

---

## Orden de Implementación Recomendado

| Prioridad | Tarea | Impacto | Esfuerzo |
|-----------|-------|---------|----------|
| 1 | Code splitting (1.1) | Alto | Bajo |
| 2 | Compresión backend (1.4) | Alto | Bajo |
| 3 | CSS crítico inline (1.3) | Medio | Bajo |
| 4 | Lazy load charts (1.2) | Medio | Medio |
| 5 | Preload por rol (2.3) | Medio | Bajo |
| 6 | Service Worker mejorado (2.2) | Medio | Medio |
| 7 | Self-hosted fonts (2.1) | Bajo | Medio |
| 8 | AuthProvider optimizado (2.4) | Medio | Medio |
| 9 | Skeletons mejorados (3.1) | Bajo | Bajo |
| 10 | Web Vitals (4.1) | Monitoreo | Bajo |

---

## Métricas Objetivo

| Métrica | Actual (estimado) | Objetivo |
|---------|-------------------|----------|
| FCP (First Contentful Paint) | ~2.5s | < 1.5s |
| LCP (Largest Contentful Paint) | ~4.0s | < 2.5s |
| TTI (Time to Interactive) | ~5.0s | < 3.5s |
| Bundle Size (main chunk) | ~1.5MB | < 500KB |
| Total Transfer (gzipped) | ~800KB | < 300KB |

---

## Notas Importantes

1. **No modificar:** `vite.config.ts` (estructura), `server/vite.ts`
2. **Testear:** Cada optimización en ambiente de desarrollo antes de producción
3. **Medir:** Usar Lighthouse antes/después de cada cambio
4. **Rollback:** Mantener versiones anteriores disponibles

---

## Próximos Pasos

Espero tus instrucciones para comenzar con la implementación. Recomiendo empezar por:
1. **Fase 1.1** - Code splitting con Vite manual chunks
2. **Fase 1.4** - Compresión de respuestas del backend

Estas dos optimizaciones tienen el mayor impacto con el menor riesgo.

---

*Documento creado: Diciembre 2024*
*Autor: Agente de Desarrollo*

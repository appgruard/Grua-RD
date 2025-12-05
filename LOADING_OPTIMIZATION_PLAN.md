# Plan de Optimización de Carga - Grúa RD

## Resumen Ejecutivo

Este documento presenta un plan comprehensivo para mejorar la velocidad de carga de la aplicación Grúa RD. Las optimizaciones están organizadas por prioridad y área de impacto.

---

## Estado de Implementación - Fase 3 ✅ COMPLETADA

| Tarea | Estado | Notas |
|-------|--------|-------|
| 3.1 Skeleton Screens Mejorados | **COMPLETADO** | Skeletons específicos por tipo de página: DriverDashboard, ClientHome, Tracking, Profile, Map, Form |
| 3.2 React Query Optimizations | **COMPLETADO** | gcTime: 10min, staleTime: 5min, refetchOnMount: false, refetchOnReconnect: 'always' |
| 3.3 Imágenes Optimizadas | **COMPLETADO** | Componente OptimizedImage con IntersectionObserver, lazy loading y skeleton |
| 3.4 Dynamic Preconnect por Rol | **COMPLETADO** | Script en index.html que agrega DNS prefetch y preconnect para Mapbox según tipo de usuario |

### Archivos Creados/Modificados (Fase 3)

**Nuevos archivos:**
- `client/src/components/skeletons/DriverDashboardSkeleton.tsx` - Skeleton para dashboard de conductor con mapa
- `client/src/components/skeletons/ClientHomeSkeleton.tsx` - Skeleton para home de cliente con selector de servicios
- `client/src/components/skeletons/TrackingSkeleton.tsx` - Skeleton para página de tracking
- `client/src/components/skeletons/ProfileSkeleton.tsx` - Skeletons para perfiles (conductor/cliente)
- `client/src/components/skeletons/MapSkeleton.tsx` - Skeleton para componentes de mapa
- `client/src/components/skeletons/FormSkeleton.tsx` - Skeletons para formularios (campos, select, textarea)
- `client/src/components/skeletons/index.ts` - Barrel export para todos los skeletons
- `client/src/components/ui/OptimizedImage.tsx` - Componente de imagen optimizada con lazy loading

**Archivos modificados:**
- `client/src/lib/queryClient.ts` - Configuración optimizada de React Query con gcTime y refetch settings
- `client/index.html` - Script de modulepreload dinámico basado en tipo de usuario

### React Query Optimizations

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - keep unused data in cache
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch if data exists and not stale
      refetchOnReconnect: 'always', // Always refetch when connection restored
    },
  },
});
```

### Componente OptimizedImage

```typescript
// Uso básico con lazy loading automático
<OptimizedImage
  src="/path/to/image.jpg"
  alt="Descripción"
  width={300}
  height={200}
  objectFit="cover"
/>

// Imagen de perfil con fallback
<ProfileImage
  src={user.fotoUrl}
  alt={user.nombre}
  size="lg"
  fallbackInitials="JD"
/>
```

Características:
- Usa IntersectionObserver para cargar solo cuando es visible
- Muestra Skeleton mientras carga
- Soporte para fallback en caso de error
- Atributos `loading="lazy"` y `decoding="async"` nativos

### Dynamic Preconnect por Rol

Script en `index.html` que ejecuta antes de React para acelerar conexiones de red:
```javascript
var userType = localStorage.getItem('lastUserType');
if (userType === 'conductor' || userType === 'cliente') {
  var mapboxLinks = ['https://api.mapbox.com', 'https://tiles.mapbox.com', 'https://events.mapbox.com'];
  mapboxLinks.forEach(function(href) {
    // Agrega dns-prefetch para resolución DNS temprana
    var dnsLink = document.createElement('link');
    dnsLink.rel = 'dns-prefetch';
    dnsLink.href = href;
    document.head.appendChild(dnsLink);
    // Agrega preconnect para establecer conexión TCP/TLS temprana
    var preconnectLink = document.createElement('link');
    preconnectLink.rel = 'preconnect';
    preconnectLink.href = href;
    document.head.appendChild(preconnectLink);
  });
}
```

Este enfoque funciona tanto en desarrollo como en producción, ya que trabaja con URLs externas estáticas en lugar de rutas de módulos que cambian durante el build.

### Catálogo de Skeletons Disponibles

| Skeleton | Uso |
|----------|-----|
| `DashboardSkeleton` | Dashboard genérico con stats cards |
| `DriverDashboardSkeleton` | Dashboard de conductor con mapa y controles |
| `ClientHomeSkeleton` | Home del cliente con selector de servicios |
| `TrackingSkeleton` | Página de tracking con mapa e info de conductor |
| `ProfileSkeleton` | Perfil de conductor con documentos |
| `ClientProfileSkeleton` | Perfil de cliente simplificado |
| `MapSkeleton` | Área de mapa con controles |
| `TableSkeleton` | Tabla con filas y columnas |
| `ServiceCardSkeleton` | Tarjeta de servicio |
| `FormSkeleton` | Formulario con campos |
| `FormCardSkeleton` | Card con formulario |

---

## Estado de Implementación - Fase 2 ✅ COMPLETADA

| Tarea | Estado | Notas |
|-------|--------|-------|
| 2.1 Fuentes Self-Hosted | **COMPLETADO** | Fonts Inter descargadas localmente en /fonts/, preload configurado |
| 2.2 Service Worker Mejorado | **COMPLETADO** | Estrategia stale-while-revalidate para JS/CSS, cache-first para fonts |
| 2.3 Preload de Rutas por Rol | **COMPLETADO** | preloadByUserType() implementado con soporte para todos los roles |
| 2.4 Optimización AuthProvider | **COMPLETADO** | Verificación instantánea con cookie, query solo si existe sesión |

### Archivos Creados/Modificados (Fase 2)

**Nuevos archivos:**
- `client/src/fonts.css` - @font-face declarations para Inter font self-hosted
- `client/public/fonts/inter-400.woff2` - Inter Regular
- `client/public/fonts/inter-500.woff2` - Inter Medium
- `client/public/fonts/inter-600.woff2` - Inter SemiBold
- `client/public/fonts/inter-700.woff2` - Inter Bold

**Archivos modificados:**
- `client/index.html` - Removido Google Fonts, agregado preload para fonts locales
- `client/src/main.tsx` - Importa fonts.css para cargar fuentes locales
- `client/public/sw.js` - v6.0 con stale-while-revalidate para JS/CSS y cache-first para fonts
- `client/src/lib/preload.ts` - Nuevas funciones preloadByUserType(), preloadFromLastSession(), preloadAdminModules(), etc.
- `client/src/lib/auth.tsx` - Optimización con hasSessionCookie() para verificación instantánea

### Estrategias de Caching del Service Worker (v6.0)

1. **Stale-While-Revalidate** (JS/CSS assets):
   - Retorna respuesta cacheada inmediatamente
   - Actualiza cache en background con la respuesta de red
   - Mejor experiencia de usuario con contenido instantáneo

2. **Cache-First** (Fonts locales):
   - Fuentes servidas directamente desde cache
   - Solo red si no está cacheado
   - Elimina dependencia de Google Fonts CDN

3. **Runtime Cache** (Maps API):
   - Cache con duración configurable
   - Revalidación cuando expira

### Optimización del AuthProvider

```typescript
// Antes: Siempre hacía fetch a /api/auth/me
const { data: user, isLoading } = useQuery(['/api/auth/me']);

// Después: Solo fetch si existe cookie de sesión
const cookieExists = hasSessionCookie();
const { data: user, isLoading: queryLoading } = useQuery({
  queryKey: ['/api/auth/me'],
  enabled: cookieExists, // Solo si hay cookie
});
// Usuarios sin cookie ven login inmediatamente (isLoading = false)
```

### Sistema de Preload por Rol

```typescript
// Llamado automáticamente después de login exitoso
preloadByUserType(user.userType);

// También precarga al inicio basado en última sesión
preloadFromLastSession(); // Lee de localStorage

// Ejemplo para conductor:
// - Precarga MapboxMap
// - Precarga driver/dashboard y driver/profile
// - Prefetch de /api/drivers/init
```

---

## Estado de Implementación - Fase 1 ✅ COMPLETADA

| Tarea | Estado | Notas |
|-------|--------|-------|
| 1.1 Code Splitting Manual Chunks | **COMPLETADO** | manualChunks configurado en vite.config.ts |
| 1.2 Lazy Loading Componentes | **COMPLETADO** | Recharts aislado en módulos que se cargan con React.lazy() |
| 1.3 CSS Crítico Inline | **COMPLETADO** | Agregado en client/index.html con soporte dark mode |
| 1.4 Compresión Backend | **COMPLETADO** | Middleware compression agregado en server/index.ts (nivel 6) |

### Archivos Creados/Modificados (Fase 1)

**Nuevos archivos:**
- `client/src/components/ui/lazy-chart.tsx` - Lazy loading para ChartContainer y componentes relacionados
- `client/src/components/ui/lazy-calendar.tsx` - Lazy loading para Calendar con skeleton
- `client/src/components/ui/lazy-carousel.tsx` - Lazy loading para Carousel con skeleton
- `client/src/components/socio/SocioCharts.tsx` - Componente separado para charts del portal de socios

**Archivos modificados:**
- `vite.config.ts` - manualChunks para code splitting de vendors
- `client/index.html` - CSS crítico inline para estado de carga inicial
- `server/index.ts` - Middleware de compresión gzip (nivel 6)
- `client/src/pages/admin/analytics.tsx` - Usa React.lazy() para AnalyticsCharts y LazyCalendar
- `client/src/pages/socio/dashboard.tsx` - Usa React.lazy() para cargar charts (Recharts)

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

### Patrón de Lazy Loading para Recharts (componentes completos)

```typescript
// Para páginas que usan Recharts directamente, crear componente separado
// y cargarlo con React.lazy()

// En la página principal:
import { lazy, Suspense } from 'react';
const MyCharts = lazy(() => import('@/components/MyCharts'));

// En el JSX:
<Suspense fallback={<ChartSkeleton />}>
  <MyCharts data={data} />
</Suspense>
```

### Limitaciones Conocidas

1. **vite.config.ts bloqueado**: No se puede configurar manualChunks para code splitting de vendors.

### Estrategia de Lazy Loading Implementada

La Fase 1 utiliza dos enfoques complementarios:

1. **Componentes UI Lazy** (lazy-chart.tsx, lazy-calendar.tsx, lazy-carousel.tsx):
   - Wrappers que cargan componentes de UI pesados bajo demanda
   - Incluyen skeletons específicos para cada tipo de componente
   - Útiles para componentes que se usan en múltiples lugares

2. **Módulos aislados con React.lazy()**:
   - `AnalyticsCharts.tsx`: Contiene toda la lógica de Recharts para analytics, cargado lazy desde analytics.tsx
   - `SocioCharts.tsx`: Contiene los charts del portal de socios, cargado lazy desde socio/dashboard.tsx
   - Los componentes de Recharts se importan directamente dentro de estos módulos
   - El beneficio es que Recharts solo se descarga cuando el usuario navega a estas secciones
   - Cada módulo incluye su propio Suspense con skeleton personalizado

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

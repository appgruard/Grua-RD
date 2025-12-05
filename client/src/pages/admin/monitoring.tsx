import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapboxMapWithFastLoad } from '@/components/maps/LazyMapboxMap';
import type { MarkerType } from '@/components/maps/MapboxMap';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleOff, Circle, MapPinOff } from 'lucide-react';
import type { Conductor, User } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type ConductorWithUser = Conductor & { user: User };

const DEFAULT_CENTER = { lat: 18.4861, lng: -69.9312 };

function calculateOperatorsCentroid(
  drivers: Array<{ lat: number; lng: number }>
): { center: { lat: number; lng: number }; zoom: number } {
  if (drivers.length === 0) {
    return { center: DEFAULT_CENTER, zoom: 12 };
  }
  
  if (drivers.length === 1) {
    return { center: drivers[0], zoom: 14 };
  }
  
  const lats = drivers.map(d => d.lat);
  const lngs = drivers.map(d => d.lng);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);
  
  let zoom = 14;
  if (maxDiff > 0.5) zoom = 10;
  else if (maxDiff > 0.2) zoom = 11;
  else if (maxDiff > 0.1) zoom = 12;
  else if (maxDiff > 0.05) zoom = 13;
  
  return { center: { lat: centerLat, lng: centerLng }, zoom };
}

function getLastSeenText(date: Date | string | null | undefined): string {
  if (!date) return 'Desconocido';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: es });
  } catch {
    return 'Desconocido';
  }
}

function hasLocation(driver: ConductorWithUser): boolean {
  return !!(driver.ubicacionLat && driver.ubicacionLng);
}

export default function AdminMonitoring() {
  const [viewFilter, setViewFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  const { data: allDrivers } = useQuery<ConductorWithUser[]>({
    queryKey: ['/api/admin/monitoring-drivers'],
    refetchInterval: 10000,
  });

  const allActiveDrivers = useMemo(() => 
    allDrivers?.filter(d => d.disponible) || [],
    [allDrivers]
  );

  const allInactiveDrivers = useMemo(() => 
    allDrivers?.filter(d => !d.disponible) || [],
    [allDrivers]
  );

  const activeDriversWithLocation = useMemo(() => 
    allActiveDrivers.filter(hasLocation),
    [allActiveDrivers]
  );

  const inactiveDriversWithLocation = useMemo(() => 
    allInactiveDrivers.filter(hasLocation),
    [allInactiveDrivers]
  );

  const markers = useMemo(() => {
    const allMarkers: Array<{
      position: { lat: number; lng: number };
      title: string;
      type: MarkerType;
    }> = [];

    if (viewFilter === 'all' || viewFilter === 'active') {
      activeDriversWithLocation.forEach((driver) => {
        allMarkers.push({
          position: {
            lat: parseFloat(driver.ubicacionLat as string),
            lng: parseFloat(driver.ubicacionLng as string),
          },
          title: `${driver.user.nombre} ${driver.user.apellido}`,
          type: 'driver' as const,
        });
      });
    }

    if (viewFilter === 'all' || viewFilter === 'inactive') {
      inactiveDriversWithLocation.forEach((driver) => {
        allMarkers.push({
          position: {
            lat: parseFloat(driver.ubicacionLat as string),
            lng: parseFloat(driver.ubicacionLng as string),
          },
          title: `${driver.user.nombre} ${driver.user.apellido} (Inactivo)`,
          type: 'driver_inactive' as const,
        });
      });
    }

    return allMarkers;
  }, [activeDriversWithLocation, inactiveDriversWithLocation, viewFilter]);
  
  const { center, zoom } = useMemo(() => {
    const driverPositions = markers.map(m => m.position);
    return calculateOperatorsCentroid(driverPositions);
  }, [markers]);

  const driversToShow = useMemo(() => {
    if (viewFilter === 'active') return allActiveDrivers;
    if (viewFilter === 'inactive') return allInactiveDrivers;
    return [...allActiveDrivers, ...allInactiveDrivers];
  }, [allActiveDrivers, allInactiveDrivers, viewFilter]);

  const totalOperators = (allDrivers?.length || 0);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Monitoreo en Tiempo Real</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="p-4 h-[600px]">
            <MapboxMapWithFastLoad
              center={center}
              zoom={zoom}
              markers={markers}
              className="w-full h-full"
            />
          </Card>
        </div>

        <div>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h3 className="font-semibold">
                Operadores ({totalOperators})
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Circle className="w-2.5 h-2.5 fill-primary text-primary" />
                  {allActiveDrivers.length}
                </span>
                <span className="flex items-center gap-1">
                  <CircleOff className="w-2.5 h-2.5 text-slate-400" />
                  {allInactiveDrivers.length}
                </span>
              </div>
            </div>

            <Tabs value={viewFilter} onValueChange={(v) => setViewFilter(v as typeof viewFilter)} className="mb-4">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1 text-xs" data-testid="tab-all">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="active" className="flex-1 text-xs" data-testid="tab-active">
                  Activos ({allActiveDrivers.length})
                </TabsTrigger>
                <TabsTrigger value="inactive" className="flex-1 text-xs" data-testid="tab-inactive">
                  Inactivos ({allInactiveDrivers.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {driversToShow.map((driver) => {
                const isActive = driver.disponible;
                const driverHasLocation = hasLocation(driver);
                return (
                  <div
                    key={driver.id}
                    className={`p-3 rounded-lg border ${isActive ? 'bg-muted' : 'bg-muted/50 border-dashed'}`}
                    data-testid={`driver-${driver.id}`}
                  >
                    <div className="flex items-start justify-between mb-2 gap-1">
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium text-sm truncate ${!isActive ? 'text-muted-foreground' : ''}`}>
                          {driver.user.nombre} {driver.user.apellido}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {driver.placaGrua}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!driverHasLocation && (
                          <Badge variant="outline" className="text-xs px-1.5 gap-0.5">
                            <MapPinOff className="w-3 h-3" />
                          </Badge>
                        )}
                        {isActive ? (
                          <Badge variant="default" className="text-xs">
                            En línea
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <CircleOff className="w-3 h-3" />
                            Inactivo
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {driver.marcaGrua} {driver.modeloGrua}
                    </p>
                    {!isActive && driver.ultimaUbicacionUpdate && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Última vez: {getLastSeenText(driver.ultimaUbicacionUpdate)}
                      </p>
                    )}
                    {!driverHasLocation && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Sin ubicación registrada
                      </p>
                    )}
                  </div>
                );
              })}
              {driversToShow.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {viewFilter === 'active' 
                    ? 'No hay operadores activos en este momento'
                    : viewFilter === 'inactive'
                    ? 'No hay operadores inactivos'
                    : 'No hay operadores registrados'}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

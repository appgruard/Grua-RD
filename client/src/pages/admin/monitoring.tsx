import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapboxMap } from '@/components/maps/MapboxMap';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Conductor, User } from '@shared/schema';

type ConductorWithUser = Conductor & { user: User };

const DEFAULT_CENTER = { lat: 18.4861, lng: -69.9312 }; // Santo Domingo

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

export default function AdminMonitoring() {
  const { data: activeDrivers } = useQuery<ConductorWithUser[]>({
    queryKey: ['/api/admin/active-drivers'],
    refetchInterval: 10000,
  });

  const markers = useMemo(() => 
    activeDrivers
      ?.filter(d => d.disponible && d.ubicacionLat && d.ubicacionLng)
      .map((driver) => ({
        position: {
          lat: parseFloat(driver.ubicacionLat as string),
          lng: parseFloat(driver.ubicacionLng as string),
        },
        title: `${driver.user.nombre} ${driver.user.apellido}`,
        type: 'driver' as const,
      })) || [],
    [activeDrivers]
  );
  
  const { center, zoom } = useMemo(() => {
    const driverPositions = markers.map(m => m.position);
    return calculateOperatorsCentroid(driverPositions);
  }, [markers]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Monitoreo en Tiempo Real</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="p-4 h-[600px]">
            <MapboxMap
              center={center}
              zoom={zoom}
              markers={markers}
              className="w-full h-full"
            />
          </Card>
        </div>

        <div>
          <Card className="p-4">
            <h3 className="font-semibold mb-4">
              Grúas Activas ({markers.length})
            </h3>
            <div className="space-y-3 max-h-[550px] overflow-y-auto">
              {activeDrivers?.filter(d => d.disponible).map((driver) => (
                <div
                  key={driver.id}
                  className="p-3 bg-muted rounded-lg"
                  data-testid={`active-driver-${driver.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">
                        {driver.user.nombre} {driver.user.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {driver.placaGrua}
                      </p>
                    </div>
                    <Badge variant="default" className="text-xs">
                      En línea
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {driver.marcaGrua} {driver.modeloGrua}
                  </p>
                </div>
              ))}
              {!activeDrivers || activeDrivers.filter(d => d.disponible).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay grúas activas en este momento
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

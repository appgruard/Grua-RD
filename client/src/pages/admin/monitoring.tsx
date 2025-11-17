import { useQuery } from '@tanstack/react-query';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Conductor, User } from '@shared/schema';

type ConductorWithUser = Conductor & { user: User };

export default function AdminMonitoring() {
  const { data: activeDrivers } = useQuery<ConductorWithUser[]>({
    queryKey: ['/api/admin/active-drivers'],
    refetchInterval: 5000,
  });

  const center = { lat: 18.4861, lng: -69.9312 }; // Santo Domingo

  const markers = activeDrivers
    ?.filter(d => d.disponible && d.ubicacionLat && d.ubicacionLng)
    .map((driver) => ({
      position: {
        lat: parseFloat(driver.ubicacionLat as string),
        lng: parseFloat(driver.ubicacionLng as string),
      },
      title: `${driver.user.nombre} ${driver.user.apellido}`,
    })) || [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Monitoreo en Tiempo Real</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="p-4 h-[600px]">
            <GoogleMap
              center={center}
              zoom={12}
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

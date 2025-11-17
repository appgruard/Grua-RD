import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Calendar, DollarSign } from 'lucide-react';
import type { ServicioWithDetails } from '@shared/schema';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientHistory() {
  const { data: services, isLoading } = useQuery<ServicioWithDetails[]>({
    queryKey: ['/api/services/my-services'],
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Historial de Servicios</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-20 bg-muted rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statusColors = {
    pendiente: 'secondary',
    aceptado: 'default',
    en_progreso: 'default',
    completado: 'default',
    cancelado: 'destructive',
  } as const;

  const statusLabels = {
    pendiente: 'Pendiente',
    aceptado: 'Aceptado',
    en_progreso: 'En Progreso',
    completado: 'Completado',
    cancelado: 'Cancelado',
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Historial de Servicios</h1>
      
      {!services || services.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tienes servicios aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <Card key={service.id} className="p-4" data-testid={`service-card-${service.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(service.createdAt), 'PPp', { locale: es })}
                  </span>
                </div>
                <Badge variant={statusColors[service.estado]}>
                  {statusLabels[service.estado]}
                </Badge>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-600 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Origen</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {service.origenDireccion}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="w-4 h-4 text-destructive mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Destino</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {service.destinoDireccion}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold">
                    RD$ {parseFloat(service.costoTotal as string).toFixed(2)}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {parseFloat(service.distanciaKm as string).toFixed(1)} km
                </span>
              </div>

              {service.conductor && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Conductor: <span className="font-medium text-foreground">
                      {service.conductor.nombre} {service.conductor.apellido}
                    </span>
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

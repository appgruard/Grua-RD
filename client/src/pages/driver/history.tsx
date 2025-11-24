import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Calendar, DollarSign, ClipboardList, Download } from 'lucide-react';
import type { ServicioWithDetails } from '@shared/schema';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceCardSkeletonList } from '@/components/skeletons/ServiceCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function DriverHistory() {
  const { toast } = useToast();
  const { data: services, isLoading } = useQuery<ServicioWithDetails[]>({
    queryKey: ['/api/services/my-services'],
  });

  const handleDownloadReceipt = async (serviceId: string) => {
    try {
      const response = await fetch(`/api/servicios/${serviceId}/recibo`);
      
      if (!response.ok) {
        throw new Error('Error al descargar el recibo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo-${serviceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Recibo descargado',
        description: 'El recibo se ha descargado correctamente',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo descargar el recibo',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 pb-20">
        <h1 className="text-2xl font-bold mb-6">Historial de Servicios</h1>
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </Card>
        <ServiceCardSkeletonList count={4} />
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

  const completedServices = services?.filter(s => s.estado === 'completado') || [];
  const totalEarnings = completedServices.reduce((sum, s) => sum + parseFloat(s.costoTotal as string), 0);

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Historial de Servicios</h1>
      
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Servicios Completados</p>
            <p className="text-2xl font-bold" data-testid="text-completed-count">{completedServices.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ganancias Totales</p>
            <p className="text-2xl font-bold" data-testid="text-total-earnings">
              RD$ {totalEarnings.toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {!services || services.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay servicios"
          description="Aún no has completado ningún servicio. Activa tu disponibilidad para comenzar a recibir solicitudes."
        />
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

              {service.cliente && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Cliente: <span className="font-medium text-foreground">
                      {service.cliente.nombre} {service.cliente.apellido}
                    </span>
                  </p>
                </div>
              )}

              {service.estado === 'completado' && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDownloadReceipt(service.id)}
                    data-testid={`button-download-receipt-${service.id}`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Recibo
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

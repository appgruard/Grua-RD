import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Navigation, Calendar, DollarSign, ClipboardList, Download, RefreshCcw, AlertCircle } from 'lucide-react';
import type { ServicioWithDetails } from '@shared/schema';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceCardSkeletonList } from '@/components/skeletons/ServiceCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function DriverHistory() {
  const { toast } = useToast();
  const { data: services, isLoading, isError, refetch } = useQuery<ServicioWithDetails[]>({
    queryKey: ['/api/services/my-services'],
    retry: 2,
    retryDelay: 1000,
  });

  const handleDownloadReceipt = async (serviceId: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/servicios/${serviceId}/recibo`));
      
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
      <div className="p-3 sm:p-4 pb-20">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Historial de Servicios</h1>
        <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Skeleton className="h-4 w-24 sm:w-32 mb-2" />
              <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 sm:w-32 mb-2" />
              <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
            </div>
          </div>
        </Card>
        <ServiceCardSkeletonList count={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden">
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-3 sm:pb-4 flex-shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold">Historial de Servicios</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">Error de conexion</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              No se pudo cargar el historial de servicios. Por favor, verifica tu conexion e intenta nuevamente.
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" data-testid="button-retry-history">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pendiente: 'secondary',
    aceptado: 'default',
    conductor_en_sitio: 'default',
    cargando: 'default',
    en_progreso: 'default',
    completado: 'default',
    cancelado: 'destructive',
  };

  const statusLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    aceptado: 'Aceptado',
    conductor_en_sitio: 'En Sitio',
    cargando: 'Cargando',
    en_progreso: 'En Progreso',
    completado: 'Completado',
    cancelado: 'Cancelado',
  };

  const completedServices = services?.filter(s => s.estado === 'completado') || [];
  const totalEarnings = completedServices.reduce((sum, s) => sum + parseFloat(s.costoTotal as string), 0);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-3 sm:pb-4 flex-shrink-0 space-y-3 sm:space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold">Historial de Servicios</h1>
        
        <Card className="p-3 sm:p-4 overflow-hidden">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Servicios Completados</p>
              <p className="text-xl sm:text-2xl font-bold" data-testid="text-completed-count">{completedServices.length}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Ganancias Totales</p>
              <p className="text-lg sm:text-2xl font-bold truncate" data-testid="text-total-earnings">
                RD$ {totalEarnings.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <ScrollArea className="flex-1 min-h-0 w-full">
        <div className="px-3 sm:px-4 pb-20">
          {!services || services.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No hay servicios"
              description="Aún no has completado ningún servicio. Activa tu disponibilidad para comenzar a recibir solicitudes."
            />
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <Card key={service.id} className="p-3 sm:p-4 overflow-hidden" data-testid={`service-card-${service.id}`}>
              <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">
                    {format(new Date(service.createdAt), 'PPp', { locale: es })}
                  </span>
                </div>
                <Badge variant={statusColors[service.estado]} className="self-start flex-shrink-0">
                  {statusLabels[service.estado]}
                </Badge>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-xs sm:text-sm font-medium">Origen</p>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words line-clamp-2">
                      {service.origenDireccion}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-xs sm:text-sm font-medium">Destino</p>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words line-clamp-2">
                      {service.destinoDireccion}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-bold text-sm sm:text-base">
                    RD$ {parseFloat(service.costoTotal as string).toFixed(2)}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {parseFloat(service.distanciaKm as string).toFixed(1)} km
                </span>
              </div>

              {service.cliente && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
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
      </ScrollArea>
    </div>
  );
}

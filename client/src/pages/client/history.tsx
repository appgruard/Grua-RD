import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Navigation, Calendar, DollarSign, ClipboardList, Download, Star } from 'lucide-react';
import type { ServicioWithDetails, Calificacion } from '@shared/schema';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceCardSkeletonList } from '@/components/skeletons/ServiceCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { RatingModal, StarRating } from '@/components/RatingModal';

interface ServiceWithRating extends ServicioWithDetails {
  calificacion?: Calificacion | null;
}

export default function ClientHistory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceWithRating | null>(null);

  const { data: services, isLoading } = useQuery<ServiceWithRating[]>({
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

  const handleRateService = (service: ServiceWithRating) => {
    setSelectedService(service);
    setRatingModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 pb-20">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Historial de Servicios</h1>
        <ServiceCardSkeletonList count={4} />
      </div>
    );
  }

  const statusColors = {
    pendiente: 'secondary',
    aceptado: 'default',
    conductor_en_sitio: 'default',
    cargando: 'default',
    en_progreso: 'default',
    completado: 'default',
    cancelado: 'destructive',
  } as const;

  const statusLabels = {
    pendiente: 'Pendiente',
    aceptado: 'Aceptado',
    conductor_en_sitio: 'Conductor en sitio',
    cargando: 'Cargando',
    en_progreso: 'En Progreso',
    completado: 'Completado',
    cancelado: 'Cancelado',
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold">Historial de Servicios</h1>
      </div>

      <ScrollArea className="flex-1 min-h-0 w-full">
        <div className="px-3 sm:px-4 pb-20">
          {!services || services.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No hay servicios"
              description="Aun no has solicitado ningun servicio de grua. Solicita tu primer servicio desde la pantalla principal."
              action={{
                label: "Solicitar Servicio",
                onClick: () => setLocation('/client')
              }}
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

              {service.conductor && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    Conductor: <span className="font-medium text-foreground">
                      {service.conductor.nombre} {service.conductor.apellido}
                    </span>
                  </p>
                </div>
              )}

              {service.estado === 'completado' && (
                <div className="mt-3 space-y-2">
                  {service.calificacion ? (
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-md">
                      <StarRating rating={service.calificacion.puntuacion} size="sm" />
                      {service.calificacion.comentario && (
                        <span className="text-xs sm:text-sm text-muted-foreground break-words line-clamp-2 flex-1 min-w-0">
                          - {service.calificacion.comentario}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full"
                      onClick={() => handleRateService(service)}
                      data-testid={`button-rate-service-${service.id}`}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Calificar Servicio
                    </Button>
                  )}
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

      {selectedService && selectedService.conductor && (
        <RatingModal
          isOpen={ratingModalOpen}
          onClose={() => {
            setRatingModalOpen(false);
            setSelectedService(null);
          }}
          serviceId={selectedService.id}
          driverName={`${selectedService.conductor.nombre} ${selectedService.conductor.apellido}`}
        />
      )}
    </div>
  );
}

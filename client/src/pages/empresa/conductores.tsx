import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Truck, Phone, Star, Clock, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ConductorAsignado {
  id: string;
  conductorId: string;
  esPrioridad: boolean;
  notas?: string;
  activo: boolean;
  conductor?: {
    id: string;
    user?: {
      nombre: string;
      apellido: string;
      phone?: string;
      avatarUrl?: string;
    };
    vehiculoMarca?: string;
    vehiculoModelo?: string;
    vehiculoColor?: string;
    vehiculoPlaca?: string;
    calificacionPromedio?: string;
    totalServicios?: number;
    disponible?: boolean;
  };
}

export default function EmpresaConductores() {
  const { data: conductores = [], isLoading } = useQuery<ConductorAsignado[]>({
    queryKey: ['/api/empresa/conductores'],
  });

  const getInitials = (nombre?: string, apellido?: string) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase() || 'C';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-conductores-title">
          Conductores Asignados
        </h1>
        <p className="text-muted-foreground">
          Conductores con prioridad asignada a su empresa
        </p>
      </div>

      {conductores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay conductores asignados</p>
            <p className="text-muted-foreground text-center max-w-sm">
              Contacte a su ejecutivo de cuenta para asignar conductores con prioridad a su empresa
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {conductores.map((asignacion) => {
            const conductor = asignacion.conductor;
            const user = conductor?.user;

            return (
              <Card 
                key={asignacion.id} 
                className={asignacion.esPrioridad ? 'border-primary' : ''}
                data-testid={`card-conductor-${asignacion.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user?.avatarUrl} />
                        <AvatarFallback>
                          {getInitials(user?.nombre, user?.apellido)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {user?.nombre} {user?.apellido}
                        </CardTitle>
                        {user?.phone && (
                          <CardDescription className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {asignacion.esPrioridad && (
                        <Badge variant="default">Prioridad</Badge>
                      )}
                      <Badge variant={conductor?.disponible ? 'outline' : 'secondary'}>
                        {conductor?.disponible ? 'Disponible' : 'Ocupado'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {conductor?.vehiculoMarca && (
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {conductor.vehiculoMarca} {conductor.vehiculoModelo}
                        {conductor.vehiculoColor && ` - ${conductor.vehiculoColor}`}
                      </span>
                    </div>
                  )}

                  {conductor?.vehiculoPlaca && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Placa:</span>
                      <Badge variant="outline">{conductor.vehiculoPlaca}</Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">
                        {conductor?.calificacionPromedio 
                          ? parseFloat(conductor.calificacionPromedio).toFixed(1)
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{conductor?.totalServicios || 0} servicios</span>
                    </div>
                  </div>

                  {asignacion.notas && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">{asignacion.notas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sobre los Conductores Asignados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Los conductores asignados a su empresa tienen prioridad al momento de 
            asignar servicios programados. Esto garantiza que siempre tenga 
            disponibilidad de grúas cuando las necesite.
          </p>
          <p>
            Los conductores marcados como "Prioridad" serán los primeros en recibir 
            las solicitudes de servicio de su empresa antes que otros conductores 
            disponibles.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

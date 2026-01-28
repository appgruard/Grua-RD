import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CancellationCardProps {
  cancellation: {
    servicio_id: string;
    fecha: string;
    penalizacion: number;
    razon: string;
    estado: string;
    bloqueadoHasta?: string | null;
    distanciaRecorrida?: number;
    evaluacion?: string;
  };
}

export function CancellationCard({ cancellation }: CancellationCardProps) {
  const getPenaltyColor = (amount: number): string => {
    if (amount === 0) return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200';
    if (amount < 10) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'rechazado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formattedDate = format(
    new Date(cancellation.fecha),
    "d 'de' MMMM 'de' yyyy 'a las' HH:mm",
    { locale: es }
  );

  const isBlocked = cancellation.bloqueadoHasta && new Date(cancellation.bloqueadoHasta) > new Date();
  const evaluationLevel = cancellation.evaluacion || 'ninguna';

  return (
    <Card className="hover-elevate" data-testid={`card-cancellation-${cancellation.servicio_id}`}>
      <CardContent className="pt-6" data-testid="cancellation-content">
        <div className="mb-4 flex items-start justify-between gap-2" data-testid="header-row">
          <div className="flex-1" data-testid="reason-section">
            <p className="text-sm font-medium" data-testid="reason-title">Razón</p>
            <p className="text-sm text-muted-foreground" data-testid="reason-value">
              {cancellation.razon}
            </p>
          </div>
          <Badge className={getStatusColor(cancellation.estado)} data-testid="status-badge">
            {cancellation.estado}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4" data-testid="details-row">
          <div data-testid="date-section">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Fecha
            </div>
            <p className="text-sm" data-testid="date-value">
              {formattedDate}
            </p>
          </div>

          <div data-testid="penalty-section">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Penalización
            </div>
            <Badge
              className={getPenaltyColor(cancellation.penalizacion)}
              data-testid="penalty-badge"
            >
              ${cancellation.penalizacion.toFixed(2)}
            </Badge>
          </div>
        </div>

        {cancellation.distanciaRecorrida !== undefined && (
          <div className="mt-3 grid grid-cols-2 gap-4" data-testid="additional-details">
            <div className="text-xs">
              <p className="text-muted-foreground">Distancia Recorrida</p>
              <p className="font-medium" data-testid="distance-value">{cancellation.distanciaRecorrida.toFixed(1)} km</p>
            </div>
            <div className="text-xs">
              <p className="text-muted-foreground">Nivel de Penalización</p>
              <Badge variant="secondary" className="text-xs capitalize" data-testid="evaluation-badge">
                {evaluationLevel}
              </Badge>
            </div>
          </div>
        )}

        {isBlocked && (
          <div
            className="mt-4 flex gap-2 rounded-md bg-red-50 p-2 dark:bg-red-950"
            data-testid="blocked-warning"
          >
            <Clock className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-xs text-red-700 dark:text-red-200" data-testid="blocked-text">
              Estuviste bloqueado por esta cancelación hasta {format(new Date(cancellation.bloqueadoHasta!), "HH:mm", { locale: es })}.
            </p>
          </div>
        )}

        {cancellation.penalizacion > 20 && (
          <div
            className="mt-4 flex gap-2 rounded-md bg-amber-50 p-2 dark:bg-amber-950"
            data-testid="high-penalty-warning"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-700 dark:text-amber-200" data-testid="warning-text">
              Esta penalización fue significativa. Si crees que es injusta, puedes apelar dentro de 7 días.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

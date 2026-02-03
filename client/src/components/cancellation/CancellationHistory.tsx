import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { CancellationCard } from './CancellationCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CancellationHistoryProps {
  userId: string;
  userType: 'cliente' | 'conductor';
}

export function CancellationHistory({ userId, userType }: CancellationHistoryProps) {
  const endpoint = userType === 'cliente'
    ? `/api/usuarios/${userId}/cancelaciones`
    : `/api/conductores/${userId}/cancelaciones`;

  const { data, isLoading, error } = useQuery<{
    ultimas_cancelaciones: any[];
    total_cancelaciones: number;
    penalizaciones_totales: number;
  }>({
    queryKey: [endpoint],
    enabled: !!userId,
    refetchOnMount: 'always',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="loading-state">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
        <CardContent className="pt-6" data-testid="error-state">
          <p className="text-sm text-red-700 dark:text-red-400">
            Error al cargar cancelaciones: {(error as Error).message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const cancelaciones = data?.ultimas_cancelaciones || [];
  const totalCancelaciones = data?.total_cancelaciones || 0;
  const penalizacionesTotales = data?.penalizaciones_totales || 0;

  if (cancelaciones.length === 0) {
    return (
      <Card className="border-dashed" data-testid="empty-state">
        <CardContent className="pt-6 text-center" data-testid="empty-message">
          <p className="text-muted-foreground">No hay cancelaciones registradas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="cancellations-list">
      <Card className="bg-muted" data-testid="cancellations-summary">
        <CardHeader data-testid="summary-header">
          <CardTitle className="text-lg" data-testid="summary-title">
            Resumen de Cancelaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4" data-testid="summary-stats">
          <div data-testid="stat-total">
            <p className="text-sm text-muted-foreground">Total de Cancelaciones</p>
            <p className="text-2xl font-bold">{totalCancelaciones}</p>
          </div>
          <div data-testid="stat-penalties">
            <p className="text-sm text-muted-foreground">Penalizaciones Totales</p>
            <p className="text-2xl font-bold text-destructive">
              ${penalizacionesTotales.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {totalCancelaciones > 5 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950" data-testid="alert-high-cancellations">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-700 dark:text-amber-200">
            Tienes una cantidad significativa de cancelaciones. Considera mantener un historial más limpio para mejorar tu reputación.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2" data-testid="cancellations-cards">
        {cancelaciones.map((cancel: any, index: number) => (
          <CancellationCard
            key={cancel.servicio_id || index}
            cancellation={cancel}
            data-testid={`cancellation-card-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

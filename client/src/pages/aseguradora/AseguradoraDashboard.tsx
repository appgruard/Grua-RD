import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AseguradoraLayout } from '@/components/layout/AseguradoraLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Receipt,
  CreditCard,
  ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  totalServicios: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
  montoTotal: number;
  montoPendiente: number;
  montoFacturado: number;
  montoPagado: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default',
  testId,
}: {
  title: string;
  value: string | number;
  icon: any;
  description?: string;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
  testId?: string;
}) {
  const variantClasses = {
    default: 'text-foreground',
    warning: 'text-yellow-600 dark:text-yellow-400',
    success: 'text-green-600 dark:text-green-400',
    destructive: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${variantClasses[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantClasses[variant]}`} data-testid={testId ? `${testId}-value` : undefined}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/aseguradora/dashboard'],
  });

  const { data: pendientes, isLoading: pendientesLoading } = useQuery<any[]>({
    queryKey: ['/api/aseguradora/servicios/pendientes'],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount);
  };

  if (statsLoading || pendientesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
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
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Dashboard
        </h2>
        <p className="text-muted-foreground">
          Resumen de servicios y facturación
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Servicios"
          value={stats?.totalServicios || 0}
          icon={FileText}
          testId="card-stat-total"
        />
        <StatCard
          title="Pendientes"
          value={stats?.pendientes || 0}
          icon={Clock}
          variant="warning"
          testId="card-stat-pending"
        />
        <StatCard
          title="Aprobados"
          value={stats?.aprobados || 0}
          icon={CheckCircle}
          variant="success"
          testId="card-stat-approved"
        />
        <StatCard
          title="Rechazados"
          value={stats?.rechazados || 0}
          icon={XCircle}
          variant="destructive"
          testId="card-stat-rejected"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monto Total Aprobado"
          value={formatCurrency(stats?.montoTotal || 0)}
          icon={DollarSign}
          testId="card-stat-amount-total"
        />
        <StatCard
          title="Pendiente Facturar"
          value={formatCurrency(stats?.montoPendiente || 0)}
          icon={Receipt}
          variant="warning"
          testId="card-stat-amount-pending"
        />
        <StatCard
          title="Facturado"
          value={formatCurrency(stats?.montoFacturado || 0)}
          icon={Receipt}
          testId="card-stat-amount-invoiced"
        />
        <StatCard
          title="Pagado"
          value={formatCurrency(stats?.montoPagado || 0)}
          icon={CreditCard}
          variant="success"
          testId="card-stat-amount-paid"
        />
      </div>

      {(pendientes?.length || 0) > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Servicios Pendientes de Aprobación</CardTitle>
              <CardDescription>
                {pendientes?.length} servicio{pendientes?.length !== 1 ? 's' : ''} requiere{pendientes?.length === 1 ? '' : 'n'} tu revisión
              </CardDescription>
            </div>
            <Link href="/aseguradora/pendientes">
              <Button variant="outline" size="sm" data-testid="link-view-pending">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendientes?.slice(0, 5).map((servicio) => (
                <div
                  key={servicio.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`card-pending-service-${servicio.id}`}
                >
                  <div>
                    <p className="font-medium">
                      Servicio #{servicio.servicio?.id?.slice(-8) || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {servicio.servicio?.tipoServicio} - {servicio.numeroPoliza}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(parseFloat(servicio.montoSolicitado || '0'))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(servicio.createdAt).toLocaleDateString('es-DO')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(pendientes?.length || 0) === 0 && !pendientesLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">No hay servicios pendientes</p>
            <p className="text-sm text-muted-foreground">
              Todos los servicios han sido procesados
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AseguradoraDashboard() {
  return (
    <AseguradoraLayout>
      <DashboardContent />
    </AseguradoraLayout>
  );
}

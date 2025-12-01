import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { 
  CalendarPlus, 
  Clock, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Truck,
  DollarSign,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  serviciosMes: number;
  serviciosEnProgreso: number;
  serviciosProgramados: number;
  facturasTotal: number;
  facturasPendientes: number;
  gastoMensual: string;
  contratoActivo?: {
    id: string;
    numeroContrato: string;
    tipoContrato: string;
    fechaFin?: string;
  } | null;
  facturasRecientes?: Array<{
    id: string;
    numeroFactura: string;
    total: string;
    estado: string;
    fechaVencimiento: string;
  }>;
  serviciosRecientes?: Array<{
    id: string;
    fechaProgramada: string;
    origenDireccion: string;
    estado: string;
  }>;
  empresa?: {
    id: string;
    nombreEmpresa: string;
    limiteCredito: string;
    verificado: boolean;
  };
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  testId,
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  description?: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`${testId}-value`}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function EmpresaDashboard() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/empresa/dashboard'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-muted-foreground">Error al cargar el dashboard</p>
      </div>
    );
  }

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(parseFloat(value || '0'));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pendiente: 'secondary',
      programado: 'default',
      ejecutado: 'outline',
      cancelado: 'destructive',
      pagado: 'outline',
      vencido: 'destructive',
    };
    return (
      <Badge variant={variants[estado] || 'secondary'}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-empresa-dashboard-title">
            ¡Bienvenido, {stats?.empresa?.nombreEmpresa}!
          </h1>
          {stats?.empresa?.verificado ? (
            <Badge variant="outline" className="mt-2">
              <CheckCircle className="w-3 h-3 mr-1" />
              Cuenta Verificada
            </Badge>
          ) : (
            <Badge variant="destructive" className="mt-2">
              <AlertCircle className="w-3 h-3 mr-1" />
              Verificación Pendiente
            </Badge>
          )}
        </div>
        <Link href="/empresa/solicitudes">
          <Button size="lg" data-testid="button-nueva-solicitud">
            <CalendarPlus className="w-4 h-4 mr-2" />
            Programar Servicio
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Servicios Este Mes"
          value={stats?.serviciosMes || 0}
          icon={TrendingUp}
          description="Servicios completados"
          testId="card-servicios-mes"
        />
        <StatCard
          title="En Progreso"
          value={stats?.serviciosEnProgreso || 0}
          icon={Clock}
          description="Servicios activos"
          testId="card-en-progreso"
        />
        <StatCard
          title="Programados"
          value={stats?.serviciosProgramados || 0}
          icon={CalendarPlus}
          description="Próximos servicios"
          testId="card-programados"
        />
        <StatCard
          title="Gasto Mensual"
          value={formatCurrency(stats?.gastoMensual || '0')}
          icon={DollarSign}
          description={`${stats?.facturasPendientes || 0} facturas pendientes`}
          testId="card-gasto-mensual"
        />
      </div>

      {stats?.contratoActivo && (
        <Card data-testid="card-contrato-activo">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contrato Activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <p className="text-sm text-muted-foreground">Número</p>
                <p className="font-medium">{stats.contratoActivo.numeroContrato}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge variant="secondary">
                  {stats.contratoActivo.tipoContrato.replace(/_/g, ' ')}
                </Badge>
              </div>
              {stats.contratoActivo.fechaFin && (
                <div>
                  <p className="text-sm text-muted-foreground">Vence</p>
                  <p className="font-medium">{formatDate(stats.contratoActivo.fechaFin)}</p>
                </div>
              )}
              <Link href="/empresa/contratos" className="ml-auto">
                <Button variant="outline" size="sm">Ver Detalles</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-servicios-recientes">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Servicios Recientes</CardTitle>
            <Link href="/empresa/historial">
              <Button variant="ghost" size="sm">Ver todos</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.serviciosRecientes && stats.serviciosRecientes.length > 0 ? (
              <div className="space-y-4">
                {stats.serviciosRecientes.slice(0, 5).map((servicio) => (
                  <div key={servicio.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {servicio.origenDireccion}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(servicio.fechaProgramada)}
                        </p>
                      </div>
                    </div>
                    {getEstadoBadge(servicio.estado)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay servicios recientes
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-facturas-recientes">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Facturas Recientes</CardTitle>
            <Link href="/empresa/facturacion">
              <Button variant="ghost" size="sm">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.facturasRecientes && stats.facturasRecientes.length > 0 ? (
              <div className="space-y-4">
                {stats.facturasRecientes.slice(0, 5).map((factura) => (
                  <div key={factura.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{factura.numeroFactura}</p>
                      <p className="text-xs text-muted-foreground">
                        Vence: {formatDate(factura.fechaVencimiento)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(factura.total)}</p>
                      {getEstadoBadge(factura.estado)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay facturas recientes
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {stats?.empresa?.limiteCredito && parseFloat(stats.empresa.limiteCredito) > 0 && (
        <Card data-testid="card-limite-credito">
          <CardHeader>
            <CardTitle className="text-lg">Límite de Crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.empresa.limiteCredito)}
                </p>
                <p className="text-sm text-muted-foreground">Crédito disponible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

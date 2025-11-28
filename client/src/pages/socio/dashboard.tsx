import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PiggyBank, 
  Calendar, 
  Download, 
  Percent,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SocioResumen {
  porcentajeParticipacion: number;
  montoInversion: number;
  fechaInversion: string;
  totalDistribuciones: number;
  totalRecibido: number;
  pendientePago: number;
  roi: number;
  ultimaDistribucion: {
    id: string;
    periodo: string;
    montoSocio: string;
    estado: string;
  } | null;
}

interface SocioData {
  id: string;
  porcentajeParticipacion: string;
  montoInversion: string;
  fechaInversion: string;
  activo: boolean;
  user: {
    nombre: string;
    email: string;
  };
}

interface Distribucion {
  id: string;
  periodo: string;
  ingresosTotales: string;
  comisionEmpresa: string;
  porcentajeAlMomento: string;
  montoSocio: string;
  estado: 'calculado' | 'aprobado' | 'pagado';
  fechaPago?: string | null;
  metodoPago?: string | null;
  createdAt: string;
}

interface DashboardData {
  socio: SocioData;
  resumen: SocioResumen;
  distribuciones: Distribucion[];
}

export default function SocioDashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/socio/dashboard'],
  });

  const handleDownloadPDF = async (periodo: string) => {
    try {
      const response = await fetch(`/api/socio/estado-financiero/${periodo}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Error al descargar PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estado-financiero-${periodo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatPeriodo = (periodo: string) => {
    const [year, month] = periodo.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy', { locale: es });
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pagado':
        return <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle2 className="w-3 h-3" />Pagado</Badge>;
      case 'aprobado':
        return <Badge className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"><Clock className="w-3 h-3" />Aprobado</Badge>;
      case 'calculado':
        return <Badge className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"><AlertCircle className="w-3 h-3" />Calculado</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const chartData = data?.distribuciones
    ?.slice(0, 12)
    ?.reverse()
    ?.map(d => ({
      periodo: formatPeriodo(d.periodo),
      monto: parseFloat(d.montoSocio),
    })) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No se encontró información de socio.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { socio, resumen, distribuciones } = data;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
            Portal de Socios
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {socio.user.nombre}
          </p>
        </div>
        <Badge variant={socio.activo ? 'default' : 'secondary'} className="w-fit" data-testid="badge-status">
          {socio.activo ? 'Socio Activo' : 'Socio Inactivo'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-participacion">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Participación</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.porcentajeParticipacion}%</div>
            <p className="text-xs text-muted-foreground">
              de las ganancias de la empresa
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-inversion">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Inversión Total</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumen.montoInversion)}</div>
            <p className="text-xs text-muted-foreground">
              Desde {format(new Date(resumen.fechaInversion), 'MMM yyyy', { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-recibido">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Recibido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(resumen.totalRecibido)}
            </div>
            <p className="text-xs text-muted-foreground">
              en {resumen.totalDistribuciones} distribuciones
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-roi">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            {resumen.roi >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resumen.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {resumen.roi.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Retorno sobre inversión
            </p>
          </CardContent>
        </Card>
      </div>

      {resumen.pendientePago > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950" data-testid="card-pendiente">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Pendiente de Pago</p>
                  <p className="text-sm text-muted-foreground">
                    Tienes distribuciones aprobadas pendientes de pago
                  </p>
                </div>
              </div>
              <div className="text-xl font-bold text-yellow-700 dark:text-yellow-400">
                {formatCurrency(resumen.pendientePago)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {chartData.length > 0 && (
        <Card data-testid="card-chart">
          <CardHeader>
            <CardTitle>Historial de Distribuciones</CardTitle>
            <CardDescription>
              Ingresos recibidos en los últimos períodos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="periodo" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Monto']}
                    labelStyle={{ color: 'var(--foreground)' }}
                    contentStyle={{ 
                      backgroundColor: 'var(--background)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="monto" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-distribuciones-list">
        <CardHeader>
          <CardTitle>Distribuciones Recientes</CardTitle>
          <CardDescription>
            Historial de distribuciones de ganancias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {distribuciones.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay distribuciones registradas aún.
            </p>
          ) : (
            <div className="space-y-4">
              {distribuciones.slice(0, 6).map((dist) => (
                <div 
                  key={dist.id} 
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`row-distribucion-${dist.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex h-10 w-10 rounded-full bg-primary/10 items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{formatPeriodo(dist.periodo)}</p>
                      <p className="text-sm text-muted-foreground">
                        Ingresos: {formatCurrency(dist.ingresosTotales)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(dist.montoSocio)}</p>
                      <p className="text-sm text-muted-foreground">
                        {dist.porcentajeAlMomento}% participación
                      </p>
                    </div>
                    {getEstadoBadge(dist.estado)}
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => handleDownloadPDF(dist.periodo)}
                      title="Descargar estado financiero"
                      data-testid={`button-download-${dist.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

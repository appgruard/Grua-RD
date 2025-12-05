import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Car, RefreshCcw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const COLORS = ['#0F2947', '#F5A623', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  aceptado: 'Aceptado',
  conductor_en_sitio: 'En Sitio',
  cargando: 'Cargando',
  en_progreso: 'En Progreso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

const vehicleLabels: Record<string, string> = {
  carro: 'Carro',
  motor: 'Motor',
  jeep: 'Jeep',
  camion: 'Camion',
  no_especificado: 'No Especificado',
};

interface RevenueData {
  period: string;
  revenue: number;
}

interface ServicesData {
  period: string;
  count: number;
}

interface PeakHourData {
  hour: number;
  count: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
}

interface VehicleDistribution {
  tipoVehiculo: string;
  count: number;
  revenue: number;
}

interface AnalyticsChartsProps {
  revenueData?: RevenueData[];
  revenueLoading: boolean;
  revenueError: boolean;
  refetchRevenue: () => void;
  servicesData?: ServicesData[];
  servicesLoading: boolean;
  servicesError: boolean;
  refetchServices: () => void;
  vehicleData?: VehicleDistribution[];
  vehicleLoading: boolean;
  vehicleError: boolean;
  refetchVehicles: () => void;
  peakHoursData?: PeakHourData[];
  peakHoursLoading: boolean;
  peakHoursError: boolean;
  refetchPeakHours: () => void;
  statusBreakdown?: StatusBreakdown[];
  statusLoading: boolean;
  statusError: boolean;
  refetchStatus: () => void;
}

function ErrorCard({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="h-80 flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <AlertCircle className="w-12 h-12 text-destructive" />
      <p className="text-center">Error al cargar {title}</p>
      <Button variant="outline" size="sm" onClick={onRetry} data-testid="button-retry">
        <RefreshCcw className="w-4 h-4 mr-2" />
        Reintentar
      </Button>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="h-80 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

export default function AnalyticsCharts({
  revenueData,
  revenueLoading,
  revenueError,
  refetchRevenue,
  servicesData,
  servicesLoading,
  servicesError,
  refetchServices,
  vehicleData,
  vehicleLoading,
  vehicleError,
  refetchVehicles,
  peakHoursData,
  peakHoursLoading,
  peakHoursError,
  refetchPeakHours,
  statusBreakdown,
  statusLoading,
  statusError,
  refetchStatus,
}: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card data-testid="card-revenue-chart">
        <CardHeader>
          <CardTitle>Ingresos por Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueError ? (
            <ErrorCard title="ingresos" onRetry={refetchRevenue} />
          ) : revenueLoading ? (
            <LoadingSpinner />
          ) : revenueData && revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [`RD$ ${value.toFixed(2)}`, 'Ingresos']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0F2947"
                  strokeWidth={2}
                  name="Ingresos (RD$)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No hay datos de ingresos para el periodo seleccionado
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-services-chart">
        <CardHeader>
          <CardTitle>Servicios por Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          {servicesError ? (
            <ErrorCard title="servicios" onRetry={refetchServices} />
          ) : servicesLoading ? (
            <LoadingSpinner />
          ) : servicesData && servicesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={servicesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#F5A623" name="Servicios" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No hay datos de servicios para el periodo seleccionado
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-vehicle-distribution">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Distribucion por Tipo de Vehiculo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vehicleError ? (
            <ErrorCard title="distribucion de vehiculos" onRetry={refetchVehicles} />
          ) : vehicleLoading ? (
            <LoadingSpinner />
          ) : vehicleData && vehicleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={vehicleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ tipoVehiculo, percent }) =>
                    `${vehicleLabels[tipoVehiculo] || tipoVehiculo}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {vehicleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value} servicios (RD$ ${props.payload.revenue.toFixed(2)})`,
                    vehicleLabels[props.payload.tipoVehiculo] || props.payload.tipoVehiculo,
                  ]}
                />
                <Legend
                  formatter={(value, entry: any) =>
                    vehicleLabels[entry.payload.tipoVehiculo] || entry.payload.tipoVehiculo
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No hay datos de vehiculos para el periodo seleccionado
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-peak-hours-chart">
        <CardHeader>
          <CardTitle>Horarios Pico</CardTitle>
        </CardHeader>
        <CardContent>
          {peakHoursError ? (
            <ErrorCard title="horarios pico" onRetry={refetchPeakHours} />
          ) : peakHoursLoading ? (
            <LoadingSpinner />
          ) : peakHoursData && peakHoursData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(hour) => `Hora: ${hour}:00`}
                />
                <Legend />
                <Bar dataKey="count" fill="#10b981" name="Servicios" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No hay datos de horarios disponibles
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-status-chart" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Estados de Servicios</CardTitle>
        </CardHeader>
        <CardContent>
          {statusError ? (
            <ErrorCard title="estados de servicios" onRetry={refetchStatus} />
          ) : statusLoading ? (
            <LoadingSpinner />
          ) : statusBreakdown && statusBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percent }) =>
                    `${statusLabels[status] || status}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    value,
                    statusLabels[props.payload.status] || props.payload.status,
                  ]}
                />
                <Legend
                  formatter={(value, entry: any) =>
                    statusLabels[entry.payload.status] || entry.payload.status
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No hay datos de estados para el periodo seleccionado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

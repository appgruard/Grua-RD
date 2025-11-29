import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar, Download, Clock, CheckCircle, XCircle, DollarSign, Car, FileText } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { HeatmapComponent } from '@/components/maps/MapboxMap';
import { StarRating } from '@/components/RatingModal';

type Period = 'day' | 'week' | 'month';

interface RevenueData {
  period: string;
  revenue: number;
}

interface ServicesData {
  period: string;
  count: number;
}

interface DriverRanking {
  driverId: string;
  driverName: string;
  completedServices: number;
  averageRating: number;
}

interface PeakHourData {
  hour: number;
  count: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  count: number;
  weight: number;
}

interface KPIData {
  avgResponseMinutes: number;
  avgServiceDurationMinutes: number;
  acceptanceRate: number;
  cancellationRate: number;
  avgRevenuePerService: number;
  totalServices: number;
  completedServices: number;
  cancelledServices: number;
}

interface VehicleDistribution {
  tipoVehiculo: string;
  count: number;
  revenue: number;
}

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

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [period, setPeriod] = useState<Period>('day');

  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

  const { data: revenueData, isLoading: revenueLoading } = useQuery<RevenueData[]>({
    queryKey: ['/api/admin/analytics/revenue', { startDate, endDate, period }],
    enabled: !!startDate && !!endDate,
  });

  const { data: servicesData, isLoading: servicesLoading } = useQuery<ServicesData[]>({
    queryKey: ['/api/admin/analytics/services', { startDate, endDate, period }],
    enabled: !!startDate && !!endDate,
  });

  const { data: driverRankings, isLoading: driversLoading } = useQuery<DriverRanking[]>({
    queryKey: ['/api/admin/analytics/drivers'],
  });

  const { data: peakHoursData, isLoading: peakHoursLoading } = useQuery<PeakHourData[]>({
    queryKey: ['/api/admin/analytics/peak-hours'],
  });

  const { data: statusBreakdown, isLoading: statusLoading } = useQuery<StatusBreakdown[]>({
    queryKey: ['/api/admin/analytics/status-breakdown', { startDate, endDate }],
    enabled: !!startDate && !!endDate,
  });

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery<HeatmapPoint[]>({
    queryKey: ['/api/admin/analytics/heatmap', { startDate, endDate }],
    enabled: !!startDate && !!endDate,
  });

  const { data: kpiData, isLoading: kpiLoading } = useQuery<KPIData>({
    queryKey: ['/api/admin/analytics/kpis', { startDate, endDate }],
    enabled: !!startDate && !!endDate,
  });

  const { data: vehicleData, isLoading: vehicleLoading } = useQuery<VehicleDistribution[]>({
    queryKey: ['/api/admin/analytics/vehicles', { startDate, endDate }],
    enabled: !!startDate && !!endDate,
  });

  const exportToPDF = async () => {
    if (!startDate || !endDate) return;
    
    try {
      const response = await fetch(`/api/admin/analytics/pdf?startDate=${startDate}&endDate=${endDate}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-gruard-${startDate}-${endDate}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  const exportToCSV = () => {
    const csvData: string[] = [];

    csvData.push('Analytics Report - Grua RD');
    csvData.push(`Period: ${startDate} to ${endDate}`);
    csvData.push('');

    if (kpiData) {
      csvData.push('Key Performance Indicators');
      csvData.push(`Tiempo Promedio de Respuesta,${kpiData.avgResponseMinutes.toFixed(1)} min`);
      csvData.push(`Duracion Promedio del Servicio,${kpiData.avgServiceDurationMinutes.toFixed(1)} min`);
      csvData.push(`Tasa de Aceptacion,${kpiData.acceptanceRate.toFixed(1)}%`);
      csvData.push(`Tasa de Cancelacion,${kpiData.cancellationRate.toFixed(1)}%`);
      csvData.push(`Ingreso Promedio por Servicio,RD$ ${kpiData.avgRevenuePerService.toFixed(2)}`);
      csvData.push('');
    }

    if (revenueData && revenueData.length > 0) {
      csvData.push('Revenue by Period');
      csvData.push('Period,Revenue (RD$)');
      revenueData.forEach(item => {
        csvData.push(`${item.period},${item.revenue.toFixed(2)}`);
      });
      csvData.push('');
    }

    if (servicesData && servicesData.length > 0) {
      csvData.push('Services by Period');
      csvData.push('Period,Count');
      servicesData.forEach(item => {
        csvData.push(`${item.period},${item.count}`);
      });
      csvData.push('');
    }

    if (vehicleData && vehicleData.length > 0) {
      csvData.push('Vehicle Type Distribution');
      csvData.push('Vehicle Type,Count,Revenue (RD$)');
      vehicleData.forEach(item => {
        csvData.push(`${vehicleLabels[item.tipoVehiculo] || item.tipoVehiculo},${item.count},${item.revenue.toFixed(2)}`);
      });
      csvData.push('');
    }

    if (driverRankings && driverRankings.length > 0) {
      csvData.push('Driver Rankings');
      csvData.push('Driver Name,Completed Services,Average Rating');
      driverRankings.forEach(driver => {
        csvData.push(`${driver.driverName},${driver.completedServices},${driver.averageRating.toFixed(2)}`);
      });
      csvData.push('');
    }

    if (peakHoursData && peakHoursData.length > 0) {
      csvData.push('Peak Hours');
      csvData.push('Hour,Service Count');
      peakHoursData.forEach(item => {
        csvData.push(`${item.hour}:00,${item.count}`);
      });
      csvData.push('');
    }

    if (statusBreakdown && statusBreakdown.length > 0) {
      csvData.push('Status Breakdown');
      csvData.push('Status,Count');
      statusBreakdown.forEach(item => {
        csvData.push(`${statusLabels[item.status] || item.status},${item.count}`);
      });
    }

    const blob = new Blob([csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-gruard-${startDate}-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = revenueLoading || servicesLoading || driversLoading || peakHoursLoading || statusLoading || kpiLoading || vehicleLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Analytics y Reportes</h1>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} disabled={isLoading} variant="outline" data-testid="button-export-pdf">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button onClick={exportToCSV} disabled={isLoading} variant="outline" data-testid="button-export-csv">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-[280px] justify-start text-left font-normal',
                !dateRange && 'text-muted-foreground'
              )}
              data-testid="button-date-range"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} -{' '}
                    {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Seleccionar fechas</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              data-testid="calendar-date-range"
            />
          </PopoverContent>
        </Popover>

        <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-period">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day" data-testid="option-period-day">Dia</SelectItem>
            <SelectItem value="week" data-testid="option-period-week">Semana</SelectItem>
            <SelectItem value="month" data-testid="option-period-month">Mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid="card-kpi-response-time">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Tiempo Respuesta</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {kpiLoading ? '...' : `${kpiData?.avgResponseMinutes.toFixed(1) || 0} min`}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-acceptance-rate">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Tasa Aceptacion</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {kpiLoading ? '...' : `${kpiData?.acceptanceRate.toFixed(1) || 0}%`}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-cancellation-rate">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Tasa Cancelacion</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {kpiLoading ? '...' : `${kpiData?.cancellationRate.toFixed(1) || 0}%`}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-avg-revenue">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Ingreso Promedio</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {kpiLoading ? '...' : `RD$ ${kpiData?.avgRevenuePerService.toFixed(0) || 0}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different analytics views */}
      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="charts" data-testid="tab-charts">Graficas</TabsTrigger>
          <TabsTrigger value="heatmap" data-testid="tab-heatmap">Mapa de Calor</TabsTrigger>
          <TabsTrigger value="rankings" data-testid="tab-rankings">Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-revenue-chart">
              <CardHeader>
                <CardTitle>Ingresos por Periodo</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
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
                {servicesLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
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
                {vehicleLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
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
                {peakHoursLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
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
                {statusLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
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
        </TabsContent>

        <TabsContent value="heatmap" className="mt-6">
          <Card data-testid="card-heatmap">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Mapa de Calor - Zonas de Demanda
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heatmapLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <HeatmapComponent 
                  data={heatmapData || []} 
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
              <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-cyan-400" />
                  <span>Baja demanda</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span>Media demanda</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span>Alta demanda</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rankings" className="mt-6">
          <Card data-testid="card-driver-rankings">
            <CardHeader>
              <CardTitle>Ranking de Conductores</CardTitle>
            </CardHeader>
            <CardContent>
              {driversLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : driverRankings && driverRankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posicion</TableHead>
                        <TableHead>Conductor</TableHead>
                        <TableHead className="text-right">Servicios Completados</TableHead>
                        <TableHead className="text-right">Calificacion Promedio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverRankings.map((driver, index) => (
                        <TableRow key={driver.driverId} data-testid={`row-driver-${driver.driverId}`}>
                          <TableCell className="font-medium">
                            {index === 0 && <span className="text-yellow-500 mr-1">1</span>}
                            {index === 1 && <span className="text-gray-400 mr-1">2</span>}
                            {index === 2 && <span className="text-amber-600 mr-1">3</span>}
                            {index > 2 && index + 1}
                          </TableCell>
                          <TableCell>{driver.driverName}</TableCell>
                          <TableCell className="text-right">{driver.completedServices}</TableCell>
                          <TableCell className="text-right">
                            {driver.averageRating > 0 ? (
                              <div className="flex items-center justify-end gap-1">
                                <StarRating rating={driver.averageRating} size="sm" />
                                <span className="text-muted-foreground">({driver.averageRating.toFixed(1)})</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sin calificaciones</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No hay conductores registrados
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar, Download } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  aceptado: 'Aceptado',
  en_progreso: 'En Progreso',
  completado: 'Completado',
  cancelado: 'Cancelado',
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

  const exportToCSV = () => {
    const csvData: string[] = [];

    csvData.push('Analytics Report - GruaRD');
    csvData.push(`Period: ${startDate} to ${endDate}`);
    csvData.push('');

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
    link.download = `analytics-${startDate}-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = revenueLoading || servicesLoading || driversLoading || peakHoursLoading || statusLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Analytics y Reportes</h1>
        <Button onClick={exportToCSV} disabled={isLoading} data-testid="button-export-csv">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
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
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day" data-testid="option-period-day">Día</SelectItem>
            <SelectItem value="week" data-testid="option-period-week">Semana</SelectItem>
            <SelectItem value="month" data-testid="option-period-month">Mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-revenue-chart">
          <CardHeader>
            <CardTitle>Ingresos por Período</CardTitle>
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
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Ingresos (RD$)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No hay datos de ingresos para el período seleccionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-services-chart">
          <CardHeader>
            <CardTitle>Servicios por Período</CardTitle>
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
                  <Bar dataKey="count" fill="#10b981" name="Servicios" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No hay datos de servicios para el período seleccionado
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
                  <Bar dataKey="count" fill="#f59e0b" name="Servicios" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No hay datos de horarios disponibles
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-status-chart">
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
                No hay datos de estados para el período seleccionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                    <TableHead>Posición</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead className="text-right">Servicios Completados</TableHead>
                    <TableHead className="text-right">Calificación Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverRankings.map((driver, index) => (
                    <TableRow key={driver.driverId} data-testid={`row-driver-${driver.driverId}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{driver.driverName}</TableCell>
                      <TableCell className="text-right">{driver.completedServices}</TableCell>
                      <TableCell className="text-right">
                        {driver.averageRating > 0
                          ? `⭐ ${driver.averageRating.toFixed(2)}`
                          : 'Sin calificaciones'}
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
    </div>
  );
}

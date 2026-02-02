import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AseguradoraLayout } from '@/components/layout/AseguradoraLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
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

interface ServicioAseguradora {
  id: string;
  servicioId: string;
  numeroPoliza: string;
  montoSolicitado: string;
  montoAprobado: string | null;
  estadoPago: string;
  aprobadoPor: string | null;
  rechazadoPor: string | null;
  motivoRechazo: string | null;
  createdAt: string;
  servicio?: {
    id: string;
    tipoServicio: string;
    vehiculoPlaca: string;
    cliente?: {
      nombre: string;
      apellido: string;
    };
  };
}

function ReportesContent() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/aseguradora/dashboard', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await fetch(getApiUrl(`/api/aseguradora/dashboard?${params}`));
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  const { data: servicios, isLoading: serviciosLoading } = useQuery<ServicioAseguradora[]>({
    queryKey: ['/api/aseguradora/servicios'],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount);
  };

  const exportToCSV = () => {
    if (!servicios) return;

    const headers = ['ID Servicio', 'Tipo', 'Cliente', 'Placa', 'Póliza', 'Monto Solicitado', 'Monto Aprobado', 'Estado', 'Fecha'];
    const rows = servicios.map(s => [
      s.servicioId,
      s.servicio?.tipoServicio || '',
      `${s.servicio?.cliente?.nombre || ''} ${s.servicio?.cliente?.apellido || ''}`,
      s.servicio?.vehiculoPlaca || '',
      s.numeroPoliza,
      s.montoSolicitado,
      s.montoAprobado || '',
      s.rechazadoPor ? 'Rechazado' : s.aprobadoPor ? 'Aprobado' : 'Pendiente',
      new Date(s.createdAt).toLocaleDateString('es-DO'),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-aseguradora-${startDate}-${endDate}.csv`;
    link.click();
  };

  const generatePDFReport = () => {
    if (!stats || !servicios) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const aprobados = servicios.filter(s => s.aprobadoPor);
    const rechazados = servicios.filter(s => s.rechazadoPor);
    const pendientes = servicios.filter(s => !s.aprobadoPor && !s.rechazadoPor);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Aseguradora - Grúa RD</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
          h2 { color: #2d3748; margin-top: 30px; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
          .stat-card { background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #1a365d; }
          .stat-label { font-size: 12px; color: #718096; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
          th { background: #f7fafc; font-weight: bold; }
          .period { color: #718096; font-size: 14px; }
          .section { page-break-inside: avoid; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Servicios - Grúa RD</h1>
          <p class="period">Período: ${startDate} a ${endDate}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.totalServicios}</div>
            <div class="stat-label">Total Servicios</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.aprobados}</div>
            <div class="stat-label">Aprobados</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.rechazados}</div>
            <div class="stat-label">Rechazados</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatCurrency(stats.montoTotal)}</div>
            <div class="stat-label">Monto Total Aprobado</div>
          </div>
        </div>

        <div class="section">
          <h2>Servicios Aprobados (${aprobados.length})</h2>
          ${aprobados.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Cliente</th>
                  <th>Póliza</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                ${aprobados.map(s => `
                  <tr>
                    <td>${s.servicio?.tipoServicio || '-'}</td>
                    <td>${s.servicio?.cliente?.nombre || '-'} ${s.servicio?.cliente?.apellido || ''}</td>
                    <td>${s.numeroPoliza}</td>
                    <td>${formatCurrency(parseFloat(s.montoAprobado || '0'))}</td>
                    <td>${new Date(s.createdAt).toLocaleDateString('es-DO')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p>No hay servicios aprobados en este período.</p>'}
        </div>

        <div class="section">
          <h2>Servicios Rechazados (${rechazados.length})</h2>
          ${rechazados.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Cliente</th>
                  <th>Póliza</th>
                  <th>Motivo Rechazo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                ${rechazados.map(s => `
                  <tr>
                    <td>${s.servicio?.tipoServicio || '-'}</td>
                    <td>${s.servicio?.cliente?.nombre || '-'} ${s.servicio?.cliente?.apellido || ''}</td>
                    <td>${s.numeroPoliza}</td>
                    <td>${s.motivoRechazo || '-'}</td>
                    <td>${new Date(s.createdAt).toLocaleDateString('es-DO')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p>No hay servicios rechazados en este período.</p>'}
        </div>

        <div class="section">
          <h2>Servicios Pendientes (${pendientes.length})</h2>
          ${pendientes.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Cliente</th>
                  <th>Póliza</th>
                  <th>Monto Solicitado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                ${pendientes.map(s => `
                  <tr>
                    <td>${s.servicio?.tipoServicio || '-'}</td>
                    <td>${s.servicio?.cliente?.nombre || '-'} ${s.servicio?.cliente?.apellido || ''}</td>
                    <td>${s.numeroPoliza}</td>
                    <td>${formatCurrency(parseFloat(s.montoSolicitado || '0'))}</td>
                    <td>${new Date(s.createdAt).toLocaleDateString('es-DO')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p>No hay servicios pendientes.</p>'}
        </div>

        <p style="margin-top: 40px; font-size: 12px; color: #718096;">
          Generado el ${new Date().toLocaleString('es-DO')} por Grúa RD
        </p>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (statsLoading || serviciosLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Reportes
        </h2>
        <p className="text-muted-foreground">
          Genera reportes detallados de servicios y facturación
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Selecciona el período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-report-total">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servicios</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-report-total">{stats?.totalServicios || 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-report-approved">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-report-approved">{stats?.aprobados || 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-report-rejected">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-report-rejected">{stats?.rechazados || 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-report-amount">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-report-amount">{formatCurrency(stats?.montoTotal || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exportar Reportes</CardTitle>
          <CardDescription>
            Descarga los datos en el formato de tu preferencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={generatePDFReport} data-testid="button-export-pdf">
              <FileText className="h-4 w-4 mr-2" />
              Generar PDF
            </Button>
            <Button variant="outline" onClick={exportToCSV} data-testid="button-export-csv">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AseguradoraReportes() {
  return (
    <AseguradoraLayout>
      <ReportesContent />
    </AseguradoraLayout>
  );
}

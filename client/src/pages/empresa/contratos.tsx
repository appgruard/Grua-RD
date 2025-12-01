import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Calendar, Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Contrato {
  id: string;
  numeroContrato: string;
  tipoContrato: string;
  fechaInicio: string;
  fechaFin?: string;
  horasContratadas?: number;
  horasUtilizadas?: number;
  serviciosContratados?: number;
  serviciosUtilizados?: number;
  tarifaHora?: string;
  tarifaDia?: string;
  tarifaServicio?: string;
  descuentoPorcentaje?: string;
  montoMensualMinimo?: string;
  activo: boolean;
  notas?: string;
}

const tipoContratoLabels: Record<string, string> = {
  por_hora: 'Por Hora',
  por_dia: 'Por Día',
  por_mes: 'Mensual',
  por_servicio: 'Por Servicio',
  volumen: 'Volumen',
};

export default function EmpresaContratos() {
  const { data: contratos = [], isLoading } = useQuery<Contrato[]>({
    queryKey: ['/api/empresa/contratos'],
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(parseFloat(value || '0'));
  };

  const getDaysRemaining = (fechaFin?: string) => {
    if (!fechaFin) return null;
    const end = new Date(fechaFin);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUsageProgress = (used?: number, total?: number) => {
    if (!total || total === 0) return 0;
    return Math.min(((used || 0) / total) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full" />
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
        <h1 className="text-3xl font-bold" data-testid="text-contratos-title">
          Contratos
        </h1>
        <p className="text-muted-foreground">
          Visualice y gestione los contratos de su empresa con Grúa RD
        </p>
      </div>

      {contratos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay contratos activos</p>
            <p className="text-muted-foreground text-center">
              Contacte a su ejecutivo de cuenta para establecer un contrato empresarial
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {contratos.map((contrato) => {
            const daysRemaining = getDaysRemaining(contrato.fechaFin);
            const hoursProgress = getUsageProgress(contrato.horasUtilizadas, contrato.horasContratadas);
            const servicesProgress = getUsageProgress(contrato.serviciosUtilizados, contrato.serviciosContratados);

            return (
              <Card 
                key={contrato.id} 
                className={contrato.activo ? 'border-primary' : ''}
                data-testid={`card-contrato-${contrato.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {contrato.numeroContrato}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Contrato {tipoContratoLabels[contrato.tipoContrato] || contrato.tipoContrato}
                      </CardDescription>
                    </div>
                    <Badge variant={contrato.activo ? 'default' : 'secondary'}>
                      {contrato.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatDate(contrato.fechaInicio)}
                      {contrato.fechaFin && ` - ${formatDate(contrato.fechaFin)}`}
                    </span>
                  </div>

                  {daysRemaining !== null && contrato.activo && (
                    <div className={`flex items-center gap-2 text-sm ${daysRemaining <= 30 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {daysRemaining <= 30 ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      <span>
                        {daysRemaining > 0 
                          ? `${daysRemaining} días restantes`
                          : 'Contrato vencido'}
                      </span>
                    </div>
                  )}

                  {contrato.horasContratadas && contrato.horasContratadas > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Horas utilizadas</span>
                        <span className="font-medium">
                          {contrato.horasUtilizadas || 0} / {contrato.horasContratadas}
                        </span>
                      </div>
                      <Progress value={hoursProgress} className="h-2" />
                    </div>
                  )}

                  {contrato.serviciosContratados && contrato.serviciosContratados > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Servicios utilizados</span>
                        <span className="font-medium">
                          {contrato.serviciosUtilizados || 0} / {contrato.serviciosContratados}
                        </span>
                      </div>
                      <Progress value={servicesProgress} className="h-2" />
                    </div>
                  )}

                  <div className="pt-2 border-t space-y-2">
                    {contrato.tarifaHora && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          Tarifa por Hora
                        </span>
                        <span className="font-medium">{formatCurrency(contrato.tarifaHora)}</span>
                      </div>
                    )}
                    {contrato.tarifaDia && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          Tarifa por Día
                        </span>
                        <span className="font-medium">{formatCurrency(contrato.tarifaDia)}</span>
                      </div>
                    )}
                    {contrato.tarifaServicio && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          Tarifa por Servicio
                        </span>
                        <span className="font-medium">{formatCurrency(contrato.tarifaServicio)}</span>
                      </div>
                    )}
                    {contrato.descuentoPorcentaje && parseFloat(contrato.descuentoPorcentaje) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          Descuento Aplicado
                        </span>
                        <Badge variant="outline" className="text-green-600">
                          {contrato.descuentoPorcentaje}%
                        </Badge>
                      </div>
                    )}
                  </div>

                  {contrato.notas && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">{contrato.notas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

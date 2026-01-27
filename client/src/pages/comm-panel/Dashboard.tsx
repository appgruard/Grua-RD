import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommPanelAuth } from '@/contexts/CommPanelAuthContext';
import { useToast } from '@/hooks/use-toast';
import { CommPanelLayout } from '@/components/comm-panel/CommPanelLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, XCircle, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmailRecord {
  id: string;
  destinatarios: string[];
  asunto: string;
  estado: 'enviado' | 'fallido' | 'pendiente';
  createdAt: string;
}

interface EmailStats {
  total: number;
  successful: number;
  failed: number;
}

export default function Dashboard() {
  const { apiRequest } = useCommPanelAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoadingTestTemplates, setIsLoadingTestTemplates] = useState(false);

  // Fetch email history
  const { data: emailHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/comm-panel/email-history'],
    queryFn: async () => {
      return await apiRequest<EmailRecord[]>('/api/comm-panel/email-history');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calculate statistics from email history
  const stats: EmailStats = {
    total: emailHistory.length,
    successful: emailHistory.filter((e) => e.estado === 'enviado').length,
    failed: emailHistory.filter((e) => e.estado === 'fallido').length,
  };

  // Mutation for sending test templates
  const testTemplatesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/comm-panel/test-all-templates', {
        method: 'POST',
        body: JSON.stringify({ email: 'pruebas@gruard.com' }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Plantillas de prueba enviadas correctamente',
      });
      // Refetch email history after sending templates
      queryClient.invalidateQueries({ queryKey: ['/api/comm-panel/email-history'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron enviar las plantillas de prueba',
        variant: 'destructive',
      });
    },
  });

  const handleSendTestTemplates = async () => {
    setIsLoadingTestTemplates(true);
    try {
      await testTemplatesMutation.mutateAsync();
    } finally {
      setIsLoadingTestTemplates(false);
    }
  };

  // Sort email history by date (most recent first)
  const sortedEmailHistory = [...emailHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <CommPanelLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground mt-1">
              Resumen de estadísticas y actividad de correos electrónicos
            </p>
          </div>
          <Button
            onClick={handleSendTestTemplates}
            disabled={isLoadingTestTemplates}
            className="gap-2"
            data-testid="button-send-test-templates"
          >
            {isLoadingTestTemplates ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Plantillas de Prueba
              </>
            )}
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Emails Card */}
          <Card data-testid="card-total-emails">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Correos
              </CardTitle>
              <Mail className="h-4 w-4 text-primary opacity-70" />
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="h-10 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div
                    className="text-2xl font-bold"
                    data-testid="stat-total-emails"
                  >
                    {stats.total}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    correos en el sistema
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Successful Emails Card */}
          <Card data-testid="card-successful-emails">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Correos Exitosos
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500 opacity-70" />
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="h-10 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div
                    className="text-2xl font-bold text-green-600 dark:text-green-400"
                    data-testid="stat-successful-emails"
                  >
                    {stats.successful}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.total > 0
                      ? `${((stats.successful / stats.total) * 100).toFixed(1)}% de éxito`
                      : 'Sin datos'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Failed Emails Card */}
          <Card data-testid="card-failed-emails">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Correos Fallidos
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-500 opacity-70" />
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="h-10 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div
                    className="text-2xl font-bold text-red-600 dark:text-red-400"
                    data-testid="stat-failed-emails"
                  >
                    {stats.failed}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.total > 0
                      ? `${((stats.failed / stats.total) * 100).toFixed(1)}% con errores`
                      : 'Sin datos'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email History Table */}
        <Card data-testid="card-email-history">
          <CardHeader>
            <CardTitle>Historial de Correos Recientes</CardTitle>
            <CardDescription>
              {isLoadingHistory ? (
                'Cargando historial...'
              ) : sortedEmailHistory.length === 0 ? (
                'No hay correos en el historial'
              ) : (
                `Mostrando ${sortedEmailHistory.length} correo${
                  sortedEmailHistory.length !== 1 ? 's' : ''
                }`
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="space-y-2" data-testid="skeleton-email-history">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : sortedEmailHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay correos en el historial</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-destinatarios">
                        Destinatarios
                      </TableHead>
                      <TableHead data-testid="header-asunto">Asunto</TableHead>
                      <TableHead data-testid="header-estado">Estado</TableHead>
                      <TableHead data-testid="header-fecha">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEmailHistory.map((email) => (
                      <TableRow
                        key={email.id}
                        data-testid={`row-email-${email.id}`}
                      >
                        <TableCell data-testid={`cell-destinatarios-${email.id}`}>
                          <div className="max-w-xs truncate">
                            {email.destinatarios?.join(', ') || 'No especificado'}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-asunto-${email.id}`}>
                          <div className="max-w-md truncate">{email.asunto}</div>
                        </TableCell>
                        <TableCell data-testid={`cell-estado-${email.id}`}>
                          <StatusBadge estado={email.estado} />
                        </TableCell>
                        <TableCell data-testid={`cell-fecha-${email.id}`}>
                          <time>
                            {format(
                              new Date(email.createdAt),
                              'dd/MM/yyyy HH:mm',
                              { locale: es }
                            )}
                          </time>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CommPanelLayout>
  );
}

interface StatusBadgeProps {
  estado: EmailRecord['estado'];
}

function StatusBadge({ estado }: StatusBadgeProps) {
  const statusConfig = {
    enviado: {
      label: 'Enviado',
      className: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
      icon: CheckCircle,
    },
    fallido: {
      label: 'Fallido',
      className: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
      icon: XCircle,
    },
    pendiente: {
      label: 'Pendiente',
      className: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
      icon: Mail,
    },
  };

  const config = statusConfig[estado];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium ${config.className}`}
      data-testid={`badge-status-${estado}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </div>
  );
}

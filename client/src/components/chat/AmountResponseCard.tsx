import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Receipt, CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AmountResponseCardProps {
  servicioId: string;
  estadoNegociacion: string;
  montoNegociado?: string | number | null;
  notasExtraccion?: string | null;
  descripcionSituacion?: string | null;
  conductorNombre?: string;
  categoriaServicio?: string;
  subtipoServicio?: string | null;
  onAccepted?: () => void;
  onRejected?: () => void;
}

function formatAmount(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return 'RD$ 0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `RD$ ${num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const SUBTIPO_LABELS: Record<string, string> = {
  'extraccion_zanja': 'Vehiculo en Zanja',
  'extraccion_lodo': 'Vehiculo en Lodo',
  'extraccion_volcado': 'Vehiculo Volcado',
  'extraccion_accidente': 'Vehiculo Accidentado',
  'extraccion_dificil': 'Situacion Compleja',
};

export function AmountResponseCard({
  servicioId,
  estadoNegociacion,
  montoNegociado,
  notasExtraccion,
  descripcionSituacion,
  conductorNombre,
  categoriaServicio,
  subtipoServicio,
  onAccepted,
  onRejected,
}: AmountResponseCardProps) {
  const { toast } = useToast();
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/services/${servicioId}/accept-amount`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Cotizacion aceptada",
        description: "El operador ha sido notificado. El servicio comenzara pronto.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/services', servicioId] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat', servicioId] });
      onAccepted?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo aceptar la cotizacion",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/services/${servicioId}/reject-amount`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Cotizacion rechazada",
        description: "Tu solicitud sigue activa para otros operadores.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/services', servicioId] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat', servicioId] });
      setShowRejectDialog(false);
      onRejected?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo rechazar la cotizacion",
        variant: "destructive",
      });
      setShowRejectDialog(false);
    },
  });

  const handleAccept = () => {
    acceptMutation.mutate();
  };

  const handleReject = () => {
    rejectMutation.mutate();
  };

  const isPending = estadoNegociacion === 'pendiente_evaluacion';
  const isProposed = estadoNegociacion === 'propuesto';
  const isConfirmed = estadoNegociacion === 'confirmado';
  const isAccepted = estadoNegociacion === 'aceptado';
  const isRejected = estadoNegociacion === 'rechazado';
  const canRespond = isConfirmed;

  if (isPending) {
    return (
      <Card className="border-dashed" data-testid="amount-response-pending">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-3 bg-muted rounded-full">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Evaluacion en Proceso</p>
              <p className="text-sm text-muted-foreground">
                El operador esta evaluando tu situacion. Te enviaremos una cotizacion pronto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isProposed) {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" data-testid="amount-response-proposed">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Propuesta Preliminar</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 my-2">
                {formatAmount(montoNegociado)}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                El operador aun esta finalizando la evaluacion. Esperando confirmacion del monto final.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isAccepted) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30" data-testid="amount-response-accepted">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">
                Servicio Confirmado
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300 my-2">
                {formatAmount(montoNegociado)}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                El operador esta en camino para atender tu servicio.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isRejected) {
    return (
      <Card className="border-muted" data-testid="amount-response-rejected">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-3 bg-muted rounded-full">
              <XCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Cotizacion Rechazada</p>
              <p className="text-sm text-muted-foreground">
                Tu solicitud sigue activa. Otro operador puede tomar el servicio.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="amount-response-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-accent" />
              <CardTitle className="text-lg">Cotizacion del Servicio</CardTitle>
            </div>
            <Badge variant="default" data-testid="amount-status-badge">
              Pendiente de Respuesta
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {conductorNombre && (
            <p className="text-sm text-muted-foreground">
              Cotizacion de: <span className="font-medium text-foreground">{conductorNombre}</span>
            </p>
          )}

          {subtipoServicio && SUBTIPO_LABELS[subtipoServicio] && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <Badge variant="outline">{SUBTIPO_LABELS[subtipoServicio]}</Badge>
            </div>
          )}

          <div className="text-center p-6 bg-accent/10 rounded-lg border-2 border-accent/30">
            <p className="text-sm text-muted-foreground mb-2">Monto Total del Servicio</p>
            <p className="text-4xl font-bold text-accent" data-testid="text-amount">
              {formatAmount(montoNegociado)}
            </p>
          </div>

          {notasExtraccion && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Notas del operador:</p>
              <p className="text-sm">{notasExtraccion}</p>
            </div>
          )}

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Al aceptar, confirmas el monto y autorizas al operador a realizar el servicio. 
                El pago se realizara segun el metodo seleccionado.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowRejectDialog(true)}
            disabled={acceptMutation.isPending || rejectMutation.isPending}
            className="flex-1 gap-2"
            data-testid="button-reject-amount"
          >
            <XCircle className="h-4 w-4" />
            Rechazar
          </Button>
          <Button
            onClick={handleAccept}
            disabled={acceptMutation.isPending || rejectMutation.isPending}
            className="flex-1 gap-2"
            data-testid="button-accept-amount"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Aceptando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Aceptar
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Cotizacion</AlertDialogTitle>
            <AlertDialogDescription>
              Si rechazas esta cotizacion, el operador actual sera liberado y tu solicitud
              quedara disponible para otros operadores. Puedes recibir una nueva cotizacion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Rechazando...
                </>
              ) : (
                'Si, rechazar cotizacion'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

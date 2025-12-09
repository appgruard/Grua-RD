import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Send, AlertTriangle, CheckCircle, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AmountProposalCardProps {
  servicioId: string;
  estadoNegociacion: string;
  montoActual?: string | number | null;
  notasExtraccion?: string | null;
  descripcionSituacion?: string | null;
  categoriaServicio?: string;
  subtipoServicio?: string | null;
  onProposed?: () => void;
  onConfirmed?: () => void;
}

function formatAmount(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return '';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseAmountInput(value: string): number {
  const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

const SUBTIPO_LABELS: Record<string, string> = {
  'extraccion_zanja': 'Vehiculo en Zanja',
  'extraccion_lodo': 'Vehiculo en Lodo',
  'extraccion_volcado': 'Vehiculo Volcado',
  'extraccion_accidente': 'Vehiculo Accidentado',
  'extraccion_dificil': 'Situacion Compleja',
};

export function AmountProposalCard({
  servicioId,
  estadoNegociacion,
  montoActual,
  notasExtraccion,
  descripcionSituacion,
  categoriaServicio,
  subtipoServicio,
  onProposed,
  onConfirmed,
}: AmountProposalCardProps) {
  const { toast } = useToast();
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (montoActual) {
      setMonto(formatAmount(montoActual));
    }
    if (notasExtraccion) {
      setNotas(notasExtraccion);
    }
  }, [montoActual, notasExtraccion]);

  const proposeMutation = useMutation({
    mutationFn: async ({ monto, notas }: { monto: number; notas: string }) => {
      return apiRequest(`/api/services/${servicioId}/propose-amount`, {
        method: 'POST',
        body: JSON.stringify({ monto, notas }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Monto propuesto",
        description: "El cliente ha sido notificado de tu propuesta",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/services', servicioId] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat', servicioId] });
      setIsEditing(false);
      onProposed?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo proponer el monto",
        variant: "destructive",
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/services/${servicioId}/confirm-amount`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Monto confirmado",
        description: "El cliente puede ahora aceptar o rechazar tu cotizacion",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/services', servicioId] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat', servicioId] });
      onConfirmed?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo confirmar el monto",
        variant: "destructive",
      });
    },
  });

  const handlePropose = () => {
    const montoNumero = parseAmountInput(monto);
    
    if (montoNumero < 500) {
      toast({
        title: "Monto muy bajo",
        description: "El monto minimo es RD$ 500",
        variant: "destructive",
      });
      return;
    }

    if (montoNumero > 500000) {
      toast({
        title: "Monto muy alto",
        description: "El monto maximo es RD$ 500,000",
        variant: "destructive",
      });
      return;
    }

    proposeMutation.mutate({ monto: montoNumero, notas });
  };

  const handleConfirm = () => {
    confirmMutation.mutate();
  };

  const isPending = estadoNegociacion === 'pendiente_evaluacion';
  const isProposed = estadoNegociacion === 'propuesto';
  const isConfirmed = estadoNegociacion === 'confirmado';
  const isAccepted = estadoNegociacion === 'aceptado';
  const isRejected = estadoNegociacion === 'rechazado';
  const canEdit = isPending || (isProposed && !isEditing);
  const showEditButton = isProposed && !isEditing;

  if (isAccepted) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30" data-testid="amount-proposal-accepted">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">
                Cotizacion Aceptada
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                RD$ {formatAmount(montoActual)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isRejected) {
    return (
      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30" data-testid="amount-proposal-rejected">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200">
                Cotizacion Rechazada
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                El cliente ha rechazado tu propuesta. El servicio esta disponible para otros operadores.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="amount-proposal-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg">Propuesta de Monto</CardTitle>
          </div>
          <Badge 
            variant={isConfirmed ? 'default' : isProposed ? 'secondary' : 'outline'}
            data-testid="negotiation-status-badge"
          >
            {isPending && 'Pendiente Evaluacion'}
            {isProposed && 'Monto Propuesto'}
            {isConfirmed && 'Esperando Cliente'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {descripcionSituacion && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Descripcion del cliente:</p>
            <p className="text-sm">{descripcionSituacion}</p>
          </div>
        )}

        {subtipoServicio && SUBTIPO_LABELS[subtipoServicio] && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tipo de extraccion:</span>
            <Badge variant="outline">{SUBTIPO_LABELS[subtipoServicio]}</Badge>
          </div>
        )}

        {(isPending || isEditing) && (
          <>
            <div className="space-y-2">
              <Label htmlFor="monto">Monto Propuesto (RD$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  RD$
                </span>
                <Input
                  id="monto"
                  type="text"
                  inputMode="decimal"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="pl-12 text-xl font-semibold"
                  disabled={proposeMutation.isPending}
                  data-testid="input-amount"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Minimo: RD$ 500 | Maximo: RD$ 500,000
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas de Evaluacion</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Describe la situacion y justifica el monto propuesto..."
                rows={3}
                disabled={proposeMutation.isPending}
                data-testid="input-notes"
              />
            </div>
          </>
        )}

        {isProposed && !isEditing && (
          <div className="space-y-3">
            <div className="text-center p-4 bg-accent/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Monto Propuesto</p>
              <p className="text-3xl font-bold">RD$ {formatAmount(montoActual)}</p>
            </div>
            {notasExtraccion && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Tus notas:</p>
                <p className="text-sm">{notasExtraccion}</p>
              </div>
            )}
          </div>
        )}

        {isConfirmed && (
          <div className="space-y-3">
            <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
              <p className="text-sm text-muted-foreground mb-1">Monto Confirmado</p>
              <p className="text-3xl font-bold">RD$ {formatAmount(montoActual)}</p>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Esperando respuesta del cliente...
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        {showEditButton && (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            data-testid="button-edit-proposal"
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Editar
          </Button>
        )}

        {(isPending || isEditing) && (
          <>
            {isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={proposeMutation.isPending}
                data-testid="button-cancel-edit"
              >
                Cancelar
              </Button>
            )}
            <Button
              onClick={handlePropose}
              disabled={!monto || proposeMutation.isPending}
              className="flex-1 gap-2"
              data-testid="button-propose-amount"
            >
              <Send className="h-4 w-4" />
              {proposeMutation.isPending ? 'Enviando...' : isEditing ? 'Actualizar Propuesta' : 'Enviar Propuesta'}
            </Button>
          </>
        )}

        {isProposed && !isEditing && (
          <Button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            className="flex-1 gap-2"
            data-testid="button-confirm-amount"
          >
            <CheckCircle className="h-4 w-4" />
            {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar Cotizacion'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

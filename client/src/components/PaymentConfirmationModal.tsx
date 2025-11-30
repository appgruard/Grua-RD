import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Loader2, DollarSign, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  serviceId: string;
  expectedAmount: number;
  metodoPago: string;
}

type ConfirmationStep = 'confirm' | 'discrepancy';

export function PaymentConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirmed,
  serviceId, 
  expectedAmount,
  metodoPago
}: PaymentConfirmationModalProps) {
  const [step, setStep] = useState<ConfirmationStep>('confirm');
  const [amountPaid, setAmountPaid] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reportDiscrepancy = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/tickets', {
        tipo: 'cobro_excesivo',
        servicioId: serviceId,
        descripcion: `El cliente reporta que pagó RD$ ${amountPaid} pero el monto acordado era RD$ ${expectedAmount.toFixed(2)}. ${description}`.trim(),
        prioridad: 'alta',
      });
      if (!response.ok) throw new Error('Failed to create report');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Reporte enviado',
        description: 'Hemos recibido tu reporte y lo revisaremos pronto',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      handleClose();
      onConfirmed();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el reporte. Intenta nuevamente.',
        variant: 'destructive',
      });
    },
  });

  const confirmPayment = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/services/${serviceId}/confirm-payment`, {
        montoConfirmado: expectedAmount,
      });
      if (!response.ok) throw new Error('Failed to confirm payment');
      return response.json();
    },
    onSuccess: () => {
      handleClose();
      onConfirmed();
    },
    onError: () => {
      handleClose();
      onConfirmed();
    },
  });

  const handleConfirmCorrect = () => {
    confirmPayment.mutate();
  };

  const handleReportDifferent = () => {
    setStep('discrepancy');
  };

  const handleSubmitDiscrepancy = () => {
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      toast({
        title: 'Ingresa el monto',
        description: 'Por favor indica cuanto te cobraron',
        variant: 'destructive',
      });
      return;
    }
    reportDiscrepancy.mutate();
  };

  const handleClose = () => {
    setStep('confirm');
    setAmountPaid('');
    setDescription('');
    onClose();
  };

  if (metodoPago !== 'efectivo') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="payment-confirmation-modal">
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2" data-testid="payment-confirmation-title">
                <Receipt className="w-5 h-5 text-primary" />
                Confirmar pago en efectivo
              </DialogTitle>
              <DialogDescription data-testid="payment-confirmation-description">
                Por favor confirma que el monto cobrado fue el correcto
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Monto acordado</p>
                  <p className="text-3xl font-bold text-primary" data-testid="text-expected-amount">
                    RD$ {expectedAmount.toFixed(2)}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    <DollarSign className="w-3 h-3 mr-1" />
                    Pago en efectivo
                  </Badge>
                </div>
              </Card>

              <p className="text-sm text-muted-foreground text-center mt-4">
                El conductor te cobró este monto?
              </p>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                className="w-full"
                onClick={handleConfirmCorrect}
                disabled={confirmPayment.isPending}
                data-testid="button-confirm-correct"
              >
                {confirmPayment.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Si, es correcto
              </Button>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleReportDifferent}
                disabled={confirmPayment.isPending}
                data-testid="button-report-different"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Me cobraron diferente
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'discrepancy' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive" data-testid="discrepancy-title">
                <AlertTriangle className="w-5 h-5" />
                Reportar cobro incorrecto
              </DialogTitle>
              <DialogDescription>
                Lamentamos el inconveniente. Por favor proporciona los detalles.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Monto acordado:</span>
                <span className="font-semibold">RD$ {expectedAmount.toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount-paid">Cuanto te cobraron?</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">RD$</span>
                  <Input
                    id="amount-paid"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="pl-12"
                    data-testid="input-amount-paid"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detalles adicionales (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe lo que sucedio..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  data-testid="input-discrepancy-description"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('confirm')}
                disabled={reportDiscrepancy.isPending}
                data-testid="button-back-discrepancy"
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmitDiscrepancy}
                disabled={reportDiscrepancy.isPending}
                data-testid="button-submit-discrepancy"
              >
                {reportDiscrepancy.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar reporte'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

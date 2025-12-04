import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerDescription,
  DrawerFooter
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

/**
 * PayDebtModal - Modal for direct debt payment
 * 
 * PRODUCTION NOTE: This component currently uses a simplified payment flow.
 * For production, integrate Stripe Elements:
 * 1. Install @stripe/stripe-js and @stripe/react-stripe-js
 * 2. Replace the amount-only form with CardElement from Stripe
 * 3. Use stripe.confirmCardPayment with the clientSecret from create-payment-intent
 * 4. Verify PaymentIntent status on the backend before applying debt payment
 * 
 * See WALLET_IMPLEMENTATION_PLAN.md for detailed integration requirements.
 */

interface PayDebtModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: string;
  totalDebt: number;
  onSuccess: () => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(amount);
};

type PaymentStep = 'amount' | 'processing' | 'success' | 'error';

export function PayDebtModal({ 
  open, 
  onOpenChange, 
  walletId, 
  totalDebt,
  onSuccess 
}: PayDebtModalProps) {
  const [step, setStep] = useState<PaymentStep>('amount');
  const [amount, setAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && amountNum <= totalDebt;

  const createPaymentIntentMutation = useMutation({
    mutationFn: async (paymentAmount: number) => {
      const res = await apiRequest('POST', '/api/wallet/create-payment-intent', {
        amount: paymentAmount,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al crear intento de pago');
      }
      return res.json();
    },
  });

  const completePaymentMutation = useMutation({
    mutationFn: async (data: { amount: number; paymentIntentId: string }) => {
      const res = await apiRequest('POST', '/api/wallet/pay-debt', {
        walletId,
        amount: data.amount,
        paymentIntentId: data.paymentIntentId,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al procesar pago');
      }
      return res.json();
    },
  });

  const handlePayment = async () => {
    if (!isValidAmount) return;

    setStep('processing');
    setErrorMessage('');

    try {
      const paymentIntentResult = await createPaymentIntentMutation.mutateAsync(amountNum);
      
      // Use the paymentIntentId from the backend response for idempotency
      await completePaymentMutation.mutateAsync({
        amount: paymentIntentResult.amount,
        paymentIntentId: paymentIntentResult.paymentIntentId,
      });

      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/debts'] });
      
      toast({
        title: 'Pago exitoso',
        description: `Se han pagado ${formatCurrency(amountNum)} de tu deuda.`,
      });
    } catch (error: any) {
      setStep('error');
      setErrorMessage(error.message || 'Ocurrió un error al procesar el pago');
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onSuccess();
    }
    setStep('amount');
    setAmount('');
    setErrorMessage('');
    onOpenChange(false);
  };

  const handlePayAll = () => {
    setAmount(totalDebt.toFixed(2));
  };

  const renderContent = () => {
    switch (step) {
      case 'amount':
        return (
          <>
            <div className="p-4 space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Deuda pendiente</p>
                <p className="text-2xl font-bold" data-testid="text-debt-to-pay">
                  {formatCurrency(totalDebt)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto a pagar</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    RD$
                  </span>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalDebt}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-12"
                    placeholder="0.00"
                    data-testid="input-payment-amount"
                  />
                </div>
                {amountNum > totalDebt && (
                  <p className="text-xs text-destructive">
                    El monto no puede exceder la deuda pendiente
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handlePayAll}
                data-testid="button-pay-all"
              >
                Pagar todo ({formatCurrency(totalDebt)})
              </Button>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  El pago se aplicará a las deudas más antiguas primero. 
                  Puedes realizar pagos parciales.
                </AlertDescription>
              </Alert>
            </div>

            <DrawerFooter className="border-t">
              <Button 
                className="w-full"
                onClick={handlePayment}
                disabled={!isValidAmount}
                data-testid="button-confirm-payment"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Confirmar Pago
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleClose}
              >
                Cancelar
              </Button>
            </DrawerFooter>
          </>
        );

      case 'processing':
        return (
          <div className="p-8 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium mb-2">Procesando pago...</p>
            <p className="text-sm text-muted-foreground text-center">
              Por favor espera mientras procesamos tu pago de {formatCurrency(amountNum)}
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
            </div>
            <p className="text-lg font-medium mb-2">¡Pago exitoso!</p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Se han pagado {formatCurrency(amountNum)} de tu deuda.
            </p>
            <p className="text-sm font-medium">
              Nueva deuda: {formatCurrency(Math.max(0, totalDebt - amountNum))}
            </p>
            <DrawerFooter className="w-full mt-4">
              <Button 
                className="w-full"
                onClick={handleClose}
                data-testid="button-close-success"
              >
                Cerrar
              </Button>
            </DrawerFooter>
          </div>
        );

      case 'error':
        return (
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-lg font-medium mb-2">Error en el pago</p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {errorMessage}
            </p>
            <DrawerFooter className="w-full">
              <Button 
                className="w-full"
                onClick={() => setStep('amount')}
                data-testid="button-retry-payment"
              >
                Intentar de nuevo
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleClose}
              >
                Cancelar
              </Button>
            </DrawerFooter>
          </div>
        );
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader className="text-left border-b">
          <DrawerTitle>Pagar Deuda</DrawerTitle>
          <DrawerDescription>
            Paga total o parcialmente tu deuda pendiente
          </DrawerDescription>
        </DrawerHeader>
        
        {renderContent()}
      </DrawerContent>
    </Drawer>
  );
}

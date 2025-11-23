import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface StripePaymentFormProps {
  amount: number;
  servicioId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function StripePaymentForm({ amount, servicioId, onSuccess, onCancel }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/client/tracking/${servicioId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: 'Error en el pago',
          description: error.message || 'No se pudo procesar el pago',
          variant: 'destructive',
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: 'Pago exitoso',
          description: 'Tu pago ha sido procesado correctamente',
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al procesar el pago',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <PaymentElement />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
            data-testid="button-cancel-payment"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="flex-1"
            data-testid="button-confirm-payment"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pagar RD$ {amount.toFixed(2)}
          </Button>
        </div>
      </div>
    </form>
  );
}

interface StripePaymentProps {
  amount: number;
  servicioId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripePayment({ amount, servicioId, onSuccess, onCancel }: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            servicioId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.configured === false) {
            setIsConfigured(false);
            setError('El sistema de pagos aún no está configurado. Por favor, intenta más tarde o selecciona pago en efectivo.');
          } else {
            throw new Error(data.message || 'Error creating payment intent');
          }
          return;
        }

        setClientSecret(data.clientSecret);
      } catch (error: any) {
        console.error('Payment intent error:', error);
        setError(error.message);
        toast({
          title: 'Error',
          description: error.message || 'No se pudo inicializar el pago',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [servicioId, toast]);

  if (isLoading) {
    return (
      <Card data-testid="card-payment-loading">
        <CardHeader>
          <CardTitle>Procesando pago...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !clientSecret) {
    return (
      <Card data-testid="card-payment-error">
        <CardHeader>
          <CardTitle>{isConfigured ? 'Error' : 'Servicio no disponible'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive mb-4">{error || 'No se pudo inicializar el pago'}</p>
          <Button onClick={onCancel} variant="outline" data-testid="button-back">
            {isConfigured ? 'Volver' : 'Seleccionar otro método de pago'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <Card data-testid="card-payment-form">
      <CardHeader>
        <CardTitle>Pago con Tarjeta</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Monto a pagar: <span className="font-bold text-lg">RD$ {amount.toFixed(2)}</span>
          </p>
        </div>
        <Elements stripe={stripePromise} options={options}>
          <StripePaymentForm
            amount={amount}
            servicioId={servicioId}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}

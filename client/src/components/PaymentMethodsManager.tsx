import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Trash2, CheckCircle2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

interface PaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

function AddPaymentMethodForm({ onSuccess, clientSecret }: { onSuccess: () => void; clientSecret: string }) {
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
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast({
          title: 'Error',
          description: submitError.message,
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        toast({
          title: 'Error',
          description: confirmError.message,
          variant: 'destructive',
        });
      } else if (setupIntent && setupIntent.payment_method) {
        const addResponse = await apiRequest('/api/payment-methods', {
          method: 'POST',
          body: JSON.stringify({
            paymentMethodId: setupIntent.payment_method,
          }),
        });

        if (!addResponse.ok) {
          throw new Error('Error al guardar el método de pago');
        }

        toast({
          title: 'Tarjeta agregada',
          description: 'Tu método de pago ha sido guardado correctamente',
        });

        await queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo agregar el método de pago',
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
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full"
          data-testid="button-save-payment-method"
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Tarjeta
        </Button>
      </div>
    </form>
  );
}

export default function PaymentMethodsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [isStripeConfigured, setIsStripeConfigured] = useState(true);
  const { toast } = useToast();

  const { data: methods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/payment-methods'],
  });

  if (!stripePublicKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              El sistema de pagos aún no está configurado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Por favor, contacta al administrador
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/payment-methods/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Error al eliminar método de pago');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: 'Método eliminado',
        description: 'El método de pago ha sido eliminado correctamente',
      });
      setDeleteMethodId(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el método de pago',
        variant: 'destructive',
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/payment-methods/${id}/default`, {
        method: 'PUT',
      });
      if (!response.ok) {
        throw new Error('Error al marcar como predeterminada');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: 'Tarjeta predeterminada actualizada',
        description: 'El método de pago ha sido marcado como predeterminado',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la tarjeta predeterminada',
        variant: 'destructive',
      });
    },
  });

  const handleOpenDialog = async () => {
    try {
      const response = await fetch('/api/payments/create-setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.configured === false) {
          toast({
            title: 'Servicio no disponible',
            description: 'El sistema de pagos aún no está configurado',
            variant: 'destructive',
          });
          return;
        }
        throw new Error('Error al crear setup intent');
      }

      const { clientSecret } = await response.json();
      setSetupClientSecret(clientSecret);
      setIsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo inicializar el formulario',
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSetupClientSecret(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSetupClientSecret(null);
    }
  };

  const getBrandIcon = (brand: string) => {
    return <CreditCard className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const setupOptions = setupClientSecret ? {
    clientSecret: setupClientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  } : null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle>Métodos de Pago</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={handleOpenDialog}
                data-testid="button-add-payment-method"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Tarjeta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Método de Pago</DialogTitle>
                <DialogDescription>
                  Agrega una tarjeta de crédito o débito para futuros pagos
                </DialogDescription>
              </DialogHeader>
              {setupOptions && setupClientSecret && stripePromise ? (
                <Elements stripe={stripePromise} options={setupOptions}>
                  <AddPaymentMethodForm onSuccess={handleCloseDialog} clientSecret={setupClientSecret} />
                </Elements>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!methods || methods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No tienes métodos de pago guardados
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Agrega una tarjeta para realizar pagos más rápido
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-3 border border-border rounded-md hover-elevate"
                  data-testid={`payment-method-${method.id}`}
                >
                  <div className="flex items-center gap-3">
                    {getBrandIcon(method.brand)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium capitalize">
                          {method.brand} •••• {method.last4}
                        </p>
                        {method.isDefault && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Predeterminada
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expira {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDefaultMutation.mutate(method.id)}
                        disabled={setDefaultMutation.isPending}
                        data-testid={`button-set-default-${method.id}`}
                      >
                        Marcar como predeterminada
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteMethodId(method.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${method.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteMethodId} onOpenChange={() => setDeleteMethodId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar método de pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El método de pago será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMethodId && deleteMutation.mutate(deleteMethodId)}
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

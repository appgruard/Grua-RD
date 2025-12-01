import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CreditCard, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react';

interface PaymentMethod {
  id: string;
  cardBrand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName?: string;
  isDefault: boolean;
}

export default function DLocalPaymentManager() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const { data: paymentMethods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/client/payment-methods'],
  });

  const addCardMutation = useMutation({
    mutationFn: async (cardData: { cardNumber: string; cardExpiry: string; cardCVV: string; cardholderName?: string }) => {
      return apiRequest('/api/client/payment-methods', {
        method: 'POST',
        body: JSON.stringify(cardData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/payment-methods'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: 'Tarjeta agregada',
        description: 'Tu método de pago ha sido guardado de forma segura.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al agregar tarjeta',
        description: error.message || 'No se pudo agregar la tarjeta',
        variant: 'destructive',
      });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (methodId: string) => {
      return apiRequest(`/api/client/payment-methods/${methodId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/payment-methods'] });
      toast({
        title: 'Tarjeta eliminada',
        description: 'El método de pago ha sido eliminado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al eliminar tarjeta',
        description: error.message || 'No se pudo eliminar la tarjeta',
        variant: 'destructive',
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (methodId: string) => {
      return apiRequest(`/api/client/payment-methods/${methodId}/set-default`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/payment-methods'] });
      toast({
        title: 'Tarjeta predeterminada actualizada',
        description: 'Esta tarjeta será usada para futuros pagos.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la tarjeta predeterminada',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setCardNumber('');
    setCardExpiry('');
    setCardCVV('');
    setCardholderName('');
  };

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const groups = numbers.match(/.{1,4}/g) || [];
    return groups.join(' ').substring(0, 19);
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return numbers.substring(0, 2) + '/' + numbers.substring(2, 4);
    }
    return numbers;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 15 || cleanCardNumber.length > 16) {
      toast({
        title: 'Número de tarjeta inválido',
        description: 'Ingresa un número de tarjeta válido',
        variant: 'destructive',
      });
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      toast({
        title: 'Fecha de vencimiento inválida',
        description: 'Usa el formato MM/AA',
        variant: 'destructive',
      });
      return;
    }

    if (cardCVV.length < 3 || cardCVV.length > 4) {
      toast({
        title: 'CVV inválido',
        description: 'Ingresa un CVV válido (3-4 dígitos)',
        variant: 'destructive',
      });
      return;
    }

    addCardMutation.mutate({
      cardNumber: cleanCardNumber,
      cardExpiry,
      cardCVV,
      cardholderName: cardholderName || undefined,
    });
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand?.toLowerCase() || '';
    if (brandLower.includes('visa')) return '💳';
    if (brandLower.includes('master')) return '💳';
    if (brandLower.includes('amex')) return '💳';
    return '💳';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Métodos de Pago</CardTitle>
          <CardDescription>Administra tus tarjetas para pagos</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-card">
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Tarjeta</DialogTitle>
              <DialogDescription>
                Tu información está protegida con encriptación segura.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Número de Tarjeta</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  data-testid="input-card-number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cardExpiry">Vencimiento</Label>
                  <Input
                    id="cardExpiry"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    data-testid="input-card-expiry"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardCVV">CVV</Label>
                  <Input
                    id="cardCVV"
                    type="password"
                    placeholder="123"
                    value={cardCVV}
                    onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, '').substring(0, 4))}
                    maxLength={4}
                    data-testid="input-card-cvv"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardholderName">Nombre del Titular (opcional)</Label>
                <Input
                  id="cardholderName"
                  placeholder="Como aparece en la tarjeta"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  data-testid="input-cardholder-name"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={addCardMutation.isPending}
                data-testid="button-submit-card"
              >
                {addCardMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Tarjeta'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!paymentMethods || paymentMethods.length === 0 ? (
          <div className="text-center py-6">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              No tienes tarjetas guardadas
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Agrega una tarjeta para pagos más rápidos
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-3 border rounded-md"
                data-testid={`card-payment-method-${method.id}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCardBrandIcon(method.cardBrand)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {method.cardBrand} •••• {method.last4}
                      </span>
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Principal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vence {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!method.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate(method.id)}
                      disabled={setDefaultMutation.isPending}
                      data-testid={`button-set-default-${method.id}`}
                    >
                      Usar
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-delete-card-${method.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Tarjeta</AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de que deseas eliminar esta tarjeta ({method.cardBrand} •••• {method.last4})?
                          Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCardMutation.mutate(method.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

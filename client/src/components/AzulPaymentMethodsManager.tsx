import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Trash2, CheckCircle2, Plus, AlertCircle } from 'lucide-react';
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

interface PaymentMethod {
  id: string;
  cardBrand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName?: string;
  isDefault: boolean;
}

interface ServiceStatus {
  configured: boolean;
  gateway: string;
}

function AddCardForm({ onSuccess }: { onSuccess: () => void }) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const { toast } = useToast();

  const addCardMutation = useMutation({
    mutationFn: async (data: { cardNumber: string; cardExpiry: string; cardCVV: string; cardholderName?: string }) => {
      const response = await apiRequest('/api/client/payment-methods', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al agregar la tarjeta');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/payment-methods'] });
      toast({
        title: 'Tarjeta agregada',
        description: 'Tu tarjeta ha sido guardada correctamente',
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 15 || cleanCardNumber.length > 16) {
      toast({
        title: 'Error',
        description: 'Número de tarjeta inválido',
        variant: 'destructive',
      });
      return;
    }

    const cleanExpiry = cardExpiry.replace('/', '');
    if (cleanExpiry.length !== 4) {
      toast({
        title: 'Error',
        description: 'Fecha de vencimiento inválida',
        variant: 'destructive',
      });
      return;
    }

    if (cardCVV.length < 3 || cardCVV.length > 4) {
      toast({
        title: 'Error',
        description: 'CVV inválido',
        variant: 'destructive',
      });
      return;
    }

    addCardMutation.mutate({
      cardNumber: cleanCardNumber,
      cardExpiry: cleanExpiry,
      cardCVV,
      cardholderName: cardholderName || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardholderName">Nombre del titular (opcional)</Label>
        <Input
          id="cardholderName"
          placeholder="NOMBRE COMO APARECE EN LA TARJETA"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
          data-testid="input-cardholder-name"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Número de tarjeta</Label>
        <Input
          id="cardNumber"
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          maxLength={19}
          required
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
            required
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
            onChange={(e) => setCardCVV(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            maxLength={4}
            required
            data-testid="input-card-cvv"
          />
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Tu información de pago está protegida con encriptación de nivel bancario a través de Azul.
        </p>
      </div>

      <Button
        type="submit"
        disabled={addCardMutation.isPending}
        className="w-full"
        data-testid="button-save-card"
      >
        {addCardMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar Tarjeta
      </Button>
    </form>
  );
}

export default function AzulPaymentMethodsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: serviceStatus, isLoading: isLoadingStatus } = useQuery<ServiceStatus>({
    queryKey: ['/api/client/payment-service-status'],
  });

  const { data: methods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/client/payment-methods'],
    enabled: serviceStatus?.configured === true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/client/payment-methods/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Error al eliminar método de pago');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/payment-methods'] });
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
      const response = await apiRequest(`/api/client/payment-methods/${id}/default`, {
        method: 'PUT',
      });
      if (!response.ok) {
        throw new Error('Error al marcar como predeterminada');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/payment-methods'] });
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

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const getBrandIcon = (brand: string) => {
    return <CreditCard className="w-5 h-5" />;
  };

  const getBrandName = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'Visa';
      case 'mastercard':
        return 'Mastercard';
      case 'amex':
        return 'American Express';
      default:
        return 'Tarjeta';
    }
  };

  if (isLoadingStatus) {
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

  if (!serviceStatus?.configured) {
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle>Métodos de Pago</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
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
              <AddCardForm onSuccess={handleCloseDialog} />
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
                    {getBrandIcon(method.cardBrand)}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {getBrandName(method.cardBrand)} •••• {method.last4}
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
                        className="hidden sm:flex"
                      >
                        Predeterminada
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
